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
    advanced_programme_recommendation: "advanced_programme_recommendation",
    educational_background: "education_background",
    graduation_status: "career_stage",
    location: "location",
    preferred_mode: "learning_mode",
    joining_timeline: "start_timeline",
    career_goal: "primary_goal",
    prior_experience: "prior_experience",
    coding_math_confidence: "coding_math_confidence",
    career_roles_interest: "career_roles_interest",
    project_learning_interest: "project_learning_interest",
    laptop_readiness: "laptop_readiness",
    vaishali_attendance: "vaishali_attendance",
    counselling_interest: "fee_counselling",
    fee_readiness: "fee_counselling",
    fast_track_interest: "fast_track_interest",
    payment_preference: "payment_preference",
    decision_authority: "decision_authority",
    decision_authority_status: "decision_authority_status",
    placement_support_required: "placement_support_required",
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

export function captureJourneyAnswer(businessUnit, questionKey, answer) {
  const unit = normalizeBusinessUnit(businessUnit);
  // Public admissions uses explicit answers. Business discovery keeps its
  // existing AI extraction and scoring contract.
  if (unit !== "admissions") return {};
  const field = Object.keys(FIELD_TO_QUESTION[unit] || {}).find(
    (key) => FIELD_TO_QUESTION[unit][key] === questionKey
  );
  const value = String(answer ?? "").trim();
  if (!field || !value) return {};
  const question = getQuestionSet(unit).questions.find(q => q.key === questionKey);
  const canonical = question?.options?.find(option => option.toLowerCase() === value.toLowerCase());
  // A question about the course is not an answer to the pending field.
  if (!canonical && (/\?/.test(value) || /^(what|why|how|can |could |tell me|explain|is |are |do |does )/i.test(value))) return {};
  // Consent must never be inferred from unrelated free text.
  if (question?.answer_type === "explicit_consent" && !canonical && !/^(yes|no)$/i.test(value)) return {};
  const result = { [field]: canonical || value };
  if (unit === "admissions" && questionKey === "advanced_programme_recommendation" &&
      /^consider data science/i.test(value)) {
    result.course_interest = "Data Science with Generative AI and Agentic AI";
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
      const value = extractedFactValue(evidence, field).replace(/&/g, "and").replace(/gen ai/g, "generative ai");
      return q.depends_on.any_of.some((option) => option.toLowerCase() === value);
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
