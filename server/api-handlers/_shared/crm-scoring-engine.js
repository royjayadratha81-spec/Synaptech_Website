// api/_shared/crm-scoring-engine.js
//
// Shared deterministic CRM scoring engine.
//
// Used by:
// - authenticated CRM scoring endpoint
// - public engagement orchestration
//
// IMPORTANT:
// - Does NOT authenticate requests
// - Does NOT expose Supabase secrets
// - Does NOT modify synaptech_leads
// - Does NOT modify LMS/Admin
// - Does NOT create opportunities
// - Only calculates and stores CRM lead scoring

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

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function isValidationDisqualified(validation) {
  return (
    validation?.validation_status ===
      "suspected_invalid" ||
    validation?.test_signal === true
  );
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
    (earned / maximum) * 100
  );
}
function calculateScoringConfidence({
  highValueFields,
  extractedProfile,
  validation,
  messages,
}) {
  const fields =
    safeArray(highValueFields);

  const profile =
    safeObject(extractedProfile);

  if (!fields.length) {
    return 0;
  }

  const knownFields =
    fields.filter((field) =>
      hasValue(profile[field])
    ).length;

  const fieldCoverage =
    (knownFields / fields.length) * 100;

  const validationStatus =
    validation?.validation_status ||
    "needs_review";

  let validationConfidence = 45;

  if (validationStatus === "valid") {
    validationConfidence = 100;
  } else if (
    isValidationDisqualified(
      validation
    )
  ) {
    validationConfidence = 0;
  }

  const customerMessages =
    safeArray(messages).filter(
      (message) =>
        message?.role === "customer" &&
        cleanText(
          message?.message_text
        ).length >= 3
    );

  let engagementConfidence = 0;

  if (customerMessages.length >= 1) {
    engagementConfidence = 40;
  }

  if (customerMessages.length >= 3) {
    engagementConfidence = 70;
  }

  if (customerMessages.length >= 5) {
    engagementConfidence = 100;
  }

  const confidence =
    fieldCoverage * 0.7 +
    validationConfidence * 0.2 +
    engagementConfidence * 0.1;

  return clamp(confidence);
}

