// api/crm/score-lead.js
//
// Synaptech CRM - Dynamic Lead Scoring Engine V1
//
// Combines:
// - deterministic lead validation
// - AI conversation facts
// - engagement
// - readiness
// - configurable scoring profile
//
// Automatically selects:
// - Admissions profile
// - Business Solutions profile
//
// IMPORTANT:
// - Does NOT modify synaptech_leads
// - Does NOT modify LMS/Admin
// - Does NOT modify AI conversation history
// - Does NOT invent source/CPL economics
// - source_quality_score and economic_score remain 0
//   until real campaign-performance data is connected.

import {
  authenticateCrmRequest,
  sendCrmError,
} from "./_auth.js";

import {
  scoreCrmLead as scoreCrmLeadShared,
} from "../_shared/crm-scoring-engine.js";

const SCORING_VERSION = "v1";

// ------------------------------------------------------------
// GENERAL HELPERS
// ------------------------------------------------------------

function cleanText(value, maxLength = 5000) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function normalizeText(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function safeObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function clamp(value, min = 0, max = 100) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(
    Math.max(
      Math.round(number),
      min
    ),
    max
  );
}

function getRequestBody(req) {
  if (!req.body) {
    return {};
  }

  if (
    typeof req.body ===
    "string"
  ) {
    try {
      return JSON.parse(
        req.body
      );
    } catch {
      return {};
    }
  }

  return req.body;
}

function unique(values) {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ];
}

function hasValue(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return false;
  }

  if (
    typeof value === "string"
  ) {
    const normalized =
      normalizeText(value);

    return (
      normalized !== "" &&
      normalized !== "unknown" &&
      normalized !== "none" &&
      normalized !== "null" &&
      normalized !== "n/a"
    );
  }

  if (
    Array.isArray(value)
  ) {
    return value.length > 0;
  }

  return true;
}

function valueFromProfile(
  profile,
  ...keys
) {
  const source =
    safeObject(profile);

  for (const key of keys) {
    if (
      hasValue(
        source[key]
      )
    ) {
      return source[key];
    }
  }

  return null;
}

function includesAny(
  text,
  terms
) {
  const normalized =
    normalizeText(text);

  return terms.some((term) =>
    normalized.includes(
      normalizeText(term)
    )
  );
}

// ------------------------------------------------------------
// BUSINESS UNIT
// ------------------------------------------------------------

function determineBusinessUnit({
  conversation,
  validation,
}) {
  const conversationUnit =
    conversation?.business_unit;

  if (
    conversationUnit ===
      "admissions" ||
    conversationUnit ===
      "business_solutions"
  ) {
    return conversationUnit;
  }

  const validationUnit =
    validation?.business_unit;

  if (
    validationUnit ===
      "admissions" ||
    validationUnit ===
      "business_solutions"
  ) {
    return validationUnit;
  }

  return "unclassified";
}

// ------------------------------------------------------------
// NORMALIZED CATEGORY SCORE
// ------------------------------------------------------------

function normalizedPoints(
  earned,
  maximum
) {
  if (
    !maximum ||
    maximum <= 0
  ) {
    return 0;
  }

  return clamp(
    (earned / maximum) *
      100
  );
}

// ------------------------------------------------------------
// CUSTOMER TEXT
// ------------------------------------------------------------

function buildCustomerText(
  messages
) {
  return messages
    .filter(
      (message) =>
        message.role ===
        "customer"
    )
    .map(
      (message) =>
        message.message_text
    )
    .filter(Boolean)
    .join(" ");
}

// ------------------------------------------------------------
// BEHAVIORAL ENGAGEMENT EVENTS
// ------------------------------------------------------------

function buildBehaviorSignals(events) {
  const eventTypes = new Set(
    safeArray(events)
      .map((event) =>
        cleanText(event?.event_type, 100)
      )
      .filter(Boolean)
  );

  const has = (eventType) =>
    eventTypes.has(eventType);

  let videoProgress = 0;

  if (has("demo_video_25")) {
    videoProgress = Math.max(
      videoProgress,
      25
    );
  }

  if (has("demo_video_50")) {
    videoProgress = Math.max(
      videoProgress,
      50
    );
  }

  if (has("demo_video_75")) {
    videoProgress = Math.max(
      videoProgress,
      75
    );
  }

  if (has("demo_video_completed")) {
    videoProgress = 100;
  }

  return {
    demo_offered:
      has("demo_offered"),

    demo_accepted:
      has("demo_accepted"),

    demo_video_started:
      has("demo_video_started"),

    demo_video_progress:
      videoProgress,

    demo_video_completed:
      has("demo_video_completed"),

    live_demo_requested:
      has("live_demo_requested"),

    live_demo_declined:
      has("live_demo_declined"),

    ai_followup_sent:
      has("ai_followup_sent"),

    ai_followup_replied:
      has("ai_followup_replied"),

    ai_call_started:
      has("ai_call_started"),

    ai_call_connected:
      has("ai_call_connected"),

    ai_call_completed:
      has("ai_call_completed"),

    ai_callback_requested:
      has("ai_callback_requested"),

    human_call_completed:
      has("human_call_completed"),
  };
}


