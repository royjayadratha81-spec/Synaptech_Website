// api/engagement/business/message.js
//
// Synaptech Public Customer Engagement
// Business Solutions - Message Bridge V1
//
// PURPOSE:
// Accept a message from a visitor who has already submitted
// the Education Solutions enquiry form and has a valid
// signed engagement session.
//
// IMPORTANT:
// - Public endpoint
// - Does NOT expose /api/crm/*
// - Does NOT modify existing LMS/Admin logic
// - Does NOT modify api/ai-chat.js
// - Does NOT modify api/chat.js
// - Does NOT modify api/lead.js
// - Uses the CRM lead already established by start.js

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  buildLeadSnapshot,
  runConversationAi,
  normalizeAiResult,
} from "../../_shared/crm-conversation-engine.js";
import {
  buildJourneyProgress,
  captureJourneyAnswer,
} from "../../_shared/crm-qualification-journey-progress.js";
import { getQuestion } from "../../_shared/crm-omnichannel-content-registry.js";
import { prepareAdmissionsProfile, buildAdmissionsTurn } from "../../_shared/crm-admissions-counselling.js";
import { scoreCrmLead } from "../../_shared/crm-scoring-engine.js";
import { evaluateAndStoreCrmQualification } from "../../_shared/crm-qualification-engine.js";

const SESSION_CHANNEL = "web_chat";
const CRM_CHANNEL = "crm";

function cleanText(value, maxLength = 4000) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

function decodeBase64Url(value) {
  return Buffer.from(
    value,
    "base64url"
  ).toString("utf8");
}

function verifySessionToken(token, secret) {
  if (!token || !secret) {
    return null;
  }

  const parts = String(token).split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [
    encodedPayload,
    suppliedSignature,
  ] = parts;

  const expectedSignature = crypto
    .createHmac(
      "sha256",
      secret
    )
    .update(encodedPayload)
    .digest("base64url");

  const suppliedBuffer =
    Buffer.from(
      suppliedSignature,
      "utf8"
    );

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      "utf8"
    );

  if (
    suppliedBuffer.length !==
    expectedBuffer.length
  ) {
    return null;
  }

  if (
    !crypto.timingSafeEqual(
      suppliedBuffer,
      expectedBuffer
    )
  ) {
    return null;
  }

  let payload;

  try {
    payload = JSON.parse(
      decodeBase64Url(
        encodedPayload
      )
    );
  } catch {
    return null;
  }

  const nowSeconds =
    Math.floor(
      Date.now() / 1000
    );

  if (
    !payload?.sid ||
    !payload?.oid ||
    !payload?.lid ||
    !payload?.exp
  ) {
    return null;
  }

  if (
    Number(payload.exp) <=
    nowSeconds
  ) {
    return null;
  }

  if (!["business_solutions", "admissions"].includes(payload.bu)) {
    return null;
  }

  if (
  payload.ch !== SESSION_CHANNEL
) {
  return null;
}

  return payload;
}

function getSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL;

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (
    !url ||
    !serviceRoleKey
  ) {
    throw new Error(
      "Server database configuration is unavailable."
    );
  }

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

