// api/_shared/crm-qualification-engine.js
//
// Shared deterministic CRM qualification engine.
//
// Used by:
// - authenticated CRM qualification endpoint
// - public engagement orchestration
// - behavioural engagement event orchestration
//
// IMPORTANT:
// - Does NOT authenticate requests
// - Does NOT expose Supabase secrets
// - Does NOT modify synaptech_leads
// - Does NOT modify LMS/Admin
// - Does NOT create opportunities
// - Does NOT invent missing customer facts
// - Uses deterministic gates over stored CRM evidence

const QUALIFICATION_VERSION = "v1";

// ------------------------------------------------------------
// HELPERS
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

function hasValue(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return false;
  }

  if (typeof value === "string") {
    const normalized =
      normalizeText(value);

    return (
      normalized !== "" &&
      normalized !== "unknown" &&
      normalized !== "none" &&
      normalized !== "null" &&
      normalized !== "n/a" &&
      normalized !== "not sure"
    );
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function includesAny(text, terms) {
  const normalized =
    normalizeText(text);

  return terms.some((term) =>
    normalized.includes(
      normalizeText(term)
    )
  );
}

function unique(values) {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ];
}

// ------------------------------------------------------------
// BUSINESS UNIT
// ------------------------------------------------------------

function determineBusinessUnit({
  conversation,
  validation,
  score,
}) {
  const candidates = [
    conversation?.business_unit,
    validation?.business_unit,
    score?.business_unit,
  ];

  for (const value of candidates) {
    if (
      value === "admissions" ||
      value === "business_solutions"
    ) {
      return value;
    }
  }

  return "unclassified";
}

// ------------------------------------------------------------
// QUALIFICATION FIELD DEFINITIONS
// ------------------------------------------------------------

const BUSINESS_CRITICAL_FIELDS = [
  "business_problem",
  "timeline",
];

const BUSINESS_IMPORTANT_FIELDS = [
  "product_interest",
  "organization_type",
  "current_system",
  "number_of_users",
  "must_have_features",
  "integrations",
  "budget_range",
  "decision_authority",
  "decision_process",
];

const ADMISSIONS_CRITICAL_FIELDS = [
  "course_interest",
  "joining_timeline",
];

const ADMISSIONS_IMPORTANT_FIELDS = [
  "educational_background",
  "graduation_status",
  "advanced_programme_guidance",
  "location",
  "preferred_mode",
  "career_goal",
  "coding_math_confidence",
  "career_roles_interest",
  "project_learning_interest",
  "laptop_readiness",
  "placement_support_required",
  "decision_authority",
  "decision_authority_status",
  "payment_preference",
  "counselling_interest",
  "fee_readiness",
];

function getFieldConfig(
  businessUnit
) {
  if (
    businessUnit ===
    "business_solutions"
  ) {
    return {
      critical:
        BUSINESS_CRITICAL_FIELDS,
      important:
        BUSINESS_IMPORTANT_FIELDS,
    };
  }

  if (
    businessUnit ===
    "admissions"
  ) {
    return {
      critical:
        ADMISSIONS_CRITICAL_FIELDS,
      important:
        ADMISSIONS_IMPORTANT_FIELDS,
    };
  }

  return {
    critical: [],
    important: [],
  };
}

// ------------------------------------------------------------
// COMPLETENESS
// ------------------------------------------------------------

function calculateCompleteness({
  profile,
  criticalFields,
  importantFields,
}) {
  const allFields = [
    ...criticalFields,
    ...importantFields,
  ];

  if (!allFields.length) {
    return 0;
  }

  const known =
    allFields.filter(
      (field) =>
        hasValue(profile[field])
    ).length;

  return clamp(
    (known / allFields.length) *
      100
  );
}

// ------------------------------------------------------------
// HANDOFF INTENT
// ------------------------------------------------------------

