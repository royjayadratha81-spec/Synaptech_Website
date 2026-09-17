// api/_shared/crm-commercial-facts-engine.js
//
// Shared commercial qualification fact engine.
//
// Used later by:
// - Business chatbot
// - WhatsApp AI
// - AI telecalling
// - CRM follow-up orchestrator
//
// IMPORTANT:
// - Does NOT send WhatsApp messages
// - Does NOT initiate calls
// - Does NOT modify LMS/Admin
// - Does NOT modify synaptech_leads
// - Does NOT create opportunities
// - Only normalizes and stores commercial facts

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

function nullableText(
  value,
  maxLength = 5000
) {
  const text =
    cleanText(
      value,
      maxLength
    );

  return text || null;
}

function toInteger(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.max(
      0,
      Math.round(value)
    );
  }

  const text =
    String(value)
      .replace(/,/g, "")
      .trim();

  const match =
    text.match(/\d+/);

  if (!match) {
    return null;
  }

  const parsed =
    Number(match[0]);

  return Number.isFinite(parsed)
    ? Math.max(
        0,
        Math.round(parsed)
      )
    : null;
}

function toBoolean(value) {
  if (
    value === true ||
    value === false
  ) {
    return value;
  }

  const normalized =
    normalizeText(value);

  if (
    [
      "yes",
      "true",
      "required",
      "needed",
      "interested",
      "include",
      "included",
    ].includes(normalized)
  ) {
    return true;
  }

  if (
    [
      "no",
      "false",
      "not required",
      "not needed",
      "declined",
    ].includes(normalized)
  ) {
    return false;
  }

  return null;
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        cleanText(item, 500)
      )
      .filter(Boolean);
  }

  if (
    typeof value === "string"
  ) {
    return value
      .split(/[,;\n]/)
      .map((item) =>
        item.trim()
      )
      .filter(Boolean);
  }

  return [];
}

function unique(values) {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ];
}

function extractRangeNumbers(value) {
  const text =
    String(value || "")
      .replace(/,/g, "");

  const matches =
    text.match(/\d+(?:\.\d+)?/g) ||
    [];

  if (!matches.length) {
    return {
      min: null,
      max: null,
    };
  }

  const numbers =
    matches
      .map(Number)
      .filter(
        (number) =>
          Number.isFinite(number)
      );

  if (!numbers.length) {
    return {
      min: null,
      max: null,
    };
  }

  if (numbers.length === 1) {
    return {
      min: numbers[0],
      max: numbers[0],
    };
  }

  return {
    min:
      Math.min(...numbers),

    max:
      Math.max(...numbers),
  };
}

function rupeeMultiplier(text) {
  const normalized =
    normalizeText(text);

  if (
    normalized.includes("crore")
  ) {
    return 10000000;
  }

  if (
    normalized.includes("lakh") ||
    normalized.includes("lac")
  ) {
    return 100000;
  }

  if (
    normalized.includes("thousand") ||
    normalized.includes("k")
  ) {
    return 1000;
  }

  return 1;
}

function parseBudgetRange(value) {
  if (!hasValue(value)) {
    return {
      label: null,
      min: null,
      max: null,
    };
  }

  const text =
    cleanText(
      value,
      500
    );

  const normalized =
    normalizeText(text);

  if (
    normalized.includes(
      "not decided"
    ) ||
    normalized.includes(
      "need recommendation"
    )
  ) {
    return {
      label: text,
      min: null,
      max: null,
    };
  }

  const multiplier =
    rupeeMultiplier(text);

  const range =
    extractRangeNumbers(text);

  let min =
    range.min;

  let max =
    range.max;

  if (min !== null) {
    min *= multiplier;
  }

  if (max !== null) {
    max *= multiplier;
  }

  if (
    normalized.includes("below") &&
    min !== null
  ) {
    max = min;
    min = 0;
  }

  if (
    normalized.includes("+") &&
    min !== null
  ) {
    max = null;
  }

  return {
    label: text,
    min,
    max,
  };
}


