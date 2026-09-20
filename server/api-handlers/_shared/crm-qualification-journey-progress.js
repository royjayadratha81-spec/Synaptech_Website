// Maps existing AI Discovery evidence to the versioned omnichannel question
// registry. Pure/read-only: no database writes, scoring or provider execution.

import { getQuestionSet, normalizeBusinessUnit } from "./crm-omnichannel-content-registry.js";

const FIELD_TO_QUESTION = Object.freeze({
  business_solutions: Object.freeze({
    product_interest: "solution_interest",
    organization_type: "organization_type",
    business_problem: "business_problems",
    current_system: "current_process",
    number_of_users: "business_scale",
    must_have_features: "business_problems",
    integrations: "integration_requirements",
    migration_requirement: "integration_requirements",
    platform_requirement: "integration_requirements",
    white_label_requirement: "deployment_model",
    timeline: "go_live_timeline",
    budget_range: "budget_or_procurement",
    decision_authority: "decision_authority",
    decision_process: "decision_authority",
  }),
  admissions: Object.freeze({
  enquiry_relation: "enquiry_relation",
  course_interest: "programme_interest",

  callback_timing_bucket: "callback_timing_bucket",
  callback_delay_review: "callback_delay_review",
  revised_callback_time: "revised_callback_time",

  guidance_callback_required: "guidance_callback_required",
  guidance_callback_time: "guidance_callback_time",

  programme_selection_guidance: "programme_selection_guidance",
  advanced_programme_recommendation: "advanced_programme_recommendation",
  advanced_programme_guidance: "advanced_programme_guidance",

  educational_background: "education_background",
  graduation_status: "career_stage",
  location: "location",

  preferred_mode: "learning_mode",
  learning_mode_guidance: "learning_mode_guidance",
  vaishali_attendance: "vaishali_attendance",
  vaishali_mode_recommendation: "vaishali_mode_recommendation",

  joining_timeline: "start_timeline",
  career_goal: "primary_goal",

  prior_experience: "prior_experience",
  coding_math_confidence: "coding_math_confidence",
  coding_counsellor_offer: "coding_counsellor_offer",

  career_roles_interest: "career_roles_interest",

  project_learning_interest: "project_learning_interest",
  project_learning_guidance: "project_learning_guidance",

  laptop_readiness: "laptop_readiness",
  laptop_guidance: "laptop_guidance",

  counselling_interest: "fee_counselling",
  fee_readiness: "fee_counselling",

  fast_track_interest: "fast_track_interest",
  fast_track_guidance: "fast_track_guidance",

  payment_preference: "payment_preference",
  payment_guidance: "payment_guidance",

  decision_authority: "decision_authority",
  guardian_call_preference: "guardian_call_preference",
  guardian_contact_details: "guardian_contact_details",
  decision_authority_status: "decision_authority_status",

  placement_support_required: "placement_support_required",
  placement_support_guidance: "placement_support_guidance",

  preferred_callback_time: "preferred_callback_time",
  whatsapp_consent: "whatsapp_consent",
  ai_call_consent: "ai_call_consent",
  human_handoff: "human_handoff",
}),
});

export const ADMISSIONS_ANSWER_FIELDS = Object.freeze(Object.keys(FIELD_TO_QUESTION.admissions));

function normalizeField(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function extractedFieldNames(extractedFacts) {
  if (Array.isArray(extractedFacts)) {
    return extractedFacts
      .map((item) => normalizeField(typeof item === "object" ? item?.field : item))
      .filter(Boolean);
  }
  if (extractedFacts && typeof extractedFacts === "object") {
    return Object.keys(extractedFacts).map(normalizeField).filter(Boolean);
  }
  return [];
}

function extractedFactValue(extractedFacts, fieldName) {
  const normalizedName = normalizeField(fieldName);
  if (Array.isArray(extractedFacts)) {
    const match = extractedFacts.find((item) =>
      item && typeof item === "object" && normalizeField(item.field) === normalizedName
    );
    return String(match?.value ?? "").trim().toLowerCase();
  }
  if (extractedFacts && typeof extractedFacts === "object") {
    const key = Object.keys(extractedFacts).find((item) => normalizeField(item) === normalizedName);
    return String(key ? extractedFacts[key] : "").trim().toLowerCase();
  }
  return "";
}

function isAffirmative(value) {
  return /^(yes|yes,|i consent|consent|agreed|allow|allowed|true\b)/i.test(String(value || "").trim());
}
function normalizeAnswerValue(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\bgen ai\b/g, "generative ai")
    .replace(/\s+/g, " ");
}