async function resolveLead({
  supabase,
  organizationId,
  leadId,
}) {
  const {
    data,
    error,
  } = await supabase
    .from("crm_leads")
    .select(`
      id,
      organization_id,
      company_id,
      contact_id,
      source_lead_id,
      title,
      requirement,
      status,
      metadata
    `)
    .eq(
      "id",
      leadId
    )
    .eq(
      "organization_id",
      organizationId
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function resolveConversation({
  supabase,
  organizationId,
  leadId,
  businessUnit,
}) {
  const {
    data: existingRows,
    error: lookupError,
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
      leadId
    )
    .eq(
      "channel",
      CRM_CHANNEL
    )
    .eq(
      "business_unit",
      businessUnit
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(1);

  if (lookupError) {
    throw lookupError;
  }

  const existing =
    existingRows?.[0] ||
    null;

  if (existing) {
    return existing;
  }

  const now =
    new Date().toISOString();

  const {
    data: created,
    error: createError,
  } = await supabase
    .from(
      "crm_ai_conversations"
    )
    .insert({
      organization_id:
        organizationId,

      lead_id:
        leadId,

      business_unit:
        businessUnit,

      channel:
        CRM_CHANNEL,

      status:
        "active",

      current_objective:
        "ai_discovery",

      known_facts: {},

      extracted_profile: {},

      missing_fields: [],

      interaction_count: 0,

      qualification_ready:
        false,

      human_handoff_required:
        false,

      created_at:
        now,

      updated_at:
        now,
    })
    .select("*")
    .single();

  if (createError) {
    throw createError;
  }

  return created;
}

async function saveCustomerMessage({
  supabase,
  organizationId,
  leadId,
  conversationId,
  message,
}) {
  const {
    data,
    error,
  } = await supabase
    .from("crm_ai_messages")
    .insert({
      organization_id:
        organizationId,

      conversation_id:
        conversationId,

      lead_id:
        leadId,

      role:
         "customer",

      channel:
        CRM_CHANNEL,

      message_text:
        message,
    })
    .select(
      "id, role, channel, message_text, created_at"
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export default async function handler(
  req,
  res
) {
  res.setHeader(
    "Cache-Control",
    "no-store"
  );

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
    const body =
      req.body || {};

    const token =
      cleanText(
        body.session_token ||
          body.token,
        10000
      );

    const message =
      cleanText(
        body.message,
        4000
      );
      const startDiscovery =
  body.start === true;

    if (!token) {
      return res.status(401).json({
        error:
          "Customer engagement session is required.",
      });
    }

    if (
  !startDiscovery &&
  !message
) {
  return res.status(400).json({
    error:
      "Message is required.",
  });
}

    const sessionSecret =
      process.env
        .ENGAGEMENT_SESSION_SECRET;

    if (!sessionSecret) {
      console.error(
        "ENGAGEMENT_SESSION_SECRET is missing."
      );

      return res.status(500).json({
        error:
          "Customer engagement service is not configured.",
      });
    }

    const session =
      verifySessionToken(
        token,
        sessionSecret
      );

    if (!session) {
      return res.status(401).json({
        error:
          "Customer engagement session is invalid or expired.",
      });
    }

    const businessUnit =
      session.bu;

    const supabase =
      getSupabaseAdmin();

    const lead =
      await resolveLead({
        supabase,

        organizationId:
          session.oid,

        leadId:
          session.lid,

        businessUnit,
      });

    if (!lead) {
      return res.status(404).json({
        error:
          "CRM lead could not be found.",
      });
    }

    const conversation =
      await resolveConversation({
        supabase,

        organizationId:
          session.oid,

        leadId:
          session.lid,

        businessUnit,
      });

    let savedMessage =
  null;

if (!startDiscovery) {
  savedMessage =
    await saveCustomerMessage({
      supabase,

      organizationId:
        session.oid,

      leadId:
        session.lid,

      conversationId:
        conversation.id,

      message,
    });
}
      // ------------------------------------------------------------
// LOAD RECENT CONVERSATION HISTORY
// ------------------------------------------------------------

const {
  data: messageRows,
  error: messagesError,
} = await supabase
  .from("crm_ai_messages")
  .select(`
    id,
    role,
    message_text,
    created_at
  `)
  .eq(
    "conversation_id",
    conversation.id
  )
  .eq(
    "organization_id",
    session.oid
  )
  .order(
    "created_at",
    {
      ascending: false,
    }
  )
  .limit(20);

if (messagesError) {
  throw messagesError;
}

const recentMessages =
  [...(messageRows || [])]
    .reverse();

// ------------------------------------------------------------
// ORGANIZATION CONTEXT
// ------------------------------------------------------------

const {
  data: organization,
  error: organizationError,
} = await supabase
  .from("crm_organizations")
  .select("id, name, slug")
  .eq(
    "id",
    session.oid
  )
  .maybeSingle();

if (organizationError) {
  throw organizationError;
}

if (!organization) {
  return res.status(404).json({
    error:
      "CRM organization could not be found.",
  });
}

// ------------------------------------------------------------
// LATEST VALIDATION EVIDENCE
// ------------------------------------------------------------

const {
  data: validationRows,
  error: validationError,
} = await supabase
  .from("crm_lead_validations")
  .select("*")
  .eq(
    "lead_id",
    lead.id
  )
  .eq(
    "organization_id",
    session.oid
  )
  .order(
    "created_at",
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

// ------------------------------------------------------------
// RUN THE SAME CRM AI DISCOVERY ENGINE
// ------------------------------------------------------------

const discoveryInput =
  startDiscovery
    ? cleanText(
        lead.requirement,
        4000
      )
    : message;

if (!discoveryInput) {
  return res.status(400).json({
    error:
      "No enquiry requirement is available for AI Discovery.",
  });
}

let previousProfile =
  conversation.extracted_profile &&
  typeof conversation.extracted_profile === "object" &&
  !Array.isArray(conversation.extracted_profile)
    ? conversation.extracted_profile
    : {};

if (businessUnit === "admissions") {
  previousProfile = prepareAdmissionsProfile(previousProfile, lead.requirement);
}

const progressBeforeTurn = buildJourneyProgress({
  businessUnit,
  extractedFacts: previousProfile,
  missingFields: conversation.missing_fields,
  qualificationReady: conversation.qualification_ready,
  humanHandoffRequired: conversation.human_handoff_required,
});

const deterministicAnswer = startDiscovery
  ? {}
  : captureJourneyAnswer(
      businessUnit,
      progressBeforeTurn.next_question_key,
      message
    );

const ai =
  await runConversationAi({
    organization,

    businessUnit:
      businessUnit,

    leadSnapshot:
      buildLeadSnapshot(lead),

    validation,

    conversation,

    recentMessages,

    customerMessage:
      discoveryInput,
  });

const result =
  normalizeAiResult(
    ai.result
  );

const admissionsTurn = businessUnit === "admissions"
  ? buildAdmissionsTurn({ profile: previousProfile, message, start: startDiscovery, aiResult: result })
  : null;

if (admissionsTurn) {
  result.qualification_ready = admissionsTurn.progress.qualification_ready;
  result.human_handoff_required = admissionsTurn.progress.human_handoff_required;
  result.conversation_status = result.qualification_ready ? "qualified" : "active";
}

const turnExtractedFacts = admissionsTurn?.facts || {
  ...result.extracted_facts,
  ...deterministicAnswer,
};

const nextProfile = admissionsTurn?.profile || {
  ...previousProfile,
  ...turnExtractedFacts,
};

const journeyProgress = admissionsTurn?.progress ||
  buildJourneyProgress({
    businessUnit:
      businessUnit,
    extractedFacts:
      nextProfile,
    missingFields:
      result.missing_fields,
    qualificationReady:
      result.qualification_ready,
    humanHandoffRequired:
      result.human_handoff_required,
  });

const nextQuestion = admissionsTurn ? admissionsTurn.question : journeyProgress.next_question_key
  ? getQuestion(businessUnit, journeyProgress.next_question_key)
  : null;

const publicAssistantMessage =
  admissionsTurn?.text || nextQuestion?.text || result.assistant_message;

if (!result.assistant_message) {
  return res.status(502).json({
    error:
      "AI Discovery returned no customer response.",
  });
}

    // ------------------------------------------------------------
// MERGE EXTRACTED FACTS INTO CONVERSATION MEMORY
// ------------------------------------------------------------

const now =
  new Date().toISOString();

// ------------------------------------------------------------
// SAVE AI RESPONSE
// ------------------------------------------------------------

const {
  data: savedAiMessage,
  error: aiMessageError,
} = await supabase
  .from("crm_ai_messages")
  .insert({
    organization_id:
      session.oid,

    conversation_id:
      conversation.id,

    lead_id:
      lead.id,

    role:
      "assistant",

    channel:
      CRM_CHANNEL,

    message_text:
      publicAssistantMessage,

    extracted_facts:
      turnExtractedFacts,

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
  throw aiMessageError;
}

// ------------------------------------------------------------
// UPDATE CONVERSATION MEMORY
// ------------------------------------------------------------

const nextStatus = admissionsTurn ? result.conversation_status :
  result.human_handoff_required
    ? "qualified"
    : result.conversation_status;

const {
  data: updatedConversation,
  error: updateError,
} = await supabase
  .from("crm_ai_conversations")
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
        : publicAssistantMessage,

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
  ) +
  (startDiscovery ? 0 : 1),

    last_customer_message_at:
  startDiscovery
    ? conversation.last_customer_message_at ||
      null
    : now,

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
    session.oid
  )
  .select("*")
  .single();

if (updateError) {
  throw updateError;
}

// Admissions answers become CRM evidence immediately. These shared engines
// preserve the existing organization-scoped scoring and Sales-Ready gates;
// failures are non-blocking so the customer conversation remains available.
let recalculation = null;
if (!startDiscovery && businessUnit === "admissions") {
  try {
    const scoreResult = await scoreCrmLead({
      supabase,
      organizationId: session.oid,
      leadId: lead.id,
    });
    const qualificationResult = await evaluateAndStoreCrmQualification({
      supabase,
      organizationId: session.oid,
      leadId: lead.id,
    });
    recalculation = {
      score: scoreResult?.score || null,
      qualification: qualificationResult?.qualification || null,
    };
  } catch (recalculationError) {
    console.error("Public Aira CRM recalculation failed:", recalculationError);
  }
}

// ------------------------------------------------------------
// PUBLIC-SAFE AI DISCOVERY RESPONSE
// ------------------------------------------------------------

return res.status(200).json({
  success: true,

  accepted: true,
  discovery_started:
  startDiscovery,

  conversation: {
    id:
      updatedConversation.id,

    status:
      updatedConversation.status,

    channel:
      updatedConversation.channel,

    business_unit:
      updatedConversation.business_unit,

    interaction_count:
      updatedConversation.interaction_count,
  },

  customer_message:
  savedMessage
    ? {
        id:
          savedMessage.id,
      }
    : null,

  assistant_message: {
    id:
      savedAiMessage.id,

    text:
      publicAssistantMessage,

    question_key:
      nextQuestion?.key || null,

    answer_options:
      nextQuestion?.options || [],

    links: admissionsTurn?.links || [],
  },

  counselling_complete: admissionsTurn?.complete === true,

  intelligence: {
    extracted_facts:
      turnExtractedFacts,

    missing_fields:
      result.missing_fields,

    detected_intent:
      result.detected_intent,

    ai_confidence:
      result.ai_confidence,

    qualification_ready:
      result.qualification_ready,

    human_handoff_required:
      result.human_handoff_required,
  },

  next_step:
    result.human_handoff_required
      ? "human_handoff"
      : "ai_discovery",

  journey_progress:
    journeyProgress,

  intelligence_recalculated: Boolean(recalculation),
});
  } catch (error) {
    console.error(
      "Business engagement message error:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to process the customer message.",
    });
  }
}