function applyBehavioralScoreAdjustments({
  intentScore,
  engagementScore,
  readinessScore,
  behaviorSignals,
  rules,
  positiveFactors,
}) {
  const config =
    safeObject(
      rules?.behavioral_events
    );

  let nextIntent =
    Number(intentScore || 0);

  let nextEngagement =
    Number(engagementScore || 0);

  let nextReadiness =
    Number(readinessScore || 0);


  // ----------------------------------------------------------
  // DEMO INTENT
  // ----------------------------------------------------------

  if (
    behaviorSignals.demo_accepted
  ) {
    nextIntent += Number(
      config.demo_accepted_intent ??
        5
    );

    positiveFactors.push(
      "Prospect accepted the product demo."
    );
  }


  // ----------------------------------------------------------
  // VIDEO ENGAGEMENT
  // Use highest milestone only — do not stack all milestones.
  // ----------------------------------------------------------

  const progress =
    Number(
      behaviorSignals
        .demo_video_progress ||
        0
    );

  if (progress >= 100) {
    nextEngagement += Number(
      config.demo_video_100_engagement ??
        20
    );

    positiveFactors.push(
      "Prospect completed the product demo."
    );
  } else if (progress >= 75) {
    nextEngagement += Number(
      config.demo_video_75_engagement ??
        15
    );

    positiveFactors.push(
      "Prospect watched at least 75% of the product demo."
    );
  } else if (progress >= 50) {
    nextEngagement += Number(
      config.demo_video_50_engagement ??
        10
    );

    positiveFactors.push(
      "Prospect watched at least 50% of the product demo."
    );
  } else if (progress >= 25) {
    nextEngagement += Number(
      config.demo_video_25_engagement ??
        5
    );

    positiveFactors.push(
      "Prospect watched at least 25% of the product demo."
    );
  }


  // ----------------------------------------------------------
  // EXPLICIT LIVE-DEMO INTEREST
  // ----------------------------------------------------------

  if (
    behaviorSignals.live_demo_requested
  ) {
    nextIntent += Number(
      config.live_demo_requested_intent ??
        20
    );

    nextReadiness += Number(
      config.live_demo_requested_readiness ??
        15
    );

    positiveFactors.push(
      "Prospect explicitly requested a personalised live demo."
    );
  }


  // ----------------------------------------------------------
  // FUTURE AI FOLLOW-UP SIGNALS
  // ----------------------------------------------------------

  if (
    behaviorSignals.ai_followup_replied
  ) {
    nextEngagement += Number(
      config.ai_followup_reply_engagement ??
        10
    );

    positiveFactors.push(
      "Prospect responded to an AI follow-up."
    );
  }


  // ----------------------------------------------------------
  // FUTURE AI TELECALLING SIGNALS
  // ----------------------------------------------------------

  if (
    behaviorSignals.ai_call_connected
  ) {
    nextEngagement += Number(
      config.ai_call_connected_engagement ??
        10
    );

    positiveFactors.push(
      "Prospect connected with the AI telecalling agent."
    );
  }

  if (
    behaviorSignals.ai_call_completed
  ) {
    nextEngagement += Number(
      config.ai_call_completed_engagement ??
        5
    );
  }

  if (
    behaviorSignals.ai_callback_requested
  ) {
    nextIntent += Number(
      config.ai_callback_requested_intent ??
        12
    );

    nextReadiness += Number(
      config.ai_callback_requested_readiness ??
        8
    );

    positiveFactors.push(
      "Prospect requested a callback during AI engagement."
    );
  }


  return {
    intentScore:
      clamp(nextIntent),

    engagementScore:
      clamp(nextEngagement),

    readinessScore:
      clamp(nextReadiness),
  };
}

// ------------------------------------------------------------
// LEAD QUALITY
// ------------------------------------------------------------

function calculateLeadQuality({
  validation,
  rules,
  positiveFactors,
  negativeFactors,
}) {
  const config =
    safeObject(
      rules?.lead_quality
    );

  const status =
    validation
      ?.validation_status ||
    "needs_review";

  if (status === "valid") {
    positiveFactors.push(
      "Lead passed deterministic validation."
    );

    return clamp(
      config
        .validation_valid ??
        100
    );
  }

  if (
    status ===
    "suspected_invalid"
  ) {
    negativeFactors.push(
      "Validation identified strong invalid/test/spam signals."
    );

    return clamp(
      config
        .validation_suspected_invalid ??
        0
    );
  }

  negativeFactors.push(
    "Lead requires validation review."
  );

  return clamp(
    config
      .validation_needs_review ??
      45
  );
}

// ------------------------------------------------------------
// BUSINESS SOLUTIONS FIT
// ------------------------------------------------------------

