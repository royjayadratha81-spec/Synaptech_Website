// api/crm/ai-qualify.js
//
// CRM-only AI qualification endpoint.
//
// IMPORTANT:
// - Uses existing Firebase authentication through api/crm/_auth.js
// - Uses existing CRM organization isolation
// - Does NOT modify website lead capture
// - Does NOT modify LMS/Admin authentication
// - Does NOT modify existing chatbot APIs
//
// Flow:
//
// Existing CRM Lead
//      ↓
// Fetch lead from crm_leads
//      ↓
// Build trusted qualification evidence
//      ↓
// OpenAI structured qualification
//      ↓
// Server-side validation + deterministic safeguards
//      ↓
// crm_ai_qualifications
//      ↓
// Return qualification to CRM UI

import {
  authenticateCrmRequest,
  sendCrmError,
} from "./_auth.js";

const OPENAI_RESPONSES_URL =
  "https://api.openai.com/v1/responses";

const QUALIFICATION_VERSION = "v1";

const DEFAULT_MODEL =
  process.env.OPENAI_CRM_MODEL || "gpt-5.6-terra";

// ------------------------------------------------------------
// ENUMS
// ------------------------------------------------------------

const ALLOWED_BANDS = [
  "hot",
  "warm",
  "cold",
  "unqualified",
];

const ALLOWED_INTENT = [
  "very_high",
  "high",
  "medium",
  "low",
  "unknown",
];

const ALLOWED_BUDGET = [
  "strong",
  "possible",
  "weak",
  "unknown",
];

const ALLOWED_TIMELINE = [
  "immediate",
  "30_days",
  "90_days",
  "later",
  "unknown",
];

const ALLOWED_AUTHORITY = [
  "decision_maker",
  "influencer",
  "researcher",
  "unknown",
];

const ALLOWED_NEED = [
  "strong",
  "good",
  "partial",
  "poor",
  "unknown",
];

const ALLOWED_PRIORITY = [
  "immediate",
  "today",
  "this_week",
  "nurture",
];

// ------------------------------------------------------------
// GENERAL HELPERS
// ------------------------------------------------------------

function clamp(value, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(
    Math.max(Math.round(number), min),
    max
  );
}

function normalizeConfidence(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  // Accept both common confidence scales:
  // 0-1 (for example 0.95) and 0-100.
  if (number > 0 && number <= 1) {
    return clamp(
      number * 100,
      0,
      100
    );
  }

  return clamp(number, 0, 100);
}

