// api/crm/ai-conversation.js
//
// CRM Interactive AI Qualification Conversation Engine
//
// IMPORTANT:
// - CRM only.
// - Reuses existing Firebase + CRM authentication.
// - Organization isolated.
// - Does NOT modify LMS/Admin authentication.
// - Does NOT modify website lead capture.
// - Does NOT modify existing chatbot APIs.
// - Does NOT replace ai-qualify.js.
// - Never invents missing customer information.

import {
  authenticateCrmRequest,
  sendCrmError,
} from "./_auth.js";
import { getAdmissionsCatalogueEvidence } from "../_shared/admissions-programme-catalogue.js";

const OPENAI_RESPONSES_URL =
  "https://api.openai.com/v1/responses";

const DEFAULT_MODEL =
  process.env.OPENAI_CRM_MODEL || "gpt-5.6-terra";

const CONVERSATION_VERSION = "v1";

const BUSINESS_FIELDS = [
  "product_interest",
  "organization_type",
  "business_problem",
  "current_system",
  "number_of_users",
  "must_have_features",
  "integrations",
  "migration_requirement",
  "platform_requirement",
  "white_label_requirement",
  "timeline",
  "budget_range",
  "decision_authority",
  "decision_process",
];

const ADMISSIONS_FIELDS = [
  "enquiry_relation",
  "course_interest",
  "advanced_programme_recommendation",
  "educational_background",
  "graduation_status",
  "location",
  "preferred_mode",
  "joining_timeline",
  "career_goal",
  "prior_experience",
  "counselling_interest",
  "fee_readiness",
  "fast_track_interest",
  "payment_preference",
  "decision_authority",
  "decision_authority_status",
  "placement_support_required",
  "preferred_callback_time",
  "whatsapp_consent",
  "ai_call_consent",
  "human_handoff",
];

function cleanText(value, maxLength = 5000) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function getRequestBody(req) {
  if (!req.body) return {};

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
}

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

function safeObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clamp(value, min = 0, max = 100) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(
    Math.max(Math.round(number), min),
    max
  );
}

function normalizeBusinessUnit(value) {
  if (value === "admissions") return "admissions";

  if (
    value === "business_solutions" ||
    value === "business solutions"
  ) {
    return "business_solutions";
  }

  return "unclassified";
}