function parseCallbackDate(value) {
  const match = String(value ?? "").trim().match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})\s*,?\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  if (!match) return null;

  const [
    ,
    dayText,
    monthText,
    yearText,
    hourText,
    minuteText,
    periodText,
  ] = match;

  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const minute = Number(minuteText);
  let hour = Number(hourText);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 1 ||
    hour > 12 ||
    minute > 59
  ) {
    return null;
  }

  if (hour === 12) hour = 0;
  if (periodText.toUpperCase() === "PM") hour += 12;

  // Interpret the learner's entered callback time as Indian Standard Time.
  const timestamp =
    Date.UTC(year, month - 1, day, hour, minute) -
    330 * 60 * 1000;

  const parsed = new Date(timestamp);
  const istCheck = new Date(timestamp + 330 * 60 * 1000);

  if (
    istCheck.getUTCFullYear() !== year ||
    istCheck.getUTCMonth() !== month - 1 ||
    istCheck.getUTCDate() !== day ||
    istCheck.getUTCHours() !== hour ||
    istCheck.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return parsed;
}

export function callbackTimingBucket(value, now = new Date()) {
  const requested = parseCallbackDate(value);

  if (!requested || Number.isNaN(now?.getTime?.())) {
    return null;
  }

  return requested.getTime() - now.getTime() >=
    48 * 60 * 60 * 1000
    ? "More than 48 hours"
    : "Within 48 hours";
}

function requestGuidanceCallback(result) {
  result.guidance_callback_required = "Yes";
  result.human_handoff = "Schedule a call";
}

export function captureJourneyAnswer(
  businessUnit,
  questionKey,
  answer
) {
  const unit = normalizeBusinessUnit(businessUnit);

  // Public admissions uses explicit answers.
  // Business discovery retains its existing AI extraction contract.
  if (unit !== "admissions") return {};

  const field = Object.keys(
    FIELD_TO_QUESTION[unit] || {}
  ).find(
    (key) =>
      FIELD_TO_QUESTION[unit][key] === questionKey
  );

  const value = String(answer ?? "").trim();

  if (!field || !value) return {};

  const question = getQuestionSet(unit).questions.find(
    (item) => item.key === questionKey
  );

  const canonical = question?.options?.find(
    (option) =>
      option.toLowerCase() === value.toLowerCase()
  );

  // A customer's question must not be saved as the answer
  // to the currently pending qualification question.
  if (
    !canonical &&
    (
      /\?/.test(value) ||
      /^(what|why|how|can |could |tell me|explain|is |are |do |does )/i.test(
        value
      )
    )
  ) {
    return {};
  }

  // Consent must not be inferred from unrelated text.
  if (
    question?.answer_type === "explicit_consent" &&
    !canonical &&
    !/^(yes|no)$/i.test(value)
  ) {
    return {};
  }

  const result = {
    [field]: canonical || value,
  };

  const selected = canonical || value;

  // Course-selection guidance.
  if (questionKey === "programme_selection_guidance") {
    if (
      selected === "Data Analytics" ||
      selected === "Data Science"
    ) {
      result.course_interest = selected;
    } else if (
      selected ===
      "Data Science with Gen AI & Agentic AI"
    ) {
      result.course_interest =
        "Data Science with Generative AI and Agentic AI";
    } else if (
      selected === "Schedule a counsellor call"
    ) {
      requestGuidanceCallback(result);
    }
  }

  // Initial advanced-programme recommendation.
  if (
    questionKey ===
      "advanced_programme_recommendation" &&
    /^consider data science/i.test(selected)
  ) {
    result.course_interest =
      "Data Science with Generative AI and Agentic AI";
  }

  // Detailed advanced-programme guidance.
  if (questionKey === "advanced_programme_guidance") {
    if (
      selected ===
      "Choose Data Science with Gen AI & Agentic AI"
    ) {
      result.course_interest =
        "Data Science with Generative AI and Agentic AI";
    } else if (
      selected === "Schedule a counsellor call"
    ) {
      requestGuidanceCallback(result);
    }
  }

  // Learning-mode guidance and Vaishali fallback.
  if (
    questionKey === "learning_mode_guidance" ||
    questionKey === "vaishali_mode_recommendation"
  ) {
    if (
      ["Online", "Offline", "Hybrid"].includes(selected)
    ) {
      result.preferred_mode = selected;
    } else if (
      selected === "Schedule a counsellor call"
    ) {
      requestGuidanceCallback(result);
    }
  }

  // If there is no coding/maths concern, do not ask the
  // repetitive confidence question.
  if (
    questionKey === "prior_experience" &&
    selected === "No"
  ) {
    result.coding_math_confidence =
      "Yes, I feel confident";
  }

  if (
    questionKey === "coding_counsellor_offer" &&
    selected === "Schedule a counsellor call"
  ) {
    requestGuidanceCallback(result);
  }

  // Project-learning guidance.
  if (questionKey === "project_learning_guidance") {
    if (
      selected ===
      "Yes, project-based learning suits me"
    ) {
      result.project_learning_interest = "Yes";
    } else if (
      selected === "Schedule a counsellor call"
    ) {
      requestGuidanceCallback(result);
    }
  }

  // Laptop guidance.
  if (questionKey === "laptop_guidance") {
    if (
      selected === "I can arrange a suitable laptop"
    ) {
      result.laptop_readiness = "I can arrange one";
    } else if (
      selected === "Schedule a counsellor call"
    ) {
      requestGuidanceCallback(result);
    }
  }

  // Regular versus fast-track guidance.
  if (questionKey === "fast_track_guidance") {
    if (
      [
        "Regular 10-month programme",
        "6-month fast-track programme",
      ].includes(selected)
    ) {
      result.fast_track_interest = selected;
    } else if (
      selected === "Schedule a counsellor call"
    ) {
      requestGuidanceCallback(result);
    }
  }

  // One-time versus EMI guidance.
  if (questionKey === "payment_guidance") {
    if (
      [
        "One-time payment",
        "No-cost EMI",
      ].includes(selected)
    ) {
      result.payment_preference = selected;
    } else if (
      selected === "Schedule a counsellor call"
    ) {
      requestGuidanceCallback(result);
    }
  }

  // Once guardian contact details are supplied,
  // prepare the requested counsellor callback.
  if (questionKey === "guardian_contact_details") {
    requestGuidanceCallback(result);
  }

  // Placement guidance.
  if (
    questionKey === "placement_support_guidance"
  ) {
    if (
      selected === "Yes, I want placement support"
    ) {
      result.placement_support_required = "Yes";
    } else if (
      selected === "No, not required"
    ) {
      result.placement_support_required = "No";
    } else if (
      selected === "Schedule a counsellor call"
    ) {
      requestGuidanceCallback(result);
    }
  }

  // A callback requested from any guidance branch.
  if (questionKey === "guidance_callback_time") {
    result.preferred_callback_time = selected;
    result.guidance_callback_required = "Completed";
    result.human_handoff = "Schedule a call";
  }

  // An earlier time selected after the 48-hour warning.
  if (questionKey === "revised_callback_time") {
    result.preferred_callback_time = selected;
  }

  // Determine whether the requested callback is at least
  // 48 hours from the present time.
  if (
    [
      "preferred_callback_time",
      "guidance_callback_time",
      "revised_callback_time",
    ].includes(questionKey)
  ) {
    const timingBucket =
      callbackTimingBucket(selected);

    if (timingBucket) {
      result.callback_timing_bucket =
        timingBucket;
    }
  }

  return result;
}