// ------------------------------------------------------------
// PACKAGE NORMALIZATION
// ------------------------------------------------------------

function normalizePackageInterest(
  value
) {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes(
      "complete package"
    ) ||
    (
      normalized.includes("lms") &&
      normalized.includes("website") &&
      normalized.includes("crm") &&
      normalized.includes("ai") &&
      (
        normalized.includes("whatsapp") ||
        normalized.includes(
          "telecalling"
        )
      )
    )
  ) {
    return "lms_website_crm_ai_funnel_with_ai_outreach";
  }

  if (
    normalized.includes("lms") &&
    normalized.includes("website") &&
    normalized.includes("crm") &&
    normalized.includes("ai")
  ) {
    return "lms_website_crm_ai_funnel";
  }

  if (
    normalized.includes("lms") &&
    normalized.includes("website") &&
    normalized.includes("crm")
  ) {
    return "lms_website_crm";
  }

  if (
    normalized.includes("lms") &&
    normalized.includes("website") &&
    normalized.includes("seo")
  ) {
    return "lms_website_seo";
  }

  if (
    normalized.includes("lms") &&
    normalized.includes("website")
  ) {
    return "lms_website";
  }

  if (
    normalized.includes("lms")
  ) {
    return "lms_only";
  }

  if (
    normalized.includes("custom")
  ) {
    return "custom";
  }

  return cleanText(
    value,
    500
  );
}


// ------------------------------------------------------------
// BILLING / WORK ORDER NORMALIZATION
// ------------------------------------------------------------

function normalizeBillingPreference(
  value
) {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("annual")
  ) {
    return "annual";
  }

  if (
    normalized.includes("monthly")
  ) {
    return "monthly";
  }

  if (
    normalized.includes(
      "one-time"
    ) ||
    normalized.includes(
      "one time"
    ) ||
    normalized.includes(
      "custom implementation"
    )
  ) {
    return "one_time";
  }

  if (
    normalized.includes(
      "usage"
    )
  ) {
    return "usage_based";
  }

  if (
    normalized.includes(
      "recommend"
    ) ||
    normalized.includes(
      "undecided"
    )
  ) {
    return "undecided";
  }

  return null;
}

function normalizeDiscountResponse(
  value
) {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes(
      "yes"
    ) ||
    normalized.includes(
      "annual option"
    )
  ) {
    return "interested";
  }

  if (
    normalized.includes(
      "both"
    )
  ) {
    return "interested";
  }

  if (
    normalized.includes(
      "monthly"
    )
  ) {
    return "declined";
  }

  return "undecided";
}

function normalizeWorkOrderIntent(
  value
) {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes(
      "discuss the work order"
    ) ||
    normalized.includes(
      "ready to proceed"
    ) ||
    normalized.includes(
      "work order"
    )
  ) {
    return "ready";
  }

  if (
    normalized.includes(
      "after a live demo"
    ) ||
    normalized.includes(
      "after demo"
    )
  ) {
    return "after_demo";
  }

  if (
    normalized.includes(
      "formal proposal"
    ) ||
    normalized.includes(
      "after proposal"
    ) ||
    normalized.includes(
      "send proposal"
    )
  ) {
    return "after_proposal";
  }

  if (
    normalized.includes(
      "management approval"
    )
  ) {
    return "management_approval";
  }

  if (
    normalized.includes(
      "comparing"
    )
  ) {
    return "comparing_vendors";
  }

  if (
    normalized.includes(
      "exploring"
    )
  ) {
    return "exploring";
  }

  if (
    normalized.includes(
      "not interested"
    )
  ) {
    return "not_interested";
  }

  return null;
}

function normalizePreferredChannel(
  value
) {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes(
      "whatsapp"
    )
  ) {
    return "whatsapp";
  }

  if (
    normalized.includes(
      "ai phone"
    ) ||
    normalized.includes(
      "ai call"
    ) ||
    normalized.includes(
      "telecalling"
    )
  ) {
    return "ai_call";
  }

  if (
    normalized.includes(
      "human call"
    )
  ) {
    return "human_call";
  }

  if (
    normalized.includes(
      "email"
    )
  ) {
    return "email";
  }

  if (
    normalized.includes(
      "demo"
    )
  ) {
    return "demo";
  }

  return null;
}