function calculateBusinessFit({
  lead,
  profile,
  rules,
  positiveFactors,
}) {
  const config =
    safeObject(
      rules?.fit
    );

  let earned = 0;
  let maximum = 0;

  function add(
    ruleName,
    condition,
    message
  ) {
    const points =
      Number(
        config[ruleName] ||
        0
      );

    maximum += points;

    if (condition) {
      earned += points;

      positiveFactors.push(
        message
      );
    }
  }

  const requirement =
    lead?.requirement ||
    lead?.title ||
    "";

  const productInterest =
    valueFromProfile(
      profile,
      "product_interest",
      "solution_interest",
      "project_type"
    );

  const organizationType =
    valueFromProfile(
      profile,
      "organization_type",
      "business_type",
      "institution_type"
    );

  const businessProblem =
    valueFromProfile(
      profile,
      "business_problem",
      "pain_point",
      "problem"
    );

  const currentSystem =
    valueFromProfile(
      profile,
      "current_system",
      "existing_system"
    );

  const numberOfUsers =
    valueFromProfile(
      profile,
      "number_of_users",
      "user_count",
      "users",
      "student_count"
    );

  const mustHaveFeatures =
    valueFromProfile(
      profile,
      "must_have_features",
      "required_features",
      "features"
    );

  const integrations =
    valueFromProfile(
      profile,
      "integrations",
      "integration_requirement"
    );

  const platform =
    valueFromProfile(
      profile,
      "platform_requirement",
      "platform"
    );

  const whiteLabel =
    valueFromProfile(
      profile,
      "white_label_requirement",
      "white_label"
    );

  const requirementSpecific =
    includesAny(
      requirement,
      [
        "lms",
        "crm",
        "erp",
        "hrms",
        "website",
        "software",
        "application",
        "app",
      ]
    );

  add(
    "product_interest_known",
    hasValue(productInterest) ||
      requirementSpecific,
    "Specific business solution requirement is known."
  );

  add(
    "organization_type_known",
    hasValue(
      organizationType
    ),
    "Organization type is known."
  );

  add(
    "business_problem_known",
    hasValue(
      businessProblem
    ),
    "Business problem or use case is known."
  );

  add(
    "current_system_known",
    hasValue(
      currentSystem
    ),
    "Current system/process is known."
  );

  add(
    "number_of_users_known",
    hasValue(
      numberOfUsers
    ),
    "Approximate user scale is known."
  );

  add(
    "must_have_features_known",
    hasValue(
      mustHaveFeatures
    ),
    "Required features are known."
  );

  add(
    "integration_requirement_known",
    hasValue(
      integrations
    ),
    "Integration requirements are known."
  );

  add(
    "platform_requirement_known",
    hasValue(
      platform
    ),
    "Platform requirement is known."
  );

  add(
    "white_label_requirement_known",
    hasValue(
      whiteLabel
    ),
    "White-label requirement is known."
  );

  return normalizedPoints(
    earned,
    maximum
  );
}

// ------------------------------------------------------------
// ADMISSIONS FIT
// ------------------------------------------------------------

function calculateAdmissionsFit({
  lead,
  profile,
  rules,
  positiveFactors,
}) {
  const config =
    safeObject(
      rules?.fit
    );

  let earned = 0;
  let maximum = 0;

  function add(
    ruleName,
    condition,
    message
  ) {
    const points =
      Number(
        config[ruleName] ||
        0
      );

    maximum += points;

    if (condition) {
      earned += points;

      positiveFactors.push(
        message
      );
    }
  }

  const requirement =
    lead?.requirement ||
    lead?.title ||
    "";

  const courseInterest =
    valueFromProfile(
      profile,
      "course_interest",
      "program_interest"
    );

  const education =
    valueFromProfile(
      profile,
      "educational_background",
      "education_background",
      "education"
    );

  const careerGoal =
    valueFromProfile(
      profile,
      "career_goal"
    );

  const location =
    valueFromProfile(
      profile,
      "location",
      "city"
    );

  const preferredMode =
    valueFromProfile(
      profile,
      "preferred_mode",
      "learning_mode"
    );

  const schedule =
    valueFromProfile(
      profile,
      "schedule_preference",
      "class_preference"
    );

  const graduation =
    valueFromProfile(
      profile,
      "graduation_status"
    );

  const specificCourse =
    includesAny(
      requirement,
      [
        "data science",
        "data analytics",
        "generative ai",
        "agentic ai",
        "machine learning",
        "python",
      ]
    );

  add(
    "course_interest_known",
    hasValue(
      courseInterest
    ) ||
      specificCourse,
    "Course interest is known."
  );

  add(
    "education_background_known",
    hasValue(education),
    "Educational background is known."
  );

  add(
    "career_goal_known",
    hasValue(careerGoal),
    "Career objective is known."
  );

  add(
    "location_known",
    hasValue(location),
    "Student location is known."
  );

  add(
    "preferred_mode_known",
    hasValue(
      preferredMode
    ),
    "Preferred learning mode is known."
  );

  add(
    "schedule_preference_known",
    hasValue(schedule),
    "Schedule preference is known."
  );

  add(
    "graduation_status_known",
    hasValue(graduation),
    "Graduation status is known."
  );

  return normalizedPoints(
    earned,
    maximum
  );
}

// ------------------------------------------------------------
// BUSINESS INTENT
// ------------------------------------------------------------

function calculateBusinessIntent({
  lead,
  customerText,
  rules,
  conversation,
  positiveFactors,
}) {
  const config =
    safeObject(
      rules?.intent
    );

  let earned = 0;
  let maximum = 0;

  function add(
    key,
    condition,
    message
  ) {
    const points =
      Number(
        config[key] || 0
      );

    maximum += points;

    if (condition) {
      earned += points;
      positiveFactors.push(
        message
      );
    }
  }

  const allText =
    `${lead?.requirement || ""} ${customerText}`;

  add(
    "specific_solution_requirement",
    includesAny(
      allText,
      [
        "lms",
        "crm",
        "erp",
        "hrms",
        "website",
        "software",
        "application",
      ]
    ),
    "Specific solution interest is present."
  );

  add(
    "asks_for_demo",
    includesAny(
      customerText,
      [
        "demo",
        "demonstration",
        "show me",
      ]
    ),
    "Prospect requested or discussed a demo."
  );

  add(
    "asks_for_proposal",
    includesAny(
      customerText,
      [
        "proposal",
        "quotation",
        "quote",
      ]
    ),
    "Prospect requested proposal/quotation information."
  );

  add(
    "asks_for_price",
    includesAny(
      customerText,
      [
        "price",
        "pricing",
        "cost",
        "budget",
        "charges",
      ]
    ),
    "Prospect showed pricing interest."
  );

  add(
    "asks_for_implementation",
    includesAny(
      customerText,
      [
        "implementation",
        "implement",
        "deployment",
        "go live",
      ]
    ),
    "Implementation intent is present."
  );

  add(
    "explicit_purchase_intent",
    includesAny(
      customerText,
      [
        "buy",
        "purchase",
        "want to proceed",
        "ready to proceed",
        "need this",
      ]
    ) ||
      conversation
        ?.human_handoff_required ===
        true,
    "Commercial buying intent is present."
  );

  return normalizedPoints(
    earned,
    maximum
  );
}