function determineHandoffIntent({
  businessUnit,
  profile,
  customerText,
  conversation,
  engagementEvents = [],
}) {
  const normalized =
    normalizeText(customerText);
    // ----------------------------------------------------------
// EXPLICIT HANDOFF EVIDENCE FROM ENGAGEMENT EVENTS
// ----------------------------------------------------------

const handoffEvents =
  engagementEvents
    .filter((event) =>
      [
        "live_demo_requested",
        "live_demo_declined",
        "ai_callback_requested",
        "human_call_completed",
      ].includes(
        event?.event_type
      )
    )
    .sort(
      (a, b) =>
        new Date(
          a?.occurred_at || 0
        ).getTime() -
        new Date(
          b?.occurred_at || 0
        ).getTime()
    );

const latestHandoffEvent =
  handoffEvents.length
    ? handoffEvents[
        handoffEvents.length - 1
      ]
    : null;

if (
  latestHandoffEvent
    ?.event_type ===
  "live_demo_requested"
) {
  return {
    intent: "requested",
    channel: "demo",
    evidence:
      "Prospect explicitly requested contact for a personalised live demo.",
  };
}

if (
  latestHandoffEvent
    ?.event_type ===
  "ai_callback_requested"
) {
  return {
    intent: "requested",
    channel: "phone",
    evidence:
      "Prospect explicitly requested a callback during AI engagement.",
  };
}

if (
  latestHandoffEvent
    ?.event_type ===
  "live_demo_declined"
) {
  return {
    intent: "declined",
    channel: "demo",
    evidence:
      "Prospect declined immediate live-demo contact.",
  };
}

  const declinedTerms = [
    "not interested",
    "do not call",
    "don't call",
    "no demo",
    "not now",
    "maybe later",
    "only researching",
    "just researching",
    "not planning to buy",
    "not planning to join",
    "not ready",
  ];

  if (
    includesAny(
      normalized,
      declinedTerms
    )
  ) {
    return {
      intent: "declined",
      channel: null,
      evidence:
        "Prospect declined or deferred human follow-up.",
    };
  }

  if (
    businessUnit ===
    "business_solutions"
  ) {
    if (
      includesAny(
        normalized,
        [
          "book a demo",
          "arrange a demo",
          "schedule a demo",
          "want a demo",
          "need a demo",
          "show me demo",
          "demo please",
        ]
      )
    ) {
      return {
        intent: "requested",
        channel: "demo",
        evidence:
          "Prospect explicitly requested a demo.",
      };
    }

    if (
      includesAny(
        normalized,
        [
          "call me",
          "contact me",
          "speak to you",
          "speak with you",
          "talk over phone",
          "phone discussion",
          "discuss over phone",
          "schedule a call",
        ]
      )
    ) {
      return {
        intent: "requested",
        channel: "phone",
        evidence:
          "Prospect explicitly requested human contact.",
      };
    }

    if (
      includesAny(
        normalized,
        [
          "send proposal",
          "send quotation",
          "send quote",
          "want proposal",
          "want quotation",
          "ready to discuss",
          "want to proceed",
          "ready to proceed",
        ]
      )
    ) {
      return {
        intent: "accepted",
        channel: "phone",
        evidence:
          "Prospect expressed explicit commercial follow-up intent.",
      };
    }
  }

  if (
    businessUnit ===
    "admissions"
  ) {
    if (
      includesAny(
        normalized,
        [
          "call me",
          "counsellor",
          "counselor",
          "counselling",
          "counseling",
          "speak to counsellor",
          "speak to counselor",
          "want counselling",
          "need counselling",
        ]
      )
    ) {
      return {
        intent: "requested",
        channel: "counselling",
        evidence:
          "Student explicitly requested counselling/contact.",
      };
    }

    if (
      includesAny(
        normalized,
        [
          "want to join",
          "ready to join",
          "want admission",
          "ready for admission",
          "want to enroll",
          "want to enrol",
          "ready to enroll",
          "ready to enrol",
        ]
      )
    ) {
      return {
        intent: "accepted",
        channel: "counselling",
        evidence:
          "Student expressed explicit joining intent.",
      };
    }
  }

  if (
    conversation
      ?.human_handoff_required ===
    true
  ) {
    return {
      intent: "accepted",
      channel:
        businessUnit ===
        "admissions"
          ? "counselling"
          : "phone",
      evidence:
        "AI conversation marked human handoff as appropriate.",
    };
  }

  const profileHandoff =
    profile?.handoff_intent;

  if (
    [
      "requested",
      "accepted",
      "undecided",
      "declined",
    ].includes(profileHandoff)
  ) {
    return {
      intent: profileHandoff,
      channel:
        profile?.handoff_channel ||
        null,
      evidence:
        "Handoff preference was previously captured.",
    };
  }

  return {
    intent: "not_asked",
    channel: null,
    evidence: null,
  };
}