// ------------------------------------------------------------
// MAP ANSWER TO FACT PATCH
// ------------------------------------------------------------

export function buildCommercialFactPatch({
  questionKey,
  answer,
  channel = null,
  metadata = {},
}) {
  const key =
    cleanText(
      questionKey,
      200
    );

  const answerText =
    cleanText(
      answer,
      5000
    );

  const context =
    safeObject(
      metadata
    );

  const patch = {
    last_question_key:
      key || null,

    last_channel:
      nullableText(
        channel,
        100
      ),

    last_interaction_at:
      new Date().toISOString(),
  };

  if (
    !key ||
    !answerText
  ) {
    return patch;
  }


  // ----------------------------------------------------------
  // PACKAGE
  // ----------------------------------------------------------

  if (
    key ===
    "package_interest"
  ) {
    const packageInterest =
      normalizePackageInterest(
        answerText
      );

    patch.package_interest =
      packageInterest;

    const normalized =
      normalizeText(answerText);

    patch.lms_required =
      normalized.includes(
        "lms"
      );

    patch.website_required =
      normalized.includes(
        "website"
      );

    patch.seo_required =
      normalized.includes(
        "seo"
      );

    patch.crm_required =
      normalized.includes(
        "crm"
      );

    patch.ai_funnel_required =
      normalized.includes(
        "ai"
      );

    patch.whatsapp_ai_required =
      normalized.includes(
        "whatsapp"
      );

    patch.ai_telecalling_required =
      (
        normalized.includes(
          "telecalling"
        ) ||
        normalized.includes(
          "ai call"
        )
      );

    patch.package_components =
      unique(
        [
          patch.lms_required
            ? "lms"
            : null,

          patch.website_required
            ? "website"
            : null,

          patch.seo_required
            ? "seo"
            : null,

          patch.crm_required
            ? "crm"
            : null,

          patch.ai_funnel_required
            ? "ai_funnel"
            : null,

          patch.whatsapp_ai_required
            ? "whatsapp_ai"
            : null,

          patch.ai_telecalling_required
            ? "ai_telecalling"
            : null,
        ]
      );

    return patch;
  }


  // ----------------------------------------------------------
  // BUSINESS PROBLEM
  // ----------------------------------------------------------

  if (
    key ===
    "business_problem"
  ) {
    patch.business_problem =
      answerText;

    return patch;
  }


  // ----------------------------------------------------------
  // GO LIVE
  // ----------------------------------------------------------

  if (
    key ===
    "go_live_timeline"
  ) {
    patch.go_live_timeline =
      answerText;

    const normalized =
      normalizeText(answerText);

    if (
      normalized.includes(
        "immediate"
      )
    ) {
      patch.implementation_urgency =
        "immediate";
    } else if (
      normalized.includes(
        "30 days"
      )
    ) {
      patch.implementation_urgency =
        "high";
    } else if (
      normalized.includes(
        "1–3 months"
      ) ||
      normalized.includes(
        "1-3 months"
      )
    ) {
      patch.implementation_urgency =
        "medium";
    } else if (
      normalized.includes(
        "3–6 months"
      ) ||
      normalized.includes(
        "3-6 months"
      )
    ) {
      patch.implementation_urgency =
        "planned";
    } else {
      patch.implementation_urgency =
        "exploratory";
    }

    return patch;
  }


  // ----------------------------------------------------------
  // MONTHLY / ANNUAL USAGE
  // ----------------------------------------------------------

  if (
    key ===
    "monthly_active_users"
  ) {
    patch.monthly_active_users =
      toInteger(
        answerText
      );

    return patch;
  }

  if (
    key ===
    "annual_users"
  ) {
    patch.annual_users =
      toInteger(
        answerText
      );

    return patch;
  }


  // ----------------------------------------------------------
  // CURRENT SYSTEM
  // ----------------------------------------------------------

  if (
    key ===
    "current_system"
  ) {
    patch.current_system =
      answerText;

    return patch;
  }


  // ----------------------------------------------------------
  // FEATURES
  // ----------------------------------------------------------

  if (
    key ===
    "must_have_features"
  ) {
    patch.must_have_features =
      normalizeArray(
        answerText
      );

    return patch;
  }


  // ----------------------------------------------------------
  // BUDGET
  // ----------------------------------------------------------

  if (
    key ===
    "budget_range"
  ) {
    const budget =
      parseBudgetRange(
        answerText
      );

    patch.budget_range =
      budget.label;

    patch.budget_amount_min =
      budget.min;

    patch.budget_amount_max =
      budget.max;

    return patch;
  }


  // ----------------------------------------------------------
  // BILLING
  // ----------------------------------------------------------

  if (
    key ===
    "billing_preference"
  ) {
    patch.billing_preference =
      normalizeBillingPreference(
        answerText
      );

    if (
      patch.billing_preference ===
      "annual"
    ) {
      patch.annual_subscription_interest =
        true;
    }

    return patch;
  }


  // ----------------------------------------------------------
  // ANNUAL DISCOUNT
  // ----------------------------------------------------------

  if (
    key ===
    "annual_discount_offer"
  ) {
    patch.annual_discount_offered =
      true;

    patch.annual_discount_percent =
      Number(
        context.discount_percent ??
        10
      );

    patch.annual_discount_response =
      normalizeDiscountResponse(
        answerText
      );

    patch.annual_subscription_interest =
      patch.annual_discount_response ===
      "interested";

    return patch;
  }


  // ----------------------------------------------------------
  // DECISION AUTHORITY
  // ----------------------------------------------------------

  if (
    key ===
    "decision_authority"
  ) {
    patch.decision_authority =
      answerText;

    const normalized =
      normalizeText(answerText);

    patch.decision_maker =
      (
        normalized.includes(
          "final decision maker"
        ) ||
        normalized.includes(
          "jointly with management"
        )
      );

    patch.management_approval_required =
      (
        normalized.includes(
          "management"
        ) ||
        normalized.includes(
          "recommend"
        ) ||
        normalized.includes(
          "someone else"
        )
      );

    return patch;
  }


  // ----------------------------------------------------------
  // DECISION PROCESS
  // ----------------------------------------------------------

  if (
    key ===
    "decision_process"
  ) {
    patch.decision_process =
      answerText;

    return patch;
  }


  // ----------------------------------------------------------
  // CATALOGUE
  // ----------------------------------------------------------

  if (
    key ===
    "catalogue_offer"
  ) {
    patch.catalogue_offered =
      true;

    patch.catalogue_response =
      answerText;

    return patch;
  }

  if (
    key ===
    "catalogue_response"
  ) {
    patch.catalogue_response =
      answerText;

    return patch;
  }


  // ----------------------------------------------------------
  // WORK ORDER / PROPOSAL
  // ----------------------------------------------------------

  if (
    key ===
    "work_order_intent"
  ) {
    patch.work_order_intent =
      normalizeWorkOrderIntent(
        answerText
      );

    const normalized =
      normalizeText(answerText);

    patch.proposal_interest =
      (
        normalized.includes(
          "proposal"
        ) ||
        normalized.includes(
          "work order"
        )
      );

    patch.quotation_requested =
      (
        normalized.includes(
          "quotation"
        ) ||
        normalized.includes(
          "quote"
        )
      );

    return patch;
  }


  // ----------------------------------------------------------
  // CONTACT CHANNEL
  // ----------------------------------------------------------

  if (
    key ===
    "preferred_contact_channel"
  ) {
    const preferredChannel =
      normalizePreferredChannel(
        answerText
      );

    patch.preferred_contact_channel =
      preferredChannel;

    const normalized =
      normalizeText(answerText);

    if (
      normalized.includes(
        "whatsapp"
      )
    ) {
      patch.whatsapp_consent =
        true;
    }

    if (
      normalized.includes(
        "ai call"
      ) ||
      normalized.includes(
        "phone"
      ) ||
      normalized.includes(
        "telecalling"
      )
    ) {
      patch.ai_call_consent =
        true;
    }

    if (
      normalized.includes(
        "human call"
      )
    ) {
      patch.human_call_consent =
        true;
    }

    return patch;
  }


  // ----------------------------------------------------------
  // WHATSAPP CONSENT
  // ----------------------------------------------------------

  if (
    key ===
    "whatsapp_consent"
  ) {
    patch.whatsapp_consent =
      toBoolean(
        answerText
      );

    return patch;
  }


  // ----------------------------------------------------------
  // AI CALL CONSENT
  // ----------------------------------------------------------

  if (
    key ===
    "ai_call_consent"
  ) {
    const normalized =
      normalizeText(answerText);

    patch.ai_call_consent =
      !(
        normalized.includes(
          "no ai call"
        ) ||
        normalized.includes(
          "whatsapp only"
        )
      );

    if (
      normalized.includes(
        "whatsapp only"
      )
    ) {
      patch.preferred_contact_channel =
        "whatsapp";
    } else if (
      patch.ai_call_consent ===
      true
    ) {
      patch.preferred_contact_channel =
        "ai_call";
    }

    patch.preferred_contact_time =
      answerText;

    return patch;
  }


  // ----------------------------------------------------------
  // GENERIC FALLBACK
  // ----------------------------------------------------------

  return patch;
}