// ------------------------------------------------------------
// ADMISSIONS INTENT
// ------------------------------------------------------------

function calculateAdmissionsIntent({
  lead,
  customerText,
  rules,
  conversation,
  positiveFactors,
}) {
  const config =
    safeObject(
      rules?.intent
    );

  let earned = 0;
  let maximum = 0;

  function add(
    key,
    condition,
    message
  ) {
    const points =
      Number(
        config[key] || 0
      );

    maximum += points;

    if (condition) {
      earned += points;
      positiveFactors.push(
        message
      );
    }
  }

  const allText =
    `${lead?.requirement || ""} ${customerText}`;

  add(
    "specific_course_interest",
    includesAny(
      allText,
      [
        "data science",
        "data analytics",
        "generative ai",
        "agentic ai",
        "machine learning",
      ]
    ),
    "Specific course interest is present."
  );

  add(
    "asks_for_counselling",
    includesAny(
      customerText,
      [
        "counselling",
        "counseling",
        "counsellor",
        "counselor",
        "call me",
        "speak to",
      ]
    ),
    "Student requested counselling/contact."
  );

  add(
    "asks_about_fee_or_emi",
    includesAny(
      customerText,
      [
        "fee",
        "fees",
        "emi",
        "installment",
        "instalment",
        "cost",
        "price",
      ]
    ),
    "Student showed fee/EMI interest."
  );

  add(
    "asks_about_batch_or_start_date",
    includesAny(
      customerText,
      [
        "batch",
        "start date",
        "starting",
        "when does",
        "when can i join",
      ]
    ),
    "Student asked about joining/batch timing."
  );

  add(
    "asks_about_placement_or_career",
    includesAny(
      customerText,
      [
        "placement",
        "job",
        "career",
        "salary",
        "interview",
      ]
    ),
    "Student showed career/placement intent."
  );

  add(
    "explicit_joining_intent",
    includesAny(
      customerText,
      [
        "join",
        "enroll",
        "enrol",
        "admission",
        "want to start",
        "ready to join",
      ]
    ) ||
      conversation
        ?.human_handoff_required ===
        true,
    "Explicit joining intent is present."
  );

  return normalizedPoints(
    earned,
    maximum
  );
}

// ------------------------------------------------------------
// ENGAGEMENT
// ------------------------------------------------------------

function calculateEngagement({
  messages,
  profile,
  highValueFields,
  rules,
  conversation,
  positiveFactors,
}) {
  const config =
    safeObject(
      rules?.engagement
    );

  let earned = 0;
  let maximum = 0;

  function add(
    key,
    condition,
    message
  ) {
    const points =
      Number(
        config[key] || 0
      );

    maximum += points;

    if (condition) {
      earned += points;
      positiveFactors.push(
        message
      );
    }
  }

  const customerMessages =
    messages.filter(
      (message) =>
        message.role ===
        "customer"
    );

  const meaningfulResponses =
    customerMessages.filter(
      (message) =>
        cleanText(
          message.message_text
        ).length >= 10
    );

  const answeredHighValue =
    highValueFields.filter(
      (field) =>
        hasValue(
          profile[field]
        )
    ).length;

  add(
    "responded_to_ai",
    customerMessages.length >= 1,
    "Lead responded to AI discovery."
  );

  add(
    "multiple_meaningful_responses",
    meaningfulResponses.length >=
      2,
    "Lead provided multiple meaningful responses."
  );

  add(
    "answered_high_value_questions",
    answeredHighValue >= 2,
    "Lead supplied multiple high-value qualification facts."
  );

  add(
    "requested_human_contact",
    conversation
      ?.human_handoff_required ===
      true,
    "Lead is ready for human interaction."
  );

  return normalizedPoints(
    earned,
    maximum
  );
}

// ------------------------------------------------------------
// BUSINESS READINESS
// ------------------------------------------------------------