// ------------------------------------------------------------
// DISQUALIFIERS
// ------------------------------------------------------------

function detectDisqualifyingSignals({
  validation,
  customerText,
}) {
  const signals = [];

  if (
    validation
      ?.validation_status ===
    "suspected_invalid"
  ) {
    signals.push(
      "Validation marked lead as suspected invalid."
    );
  }

  if (
    validation?.test_signal === true
  ) {
    signals.push(
      "Test-like lead signal detected."
    );
  }

  if (
    includesAny(
      customerText,
      [
        "not interested",
        "no requirement",
        "don't need",
        "do not need",
        "no project",
        "no budget at all",
        "not planning to buy",
        "not planning to join",
      ]
    )
  ) {
    signals.push(
      "Prospect expressed a material disqualification or no-current-need signal."
    );
  }

  return unique(signals);
}

// ------------------------------------------------------------
// GATE EVALUATION
// ------------------------------------------------------------

function evaluateGates({
  businessUnit,
  validation,
  score,
  profile,
  completeness,
  missingCriticalFields,
  handoffIntent,
  disqualifyingSignals,
}) {
  const validationPassed =
    validation
      ?.validation_status ===
    "valid";

  const criticalFieldsPassed =
    missingCriticalFields.length === 0;

  const completenessPassed =
    completeness >= 70;

  const fitPassed =
    Number(
      score?.fit_score || 0
    ) >= 60;

  const intentPassed =
    Number(
      score?.intent_score || 0
    ) >= 40;

  const readinessPassed =
    Number(
      score?.readiness_score || 0
    ) >= 40;

  const engagementPassed =
    Number(
      score?.engagement_score || 0
    ) >= 40;

  const confidencePassed =
    Number(
      score?.scoring_confidence || 0
    ) >= 60;

  const explicitHandoffPassed =
    [
      "requested",
      "accepted",
    ].includes(
      handoffIntent.intent
    );

  const noDisqualifier =
    disqualifyingSignals.length === 0;

  const businessSpecificGate =
    businessUnit ===
    "business_solutions"
      ? (
          hasValue(
            profile.business_problem
          ) &&
          hasValue(
            profile.timeline
          )
        )
      : businessUnit ===
          "admissions"
        ? (
            hasValue(
              profile.course_interest
            ) &&
            hasValue(
              profile.joining_timeline
            ) &&
            hasValue(
              profile.decision_authority
            ) &&
            includesAny(
              profile.decision_authority_status,
              ["yes", "agreed", "agreement"]
            ) &&
            (
              hasValue(profile.fee_readiness) ||
              hasValue(profile.payment_preference)
            )
          )
        : false;

  return {
    validation_passed:
      validationPassed,

    critical_fields_passed:
      criticalFieldsPassed,

    completeness_passed:
      completenessPassed,

    fit_passed:
      fitPassed,

    intent_passed:
      intentPassed,

    engagement_passed:
      engagementPassed,

    readiness_passed:
      readinessPassed,

    confidence_passed:
      confidencePassed,

    explicit_handoff_passed:
      explicitHandoffPassed,

    no_disqualifier:
      noDisqualifier,

    business_specific_gate:
      businessSpecificGate,
  };
}

// ------------------------------------------------------------
// FINAL QUALIFICATION DECISION
// ------------------------------------------------------------