export function mapDiscoveryFieldsToQuestionKeys(businessUnit, fields = []) {
  const unit = normalizeBusinessUnit(businessUnit);
  const questionSet = getQuestionSet(unit);
  const mapping = FIELD_TO_QUESTION[unit] || {};
  if (!questionSet) return [];
  const validKeys = new Set(questionSet.questions.map((question) => question.key));
  return [...new Set(fields
    .map((field) => mapping[normalizeField(field)])
    .filter((key) => key && validKeys.has(key)))];
}

export function buildJourneyProgress({
  businessUnit,
  extractedFacts = [],
  missingFields = [],
  qualificationReady = false,
  humanHandoffRequired = false,
} = {}) {
  const unit = normalizeBusinessUnit(businessUnit);
  const evidence = unit === "admissions" && extractedFacts?._aira_answers
    ? extractedFacts._aira_answers : extractedFacts;
  let answeredQuestionKeys = mapDiscoveryFieldsToQuestionKeys(
    unit,
    extractedFieldNames(evidence)
  );
  let missingQuestionKeys = mapDiscoveryFieldsToQuestionKeys(unit, missingFields);
  if (unit === "admissions") {
    const answered = new Set(answeredQuestionKeys.filter((key) => {
      const field = Object.keys(FIELD_TO_QUESTION.admissions).find((f) => FIELD_TO_QUESTION.admissions[f] === key);
      const value = extractedFactValue(evidence, field);
      return Boolean(value && !["unknown", "null", "undefined"].includes(value));
    }));
    answeredQuestionKeys = [...answered];
    missingQuestionKeys = getQuestionSet(unit).questions.filter((q) => {
      if (answered.has(q.key)) return false;
      if (!q.depends_on) return true;
      const field = Object.keys(FIELD_TO_QUESTION.admissions).find((f) => FIELD_TO_QUESTION.admissions[f] === q.depends_on.key);
      const value = normalizeAnswerValue(
  extractedFactValue(evidence, field)
);

return q.depends_on.any_of.some(
  (option) => normalizeAnswerValue(option) === value
);
    }).map((q) => q.key);
  }
  const humanHandoff = extractedFactValue(extractedFacts, "human_handoff");

  return Object.freeze({
    business_unit: unit,
    answered_question_keys: Object.freeze(answeredQuestionKeys),
    question_key: answeredQuestionKeys.at(-1) || null,
    next_question_key: missingQuestionKeys[0] || null,
    qualification_ready: qualificationReady === true,
    human_handoff_required: humanHandoffRequired === true,
    whatsapp_consent: isAffirmative(extractedFactValue(extractedFacts, "whatsapp_consent")),
    ai_call_consent: isAffirmative(extractedFactValue(extractedFacts, "ai_call_consent")),
    callback_consent: /speak|schedule|call|callback/.test(humanHandoff),
    callback_requested: /speak|schedule|call|callback/.test(humanHandoff),
  });
}