function calculateBusinessReadiness({
  profile,
  rules,
  positiveFactors,
}) {
  const config =
    safeObject(
      rules?.readiness
    );

  let earned = 0;
  let maximum = 0;

  function add(
    key,
    condition,
    message
  ) {
    const points =
      Number(
        config[key] || 0
      );

    maximum += points;

    if (condition) {
      earned += points;
      positiveFactors.push(
        message
      );
    }
  }

  const timeline =
    normalizeText(
      valueFromProfile(
        profile,
        "timeline"
      )
    );

  const budget =
    valueFromProfile(
      profile,
      "budget_range",
      "budget"
    );

  const authority =
    normalizeText(
      valueFromProfile(
        profile,
        "decision_authority",
        "authority"
      )
    );

  add(
    "timeline_known",
    hasValue(timeline),
    "Implementation timeline is known."
  );

  add(
    "timeline_within_30_days",
    includesAny(
      timeline,
      [
        "immediate",
        "immediately",
        "within 30 days",
        "1 month",
        "this month",
      ]
    ),
    "Implementation appears near-term."
  );

  add(
    "timeline_within_90_days",
    includesAny(
      timeline,
      [
        "2 months",
        "3 months",
        "60 days",
        "90 days",
      ]
    ),
    "Implementation is within roughly 90 days."
  );

  add(
    "budget_range_known",
    hasValue(budget),
    "Budget range is known."
  );

  add(
    "decision_authority_known",
    hasValue(authority),
    "Decision authority is known."
  );

  add(
    "decision_maker",
    includesAny(
      authority,
      [
        "decision maker",
        "decision-maker",
        "owner",
        "founder",
        "director",
        "head",
        "authorized",
      ]
    ),
    "Decision-maker involvement is present."
  );

  return normalizedPoints(
    earned,
    maximum
  );
}

// ------------------------------------------------------------
// ADMISSIONS READINESS
// ------------------------------------------------------------

function calculateAdmissionsReadiness({
  profile,
  customerText,
  rules,
  positiveFactors,
}) {
  const config =
    safeObject(
      rules?.readiness
    );

  let earned = 0;
  let maximum = 0;

  function add(
    key,
    condition,
    message
  ) {
    const points =
      Number(
        config[key] || 0
      );

    maximum += points;

    if (condition) {
      earned += points;
      positiveFactors.push(
        message
      );
    }
  }

  const joining =
    normalizeText(
      valueFromProfile(
        profile,
        "joining_timeline",
        "timeline"
      )
    );

  const feeReadiness =
    valueFromProfile(
      profile,
      "fee_readiness"
    );

  const counselling =
    valueFromProfile(
      profile,
      "counselling_interest"
    );

  add(
    "joining_timeline_known",
    hasValue(joining),
    "Joining timeline is known."
  );

  add(
    "joining_within_30_days",
    includesAny(
      joining,
      [
        "immediate",
        "this month",
        "within 30 days",
        "1 month",
      ]
    ),
    "Student appears ready to join soon."
  );

  add(
    "joining_within_90_days",
    includesAny(
      joining,
      [
        "2 months",
        "3 months",
        "60 days",
        "90 days",
      ]
    ),
    "Student has a defined near-term joining window."
  );

  add(
    "fee_readiness_known",
    hasValue(
      feeReadiness
    ),
    "Fee readiness is known."
  );

  add(
    "counselling_interest",
    hasValue(counselling) ||
      includesAny(
        customerText,
        [
          "counselling",
          "counseling",
          "call me",
          "speak to counsellor",
        ]
      ),
    "Student has counselling interest."
  );

  add(
    "decision_ready",
    includesAny(
      customerText,
      [
        "ready to join",
        "want to join",
        "want admission",
        "enroll",
        "enrol",
      ]
    ),
    "Student has expressed decision readiness."
  );

  return normalizedPoints(
    earned,
    maximum
  );
}

// ------------------------------------------------------------
// ROUTING
// ------------------------------------------------------------

function determineRouting({
  overallScore,
  validation,
  businessUnit,
  routingRules,
}) {
  const bands =
    safeObject(
      routingRules?.bands
    );

  // Strong validation failure overrides score.
  if (
    validation
      ?.validation_status ===
    "suspected_invalid"
  ) {
    const invalid =
      safeObject(
        bands.invalid
      );

    return {
      band: "invalid",
      route:
        invalid.route ||
        "quarantine",
      action:
        invalid.action ||
        "Review before routing.",
    };
  }

  if (
    businessUnit ===
    "unclassified"
  ) {
    const review =
      safeObject(
        bands.review
      );

    return {
      band: "review",
      route:
        review.route ||
        "human_review",
      action:
        "Classify this lead before commercial routing.",
    };
  }

  const ordered = [
    "hot",
    "warm",
    "nurture",
    "review",
  ];

  for (const name of ordered) {
    const config =
      safeObject(
        bands[name]
      );

    const threshold =
      Number(
        config.minimum_score
      );

    if (
      Number.isFinite(
        threshold
      ) &&
      overallScore >=
        threshold
    ) {
      return {
        band: name,
        route:
          config.route ||
          null,
        action:
          config.action ||
          null,
      };
    }
  }

  return {
    band: "review",
    route: "human_review",
    action:
      "Review lead information.",
  };
}

// ------------------------------------------------------------
// CONFIDENCE
// ------------------------------------------------------------

function calculateConfidence({
  validation,
  conversation,
  latestAssistant,
  profile,
  highValueFields,
}) {
  const validationConfidence =
    Number(
      validation
        ?.validation_confidence ||
        0
    );

  const aiConfidence =
    Number(
      latestAssistant
        ?.ai_confidence ||
        0
    );

  const knownHighValue =
    highValueFields.filter(
      (field) =>
        hasValue(
          profile[field]
        )
    ).length;

  const completeness =
    highValueFields.length
      ? (
          knownHighValue /
          highValueFields.length
        ) *
        100
      : 0;

  const conversationFactor =
    conversation
      ? Math.min(
          100,
          Number(
            conversation.interaction_count ||
              0
          ) * 20
        )
      : 0;

  const available = [
    validationConfidence,
    aiConfidence,
    completeness,
    conversationFactor,
  ].filter(
    (value) => value > 0
  );

  if (!available.length) {
    return 20;
  }

  return clamp(
    available.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / available.length
  );
}