function determineQualification({
  businessUnit,
  validation,
  score,
  completeness,
  missingCriticalFields,
  handoffIntent,
  gates,
  disqualifyingSignals,
}) {
  const overall =
    Number(
      score?.overall_score || 0
    );

  const intent =
    Number(
      score?.intent_score || 0
    );

  const readiness =
    Number(
      score?.readiness_score || 0
    );

  if (
    validation
      ?.validation_status ===
    "suspected_invalid"
  ) {
    return {
      stage: "invalid",
      salesReady: false,
      salesReadyStatus:
        "invalid",
      recommendedRoute:
        "quarantine",
      recommendedAction:
        "Keep this lead out of active sales or admissions routing until reviewed.",
      reason:
        "Lead failed authenticity validation.",
    };
  }

  if (
    businessUnit ===
    "unclassified"
  ) {
    return {
      stage: "review",
      salesReady: false,
      salesReadyStatus:
        "review",
      recommendedRoute:
        "human_review",
      recommendedAction:
        "Classify this lead before continuing automated qualification.",
      reason:
        "Business unit could not be determined.",
    };
  }

  if (
    disqualifyingSignals.length > 0
  ) {
    return {
      stage: "disqualified",
      salesReady: false,
      salesReadyStatus:
        "disqualified",
      recommendedRoute:
        "do_not_route",
      recommendedAction:
        "Retain history but do not send to active sales/counselling.",
      reason:
        disqualifyingSignals[0],
    };
  }

  if (
    handoffIntent.intent ===
    "declined"
  ) {
    return {
      stage: "deferred",
      salesReady: false,
      salesReadyStatus:
        "deferred",
      recommendedRoute:
        "nurture",
      recommendedAction:
        "Respect the prospect's decision and place the lead into nurture/deferred follow-up.",
      reason:
        "Prospect declined or deferred immediate human contact.",
    };
  }

  const hardSalesReady =
    gates.validation_passed &&
    gates.critical_fields_passed &&
    gates.completeness_passed &&
    gates.fit_passed &&
    gates.intent_passed &&
    gates.engagement_passed &&
    gates.readiness_passed &&
    gates.confidence_passed &&
    gates.explicit_handoff_passed &&
    gates.no_disqualifier &&
    gates.business_specific_gate;

  if (hardSalesReady) {
    return {
      stage: "sales_ready",
      salesReady: true,
      salesReadyStatus:
        overall >= 80
          ? "priority_hot"
          : "sales_ready_qualified",
      recommendedRoute:
        businessUnit ===
        "admissions"
          ? "admissions_counsellor_priority"
          : "business_sales_priority",
      recommendedAction:
        businessUnit ===
        "admissions"
          ? "Connect this lead to the admissions counsellor for a real counselling conversation."
          : "Connect this lead to business sales for a personalized demo or commercial discussion.",
      reason:
        "Lead passed authenticity, discovery, commercial-readiness and explicit human-handoff gates.",
    };
  }

  const discoveryComplete =
    missingCriticalFields.length === 0 &&
    completeness >= 70;

  if (
    discoveryComplete &&
    ![
      "requested",
      "accepted",
    ].includes(
      handoffIntent.intent
    )
  ) {
    return {
      stage:
        "awaiting_handoff_confirmation",
      salesReady: false,
      salesReadyStatus:
        overall >= 60
          ? "qualified_warm"
          : "nurture",
      recommendedRoute:
        "ai_handoff_confirmation",
      recommendedAction:
        businessUnit ===
        "admissions"
          ? "Ask whether the student would like to speak with an admissions counsellor."
          : "Ask whether the prospect would like a personalized demo or phone discussion.",
      reason:
        "Discovery is sufficiently complete, but explicit human-contact intent has not yet been confirmed.",
    };
  }

  if (
    overall >= 60 ||
    (
      intent >= 40 &&
      readiness >= 30
    )
  ) {
    return {
      stage: "ai_discovery",
      salesReady: false,
      salesReadyStatus:
        "qualified_warm",
      recommendedRoute:
        "priority_ai_discovery",
      recommendedAction:
        "Continue only the highest-value remaining qualification questions.",
      reason:
        "Lead shows meaningful commercial potential but has not yet passed all sales-ready gates.",
    };
  }

  return {
    stage: "ai_discovery",
    salesReady: false,
    salesReadyStatus:
      "nurture",
    recommendedRoute:
      businessUnit ===
      "admissions"
        ? "admissions_nurture"
        : "business_nurture",
    recommendedAction:
      "Continue structured AI discovery and nurturing.",
    reason:
      "Lead is valid but not yet commercially ready for human handoff.",
  };
}