function buildCustomerText(
  messages
) {
  return safeArray(messages)
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
// BEHAVIORAL EVENTS
// ------------------------------------------------------------

function buildBehaviorSignals(events) {
  const eventTypes = new Set(
    safeArray(events)
      .map((event) =>
        cleanText(
          event?.event_type,
          100
        )
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

  if (
    has("demo_video_completed")
  ) {
    videoProgress = 100;
  }

  return {
    demo_offered:
      has("demo_offered"),

    demo_accepted:
      has("demo_accepted"),

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


// ------------------------------------------------------------
// COMPONENT CALCULATORS
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
      config.validation_valid ??
        100
    );
  }

  if (
    isValidationDisqualified(
      validation
    )
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
        config[ruleName] || 0
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
        config[ruleName] || 0
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
    hasValue(courseInterest) ||
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
    "graduation_status_known",
    hasValue(graduation),
    "Graduation status is known."
  );

  return normalizedPoints(
    earned,
    maximum
  );
}


function calculateBusinessIntent({
  lead,
  customerText,
  rules,
  conversation,
  profile,
  positiveFactors,
}) {
  const config =
    safeObject(
      rules?.intent
    );

  const commercial =
  safeObject(profile);

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

  const workOrderIntent =
    cleanText(
      commercial.work_order_intent
    ).toLowerCase();

  const decisionAuthority =
    cleanText(
      commercial.decision_authority
    ).toLowerCase();

  const catalogueResponse =
    cleanText(
      commercial.catalogue_response
    ).toLowerCase();

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
    ) ||
      hasValue(
        commercial.product_interest
      ) ||
      hasValue(
        profile.must_have_features
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
    ) ||
      profile.demo_requested === true ||
      profile.live_demo_requested === true,
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
    ) ||
      profile.proposal_interest === true ||
      profile.quotation_requested === true,
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
    ) ||
      hasValue(
        profile.budget_range
      ) ||
      hasValue(
        profile.billing_preference
      ) ||
      profile.annual_subscription_interest ===
        true,
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
    ) ||
      hasValue(
        profile.go_live_timeline
      ) ||
      hasValue(
        profile.desired_go_live_date
      ) ||
      hasValue(
        profile.implementation_urgency
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
        "work order",
      ]
    ) ||
      [
        "ready",
        "proceed",
        "interested",
        "work_order_ready",
      ].includes(
        workOrderIntent
      ) ||
      profile.proposal_interest ===
        true ||
      profile.quotation_requested ===
        true ||
      profile.decision_maker ===
        true ||
      includesAny(
        decisionAuthority,
        [
          "final decision maker",
          "decision maker",
          "authorized",
        ]
      ) ||
      includesAny(
        catalogueResponse,
        [
          "send",
          "catalogue",
          "whatsapp",
          "email",
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
    safeArray(messages).filter(
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
    safeArray(highValueFields)
      .filter(
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
    meaningfulResponses.length >= 2,
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


function calculateBusinessReadiness({
  profile,
  rules,
  positiveFactors,
}) {
  const config =
    safeObject(
      rules?.readiness
    );

  const commercial =
    safeObject(profile);

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
        commercial,
        "timeline",
        "go_live_timeline",
        "implementation_timeline"
      )
    );

  const budget =
    valueFromProfile(
      commercial,
      "budget_range",
      "budget"
    );

  const billingPreference =
    normalizeText(
      valueFromProfile(
        commercial,
        "billing_preference"
      )
    );

  const authority =
    normalizeText(
      valueFromProfile(
        commercial,
        "decision_authority",
        "authority"
      )
    );

  const decisionProcess =
    valueFromProfile(
      commercial,
      "decision_process"
    );

  const workOrderIntent =
    normalizeText(
      valueFromProfile(
        commercial,
        "work_order_intent"
      )
    );

  const proposalInterest =
    commercial
      .proposal_interest === true;

  const quotationRequested =
    commercial
      .quotation_requested === true;

  const decisionMaker =
    commercial
      .decision_maker === true;

  const annualSubscriptionInterest =
    commercial
      .annual_subscription_interest ===
      true;

  const whatsappConsent =
    commercial
      .whatsapp_consent === true;

  const aiCallConsent =
    commercial
      .ai_call_consent === true;

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
        "within 1–3 months",
        "within 1-3 months",
        "1–3 months",
        "1-3 months",
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
    "Budget or commercial pricing preference is known."
  );

  add(
    "decision_authority_known",
    hasValue(authority) ||
      decisionMaker,
    "Decision authority is known."
  );

  add(
    "decision_maker",
    decisionMaker ||
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
          "final decision maker",
        ]
      ),
    "Decision-maker involvement is present."
  );

  add(
    "decision_process_known",
    hasValue(
      decisionProcess
    ),
    "Decision and approval process is known."
  );

  add(
    "commercial_model_known",
    hasValue(
      billingPreference
    ),
    "Preferred commercial or billing model is known."
  );

  add(
    "annual_subscription_interest",
    annualSubscriptionInterest,
    "Prospect showed interest in an annual subscription."
  );

  add(
    "proposal_or_quotation_interest",
    proposalInterest ||
      quotationRequested,
    "Prospect requested or showed interest in a commercial proposal."
  );

  add(
    "work_order_readiness",
    [
      "ready",
      "after_demo",
      "after_proposal",
    ].includes(
      workOrderIntent
    ),
    "Prospect expressed readiness to progress toward a work order."
  );

  add(
    "follow_up_permission",
    whatsappConsent ||
      aiCallConsent,
    "Prospect gave permission for AI-assisted commercial follow-up."
  );

  return normalizedPoints(
    earned,
    maximum
  );
}


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

  const decisionAuthorityStatus = normalizeText(
    valueFromProfile(profile, "decision_authority_status")
  );

  const paymentPreference = valueFromProfile(
    profile,
    "payment_preference"
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
    hasValue(feeReadiness) || hasValue(paymentPreference),
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
      `${customerText} ${decisionAuthorityStatus}`,
      [
        "ready to join",
        "want to join",
        "want admission",
        "enroll",
        "enrol",
        "yes",
        "agreed",
        "agreement",
      ]
    ),
    "Student has expressed decision readiness."
  );

  return normalizedPoints(
    earned,
    maximum
  );
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

  const progress =
    Number(
      behaviorSignals
        .demo_video_progress || 0
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

  if (
    isValidationDisqualified(
      validation
    )
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
// MAIN SHARED SCORING FUNCTION
// ------------------------------------------------------------

export async function scoreCrmLead({
  supabase,
  organizationId,
  leadId,
  scoringVersion = "v1",
}) {
  if (
    !supabase ||
    !organizationId ||
    !leadId
  ) {
    throw new Error(
      "Scoring context is incomplete."
    );
  }

  const {
    data: lead,
    error: leadError,
  } = await supabase
    .from("crm_leads")
    .select("*")
    .eq(
      "organization_id",
      organizationId
    )
    .eq(
      "id",
      leadId
    )
    .maybeSingle();

  if (leadError) {
    throw leadError;
  }

  if (!lead) {
    throw new Error(
      "CRM lead not found."
    );
  }

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
      organizationId
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
    validationRows?.[0] || null;

  const {
    data: conversationRows,
    error: conversationError,
  } = await supabase
    .from(
      "crm_ai_conversations"
    )
    .select("*")
    .eq(
      "organization_id",
      organizationId
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

  let messages = [];

  if (conversation?.id) {
    const {
      data: messageRows,
      error: messageError,
    } = await supabase
      .from("crm_ai_messages")
      .select(`
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
      `)
      .eq(
        "organization_id",
        organizationId
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

  const {
    data: engagementEvents,
    error: engagementError,
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
      organizationId
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

  if (engagementError) {
    throw engagementError;
  }

  const behaviorSignals =
    buildBehaviorSignals(
      engagementEvents || []
    );

  const customerText =
    buildCustomerText(
      messages
    );

    // ----------------------------------------------------------
// STRUCTURED COMMERCIAL QUALIFICATION FACTS
// ----------------------------------------------------------

let commercialFacts = null;

if (
  businessUnit ===
  "business_solutions"
) {
  const {
    data: commercialFactRow,
    error: commercialFactsError,
  } = await supabase
    .from(
      "crm_commercial_qualification_facts"
    )
    .select("*")
    .eq(
      "organization_id",
      organizationId
    )
    .eq(
      "lead_id",
      lead.id
    )
    .eq(
      "business_unit",
      "business_solutions"
    )
    .maybeSingle();

  if (commercialFactsError) {
    throw commercialFactsError;
  }

  commercialFacts =
    commercialFactRow || null;
}
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
        organizationId
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

  const conversationProfile =
  safeObject(
    conversation
      ?.extracted_profile
  );

const structuredCommercialFacts =
  safeObject(
    commercialFacts
  );

const extractedProfile = {
  ...conversationProfile,

  ...structuredCommercialFacts,

  // --------------------------------------------------------
  // CANONICAL BUSINESS-SOLUTIONS MAPPINGS
  // --------------------------------------------------------
  //
  // The scoring profile already understands canonical keys
  // such as product_interest, number_of_users and timeline.
  // Map the richer follow-up facts onto those keys without
  // deleting the original structured fields.

  product_interest:
    conversationProfile
      .product_interest ||
    structuredCommercialFacts
      .package_interest ||
    conversationProfile
      .solution_interest ||
    null,

  business_problem:
    structuredCommercialFacts
      .business_problem ||
    conversationProfile
      .business_problem ||
    conversationProfile
      .pain_point ||
    conversationProfile
      .problem ||
    null,

  current_system:
    structuredCommercialFacts
      .current_system ||
    conversationProfile
      .current_system ||
    conversationProfile
      .existing_system ||
    null,

  number_of_users:
    structuredCommercialFacts
      .monthly_active_users ??
    structuredCommercialFacts
      .annual_users ??
    conversationProfile
      .number_of_users ??
    conversationProfile
      .user_count ??
    conversationProfile
      .student_count ??
    null,

  must_have_features:
    (
      Array.isArray(
        structuredCommercialFacts
          .must_have_features
      ) &&
      structuredCommercialFacts
        .must_have_features.length
    )
      ? structuredCommercialFacts
          .must_have_features
      : conversationProfile
          .must_have_features ||
        conversationProfile
          .required_features ||
        null,

  integrations:
    (
      Array.isArray(
        structuredCommercialFacts
          .integration_requirements
      ) &&
      structuredCommercialFacts
        .integration_requirements.length
    )
      ? structuredCommercialFacts
          .integration_requirements
      : conversationProfile
          .integrations ||
        conversationProfile
          .integration_requirement ||
        null,

  timeline:
    structuredCommercialFacts
      .go_live_timeline ||
    structuredCommercialFacts
      .desired_go_live_date ||
    conversationProfile
      .timeline ||
    null,

  budget_range:
    structuredCommercialFacts
      .budget_range ||
    conversationProfile
      .budget_range ||
    conversationProfile
      .budget ||
    null,

  decision_authority:
    structuredCommercialFacts
      .decision_authority ||
    conversationProfile
      .decision_authority ||
    conversationProfile
      .authority ||
    null,

  decision_process:
    structuredCommercialFacts
      .decision_process ||
    conversationProfile
      .decision_process ||
    null,
};

  const highValueFields = businessUnit === "admissions"
    ? [...new Set([
        ...safeArray(rules.high_value_fields),
        "course_interest",
        "joining_timeline",
        "decision_authority",
        "decision_authority_status",
        "payment_preference",
        "placement_support_required",
        "coding_math_confidence",
        "career_roles_interest",
        "project_learning_interest",
        "laptop_readiness",
      ])]
    : safeArray(rules.high_value_fields);

  const positiveFactors = [];
  const negativeFactors = [];

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
    profile:
      extractedProfile,
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

  const leadQualityWeight =
    Number(
      weights.lead_quality || 0
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
      weights.engagement || 0
    );

  const readinessWeight =
    Number(
      weights.readiness || 0
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

  if (
    isValidationDisqualified(
      validation
    )
  ) {
    overallScore = 0;
  }

  overallScore =
    clamp(overallScore);

  const missingHighValueFields =
    highValueFields.filter(
      (field) =>
        !hasValue(
          extractedProfile[field]
        )
    );
    const scoringConfidence =
  calculateScoringConfidence({
    highValueFields,
    extractedProfile,
    validation,
    messages,
  });

  const routing =
    determineRouting({
      overallScore,
      validation,
      businessUnit,
      routingRules,
    });

  const scoreBreakdown = {
    version:
      scoringVersion,

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
        behaviorSignals
          .demo_video_progress,

      demo_video_completed:
        behaviorSignals
          .demo_video_completed,

      live_demo_requested:
        behaviorSignals
          .live_demo_requested,

      live_demo_declined:
        behaviorSignals
          .live_demo_declined,

      ai_followup_replied:
        behaviorSignals
          .ai_followup_replied,

      ai_call_connected:
        behaviorSignals
          .ai_call_connected,

      ai_call_completed:
        behaviorSignals
          .ai_call_completed,

      ai_callback_requested:
        behaviorSignals
          .ai_callback_requested,
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

  scoring_confidence:
    scoringConfidence,

  source_quality: 0,

  economic: 0,
},

    economics_connected:
      false,
  };

  const now =
    new Date().toISOString();

  const scoreRow = {
    organization_id:
      organizationId,

    lead_id:
      lead.id,

    scoring_profile_id:
      scoringProfile?.id ||
      null,

    scoring_version:
      scoringVersion,

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

scoring_confidence:
  scoringConfidence,

source_quality_score:
  0,

    economic_score:
      0,

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
          ?.interaction_count || 0
      ),

    source:
      lead.source || null,

    medium:
      lead.medium || null,

    campaign:
      lead.campaign || null,

    calculated_at:
      now,

    updated_at:
      now,
  };

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
    throw saveError;
  }

  return {
    score:
      savedScore,

    routing,

    behaviorSignals,

    businessUnit,

    profile:
      scoringProfile,
  };
}