function cleanText(value, maxLength = 4000) {
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

function nullableText(value, maxLength = 4000) {
  const text = cleanText(value, maxLength);

  return text || null;
}

function enumOrDefault(
  value,
  allowed,
  fallback
) {
  if (
    typeof value === "string" &&
    allowed.includes(value)
  ) {
    return value;
  }

  return fallback;
}

function getRequestBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
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

// ------------------------------------------------------------
// EXTRACT OUTPUT TEXT FROM RESPONSES API
// ------------------------------------------------------------

function extractResponseText(responseData) {
  if (
    typeof responseData?.output_text === "string" &&
    responseData.output_text.trim()
  ) {
    return responseData.output_text.trim();
  }

  const output = Array.isArray(responseData?.output)
    ? responseData.output
    : [];

  for (const item of output) {
    const contents = Array.isArray(item?.content)
      ? item.content
      : [];

    for (const content of contents) {
      if (
        typeof content?.text === "string" &&
        content.text.trim()
      ) {
        return content.text.trim();
      }
    }
  }

  return null;
}

// ------------------------------------------------------------
// CREATE SAFE LEAD SNAPSHOT
// ------------------------------------------------------------
//
// We pass CRM information to AI,
// but explicitly label missing values as unknown.
// The AI must never invent missing facts.
//

function buildLeadEvidence({
  lead,
  validation,
  conversation,
  messages,
  commercialFacts,
  score,
  qualificationState,
  engagementEvents,
}) {
  const contact =
    safeObject(lead?.contact);

  const company =
    safeObject(lead?.company);

  return {
    lead_id: lead.id || null,

    contact: {
      name:
        contact.full_name ||
        [
          contact.first_name,
          contact.last_name,
        ]
          .filter(Boolean)
          .join(" ") ||
        lead.name ||
        lead.full_name ||
        lead.contact_name ||
        null,

      email:
        contact.email ||
        lead.email ||
        lead.contact_email ||
        null,

      phone:
        contact.phone ||
        contact.whatsapp_number ||
        lead.phone ||
        lead.contact_phone ||
        null,

      organization:
        company.name ||
        lead.organization ||
        lead.organization_name ||
        lead.company_name ||
        null,

      designation:
        contact.designation ||
        null,

      city:
        contact.city ||
        company.city ||
        null,
    },

    prospect_organization: {
      name: company.name || null,
      industry:
        company.industry || null,
      company_size:
        company.company_size || null,
      website:
        company.website || null,
      city: company.city || null,
      state: company.state || null,
      country: company.country || null,
    },

    requirement:
      lead.requirement ||
      lead.requirements ||
      lead.message ||
      lead.description ||
      lead.notes ||
      null,

    crm_status: lead.status || null,

    quality_status:
      lead.quality_status || null,

    existing_lead_score:
      lead.lead_score ?? null,

    estimated_value:
      lead.estimated_value ?? null,

    source: {
      source:
        lead.source ||
        lead.lead_source ||
        null,

      medium:
        lead.medium ||
        lead.utm_medium ||
        null,

      campaign:
        lead.campaign ||
        lead.utm_campaign ||
        null,

      utm_source:
        lead.utm_source || null,

      utm_medium:
        lead.utm_medium || null,

      utm_campaign:
        lead.utm_campaign || null,

      referrer:
        lead.referrer || null,

      landing_page:
        lead.landing_page ||
        lead.page_url ||
        null,
    },

    lifecycle: {
      created_at:
        lead.created_at || null,

      updated_at:
        lead.updated_at || null,

      next_follow_up_at:
        lead.next_follow_up_at ||
        null,

      pipeline_id:
        lead.pipeline_id || null,

      stage_id:
        lead.stage_id || null,

      owner_user_id:
        lead.owner_user_id || null,
    },

    other_available_fields: {
      project_type:
        lead.project_type || null,

      business_size:
        lead.business_size || null,

      budget:
        lead.budget ||
        lead.estimated_budget ||
        null,

      timeline:
        lead.timeline || null,

      decision_authority:
        lead.decision_authority ||
        null,
    },

    validation:
      validation || null,

    ai_discovery: {
      conversation:
        conversation || null,

      messages:
        safeArray(messages).map(
          (message) => ({
            role:
              message.role || null,
            text:
              message.message_text ||
              null,
            extracted_facts:
              message.extracted_facts ||
              null,
            detected_intent:
              message.detected_intent ||
              null,
            buying_signals:
              message.buying_signals ||
              null,
            objections:
              message.objections ||
              null,
            created_at:
              message.created_at || null,
          })
        ),
    },

    commercial_facts:
      commercialFacts || null,

    authoritative_intelligence: {
      score: score || null,
      qualification_state:
        qualificationState || null,
    },

    engagement_events:
      safeArray(engagementEvents),
  };
}

// ------------------------------------------------------------
// STRUCTURED OUTPUT SCHEMA
// ------------------------------------------------------------

const qualificationSchema = {
  type: "object",

  additionalProperties: false,

  properties: {
    score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
    },

    qualification_band: {
      type: "string",
      enum: ALLOWED_BANDS,
    },

    intent_level: {
      type: "string",
      enum: ALLOWED_INTENT,
    },

    budget_fit: {
      type: "string",
      enum: ALLOWED_BUDGET,
    },

    timeline_fit: {
      type: "string",
      enum: ALLOWED_TIMELINE,
    },

    decision_authority: {
      type: "string",
      enum: ALLOWED_AUTHORITY,
    },

    need_fit: {
      type: "string",
      enum: ALLOWED_NEED,
    },

    project_type: {
      type: "string",
    },

    estimated_budget: {
      type: "string",
    },

    business_size: {
      type: "string",
    },

    requirements_summary: {
      type: "string",
    },

    pain_points: {
      type: "string",
    },

    buying_signals: {
      type: "string",
    },

    objections: {
      type: "string",
    },

    qualification_reason: {
      type: "string",
    },

    recommended_action: {
      type: "string",
    },

    recommended_priority: {
      type: "string",
      enum: ALLOWED_PRIORITY,
    },

    ai_confidence: {
      type: "number",
      minimum: 0,
      maximum: 100,
    },

    conversation_summary: {
      type: "string",
    },
  },

  required: [
    "score",
    "qualification_band",
    "intent_level",
    "budget_fit",
    "timeline_fit",
    "decision_authority",
    "need_fit",
    "project_type",
    "estimated_budget",
    "business_size",
    "requirements_summary",
    "pain_points",
    "buying_signals",
    "objections",
    "qualification_reason",
    "recommended_action",
    "recommended_priority",
    "ai_confidence",
    "conversation_summary",
  ],
};