// ------------------------------------------------------------
// HANDLER
// ------------------------------------------------------------

export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    res.setHeader(
      "Allow",
      "POST"
    );

    return res.status(405).json({
      error:
        "Method not allowed.",
    });
  }

  try {
    const {
      organization,
      supabase,
      crmUser,
    } =
      await authenticateCrmRequest(
        req
      );

    const body =
      getRequestBody(req);

    const leadId =
      cleanText(
        body?.lead_id ||
          body?.leadId,
        100
      );

    if (!leadId) {
      return res.status(400).json({
        error:
          "lead_id is required.",
      });
    }

    // Use the same scoring engine as public engagement events.
    // Set CRM_USE_SHARED_SCORING_ENGINE=false for immediate legacy fallback.
    if (
      process.env
        .CRM_USE_SHARED_SCORING_ENGINE !==
      "false"
    ) {
      const result =
        await scoreCrmLeadShared({
          supabase,
          organizationId:
            organization.id,
          leadId,
        });

      const score =
        result.score;

      return res.status(200).json({
        success: true,
        score,
        profile:
          result.profile
            ? {
                id:
                  result.profile.id,
                key:
                  result.profile
                    .profile_key,
                name:
                  result.profile
                    .profile_name,
                business_unit:
                  result.profile
                    .business_unit,
              }
            : null,
        routing:
          result.routing,
        intelligence: {
          overall_score:
            score?.overall_score ??
            null,
          lead_quality_score:
            score
              ?.lead_quality_score ??
            null,
          fit_score:
            score?.fit_score ??
            null,
          intent_score:
            score?.intent_score ??
            null,
          engagement_score:
            score
              ?.engagement_score ??
            null,
          readiness_score:
            score
              ?.readiness_score ??
            null,
          source_quality_score:
            score
              ?.source_quality_score ??
            null,
          economic_score:
            score
              ?.economic_score ??
            null,
          scoring_confidence:
            score
              ?.scoring_confidence ??
            null,
          missing_high_value_fields:
            score
              ?.missing_high_value_fields ||
            [],
        },
        economics: {
          connected: false,
          note:
            "Campaign spend, CPL, qualified-lead cost, CAC and ROAS are not connected yet and therefore do not affect this score.",
        },
        scored_by: {
          crm_user_id:
            crmUser.id,
          scoring_version:
            score?.scoring_version ||
            SCORING_VERSION,
          engine:
            "shared",
        },
      });
    }

    // ----------------------------------------------------------
    // LEAD
    // ----------------------------------------------------------

    const {
      data: lead,
      error: leadError,
    } = await supabase
      .from("crm_leads")
      .select("*")
      .eq(
        "organization_id",
        organization.id
      )
      .eq("id", leadId)
      .maybeSingle();

    if (leadError) {
      throw leadError;
    }

    if (!lead) {
      return res.status(404).json({
        error:
          "CRM lead not found.",
      });
    }

    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    const {
      data: validationRows,
      error: validationError,
    } = await supabase
      .from(
        "crm_lead_validations"
      )
      .select("*")
      .eq(
        "organization_id",
        organization.id
      )
      .eq(
        "lead_id",
        lead.id
      )
      .order(
        "updated_at",
        {
          ascending: false,
        }
      )
      .limit(1);

    if (validationError) {
      throw validationError;
    }

    const validation =
      validationRows?.[0] ||
      null;

    // ----------------------------------------------------------
    // CONVERSATION
    // ----------------------------------------------------------

    const {
      data: conversationRows,
      error:
        conversationError,
    } = await supabase
      .from(
        "crm_ai_conversations"
      )
      .select("*")
      .eq(
        "organization_id",
        organization.id
      )
      .eq(
        "lead_id",
        lead.id
      )
      .order(
        "updated_at",
        {
          ascending: false,
        }
      )
      .limit(1);

    if (conversationError) {
      throw conversationError;
    }

    const conversation =
      conversationRows?.[0] ||
      null;

    const businessUnit =
      determineBusinessUnit({
        conversation,
        validation,
      });

    // ----------------------------------------------------------
    // MESSAGES
    // ----------------------------------------------------------

    let messages = [];

    if (conversation?.id) {
      const {
        data: messageRows,
        error: messageError,
      } = await supabase
        .from("crm_ai_messages")
        .select(
          `
          id,
          role,
          message_text,
          extracted_facts,
          detected_intent,
          sentiment,
          buying_signals,
          objections,
          ai_confidence,
          created_at
          `
        )
        .eq(
          "organization_id",
          organization.id
        )
        .eq(
          "conversation_id",
          conversation.id
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        )
        .limit(100);

      if (messageError) {
        throw messageError;
      }

      messages =
        messageRows || [];
    }
// ----------------------------------------------------------
// BEHAVIORAL ENGAGEMENT EVENTS
// ----------------------------------------------------------

const {
  data: engagementEventRows,
  error: engagementEventError,
} = await supabase
  .from(
    "crm_engagement_events"
  )
  .select(
    `
    event_type,
    event_value,
    metadata,
    occurred_at
    `
  )
  .eq(
    "organization_id",
    organization.id
  )
  .eq(
    "lead_id",
    lead.id
  )
  .order(
    "occurred_at",
    {
      ascending: true,
    }
  )
  .limit(250);

if (engagementEventError) {
  throw engagementEventError;
}

const engagementEvents =
  engagementEventRows || [];

const behaviorSignals =
  buildBehaviorSignals(
    engagementEvents
  );
    const customerText =
      buildCustomerText(
        messages
      );

    const latestAssistant =
      [...messages]
        .reverse()
        .find(
          (message) =>
            message.role ===
            "assistant"
        ) || null;

    // ----------------------------------------------------------
    // PROFILE
    // ----------------------------------------------------------

    let scoringProfile =
      null;

    if (
      businessUnit !==
      "unclassified"
    ) {
      const {
        data,
        error,
      } = await supabase
        .from(
          "crm_scoring_profiles"
        )
        .select("*")
        .eq(
          "organization_id",
          organization.id
        )
        .eq(
          "business_unit",
          businessUnit
        )
        .eq(
          "is_active",
          true
        )
        .order(
          "updated_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      scoringProfile = data;
    }

    const rules =
      safeObject(
        scoringProfile
          ?.scoring_rules
      );

    const routingRules =
      safeObject(
        scoringProfile
          ?.routing_rules
      );

    const weights =
      safeObject(
        rules.weights
      );

    const extractedProfile =
      safeObject(
        conversation
          ?.extracted_profile
      );

    const highValueFields =
      safeArray(
        rules.high_value_fields
      );

    const positiveFactors = [];
    const negativeFactors = [];

    // ----------------------------------------------------------
    // COMPONENT SCORES
    // ----------------------------------------------------------

    const leadQualityScore =
      calculateLeadQuality({
        validation,
        rules,
        positiveFactors,
        negativeFactors,
      });

    let fitScore = 0;
    let intentScore = 0;
    let readinessScore = 0;

    if (
      businessUnit ===
      "business_solutions"
    ) {
      fitScore =
        calculateBusinessFit({
          lead,
          profile:
            extractedProfile,
          rules,
          positiveFactors,
        });

      intentScore =
        calculateBusinessIntent({
          lead,
          customerText,
          rules,
          conversation,
          positiveFactors,
        });

      readinessScore =
        calculateBusinessReadiness({
          profile:
            extractedProfile,
          rules,
          positiveFactors,
        });
    }

    if (
      businessUnit ===
      "admissions"
    ) {
      fitScore =
        calculateAdmissionsFit({
          lead,
          profile:
            extractedProfile,
          rules,
          positiveFactors,
        });

      intentScore =
        calculateAdmissionsIntent({
          lead,
          customerText,
          rules,
          conversation,
          positiveFactors,
        });

      readinessScore =
        calculateAdmissionsReadiness({
          profile:
            extractedProfile,
          customerText,
          rules,
          positiveFactors,
        });
    }

    let engagementScore =
      calculateEngagement({
        messages,
        profile:
          extractedProfile,
        highValueFields,
        rules,
        conversation,
        positiveFactors,
      });

// ----------------------------------------------------------
// APPLY REAL BEHAVIORAL EVIDENCE
// ----------------------------------------------------------

const behavioralScores =
  applyBehavioralScoreAdjustments({
    intentScore,
    engagementScore,
    readinessScore,
    behaviorSignals,
    rules,
    positiveFactors,
  });

intentScore =
  behavioralScores.intentScore;

engagementScore =
  behavioralScores.engagementScore;

readinessScore =
  behavioralScores.readinessScore;

    // ----------------------------------------------------------
    // REAL ECONOMICS NOT CONNECTED YET
    // ----------------------------------------------------------

    const sourceQualityScore =
      0;

    const economicScore =
      0;

    // ----------------------------------------------------------
    // WEIGHTED SCORE
    // ----------------------------------------------------------

    const leadQualityWeight =
      Number(
        weights.lead_quality ||
          0
      );

    const fitWeight =
      Number(
        weights.fit || 0
      );

    const intentWeight =
      Number(
        weights.intent || 0
      );

    const engagementWeight =
      Number(
        weights.engagement ||
          0
      );

    const readinessWeight =
      Number(
        weights.readiness ||
          0
      );

    const totalWeight =
      leadQualityWeight +
      fitWeight +
      intentWeight +
      engagementWeight +
      readinessWeight;

    let overallScore =
      totalWeight > 0
        ? (
            leadQualityScore *
              leadQualityWeight +
            fitScore *
              fitWeight +
            intentScore *
              intentWeight +
            engagementScore *
              engagementWeight +
            readinessScore *
              readinessWeight
          ) /
          totalWeight
        : 0;

    // ----------------------------------------------------------
    // DETERMINISTIC NEGATIVE SIGNALS
    // ----------------------------------------------------------

    if (
      validation
        ?.test_signal === true
    ) {
      negativeFactors.push(
        "Test-like lead signal detected."
      );
    }

    if (
      validation
        ?.duplicate_status ===
        "exact" &&
      messages.filter(
        (message) =>
          message.role ===
          "customer"
      ).length === 0
    ) {
      overallScore -= 10;

      negativeFactors.push(
        "Exact duplicate exists without new engagement evidence."
      );
    }

    if (
      validation
        ?.validation_status ===
      "suspected_invalid"
    ) {
      overallScore = 0;
    }

    overallScore =
      clamp(overallScore);

    // ----------------------------------------------------------
    // MISSING HIGH VALUE FIELDS
    // ----------------------------------------------------------

    const missingHighValueFields =
      highValueFields.filter(
        (field) =>
          !hasValue(
            extractedProfile[
              field
            ]
          )
      );

    // ----------------------------------------------------------
    // CONFIDENCE
    // ----------------------------------------------------------

    const scoringConfidence =
      calculateConfidence({
        validation,
        conversation,
        latestAssistant,
        profile:
          extractedProfile,
        highValueFields,
      });

    // ----------------------------------------------------------
    // ROUTING
    // ----------------------------------------------------------

    const routing =
      determineRouting({
        overallScore,
        validation,
        businessUnit,
        routingRules,
      });

    // ----------------------------------------------------------
    // SCORE BREAKDOWN
    // ----------------------------------------------------------

    const scoreBreakdown = {
      version:
        SCORING_VERSION,

      profile_key:
        scoringProfile
          ?.profile_key ||
        null,
      
        behavioral_evidence: {
  demo_offered:
    behaviorSignals.demo_offered,

  demo_accepted:
    behaviorSignals.demo_accepted,

  demo_video_progress:
    behaviorSignals.demo_video_progress,

  demo_video_completed:
    behaviorSignals.demo_video_completed,

  live_demo_requested:
    behaviorSignals.live_demo_requested,

  live_demo_declined:
    behaviorSignals.live_demo_declined,

  ai_followup_replied:
    behaviorSignals.ai_followup_replied,

  ai_call_connected:
    behaviorSignals.ai_call_connected,

  ai_call_completed:
    behaviorSignals.ai_call_completed,

  ai_callback_requested:
    behaviorSignals.ai_callback_requested,
},

      weights: {
        lead_quality:
          leadQualityWeight,

        fit:
          fitWeight,

        intent:
          intentWeight,

        engagement:
          engagementWeight,

        readiness:
          readinessWeight,
      },

      scores: {
        lead_quality:
          leadQualityScore,

        fit:
          fitScore,

        intent:
          intentScore,

        engagement:
          engagementScore,

        readiness:
          readinessScore,

        source_quality:
          sourceQualityScore,

        economic:
          economicScore,
      },

      economics_connected:
        false,
    };

    const now =
      new Date().toISOString();

    const scoreRow = {
      organization_id:
        organization.id,

      lead_id:
        lead.id,

      scoring_profile_id:
        scoringProfile?.id ||
        null,

      scoring_version:
        SCORING_VERSION,

      business_unit:
        businessUnit,

      overall_score:
        overallScore,

      lead_quality_score:
        leadQualityScore,

      fit_score:
        fitScore,

      intent_score:
        intentScore,

      engagement_score:
        engagementScore,

      readiness_score:
        readinessScore,

      source_quality_score:
        sourceQualityScore,

      economic_score:
        economicScore,

      scoring_confidence:
        scoringConfidence,

      routing_band:
        routing.band,

      recommended_route:
        routing.route,

      recommended_action:
        routing.action,

      score_breakdown:
        scoreBreakdown,

      positive_factors:
        unique(
          positiveFactors
        ),

      negative_factors:
        unique(
          negativeFactors
        ),

      missing_high_value_fields:
        missingHighValueFields,

      validation_status:
        validation
          ?.validation_status ||
        null,

      qualification_status:
        conversation
          ?.qualification_ready
          ? "ready"
          : "discovering",

      conversation_status:
        conversation?.status ||
        null,

      interaction_count:
        Number(
          conversation
            ?.interaction_count ||
            0
        ),

      source:
        lead.source || null,

      medium:
        lead.medium || null,

      campaign:
        lead.campaign ||
        null,

      calculated_at:
        now,

      updated_at:
        now,
    };

    // ----------------------------------------------------------
    // SAVE SCORE
    // ----------------------------------------------------------

    const {
      data: savedScore,
      error: saveError,
    } = await supabase
      .from(
        "crm_lead_scores"
      )
      .upsert(
        scoreRow,
        {
          onConflict:
            "lead_id,scoring_version",
        }
      )
      .select("*")
      .single();

    if (saveError) {
      console.error(
        "CRM dynamic score save failed:",
        saveError
      );

      throw saveError;
    }

    // ----------------------------------------------------------
    // SAFE RESPONSE
    // ----------------------------------------------------------

    return res.status(200).json({
      success: true,

      score:
        savedScore,

      profile:
        scoringProfile
          ? {
              id:
                scoringProfile.id,

              key:
                scoringProfile.profile_key,

              name:
                scoringProfile.profile_name,

              business_unit:
                scoringProfile.business_unit,
            }
          : null,

      routing,

      intelligence: {
        overall_score:
          overallScore,

        lead_quality_score:
          leadQualityScore,

        fit_score:
          fitScore,

        intent_score:
          intentScore,

        engagement_score:
          engagementScore,

        readiness_score:
          readinessScore,

        source_quality_score:
          sourceQualityScore,

        economic_score:
          economicScore,

        scoring_confidence:
          scoringConfidence,

        missing_high_value_fields:
          missingHighValueFields,
      },

      economics: {
        connected: false,

        note:
          "Campaign spend, CPL, qualified-lead cost, CAC and ROAS are not connected yet and therefore do not affect this score.",
      },

      scored_by: {
        crm_user_id:
          crmUser.id,

        scoring_version:
          SCORING_VERSION,
      },
    });
  } catch (error) {
    console.error(
      "CRM dynamic scoring error:",
      error
    );

    return sendCrmError(
      res,
      error
    );
  }
}
