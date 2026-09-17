// api/_shared/crm-followup-question-engine.js
//
// Provider-independent commercial qualification question engine.
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
// - Does NOT award lead score directly
// - Selects the next best missing commercial question
// - Avoids repeating facts already known

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
      normalized !== "not sure" &&
      normalized !== "undecided"
    );
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function firstKnown(...values) {
  for (const value of values) {
    if (hasValue(value)) {
      return value;
    }
  }

  return null;
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
// PACKAGE DETECTION
// ------------------------------------------------------------

export function inferPackageInterest({
  facts = {},
  profile = {},
  requirement = "",
}) {
  const commercial =
    safeObject(facts);

  const extracted =
    safeObject(profile);

  const explicitPackage =
    firstKnown(
      commercial.package_interest,
      extracted.package_interest,
      extracted.product_interest,
      extracted.solution_interest
    );

  if (explicitPackage) {
    return cleanText(
      explicitPackage,
      500
    );
  }

  const combinedText =
    [
      requirement,
      extracted.product_interest,
      extracted.solution_interest,
      extracted.must_have_features,
    ]
      .flat()
      .filter(Boolean)
      .join(" ");

  const hasLms =
    includesAny(
      combinedText,
      [
        "lms",
        "learning management",
        "learning platform",
      ]
    );

  const hasWebsite =
    includesAny(
      combinedText,
      [
        "website",
        "web site",
        "web development",
      ]
    );

  const hasSeo =
    includesAny(
      combinedText,
      [
        "seo",
        "search engine optimization",
        "search engine optimisation",
      ]
    );

  const hasCrm =
    includesAny(
      combinedText,
      [
        "crm",
        "lead management",
        "sales crm",
      ]
    );

  const hasAiFunnel =
    includesAny(
      combinedText,
      [
        "ai funnel",
        "ai qualification",
        "lead qualification",
        "ai lead",
        "ai follow-up",
        "ai followup",
      ]
    );

  const hasWhatsapp =
    includesAny(
      combinedText,
      [
        "whatsapp",
        "whats app",
      ]
    );

  const hasTelecalling =
    includesAny(
      combinedText,
      [
        "telecalling",
        "tele calling",
        "ai call",
        "voice bot",
        "voice agent",
      ]
    );

  if (
    hasLms &&
    hasWebsite &&
    hasCrm &&
    hasAiFunnel &&
    (
      hasWhatsapp ||
      hasTelecalling
    )
  ) {
    return "lms_website_crm_ai_funnel_with_ai_outreach";
  }

  if (
    hasLms &&
    hasWebsite &&
    hasCrm &&
    hasAiFunnel
  ) {
    return "lms_website_crm_ai_funnel";
  }

  if (
    hasLms &&
    hasWebsite &&
    hasCrm
  ) {
    return "lms_website_crm";
  }

  if (
    hasLms &&
    hasWebsite &&
    hasSeo
  ) {
    return "lms_website_seo";
  }

  if (
    hasLms &&
    hasWebsite
  ) {
    return "lms_website";
  }

  if (hasLms) {
    return "lms_only";
  }

  return null;
}


// ------------------------------------------------------------
// PACKAGE LABELS
// ------------------------------------------------------------

function getPackageLabel(
  packageInterest
) {
  const labels = {
    lms_only:
      "LMS only",

    lms_website:
      "LMS + Website",

    lms_website_seo:
      "LMS + Website + SEO",

    lms_website_crm:
      "LMS + Website + CRM",

    lms_website_crm_ai_funnel:
      "LMS + Website + CRM + AI Funnel",

    lms_website_crm_ai_funnel_with_ai_outreach:
      "LMS + Website + CRM + AI Funnel + AI WhatsApp/Telecalling",

    custom:
      "Custom solution",
  };

  return (
    labels[packageInterest] ||
    cleanText(packageInterest, 300) ||
    "the required solution"
  );
}


// ------------------------------------------------------------
// BUDGET OPTIONS
// ------------------------------------------------------------

function getBudgetQuestion(
  packageInterest
) {
  const packageLabel =
    getPackageLabel(
      packageInterest
    );

  if (
    packageInterest ===
    "lms_only"
  ) {
    return {
      text:
        "To recommend the right LMS plan, what approximate budget range are you considering?",
      options: [
        "Below ₹1 lakh",
        "₹1–2 lakh",
        "₹2–5 lakh",
        "₹5 lakh+",
        "Prefer monthly SaaS pricing",
        "Not decided yet",
      ],
    };
  }

  if (
    packageInterest ===
    "lms_website_seo"
  ) {
    return {
      text:
        "For an LMS + Website + SEO solution, what approximate budget range are you considering?",
      options: [
        "Below ₹1.5 lakh",
        "₹1.5–3 lakh",
        "₹3–5 lakh",
        "₹5 lakh+",
        "Prefer subscription pricing",
        "Need recommendation",
      ],
    };
  }

  if (
    packageInterest ===
    "lms_website_crm"
  ) {
    return {
      text:
        "For an LMS + Website + CRM solution, what approximate budget range are you considering?",
      options: [
        "Below ₹2 lakh",
        "₹2–4 lakh",
        "₹4–7 lakh",
        "₹7 lakh+",
        "Prefer SaaS/monthly pricing",
        "Need recommendation",
      ],
    };
  }

  if (
    packageInterest ===
      "lms_website_crm_ai_funnel" ||
    packageInterest ===
      "lms_website_crm_ai_funnel_with_ai_outreach"
  ) {
    return {
      text:
        `For ${packageLabel}, what approximate budget range are you considering?`,
      options: [
        "Below ₹3 lakh",
        "₹3–5 lakh",
        "₹5–10 lakh",
        "₹10 lakh+",
        "Prefer SaaS/monthly pricing",
        "Need recommendation",
      ],
    };
  }

  return {
    text:
      "What approximate budget range are you considering for this project?",
    options: [
      "Below ₹1 lakh",
      "₹1–3 lakh",
      "₹3–5 lakh",
      "₹5–10 lakh",
      "₹10 lakh+",
      "Prefer subscription pricing",
      "Not decided yet",
    ],
  };
}


// ------------------------------------------------------------
// QUESTION DEFINITIONS
// ------------------------------------------------------------

function buildQuestion({
  key,
  text,
  channel,
  purpose,
  options = [],
  factKeys = [],
  priority = 50,
  commercialStage = "qualification",
  allowFreeText = true,
  metadata = {},
}) {
  return {
    key,
    text,
    channel,
    purpose,
    options,
    fact_keys:
      unique(factKeys),
    priority,
    commercial_stage:
      commercialStage,
    allow_free_text:
      allowFreeText,
    metadata:
      safeObject(metadata),
  };
}


// ------------------------------------------------------------
// DETERMINE FACT VALUES
// ------------------------------------------------------------

function buildKnownFacts({
  facts,
  profile,
  lead,
}) {
  const commercial =
    safeObject(facts);

  const extracted =
    safeObject(profile);

  return {
    package_interest:
      firstKnown(
        commercial.package_interest,
        extracted.package_interest,
        extracted.product_interest,
        extracted.solution_interest,
        inferPackageInterest({
          facts: commercial,
          profile: extracted,
          requirement:
            lead?.requirement || "",
        })
      ),

    business_problem:
      firstKnown(
        commercial.business_problem,
        extracted.business_problem,
        extracted.pain_point,
        extracted.problem
      ),

    current_system:
      firstKnown(
        commercial.current_system,
        extracted.current_system,
        extracted.existing_system
      ),

    current_system_limitations:
      firstKnown(
        commercial.current_system_limitations,
        extracted.current_system_limitations
      ),

    monthly_active_users:
      firstKnown(
        commercial.monthly_active_users,
        extracted.monthly_active_users,
        extracted.monthly_users
      ),

    annual_users:
      firstKnown(
        commercial.annual_users,
        extracted.annual_users,
        extracted.yearly_users,
        extracted.student_count
      ),

    internal_admin_users:
      firstKnown(
        commercial.internal_admin_users,
        extracted.internal_admin_users
      ),

    faculty_users:
      firstKnown(
        commercial.faculty_users,
        extracted.faculty_users
      ),

    counsellor_users:
      firstKnown(
        commercial.counsellor_users,
        extracted.counsellor_users
      ),

    sales_users:
      firstKnown(
        commercial.sales_users,
        extracted.sales_users
      ),

    must_have_features:
      firstKnown(
        commercial.must_have_features,
        extracted.must_have_features,
        extracted.required_features
      ),

    integrations:
      firstKnown(
        commercial.integration_requirements,
        extracted.integrations,
        extracted.integration_requirement
      ),

    go_live_timeline:
      firstKnown(
        commercial.go_live_timeline,
        extracted.go_live_timeline,
        extracted.timeline
      ),

    desired_go_live_date:
      firstKnown(
        commercial.desired_go_live_date,
        extracted.desired_go_live_date
      ),

    budget_range:
      firstKnown(
        commercial.budget_range,
        extracted.budget_range,
        extracted.budget
      ),

    billing_preference:
      firstKnown(
        commercial.billing_preference,
        extracted.billing_preference
      ),

    annual_subscription_interest:
      firstKnown(
        commercial.annual_subscription_interest,
        extracted.annual_subscription_interest
      ),

    annual_discount_offered:
      commercial
        .annual_discount_offered ===
      true,

    annual_discount_response:
      firstKnown(
        commercial.annual_discount_response,
        extracted.annual_discount_response
      ),

    decision_authority:
      firstKnown(
        commercial.decision_authority,
        extracted.decision_authority,
        extracted.authority
      ),

    decision_maker:
      firstKnown(
        commercial.decision_maker,
        extracted.decision_maker
      ),

    decision_process:
      firstKnown(
        commercial.decision_process,
        extracted.decision_process
      ),

    management_approval_required:
      firstKnown(
        commercial.management_approval_required,
        extracted.management_approval_required
      ),

    demo_interest:
      firstKnown(
        commercial.demo_interest,
        extracted.demo_interest
      ),

    live_demo_interest:
      firstKnown(
        commercial.live_demo_interest,
        extracted.live_demo_interest
      ),

    catalogue_offered:
      commercial.catalogue_offered ===
      true,

    catalogue_viewed:
      commercial.catalogue_viewed ===
      true,

    catalogue_downloaded:
      commercial.catalogue_downloaded ===
      true,

    catalogue_response:
      firstKnown(
        commercial.catalogue_response,
        extracted.catalogue_response
      ),

    proposal_interest:
      firstKnown(
        commercial.proposal_interest,
        extracted.proposal_interest
      ),

    quotation_requested:
      firstKnown(
        commercial.quotation_requested,
        extracted.quotation_requested
      ),

    work_order_intent:
      firstKnown(
        commercial.work_order_intent,
        extracted.work_order_intent
      ),

    preferred_contact_channel:
      firstKnown(
        commercial.preferred_contact_channel,
        extracted.preferred_contact_channel
      ),

    whatsapp_consent:
      firstKnown(
        commercial.whatsapp_consent,
        extracted.whatsapp_consent
      ),

    ai_call_consent:
      firstKnown(
        commercial.ai_call_consent,
        extracted.ai_call_consent
      ),

    preferred_contact_time:
      firstKnown(
        commercial.preferred_contact_time,
        extracted.preferred_contact_time
      ),
  };
}


// ------------------------------------------------------------
// QUESTION ENGINE
// ------------------------------------------------------------

export function selectNextCommercialQuestion({
  lead = {},
  facts = {},
  profile = {},
  channel = "crm",
  qualification = {},
  score = {},
}) {
  const known =
    buildKnownFacts({
      facts,
      profile,
      lead,
    });

  const qualificationState =
    safeObject(
      qualification
    );

  const currentChannel =
    cleanText(
      channel,
      100
    ) || "crm";


  // ----------------------------------------------------------
  // 1. PACKAGE REQUIREMENT
  // ----------------------------------------------------------

  if (
    !hasValue(
      known.package_interest
    )
  ) {
    return buildQuestion({
      key:
        "package_interest",

      channel:
        currentChannel,

      purpose:
        "Identify the solution/package required.",

      priority: 100,

      factKeys: [
        "package_interest",
        "package_components",
        "lms_required",
        "website_required",
        "seo_required",
        "crm_required",
        "ai_funnel_required",
        "whatsapp_ai_required",
        "ai_telecalling_required",
      ],

      text:
        "Which solution are you mainly looking for?",

      options: [
        "LMS only",
        "LMS + Website",
        "LMS + Website + SEO",
        "LMS + Website + CRM",
        "LMS + Website + CRM + AI Funnel",
        "Complete package with AI WhatsApp + AI Telecalling",
        "Custom requirement",
      ],
    });
  }


  // ----------------------------------------------------------
  // 2. BUSINESS PROBLEM
  // ----------------------------------------------------------

  if (
    !hasValue(
      known.business_problem
    )
  ) {
    return buildQuestion({
      key:
        "business_problem",

      channel:
        currentChannel,

      purpose:
        "Understand the commercial problem the solution must solve.",

      priority: 95,

      factKeys: [
        "business_problem",
      ],

      text:
        "What are the main business problems you want this system to solve? For example student management, admissions, lead generation, follow-ups, sales conversion, payments, attendance, certificates or reporting.",

      options: [],
    });
  }


  // ----------------------------------------------------------
  // 3. GO-LIVE TIMELINE
  // ----------------------------------------------------------

  if (
    !hasValue(
      known.go_live_timeline
    ) &&
    !hasValue(
      known.desired_go_live_date
    )
  ) {
    return buildQuestion({
      key:
        "go_live_timeline",

      channel:
        currentChannel,

      purpose:
        "Determine implementation urgency and commercial readiness.",

      priority: 94,

      factKeys: [
        "go_live_timeline",
        "desired_go_live_date",
        "implementation_urgency",
      ],

      text:
        "When would you ideally like to go live with this solution?",

      options: [
        "Immediately",
        "Within 30 days",
        "Within 1–3 months",
        "Within 3–6 months",
        "More than 6 months",
        "Still exploring",
      ],
    });
  }


  // ----------------------------------------------------------
  // 4. MONTHLY LMS USAGE
  // ----------------------------------------------------------

  if (
    !hasValue(
      known.monthly_active_users
    )
  ) {
    return buildQuestion({
      key:
        "monthly_active_users",

      channel:
        currentChannel,

      purpose:
        "Understand expected monthly LMS scale.",

      priority: 90,

      factKeys: [
        "monthly_active_users",
      ],

      text:
        "Approximately how many students or users do you expect to actively use the LMS in a typical month?",

      options: [
        "Below 100",
        "100–250",
        "251–500",
        "501–1,000",
        "1,001–2,500",
        "2,500+",
      ],
    });
  }


  // ----------------------------------------------------------
  // 5. ANNUAL LMS USAGE
  // ----------------------------------------------------------

  if (
    !hasValue(
      known.annual_users
    )
  ) {
    return buildQuestion({
      key:
        "annual_users",

      channel:
        currentChannel,

      purpose:
        "Understand annual LMS scale and infrastructure requirement.",

      priority: 89,

      factKeys: [
        "annual_users",
      ],

      text:
        "Approximately how many students or users do you expect to use the LMS across a full year?",

      options: [
        "Below 500",
        "500–1,000",
        "1,001–2,500",
        "2,501–5,000",
        "5,001–10,000",
        "10,000+",
      ],
    });
  }


  // ----------------------------------------------------------
  // 6. CURRENT SYSTEM
  // ----------------------------------------------------------

  if (
    !hasValue(
      known.current_system
    )
  ) {
    return buildQuestion({
      key:
        "current_system",

      channel:
        currentChannel,

      purpose:
        "Understand current technology/process and replacement need.",

      priority: 82,

      factKeys: [
        "current_system",
        "current_system_limitations",
      ],

      text:
        "Are you currently using any LMS, CRM, ERP or website platform? If yes, please tell me which one and what limitations you are facing.",

      options: [
        "No current system",
        "Using an LMS",
        "Using a CRM",
        "Using LMS + CRM",
        "Using another ERP/software",
      ],
    });
  }


  // ----------------------------------------------------------
  // 7. FEATURES
  // ----------------------------------------------------------

  if (
    !hasValue(
      known.must_have_features
    )
  ) {
    return buildQuestion({
      key:
        "must_have_features",

      channel:
        currentChannel,

      purpose:
        "Capture mandatory implementation requirements.",

      priority: 78,

      factKeys: [
        "must_have_features",
      ],

      text:
        "Which features are absolutely essential for your organization? You can mention items such as live classes, recordings, assignments, attendance, payments, certificates, lead management, AI qualification, reporting or custom workflows.",

      options: [],
    });
  }


  // ----------------------------------------------------------
  // 8. BUDGET
  // ----------------------------------------------------------

  if (
    !hasValue(
      known.budget_range
    )
  ) {
    const budgetQuestion =
      getBudgetQuestion(
        known.package_interest
      );

    return buildQuestion({
      key:
        "budget_range",

      channel:
        currentChannel,

      purpose:
        "Understand commercial budget fit.",

      priority: 76,

      factKeys: [
        "budget_range",
        "budget_amount_min",
        "budget_amount_max",
      ],

      text:
        budgetQuestion.text,

      options:
        budgetQuestion.options,

      metadata: {
        package_interest:
          known.package_interest,

        package_label:
          getPackageLabel(
            known.package_interest
          ),
      },
    });
  }


  // ----------------------------------------------------------
  // 9. BILLING PREFERENCE
  // ----------------------------------------------------------

  if (
    !hasValue(
      known.billing_preference
    )
  ) {
    return buildQuestion({
      key:
        "billing_preference",

      channel:
        currentChannel,

      purpose:
        "Understand monthly versus annual versus implementation pricing preference.",

      priority: 72,

      factKeys: [
        "billing_preference",
      ],

      text:
        "Would you prefer monthly subscription billing, annual subscription billing, or a one-time/custom implementation model?",

      options: [
        "Monthly subscription",
        "Annual subscription",
        "One-time/custom implementation",
        "Usage-based where applicable",
        "Need recommendation",
      ],
    });
  }


  // ----------------------------------------------------------
  // 10. 10% ANNUAL SUBSCRIPTION OFFER
  // ----------------------------------------------------------

  if (
    normalizeText(
      known.billing_preference
    ).includes("annual") &&
    !known.annual_discount_offered
  ) {
    return buildQuestion({
      key:
        "annual_discount_offer",

      channel:
        currentChannel,

      purpose:
        "Present annual subscription commercial benefit.",

      priority: 71,

      factKeys: [
        "annual_discount_offered",
        "annual_discount_percent",
        "annual_subscription_interest",
        "annual_discount_response",
      ],

      commercialStage:
        "commercial_offer",

      text:
        "For annual subscription plans, Synaptech offers a 10% discount compared with monthly billing. Would you like us to include the discounted annual option in your recommendation?",

      options: [
        "Yes, show annual option",
        "Maybe, show both",
        "Prefer monthly billing",
      ],

      metadata: {
        discount_percent: 10,
      },
    });
  }


  // ----------------------------------------------------------
  // 11. DECISION AUTHORITY
  // ----------------------------------------------------------

  if (
    !hasValue(
      known.decision_authority
    ) &&
    !hasValue(
      known.decision_maker
    )
  ) {
    return buildQuestion({
      key:
        "decision_authority",

      channel:
        currentChannel,

      purpose:
        "Determine buying authority and approval process.",

      priority: 70,

      factKeys: [
        "decision_authority",
        "decision_maker",
        "management_approval_required",
      ],

      text:
        "Are you personally involved in the final purchase decision for this project?",

      options: [
        "Yes, I am the final decision maker",
        "Yes, jointly with management",
        "I will recommend the solution",
        "I am evaluating it for someone else",
      ],
    });
  }


  // ----------------------------------------------------------
  // 12. DECISION PROCESS
  // ----------------------------------------------------------

  if (
    !hasValue(
      known.decision_process
    )
  ) {
    return buildQuestion({
      key:
        "decision_process",

      channel:
        currentChannel,

      purpose:
        "Understand who must approve the project.",

      priority: 67,

      factKeys: [
        "decision_process",
        "management_approval_required",
        "stakeholders",
      ],

      text:
        "Who else would normally need to approve the project before a work order can be issued?",

      options: [],
    });
  }


  // ----------------------------------------------------------
  // 13. CATALOGUE
  // ----------------------------------------------------------

  if (
    !known.catalogue_offered
  ) {
    return buildQuestion({
      key:
        "catalogue_offer",

      channel:
        currentChannel,

      purpose:
        "Offer the relevant Synaptech catalogue after meaningful qualification.",

      priority: 60,

      factKeys: [
        "catalogue_offered",
      ],

      commercialStage:
        "catalogue",

      text:
        `Based on what you have shared, ${getPackageLabel(
          known.package_interest
        )} appears relevant. Would you like to see Synaptech's solution catalogue before we discuss the next step?`,

      options: [
        "Yes, show catalogue",
        "Send it on WhatsApp",
        "Send it by email",
        "Not now",
      ],
    });
  }


  // ----------------------------------------------------------
  // 14. CATALOGUE RESPONSE
  // ----------------------------------------------------------

  if (
    known.catalogue_offered &&
    (
      known.catalogue_viewed ||
      known.catalogue_downloaded
    ) &&
    !hasValue(
      known.catalogue_response
    )
  ) {
    return buildQuestion({
      key:
        "catalogue_response",

      channel:
        currentChannel,

      purpose:
        "Measure commercial response after catalogue review.",

      priority: 58,

      factKeys: [
        "catalogue_response",
      ],

      commercialStage:
        "catalogue",

      text:
        "After reviewing the catalogue, would you like Synaptech to prepare a package recommendation specifically for your organization?",

      options: [
        "Yes",
        "Yes, after a live demo",
        "Need pricing first",
        "Need management discussion",
        "Not yet",
      ],
    });
  }


  // ----------------------------------------------------------
  // 15. PROPOSAL / WORK ORDER INTENT
  // ----------------------------------------------------------

  if (
    !hasValue(
      known.work_order_intent
    )
  ) {
    return buildQuestion({
      key:
        "work_order_intent",

      channel:
        currentChannel,

      purpose:
        "Determine whether the prospect is commercially ready to progress.",

      priority: 55,

      factKeys: [
        "proposal_interest",
        "quotation_requested",
        "work_order_intent",
      ],

      commercialStage:
        "commercial_intent",

      text:
        "If the solution matches your requirements and budget, what would you prefer as the next step?",

      options: [
        "Proceed after a live demo",
        "Send me a formal proposal",
        "Discuss the work order",
        "Need management approval",
        "Still comparing vendors",
        "Just exploring",
      ],
    });
  }


  // ----------------------------------------------------------
  // 16. PREFERRED CONTACT CHANNEL
  // ----------------------------------------------------------

  if (
    !hasValue(
      known.preferred_contact_channel
    )
  ) {
    return buildQuestion({
      key:
        "preferred_contact_channel",

      channel:
        currentChannel,

      purpose:
        "Determine the preferred follow-up channel.",

      priority: 52,

      factKeys: [
        "preferred_contact_channel",
        "whatsapp_consent",
        "ai_call_consent",
        "preferred_contact_time",
      ],

      commercialStage:
        "follow_up",

      text:
        "How would you prefer Synaptech's AI assistant to continue the follow-up?",

      options: [
        "WhatsApp",
        "AI phone call",
        "WhatsApp first, then AI call if needed",
        "Human call after qualification",
        "Email",
      ],
    });
  }


  // ----------------------------------------------------------
  // 17. WHATSAPP CONSENT
  // ----------------------------------------------------------

  if (
    normalizeText(
      known.preferred_contact_channel
    ).includes("whatsapp") &&
    known.whatsapp_consent !== true
  ) {
    return buildQuestion({
      key:
        "whatsapp_consent",

      channel:
        currentChannel,

      purpose:
        "Obtain permission before WhatsApp follow-up.",

      priority: 51,

      factKeys: [
        "whatsapp_consent",
      ],

      commercialStage:
        "consent",

      text:
        "May Synaptech's AI assistant contact you on WhatsApp regarding this enquiry, demo, pricing and follow-up?",

      options: [
        "Yes",
        "No",
      ],
    });
  }


  // ----------------------------------------------------------
  // 18. AI CALL CONSENT
  // ----------------------------------------------------------

  if (
    includesAny(
      known.preferred_contact_channel,
      [
        "ai call",
        "phone",
        "telecalling",
      ]
    ) &&
    known.ai_call_consent !== true
  ) {
    return buildQuestion({
      key:
        "ai_call_consent",

      channel:
        currentChannel,

      purpose:
        "Obtain permission before AI telecalling.",

      priority: 50,

      factKeys: [
        "ai_call_consent",
        "preferred_contact_time",
      ],

      commercialStage:
        "consent",

      text:
        "May Synaptech's AI calling assistant contact you regarding this enquiry? You can also tell us a convenient time for the call.",

      options: [
        "Yes, call anytime during business hours",
        "Yes, I will specify a preferred time",
        "WhatsApp only",
        "No AI call",
      ],
    });
  }


  // ----------------------------------------------------------
  // COMPLETE
  // ----------------------------------------------------------

  return {
    key: null,

    text: null,

    channel:
      currentChannel,

    purpose:
      "Commercial qualification sufficiently complete.",

    options: [],

    fact_keys: [],

    priority: 0,

    commercial_stage:
      qualificationState
        ?.sales_ready
        ? "sales_ready"
        : "qualification_complete",

    allow_free_text: false,

    complete: true,

    recommendation:
      qualificationState
        ?.sales_ready
        ? "Route according to the Sales Ready gate."
        : "Re-score and re-evaluate qualification before selecting the next follow-up action.",

    metadata: {
      overall_score:
        score?.overall_score ??
        null,

      sales_ready:
        qualificationState
          ?.sales_ready ??
        false,

      sales_ready_status:
        qualificationState
          ?.sales_ready_status ??
        null,
    },
  };
}


// ------------------------------------------------------------
// BUILD QUESTION PLAN
// ------------------------------------------------------------
//
// Useful for CRM/admin preview.
// It repeatedly simulates the question sequence WITHOUT
// changing the real customer record.

export function buildCommercialQuestionPlan({
  lead = {},
  facts = {},
  profile = {},
  channel = "crm",
  qualification = {},
  score = {},
  maxQuestions = 20,
}) {
  const simulatedFacts = {
    ...safeObject(facts),
  };

  const plan = [];

  for (
    let index = 0;
    index < maxQuestions;
    index += 1
  ) {
    const question =
      selectNextCommercialQuestion({
        lead,
        facts:
          simulatedFacts,
        profile,
        channel,
        qualification,
        score,
      });

    if (
      !question ||
      question.complete ||
      !question.key
    ) {
      break;
    }

    plan.push(question);

    // Prevent the planner from selecting
    // the exact same question repeatedly.
    //
    // This is ONLY simulation for preview,
    // not real customer data.

    for (
      const factKey of
      safeArray(
        question.fact_keys
      )
    ) {
      if (
        simulatedFacts[
          factKey
        ] === undefined
      ) {
        simulatedFacts[
          factKey
        ] =
          "__planned__";
      }
    }
  }

  return plan;
}