// ------------------------------------------------------------
// QUALIFICATION INSTRUCTIONS
// ------------------------------------------------------------
//
// This is deliberately generic.
// We do NOT hard-code Synaptech pricing or products.
//
// Later:
// organization-specific ICP configuration
// can be stored in CRM settings.
//

function buildQualificationInstructions(
  organization
) {
  return `
You are an enterprise-grade AI lead qualification engine
inside a CRM.

You are evaluating a lead for:

Organization:
${organization?.name || "Unknown organization"}

Your task is NOT merely to summarize the lead.

You must evaluate:

1. Commercial buying intent
2. Strength and clarity of need
3. Project seriousness
4. Budget evidence or budget probability
5. Purchase timeline
6. Decision-making authority
7. Commercial fit
8. Urgency
9. Buying signals
10. Objections or friction
11. Data completeness
12. Engagement quality
13. Source and campaign context
14. Sales-readiness
15. Recommended next sales action

CRITICAL RULES:

- Never invent information.
- Never assume budget exists when none is stated.
- Never assume someone is a decision-maker.
- Never invent company size.
- Never invent project timelines.
- Never invent conversations.
- Treat crm_contacts and crm_companies as the authoritative
  contact and prospect-organization records.
- Treat AI discovery messages and commercial_facts as explicit
  evidence when they contain customer-supplied answers.
- The authenticated CRM organization is the seller/tenant; it is
  not the prospect organization.
- authoritative_intelligence is produced by deterministic shared
  CRM engines. Do not contradict its invalid, disqualified,
  sales-ready, score, band or routing decisions.
- Return ai_confidence as a percentage from 0 to 100. For
  example, return 95 for ninety-five percent, not 0.95.
- Missing information must be represented as unknown.
- Do not exaggerate qualification because a lead submitted a form.
- A lead with only name/email/phone must NOT automatically
  receive a high score.
- A specific requirement is stronger than a vague enquiry.
- Stated commercial intent is stronger than general curiosity.
- Explicit budget is stronger than inferred budget.
- Explicit timeline is stronger than inferred urgency.
- Decision-maker involvement is a strong positive signal.
- Very weak or spam-like enquiries should score low.
- Research-only intent should not be treated as purchase intent.
- Do not penalize a lead merely because optional fields are absent,
  but reduce confidence where evidence is incomplete.

SCORING PHILOSOPHY:

90-100:
Exceptional buying intent, strong fit, high urgency,
credible authority and strong commercial evidence.

75-89:
Strong qualified opportunity with meaningful buying signals.

55-74:
Promising but requires discovery or qualification.

35-54:
Early-stage or weak commercial evidence.

0-34:
Very low intent, unsuitable, spam-like, or clearly unqualified.

QUALIFICATION BAND:

hot:
Normally 75+, unless evidence quality does not justify it.

warm:
Normally 50-74.

cold:
Normally 25-49.

unqualified:
Normally below 25 or clearly unsuitable/spam/non-commercial.

RECOMMENDED PRIORITY:

immediate:
High-value / high-intent lead needing rapid contact.

today:
Strong lead worth contacting the same business day.

this_week:
Potential opportunity requiring structured follow-up.

nurture:
Weak/early lead requiring education, future follow-up,
or additional qualification.

Your response must be structured JSON only and must conform
exactly to the supplied schema.

Use "unknown" or an empty string when evidence does not exist.
`.trim();
}

// ------------------------------------------------------------
// CALL OPENAI
// ------------------------------------------------------------