// ------------------------------------------------------------
// SHARED QUALIFICATION ENGINE
// ------------------------------------------------------------

export async function evaluateAndStoreCrmQualification({
  supabase,
  organizationId,
  leadId,
}) {
  if (!supabase) {
    throw new Error(
      "Supabase client is required."
    );
  }

  if (!organizationId) {
    throw new Error(
      "organizationId is required."
    );
  }

  if (!leadId) {
    throw new Error(
      "leadId is required."
    );
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

  // ----------------------------------------------------------
  // LATEST VALIDATION
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
    validationRows?.[0] ||
    null;

  // ----------------------------------------------------------
  // LATEST AI CONVERSATION
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // LATEST SCORE
  // ----------------------------------------------------------

  const {
    data: scoreRows,
    error: scoreError,
  } = await supabase
    .from(
      "crm_lead_scores"
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

  if (scoreError) {
    throw scoreError;
  }

  const score =
    scoreRows?.[0] ||
    null;

// ----------------------------------------------------------
// ENGAGEMENT EVENT HISTORY
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

if (engagementEventError) {
  throw engagementEventError;
}

const engagementEvents =
  engagementEventRows || [];

  // ----------------------------------------------------------
  // CUSTOMER MESSAGE HISTORY
  // ----------------------------------------------------------

  let messages = [];

  if (conversation?.id) {
    const {
      data: messageRows,
      error: messageError,
    } = await supabase
      .from(
        "crm_ai_messages"
      )
      .select(
        `
        role,
        message_text,
        created_at
        `
      )
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
      .limit(200);

    if (messageError) {
      throw messageError;
    }

    messages =
      messageRows || [];
  }

  const customerText =
    messages
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

  // ----------------------------------------------------------
  // BUSINESS UNIT + PROFILE
  // ----------------------------------------------------------

  const businessUnit =
    determineBusinessUnit({
      conversation,
      validation,
      score,
    });

  const profile =
    safeObject(
      conversation
        ?.extracted_profile
    );

  const {
    critical:
      criticalFields,
    important:
      importantFields,
  } =
    getFieldConfig(
      businessUnit
    );

  const requiredFields = [
    ...criticalFields,
    ...importantFields,
  ];

  const missingCriticalFields =
    criticalFields.filter(
      (field) =>
        !hasValue(
          profile[field]
        )
    );

  const completeness =
    calculateCompleteness({
      profile,
      criticalFields,
      importantFields,
    });

  // ----------------------------------------------------------
  // HANDOFF INTENT
  // ----------------------------------------------------------

  const handoffIntent =
  determineHandoffIntent({
    businessUnit,
    profile,
    customerText,
    conversation,
    engagementEvents,
  });

  // ----------------------------------------------------------
  // DISQUALIFIERS
  // ----------------------------------------------------------

  const disqualifyingSignals =
    detectDisqualifyingSignals({
      validation,
      customerText,
    });

  // ----------------------------------------------------------
  // GATES
  // ----------------------------------------------------------

  const gates =
    evaluateGates({
      businessUnit,
      validation,
      score,
      profile,
      completeness,
      missingCriticalFields,
      handoffIntent,
      disqualifyingSignals,
    });

  // ----------------------------------------------------------
  // FINAL QUALIFICATION
  // ----------------------------------------------------------

  const qualification =
    determineQualification({
      businessUnit,
      validation,
      score,
      completeness,
      missingCriticalFields,
      handoffIntent,
      gates,
      disqualifyingSignals,
    });

  // ----------------------------------------------------------
  // POSITIVE SIGNALS
  // ----------------------------------------------------------

  const positiveSignals = [];

  if (
    gates.validation_passed
  ) {
    positiveSignals.push(
      "Lead passed authenticity validation."
    );
  }

  if (
    gates.critical_fields_passed
  ) {
    positiveSignals.push(
      "All critical qualification fields are known."
    );
  }

  if (
    gates.completeness_passed
  ) {
    positiveSignals.push(
      "AI discovery reached sufficient completeness."
    );
  }

  if (gates.fit_passed) {
    positiveSignals.push(
      "Commercial fit is strong enough for qualification."
    );
  }

  if (
    gates.intent_passed
  ) {
    positiveSignals.push(
      "Meaningful buyer/joining intent is present."
    );
  }

  if (
    gates.readiness_passed
  ) {
    positiveSignals.push(
      "Commercial/joining readiness is established."
    );
  }

  if (
    gates.explicit_handoff_passed
  ) {
    positiveSignals.push(
      handoffIntent.evidence ||
        "Prospect explicitly accepted human follow-up."
    );
  }

  // ----------------------------------------------------------
  // TIMESTAMPS
  // ----------------------------------------------------------

  const now =
    new Date().toISOString();

  const discoveryComplete =
    completeness >= 70 &&
    missingCriticalFields.length === 0;

  const handoffRequested =
    [
      "requested",
      "accepted",
    ].includes(
      handoffIntent.intent
    );

  // ----------------------------------------------------------
  // UPSERT QUALIFICATION STATE
  // ----------------------------------------------------------

  const qualificationRow = {
    organization_id:
      organizationId,

    lead_id:
      lead.id,

    business_unit:
      businessUnit,

    validation_state:
      validation
        ?.validation_status ||
      "needs_review",

    authenticity_score:
      validation
        ?.validation_score ??
      null,

    qualification_completeness:
      completeness,

    qualification_stage:
      qualification.stage,

    handoff_intent:
      handoffIntent.intent,

    handoff_channel:
      handoffIntent.channel,

    human_handoff_required:
      qualification.salesReady,

    sales_ready:
      qualification.salesReady,

    sales_ready_status:
      qualification
        .salesReadyStatus,

    overall_score:
      score?.overall_score ??
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

    scoring_confidence:
      score
        ?.scoring_confidence ??
      null,

    gates_passed:
      gates,

    required_fields:
      requiredFields,

    missing_critical_fields:
      missingCriticalFields,

    positive_qualification_signals:
      unique(
        positiveSignals
      ),

    disqualifying_signals:
      disqualifyingSignals,

    qualification_reason:
      qualification.reason,

    recommended_next_action:
      qualification
        .recommendedAction,

    recommended_route:
      qualification
        .recommendedRoute,

    qualification_version:
      QUALIFICATION_VERSION,

    discovery_completed_at:
      discoveryComplete
        ? now
        : null,

    handoff_requested_at:
      handoffRequested
        ? now
        : null,

    sales_ready_at:
      qualification.salesReady
        ? now
        : null,

    last_evaluated_at:
      now,

    updated_at:
      now,
  };

  const {
    data: savedQualification,
    error: saveError,
  } = await supabase
    .from(
      "crm_lead_qualification_states"
    )
    .upsert(
      qualificationRow,
      {
        onConflict:
          "lead_id,qualification_version",
      }
    )
    .select("*")
    .single();

  if (saveError) {
    throw saveError;
  }

  return {
    qualification:
      savedQualification,

    intelligence: {
      business_unit:
        businessUnit,

      validation_state:
        qualificationRow
          .validation_state,

      authenticity_score:
        qualificationRow
          .authenticity_score,

      qualification_completeness:
        completeness,

      missing_critical_fields:
        missingCriticalFields,

      handoff_intent:
        handoffIntent.intent,

      handoff_channel:
        handoffIntent.channel,

      sales_ready:
        qualification.salesReady,

      sales_ready_status:
        qualification
          .salesReadyStatus,

      qualification_stage:
        qualification.stage,

      recommended_route:
        qualification
          .recommendedRoute,

      recommended_next_action:
        qualification
          .recommendedAction,

      qualification_reason:
        qualification.reason,

      gates,
    },

    businessUnit,
    lead,
    score,
    validation,
    conversation,
  };
}