function inferBusinessUnit({
  lead,
  validation,
  existingConversation,
}) {
  const existing = normalizeBusinessUnit(
    existingConversation?.business_unit
  );

  if (existing !== "unclassified") {
    return existing;
  }

  const validationUnit = normalizeBusinessUnit(
    validation?.business_unit
  );

  if (validationUnit !== "unclassified") {
    return validationUnit;
  }

  const evidence = [
    lead?.title,
    lead?.requirement,
    lead?.requirements,
    lead?.message,
    lead?.description,
    lead?.project_type,
    lead?.source,
    lead?.campaign,
    lead?.utm_campaign,
    lead?.landing_page,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const businessTerms = [
    "lms",
    "crm",
    "erp",
    "hrms",
    "website",
    "software",
    "application",
    "app development",
    "custom software",
    "business management",
    "lead management",
    "institution management",
  ];

  const admissionsTerms = [
    "admission",
    "course",
    "data science",
    "data analytics",
    "generative ai",
    "agentic ai",
    "student",
    "training",
    "certification",
    "placement",
    "fee",
    "batch",
  ];

  const businessMatches =
    businessTerms.filter((term) =>
      evidence.includes(term)
    ).length;

  const admissionsMatches =
    admissionsTerms.filter((term) =>
      evidence.includes(term)
    ).length;

  if (businessMatches > admissionsMatches) {
    return "business_solutions";
  }

  if (admissionsMatches > businessMatches) {
    return "admissions";
  }

  return "unclassified";
}

function buildLeadSnapshot(lead) {
  return {
    lead_id: lead.id || null,

    contact: {
      name:
        lead.name ||
        lead.full_name ||
        lead.contact_name ||
        null,

      email:
        lead.email ||
        lead.contact_email ||
        null,

      phone:
        lead.phone ||
        lead.contact_phone ||
        null,

      organization:
        lead.organization ||
        lead.organization_name ||
        lead.company_name ||
        null,
    },

    requirement:
      lead.requirement ||
      lead.requirements ||
      lead.message ||
      lead.description ||
      lead.notes ||
      null,

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

      landing_page:
        lead.landing_page ||
        lead.page_url ||
        null,
    },

    crm: {
      status: lead.status || null,
      quality_status:
        lead.quality_status || null,
      lead_score:
        lead.lead_score ?? null,
      estimated_value:
        lead.estimated_value ?? null,
    },

    available_commercial_fields: {
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
  };
}

const conversationSchema = {
  type: "object",

  additionalProperties: false,

  properties: {
    assistant_message: {
      type: "string",
    },

    current_objective: {
      type: "string",
    },

    extracted_facts: {
  type: "array",

  items: {
    type: "object",

    additionalProperties: false,

    properties: {
      field: {
        type: "string",
      },

      value: {
        type: "string",
      },
    },

    required: [
      "field",
      "value",
    ],
  },
},

    missing_fields: {
      type: "array",
      items: {
        type: "string",
      },
    },

    questions_answered: {
      type: "array",
      items: {
        type: "string",
      },
    },

    buying_signals: {
      type: "array",
      items: {
        type: "string",
      },
    },

    objections: {
      type: "array",
      items: {
        type: "string",
      },
    },

    detected_intent: {
      type: "string",
      enum: [
        "very_high",
        "high",
        "medium",
        "low",
        "unknown",
      ],
    },

    sentiment: {
      type: "string",
      enum: [
        "positive",
        "neutral",
        "negative",
        "mixed",
        "unknown",
      ],
    },

    ai_confidence: {
      type: "integer",
      minimum: 0,
      maximum: 100,
    },

    qualification_ready: {
      type: "boolean",
    },

    human_handoff_required: {
      type: "boolean",
    },

    human_handoff_reason: {
      type: "string",
    },

    conversation_status: {
      type: "string",
      enum: [
        "active",
        "completed",
        "qualified",
        "nurture",
        "review",
      ],
    },

    conversation_summary: {
      type: "string",
    },
  },

  required: [
    "assistant_message",
    "current_objective",
    "extracted_facts",
    "missing_fields",
    "questions_answered",
    "buying_signals",
    "objections",
    "detected_intent",
    "sentiment",
    "ai_confidence",
    "qualification_ready",
    "human_handoff_required",
    "human_handoff_reason",
    "conversation_status",
    "conversation_summary",
  ],
};

function buildInstructions({
  organization,
  businessUnit,
}) {
  const targetFields =
    businessUnit === "admissions"
      ? ADMISSIONS_FIELDS
      : businessUnit === "business_solutions"
        ? BUSINESS_FIELDS
        : [
            "requirement_type",
            "primary_need",
            "timeline",
          ];

  return `
You are an enterprise-grade conversational lead
qualification engine operating inside a CRM.

Organization:
${organization?.name || "Unknown organization"}

Business unit:
${businessUnit}

Your purpose is to progressively qualify a real
prospect through a natural conversation.

This is NOT a generic customer-support chatbot.

You must:

1. Understand everything already known.
2. Extract facts from the latest customer reply.
3. Preserve previously established facts.
4. Identify commercially important missing information.
5. Ask the SINGLE highest-value next question.
6. Avoid asking for information already supplied.
7. Never invent customer facts.
8. Never invent budget, authority, timeline, company
   size, student profile, user count or intent.
9. Keep questions natural and concise.
10. Do not interrogate the customer with a long form.
11. Adapt the conversation to the customer's replies.
12. Recognize buying signals and objections.
13. Decide when sufficient evidence exists for human
    handoff.
14. Stop unnecessary questioning when a high-intent
    prospect explicitly asks for a demo, quotation,
    counsellor, call or human representative.
15. Never claim that the customer is qualified merely
    because they submitted a form.
16. If the customer gives ambiguous information,
    preserve uncertainty.
17. Do not ask for sensitive personal information.
18. Do not discuss internal lead scores, spam rules,
    CPL calculations or internal CRM classifications
    with the customer.

Important target fields for this business unit:

${JSON.stringify(targetFields, null, 2)}

BUSINESS SOLUTIONS GUIDANCE:

For business_solutions, progressively understand:
product/solution required, organization context,
business problem, current process/system, approximate
users or scale, essential features, integrations,
migration, platform/white-label needs, timeline,
budget range, authority and decision process.

Do NOT require every field before handoff.
A strong explicit buying signal can justify earlier
human involvement.

ADMISSIONS GUIDANCE:

For admissions, progressively understand:
course interest, educational background, location,
preferred learning mode, joining timeframe, career
objective, placement-support requirement, the actual
decision-maker, whether that decision-maker agrees in
principle, payment preference, counselling interest and
realistic fee readiness.

Use the supplied admissions_catalogue as the only source
for programme duration, price, discount, EMI, schedule,
learning-mode and placement-support facts.

When asking course interest, explicitly present these
options: Data Analytics; Data Science; Data Science with
Gen AI & Agentic AI; or Need help choosing.

If the prospect selects Data Analytics or Data Science,
do not offer a programme comparison at that stage. First
give one concise advisory explanation: combining Data
Science with Generative AI and Agentic AI adds current AI
skills, broader AI-oriented roles and stronger long-term
career scope, while learning still begins from the
foundations. Then ask whether the prospect wants to keep
the original selection or consider Data Science with Gen
AI & Agentic AI. Record this response as
advanced_programme_recommendation. Respect the original
choice if the prospect wants to retain it, without further
pressure. Ask the full programme/fee comparison question
only later at the counselling-interest stage.

Weekend classes are standard. Do not ask whether the
student prefers weekdays. Mention weekday classes only as
subject to management approval and student availability.

Never say fees vary by Online, Offline or Hybrid mode.
The fee is the same for all three modes.

Only Data Science with Gen AI & Agentic AI has a fast-track
option. Its regular duration is 10 months and fast-track
duration is 6 months. Do not offer fast-track for Data
Analytics or Data Science.

If asked about fees, answer directly from the catalogue.
After explaining the applicable fee, ask whether the
student prefers one-time payment or no-cost EMI.

Before completing qualification, establish payment
preference, who makes the
final decision and whether that person agrees in principle.
Also establish whether placement assistance is required.

When placement support is discussed, explain the exact
support in the catalogue. Never guarantee employment,
salary, selection by an MNC or admission.

When qualification is sufficiently complete, briefly
summarise the chosen programme and payment preference,
say that the programme brochure is ready, and hand over to
the appropriate human counsellor if requested.

Do not pressure students.
Do not make placement, salary or admission guarantees.

NEXT-BEST-QUESTION POLICY:

Normally ask exactly ONE question in
assistant_message.

Select the question that provides the greatest
qualification value given what is still unknown.

Do not repeat questions.

If enough information exists, assistant_message
should naturally acknowledge the prospect and explain
that the appropriate human team can take over instead
of asking another qualification question.

HUMAN HANDOFF:

Set human_handoff_required=true when appropriate,
including when:
- a strong prospect requests a demo/call/proposal;
- a student requests counselling and sufficient
  context exists;
- commercial intent is strong and continued automated
  questioning would add little value;
- the conversation needs human judgment;
- the customer is frustrated or explicitly asks for
  a person.

QUALIFICATION_READY:

This means enough evidence exists for downstream
qualification/scoring. It does NOT mean automatically
"hot" or "won".
EXTRACTED FACTS FORMAT:

Return extracted_facts as an array of objects.

Each object must contain exactly:

{
  "field": "field_name",
  "value": "value supplied or clearly established by the customer"
}

Example:

[
  {
    "field": "number_of_users",
    "value": "1050"
  },
  {
    "field": "timeline",
    "value": "within 2 months"
  }
]

If no new facts were established in this turn,
return an empty array.

Never invent a value.

Return structured JSON only.
`.trim();
}

async function runConversationAi({
  organization,
  businessUnit,
  leadSnapshot,
  validation,
  conversation,
  recentMessages,
  customerMessage,
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

  const evidence = {
    lead: leadSnapshot,

    validation: validation
  ? {
      validation_status:
        validation.validation_status ||
        null,

      validation_score:
        validation.validation_score ??
        null,

      validation_confidence:
        validation.validation_confidence ??
        null,

      spam_score:
        validation.spam_score ??
        null,

      completeness_score:
        validation.completeness_score ??
        null,

      business_unit:
        validation.business_unit ||
        null,

      business_unit_confidence:
        validation.business_unit_confidence ??
        null,

      duplicate_status:
        validation.duplicate_status ||
        null,

      positive_signals:
        validation.positive_signals || [],

      warning_signals:
        validation.warning_signals || [],

      blocking_signals:
        validation.blocking_signals || [],
    }
  : null,

    conversation_memory: {
      known_facts:
        safeObject(
          conversation?.known_facts
        ),

      extracted_profile:
        safeObject(
          conversation?.extracted_profile
        ),

      missing_fields:
        safeArray(
          conversation?.missing_fields
        ),

      conversation_summary:
        conversation?.conversation_summary ||
        null,

      interaction_count:
        conversation?.interaction_count ||
        0,
    },

    recent_messages:
      recentMessages.map((message) => ({
        role: message.role,
        message_text:
          message.message_text,
        created_at:
          message.created_at,
      })),

    latest_customer_message:
      customerMessage || null,
  };

  if (businessUnit === "admissions") {
    evidence.admissions_catalogue =
      getAdmissionsCatalogueEvidence();
  }

  const payload = {
    model: DEFAULT_MODEL,

    reasoning: {
      effort: "medium",
    },

    instructions:
      buildInstructions({
        organization,
        businessUnit,
      }),

    input: [
      {
        role: "user",

        content: [
          {
            type: "input_text",

            text:
              "Continue this CRM qualification conversation using only the supplied evidence.\n\n" +
              JSON.stringify(
                evidence,
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
          "crm_ai_conversation_turn",

        strict: true,

        schema:
          conversationSchema,
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

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "CRM AI conversation OpenAI error:",
      data
    );

    const error = new Error(
      "AI conversation service failed."
    );

    error.statusCode = 502;
    throw error;
  }

  const outputText =
    extractResponseText(data);

  if (!outputText) {
    const error = new Error(
      "AI conversation returned no result."
    );

    error.statusCode = 502;
    throw error;
  }

  let parsed;

  try {
    parsed =
      JSON.parse(outputText);
  } catch (parseError) {
    console.error(
      "CRM AI conversation JSON parse error:",
      parseError,
      outputText
    );

    const error = new Error(
      "AI conversation returned an invalid result."
    );

    error.statusCode = 502;
    throw error;
  }

  return {
    result: parsed,
    model:
      data.model || DEFAULT_MODEL,
    responseId:
      data.id || null,
    usage:
      data.usage || null,
  };
}
function normalizeExtractedFacts(value) {
  if (!Array.isArray(value)) {
    return {};
  }

  const facts = {};

  for (const item of value) {
    const field =
      cleanText(
        item?.field,
        100
      );

    const factValue =
      cleanText(
        item?.value,
        2000
      );

    if (
      field &&
      factValue
    ) {
      facts[field] =
        factValue;
    }
  }

  return facts;
}
function normalizeAiResult(result) {
  const allowedIntent = [
    "very_high",
    "high",
    "medium",
    "low",
    "unknown",
  ];

  const allowedSentiment = [
    "positive",
    "neutral",
    "negative",
    "mixed",
    "unknown",
  ];

  const allowedStatus = [
    "active",
    "completed",
    "qualified",
    "nurture",
    "review",
  ];

  return {
    assistant_message:
      cleanText(
        result?.assistant_message,
        4000
      ),

    current_objective:
      cleanText(
        result?.current_objective,
        1000
      ),

    extracted_facts:
  normalizeExtractedFacts(
    result?.extracted_facts
  ),

    missing_fields:
      safeArray(
        result?.missing_fields
      )
        .map((item) =>
          cleanText(item, 100)
        )
        .filter(Boolean)
        .slice(0, 30),

    questions_answered:
      safeArray(
        result?.questions_answered
      )
        .map((item) =>
          cleanText(item, 200)
        )
        .filter(Boolean)
        .slice(0, 30),

    buying_signals:
      safeArray(
        result?.buying_signals
      )
        .map((item) =>
          cleanText(item, 500)
        )
        .filter(Boolean)
        .slice(0, 20),

    objections:
      safeArray(
        result?.objections
      )
        .map((item) =>
          cleanText(item, 500)
        )
        .filter(Boolean)
        .slice(0, 20),

    detected_intent:
      allowedIntent.includes(
        result?.detected_intent
      )
        ? result.detected_intent
        : "unknown",

    sentiment:
      allowedSentiment.includes(
        result?.sentiment
      )
        ? result.sentiment
        : "unknown",

    ai_confidence:
      clamp(
        result?.ai_confidence
      ),

    qualification_ready:
      result?.qualification_ready ===
      true,

    human_handoff_required:
      result?.human_handoff_required ===
      true,

    human_handoff_reason:
      cleanText(
        result?.human_handoff_reason,
        2000
      ),

    conversation_status:
      allowedStatus.includes(
        result?.conversation_status
      )
        ? result.conversation_status
        : "active",

    conversation_summary:
      cleanText(
        result?.conversation_summary,
        5000
      ),
  };
}

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
      error: "Method not allowed.",
    });
  }

  try {
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

    const customerMessage =
      cleanText(
        body?.message ||
        body?.customer_message,
        5000
      );

    if (!leadId) {
      return res.status(400).json({
        error:
          "lead_id is required.",
      });
    }

    // ----------------------------------------------------------
    // Load lead with organization isolation
    // ----------------------------------------------------------

    const {
      data: lead,
      error: leadError,
    } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("id", leadId)
      .eq(
        "organization_id",
        organization.id
      )
      .maybeSingle();

    if (leadError) {
      console.error(
        "CRM conversation lead lookup failed:",
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

    // ----------------------------------------------------------
    // Load latest validation evidence
    // ----------------------------------------------------------

    const {
      data: validationRows,
      error: validationError,
    } = await supabase
      .from("crm_lead_validations")
      .select("*")
      .eq("lead_id", lead.id)
      .eq(
        "organization_id",
        organization.id
      )
      .order(
        "created_at",
        { ascending: false }
      )
      .limit(1);

    if (validationError) {
      console.error(
        "CRM validation lookup failed:",
        validationError
      );

      const error = new Error(
        "Unable to load lead validation."
      );

      error.statusCode = 500;
      throw error;
    }

    const validation =
      validationRows?.[0] || null;

    // ----------------------------------------------------------
    // Find existing active conversation
    // ----------------------------------------------------------

    const {
      data: existingRows,
      error: conversationLookupError,
    } = await supabase
      .from("crm_ai_conversations")
      .select("*")
      .eq("lead_id", lead.id)
      .eq(
        "organization_id",
        organization.id
      )
      .in("status", [
        "active",
        "paused",
        "review",
      ])
      .order(
        "updated_at",
        { ascending: false }
      )
      .limit(1);

    if (conversationLookupError) {
      console.error(
        "CRM conversation lookup failed:",
        conversationLookupError
      );

      const error = new Error(
        "Unable to load AI conversation."
      );

      error.statusCode = 500;
      throw error;
    }

    let conversation =
      existingRows?.[0] || null;

    const businessUnit =
      inferBusinessUnit({
        lead,
        validation,
        existingConversation:
          conversation,
      });

    // ----------------------------------------------------------
    // Create conversation if needed
    // ----------------------------------------------------------

    if (!conversation) {
      const {
        data: createdConversation,
        error: createError,
      } = await supabase
        .from(
          "crm_ai_conversations"
        )
        .insert({
          organization_id:
            organization.id,

          lead_id:
            lead.id,

          conversation_type:
            businessUnit === "admissions"
              ? "admissions"
              : businessUnit ===
                  "business_solutions"
                ? "business_discovery"
                : "qualification",

          business_unit:
            businessUnit,

          channel:
            cleanText(
              body?.channel,
              50
            ) || "crm",

          status:
            "active",

          consent_status:
            cleanText(
              body?.consent_status,
              50
            ) || "unknown",

          known_facts:
            buildLeadSnapshot(
              lead
            ),

          extracted_profile: {},

          missing_fields: [],

          interaction_count: 0,

          qualification_ready:
            false,

          human_handoff_required:
            false,
        })
        .select("*")
        .single();

      if (createError) {
        console.error(
          "CRM conversation create failed:",
          createError
        );

        const error = new Error(
          "Unable to create AI conversation."
        );

        error.statusCode = 500;
        throw error;
      }

      conversation =
        createdConversation;
    }

    // ----------------------------------------------------------
    // Save customer's new message first
    // ----------------------------------------------------------

    if (customerMessage) {
      const {
        error: customerSaveError,
      } = await supabase
        .from("crm_ai_messages")
        .insert({
          organization_id:
            organization.id,

          conversation_id:
            conversation.id,

          lead_id:
            lead.id,

          role:
            "customer",

          channel:
            cleanText(
              body?.channel,
              50
            ) || conversation.channel ||
            "crm",

          message_text:
            customerMessage,
        });

      if (customerSaveError) {
        console.error(
          "CRM customer message save failed:",
          customerSaveError
        );

        const error = new Error(
          "Unable to save customer message."
        );

        error.statusCode = 500;
        throw error;
      }
    }

    // ----------------------------------------------------------
    // Retrieve recent conversation history
    // ----------------------------------------------------------

    const {
      data: messageRows,
      error: messagesError,
    } = await supabase
      .from("crm_ai_messages")
      .select(
        `
        id,
        role,
        message_text,
        created_at
        `
      )
      .eq(
        "conversation_id",
        conversation.id
      )
      .eq(
        "organization_id",
        organization.id
      )
      .order(
        "created_at",
        { ascending: false }
      )
      .limit(20);

    if (messagesError) {
      console.error(
        "CRM conversation messages lookup failed:",
        messagesError
      );

      const error = new Error(
        "Unable to load conversation history."
      );

      error.statusCode = 500;
      throw error;
    }

    const recentMessages =
      [...(messageRows || [])]
        .reverse();

    // ----------------------------------------------------------
    // Run next-best-action conversation intelligence
    // ----------------------------------------------------------

    const ai =
      await runConversationAi({
        organization,
        businessUnit,
        leadSnapshot:
          buildLeadSnapshot(lead),
        validation,
        conversation,
        recentMessages,
        customerMessage,
      });

    const result =
      normalizeAiResult(
        ai.result
      );

    if (!result.assistant_message) {
      const error = new Error(
        "AI conversation produced an empty message."
      );

      error.statusCode = 502;
      throw error;
    }

    // ----------------------------------------------------------
    // Merge structured facts into conversation memory
    // ----------------------------------------------------------

    const previousProfile =
      safeObject(
        conversation.extracted_profile
      );

    const nextProfile = {
      ...previousProfile,
      ...result.extracted_facts,
    };

    const now =
      new Date().toISOString();

    // ----------------------------------------------------------
    // Save AI message
    // ----------------------------------------------------------

    const {
      data: savedAiMessage,
      error: aiMessageError,
    } = await supabase
      .from("crm_ai_messages")
      .insert({
        organization_id:
          organization.id,

        conversation_id:
          conversation.id,

        lead_id:
          lead.id,

        role:
          "assistant",

        channel:
          conversation.channel ||
          "crm",

        message_text:
          result.assistant_message,

        extracted_facts:
          result.extracted_facts,

        detected_intent:
          result.detected_intent,

        sentiment:
          result.sentiment,

        buying_signals:
          result.buying_signals,

        objections:
          result.objections,

        questions_answered:
          result.questions_answered,

        questions_still_missing:
          result.missing_fields,

        ai_confidence:
          result.ai_confidence,

        model_name:
          ai.model,
      })
      .select("*")
      .single();

    if (aiMessageError) {
      console.error(
        "CRM AI message save failed:",
        aiMessageError
      );

      const error = new Error(
        "Unable to save AI response."
      );

      error.statusCode = 500;
      throw error;
    }

    // ----------------------------------------------------------
    // Update conversation memory
    // ----------------------------------------------------------

    const nextStatus =
      result.human_handoff_required
        ? "qualified"
        : result.conversation_status;

    const {
      data: updatedConversation,
      error: updateError,
    } = await supabase
      .from(
        "crm_ai_conversations"
      )
      .update({
        business_unit:
          businessUnit,

        status:
          nextStatus,

        current_objective:
          result.current_objective ||
          null,

        next_best_question:
          result.human_handoff_required
            ? null
            : result.assistant_message,

        missing_fields:
          result.missing_fields,

        extracted_profile:
          nextProfile,

        conversation_summary:
          result.conversation_summary ||
          null,

        interaction_count:
          Number(
            conversation.interaction_count ||
            0
          ) + 1,

        last_customer_message_at:
          customerMessage
            ? now
            : conversation.last_customer_message_at,

        last_ai_message_at:
          now,

        qualification_ready:
          result.qualification_ready,

        human_handoff_required:
          result.human_handoff_required,

        human_handoff_reason:
          result.human_handoff_reason ||
          null,

        updated_at:
          now,
      })
      .eq(
        "id",
        conversation.id
      )
      .eq(
        "organization_id",
        organization.id
      )
      .select("*")
      .single();

    if (updateError) {
      console.error(
        "CRM conversation update failed:",
        updateError
      );

      const error = new Error(
        "Unable to update AI conversation."
      );

      error.statusCode = 500;
      throw error;
    }
    // ----------------------------------------------------------
// Automatic dynamic lead rescoring
// ----------------------------------------------------------

let updatedLeadScore = null;

try {
  const protocol =
    req.headers["x-forwarded-proto"] ||
    (req.headers.host?.includes("localhost")
      ? "http"
      : "https");

  const host = req.headers.host;

  if (host) {
    const scoreResponse = await fetch(
      `${protocol}://${host}/api/crm/score-lead`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization:
            req.headers.authorization || "",
        },

        body: JSON.stringify({
          lead_id: lead.id,
        }),
      }
    );

    const scoreData =
      await scoreResponse.json();

    if (scoreResponse.ok) {
      updatedLeadScore =
        scoreData?.score ||
        scoreData?.lead_score ||
        scoreData?.data ||
        scoreData ||
        null;
    } else {
      console.error(
        "CRM automatic rescoring returned an error:",
        scoreData
      );
    }
  }
} catch (scoreError) {
  console.error(
    "CRM automatic rescoring failed:",
    scoreError
  );
}

    // ----------------------------------------------------------
    // CRM-safe response
    // ----------------------------------------------------------

    return res.status(200).json({
  success: true,

  conversation:
    updatedConversation,

  message:
    savedAiMessage,

  lead_score:
    updatedLeadScore,

  intelligence: {
        business_unit:
          businessUnit,

        detected_intent:
          result.detected_intent,

        sentiment:
          result.sentiment,

        ai_confidence:
          result.ai_confidence,

        extracted_facts:
          result.extracted_facts,

        missing_fields:
          result.missing_fields,

        buying_signals:
          result.buying_signals,

        objections:
          result.objections,

        qualification_ready:
          result.qualification_ready,

        human_handoff_required:
          result.human_handoff_required,

        human_handoff_reason:
          result.human_handoff_reason,
      },

      ai: {
        model:
          ai.model,

        response_id:
          ai.responseId,

        conversation_version:
          CONVERSATION_VERSION,
      },

      operated_by: {
        crm_user_id:
          crmUser.id,
      },
    });
  } catch (error) {
    return sendCrmError(
      res,
      error
    );
  }
}
// ------------------------------------------------------------
// SHARED SERVER-SIDE CONVERSATION ENGINE EXPORTS
// ------------------------------------------------------------
//
// These exports allow trusted server-side engagement endpoints
// to reuse the SAME CRM conversation intelligence without
// bypassing the authenticated CRM handler.
//
// Existing CRM endpoint behaviour remains unchanged.

export {
  CONVERSATION_VERSION,
  inferBusinessUnit,
  buildLeadSnapshot,
  runConversationAi,
  normalizeAiResult,
};