async function runAiQualification({
  leadEvidence,
  organization,
}) {
  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const error = new Error(
      "OpenAI API key is not configured."
    );

    error.statusCode = 500;

    throw error;
  }

  const payload = {
    model: DEFAULT_MODEL,

    reasoning: {
      effort: "medium",
    },

    instructions:
      buildQualificationInstructions(
        organization
      ),

    input: [
      {
        role: "user",

        content: [
          {
            type: "input_text",

            text:
              "Qualify this CRM lead using only the supplied evidence.\n\n" +
              JSON.stringify(
                leadEvidence,
                null,
                2
              ),
          },
        ],
      },
    ],

    text: {
      format: {
        type: "json_schema",

        name:
          "crm_lead_qualification",

        strict: true,

        schema:
          qualificationSchema,
      },
    },
  };

  const response = await fetch(
    OPENAI_RESPONSES_URL,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${apiKey}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "CRM AI qualification OpenAI error:",
      data
    );

    const error = new Error(
      "AI qualification service failed."
    );

    error.statusCode = 502;

    throw error;
  }

  const outputText =
    extractResponseText(data);

  if (!outputText) {
    console.error(
      "CRM AI qualification returned no output:",
      data
    );

    const error = new Error(
      "AI qualification returned no result."
    );

    error.statusCode = 502;

    throw error;
  }

  let parsed;

  try {
    parsed = JSON.parse(outputText);
  } catch (parseError) {
    console.error(
      "CRM AI qualification JSON parse error:",
      parseError,
      outputText
    );

    const error = new Error(
      "AI qualification returned an invalid result."
    );

    error.statusCode = 502;

    throw error;
  }

  return {
    result: parsed,
    responseId: data.id || null,
    model:
      data.model ||
      DEFAULT_MODEL,
    usage:
      data.usage || null,
  };
}

// ------------------------------------------------------------
// SERVER-SIDE VALIDATION
// ------------------------------------------------------------
//
// AI is an interpretation layer.
// Server logic remains authoritative.
//