// ------------------------------------------------------------
// STORE FACTS
// ------------------------------------------------------------

export async function upsertCommercialFacts({
  supabase,
  organizationId,
  leadId,
  conversationId = null,
  businessUnit = "business_solutions",
  patch = {},
  factSource = null,
  factConfidence = null,
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

  const incoming =
    safeObject(
      patch
    );

  const {
    data: existing,
    error: existingError,
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
      leadId
    )
    .eq(
      "business_unit",
      businessUnit
    )
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const now =
    new Date().toISOString();

  const row = {
    ...(existing || {}),

    ...incoming,

    organization_id:
      organizationId,

    lead_id:
      leadId,

    conversation_id:
      conversationId ||
      existing?.conversation_id ||
      null,

    business_unit:
      businessUnit,

    fact_source:
      nullableText(
        factSource,
        100
      ) ||
      existing?.fact_source ||
      null,

    fact_confidence:
      factConfidence !== null &&
      factConfidence !== undefined
        ? Math.min(
            100,
            Math.max(
              0,
              Math.round(
                Number(
                  factConfidence
                ) || 0
              )
            )
          )
        : existing?.fact_confidence ??
          null,

    updated_at:
      now,
  };

  delete row.id;
  delete row.created_at;

  const {
    data: savedFacts,
    error: saveError,
  } = await supabase
    .from(
      "crm_commercial_qualification_facts"
    )
    .upsert(
      row,
      {
        onConflict:
          "organization_id,lead_id,business_unit",
      }
    )
    .select("*")
    .single();

  if (saveError) {
    throw saveError;
  }

  return savedFacts;
}


// ------------------------------------------------------------
// APPLY QUESTION ANSWER
// ------------------------------------------------------------

export async function applyCommercialQuestionAnswer({
  supabase,
  organizationId,
  leadId,
  conversationId = null,
  businessUnit =
    "business_solutions",
  questionKey,
  answer,
  channel = null,
  metadata = {},
  factSource = null,
  factConfidence = null,
}) {
  const patch =
    buildCommercialFactPatch({
      questionKey,
      answer,
      channel,
      metadata,
    });

  const savedFacts =
    await upsertCommercialFacts({
      supabase,
      organizationId,
      leadId,
      conversationId,
      businessUnit,
      patch,
      factSource:
        factSource ||
        channel ||
        "ai_followup",
      factConfidence,
    });

  return {
    facts:
      savedFacts,

    patch,
  };
}