function normalizeQualification(
  aiResult,
  {
    authoritativeScore = null,
    qualificationState = null,
  } = {}
) {
  let score = clamp(
    aiResult?.score,
    0,
    100
  );

  const sharedScore =
    Number(
      authoritativeScore
        ?.overall_score
    );

  const hasSharedScore =
    Number.isFinite(sharedScore);

  if (hasSharedScore) {
    score = clamp(
      sharedScore,
      0,
      100
    );
  }

  const authoritativeInvalid =
    authoritativeScore
      ?.routing_band === "invalid" ||
    qualificationState
      ?.qualification_stage ===
        "disqualified" ||
    qualificationState
      ?.sales_ready_status ===
        "disqualified";

  if (authoritativeInvalid) {
    score = 0;
  }

  const intentLevel =
    enumOrDefault(
      aiResult?.intent_level,
      ALLOWED_INTENT,
      "unknown"
    );

  const budgetFit =
    enumOrDefault(
      aiResult?.budget_fit,
      ALLOWED_BUDGET,
      "unknown"
    );

  const timelineFit =
    enumOrDefault(
      aiResult?.timeline_fit,
      ALLOWED_TIMELINE,
      "unknown"
    );

  const decisionAuthority =
    enumOrDefault(
      aiResult?.decision_authority,
      ALLOWED_AUTHORITY,
      "unknown"
    );

  const needFit =
    enumOrDefault(
      aiResult?.need_fit,
      ALLOWED_NEED,
      "unknown"
    );

  // ----------------------------------------------------------
  // DETERMINISTIC SAFEGUARDS
  // ----------------------------------------------------------
  //
  // The AI proposes a score.
  // These rules stop obviously under-qualified
  // leads from becoming "hot" because of model optimism.
  //

  const strongSignals = [
    intentLevel === "very_high",
    intentLevel === "high",
    needFit === "strong",
    budgetFit === "strong",
    timelineFit === "immediate",
    timelineFit === "30_days",
    decisionAuthority ===
      "decision_maker",
  ].filter(Boolean).length;

  // A lead cannot be 90+ without
  // multiple strong commercial signals.
  if (
    !hasSharedScore &&
    score >= 90 &&
    strongSignals < 4
  ) {
    score = 89;
  }

  // A lead cannot remain "hot-level"
  // with almost no strong evidence.
  if (
    !hasSharedScore &&
    score >= 75 &&
    strongSignals < 2
  ) {
    score = 74;
  }

  let qualificationBand;

  if (score >= 75) {
    qualificationBand = "hot";
  } else if (score >= 50) {
    qualificationBand = "warm";
  } else if (score >= 25) {
    qualificationBand = "cold";
  } else {
    qualificationBand =
      "unqualified";
  }

  let recommendedPriority =
    enumOrDefault(
      aiResult?.recommended_priority,
      ALLOWED_PRIORITY,
      "nurture"
    );

  if (authoritativeInvalid) {
    recommendedPriority =
      "nurture";
  }

  // Priority should align with
  // final validated score.

  if (score >= 85) {
    recommendedPriority =
      "immediate";
  } else if (score >= 70) {
    if (
      recommendedPriority ===
      "nurture"
    ) {
      recommendedPriority =
        "today";
    }
  } else if (score < 40) {
    recommendedPriority =
      "nurture";
  }

  return {
    score,

    qualification_band:
      qualificationBand,

    intent_level:
      intentLevel,

    budget_fit:
      budgetFit,

    timeline_fit:
      timelineFit,

    decision_authority:
      decisionAuthority,

    need_fit:
      needFit,

    project_type:
      nullableText(
        aiResult?.project_type,
        500
      ),

    estimated_budget:
      nullableText(
        aiResult?.estimated_budget,
        500
      ),

    business_size:
      nullableText(
        aiResult?.business_size,
        500
      ),

    requirements_summary:
      nullableText(
        aiResult?.requirements_summary,
        5000
      ),

    pain_points:
      nullableText(
        aiResult?.pain_points,
        5000
      ),

    buying_signals:
      nullableText(
        aiResult?.buying_signals,
        5000
      ),

    objections:
      nullableText(
        aiResult?.objections,
        5000
      ),

    qualification_reason:
      nullableText(
        aiResult?.qualification_reason,
        5000
      ),

    recommended_action:
      authoritativeInvalid
        ? "Do not route to active sales until reviewed."
        : nullableText(
            aiResult?.recommended_action,
            5000
          ),

    recommended_priority:
      recommendedPriority,

    ai_confidence:
      normalizeConfidence(
        aiResult?.ai_confidence
      ),

    conversation_summary:
      nullableText(
        aiResult?.conversation_summary,
        5000
      ),
  };
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
    // --------------------------------------------------------
    // Existing Firebase + CRM authentication
    // --------------------------------------------------------

    const {
      crmUser,
      organization,
      supabase,
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

    // --------------------------------------------------------
    // Fetch lead with strict organization scoping
    // --------------------------------------------------------

    const {
      data: lead,
      error: leadError,
    } = await supabase
      .from("crm_leads")
      .select(`
        *,
        company:crm_companies (
          id,
          name,
          website,
          industry,
          company_size,
          phone,
          email,
          city,
          state,
          country
        ),
        contact:crm_contacts (
          id,
          first_name,
          last_name,
          full_name,
          email,
          phone,
          whatsapp_number,
          designation,
          department,
          city,
          state,
          country
        )
      `)
      .eq("id", leadId)
      .eq(
        "organization_id",
        organization.id
      )
      .maybeSingle();

    if (leadError) {
      console.error(
        "CRM AI lead lookup failed:",
        leadError
      );

      const error = new Error(
        "Unable to load CRM lead."
      );

      error.statusCode = 500;

      throw error;
    }

    if (!lead) {
      return res.status(404).json({
        error:
          "CRM lead not found.",
      });
    }

    // --------------------------------------------------------
    // Load the complete organization-scoped CRM evidence
    // --------------------------------------------------------

    const [
      validationResult,
      conversationResult,
      commercialFactsResult,
      scoreResult,
      qualificationStateResult,
      engagementResult,
    ] = await Promise.all([
      supabase
        .from("crm_lead_validations")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("lead_id", lead.id)
        .order("updated_at", { ascending: false })
        .limit(1),

      supabase
        .from("crm_ai_conversations")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("lead_id", lead.id)
        .order("updated_at", { ascending: false })
        .limit(1),

      supabase
        .from("crm_commercial_qualification_facts")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("lead_id", lead.id)
        .eq("business_unit", "business_solutions")
        .maybeSingle(),

      supabase
        .from("crm_lead_scores")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("lead_id", lead.id)
        .order("updated_at", { ascending: false })
        .limit(1),

      supabase
        .from("crm_lead_qualification_states")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("lead_id", lead.id)
        .order("updated_at", { ascending: false })
        .limit(1),

      supabase
        .from("crm_engagement_events")
        .select(`
          event_type,
          event_value,
          metadata,
          occurred_at
        `)
        .eq("organization_id", organization.id)
        .eq("lead_id", lead.id)
        .order("occurred_at", { ascending: true })
        .limit(250),
    ]);

    const evidenceResults = [
      validationResult,
      conversationResult,
      commercialFactsResult,
      scoreResult,
      qualificationStateResult,
      engagementResult,
    ];

    const evidenceError =
      evidenceResults.find(
        (result) => result?.error
      )?.error;

    if (evidenceError) {
      console.error(
        "CRM AI qualification evidence lookup failed:",
        evidenceError
      );

      const error = new Error(
        "Unable to load complete CRM qualification evidence."
      );

      error.statusCode = 500;
      throw error;
    }

    const validation =
      validationResult.data?.[0] || null;

    const conversation =
      conversationResult.data?.[0] || null;

    const commercialFacts =
      commercialFactsResult.data || null;

    const authoritativeScore =
      scoreResult.data?.[0] || null;

    const qualificationState =
      qualificationStateResult.data?.[0] || null;

    const engagementEvents =
      engagementResult.data || [];

    let messages = [];

    if (conversation?.id) {
      const {
        data: messageRows,
        error: messageError,
      } = await supabase
        .from("crm_ai_messages")
        .select(`
          role,
          message_text,
          extracted_facts,
          detected_intent,
          buying_signals,
          objections,
          created_at
        `)
        .eq("organization_id", organization.id)
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (messageError) {
        console.error(
          "CRM AI qualification message lookup failed:",
          messageError
        );

        const error = new Error(
          "Unable to load CRM discovery messages."
        );

        error.statusCode = 500;
        throw error;
      }

      messages = messageRows || [];
    }

    // --------------------------------------------------------
    // Build trusted evidence
    // --------------------------------------------------------

    const leadEvidence =
      buildLeadEvidence({
        lead,
        validation,
        conversation,
        messages,
        commercialFacts,
        score: authoritativeScore,
        qualificationState,
        engagementEvents,
      });

    // --------------------------------------------------------
    // AI qualification
    // --------------------------------------------------------

    const ai =
      await runAiQualification({
        leadEvidence,
        organization,
      });

    // --------------------------------------------------------
    // Server-side deterministic validation
    // --------------------------------------------------------

    const qualification =
      normalizeQualification(
        ai.result,
        {
          authoritativeScore,
          qualificationState,
        }
      );

    // --------------------------------------------------------
    // Save / update qualification
    // --------------------------------------------------------

    const qualificationRow = {
      organization_id:
        organization.id,

      lead_id:
        lead.id,

      qualification_version:
        QUALIFICATION_VERSION,

      score:
        qualification.score,

      qualification_band:
        qualification.qualification_band,

      intent_level:
        qualification.intent_level,

      budget_fit:
        qualification.budget_fit,

      timeline_fit:
        qualification.timeline_fit,

      decision_authority:
        qualification.decision_authority,

      need_fit:
        qualification.need_fit,

      project_type:
        qualification.project_type,

      estimated_budget:
        qualification.estimated_budget,

      business_size:
        qualification.business_size,

      requirements_summary:
        qualification.requirements_summary,

      pain_points:
        qualification.pain_points,

      buying_signals:
        qualification.buying_signals,

      objections:
        qualification.objections,

      qualification_reason:
        qualification.qualification_reason,

      recommended_action:
        qualification.recommended_action,

      recommended_priority:
        qualification.recommended_priority,

      ai_confidence:
        qualification.ai_confidence,

      conversation_summary:
        qualification.conversation_summary,

      model_name:
        ai.model,

      updated_at:
        new Date().toISOString(),
    };

    const {
      data: savedQualification,
      error: saveError,
    } = await supabase
      .from(
        "crm_ai_qualifications"
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
      console.error(
        "CRM AI qualification save failed:",
        saveError
      );

      const error = new Error(
        "Unable to save AI qualification."
      );

      error.statusCode = 500;

      throw error;
    }

    // --------------------------------------------------------
    // Return CRM-safe response
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      qualification:
        savedQualification,

      lead: {
        id: lead.id,

        name:
          lead.contact?.full_name ||
          [
            lead.contact?.first_name,
            lead.contact?.last_name,
          ]
            .filter(Boolean)
            .join(" ") ||
          lead.name ||
          lead.full_name ||
          lead.contact_name ||
          null,

        email:
          lead.contact?.email ||
          lead.email ||
          lead.contact_email ||
          null,

        phone:
          lead.contact?.phone ||
          lead.contact
            ?.whatsapp_number ||
          lead.phone ||
          lead.contact_phone ||
          null,

        company:
          lead.company?.name ||
          null,
      },

      organization: {
        id: organization.id,
        name: organization.name,
      },

      prospect_organization: {
        id:
          lead.company?.id || null,
        name:
          lead.company?.name || null,
      },

      qualified_by: {
        crm_user_id:
          crmUser.id,

        model:
          ai.model,

        qualification_version:
          QUALIFICATION_VERSION,

        response_id:
          ai.responseId,
      },
    });
  } catch (error) {
    return sendCrmError(
      res,
      error
    );
  }
}
