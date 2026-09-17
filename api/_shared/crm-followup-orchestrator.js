// api/_shared/crm-followup-orchestrator.js
//
// Provider-independent CRM follow-up orchestrator.
//
// Responsibilities:
// - Load current commercial facts
// - Load latest score and qualification state
// - Select the next best commercial question
// - Create/update a follow-up job
// - Apply customer answers into structured CRM facts
// - Re-score the lead
// - Re-evaluate qualification
//
// IMPORTANT:
// - Does NOT directly send WhatsApp messages
// - Does NOT directly initiate AI phone calls
// - Does NOT modify LMS/Admin
// - Does NOT modify synaptech_leads
// - Does NOT create opportunities
// - Keeps channel execution separate from intelligence

import {
  selectNextCommercialQuestion,
} from "./crm-followup-question-engine.js";

import {
  applyCommercialQuestionAnswer,
} from "./crm-commercial-facts-engine.js";

import {
  scoreCrmLead,
} from "./crm-scoring-engine.js";

import {
  evaluateAndStoreCrmQualification,
} from "./crm-qualification-engine.js";

import {
  getContactRoutingPolicy,
} from "./crm-contact-routing-policy.js";


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

function normalizeText(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}


// ------------------------------------------------------------
// LOAD COMMERCIAL FACTS
// ------------------------------------------------------------

export async function loadCommercialFacts({
  supabase,
  organizationId,
  leadId,
  businessUnit = "business_solutions",
}) {
  const {
    data,
    error,
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

  if (error) {
    throw error;
  }

  return data || null;
}


// ------------------------------------------------------------
// LOAD LEAD CONTEXT
// ------------------------------------------------------------

async function loadLeadContext({
  supabase,
  organizationId,
  leadId,
}) {
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
      leadId
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
      leadId
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

  const {
    data: qualificationRows,
    error: qualificationError,
  } = await supabase
    .from(
      "crm_lead_qualification_states"
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
    .order(
      "updated_at",
      {
        ascending: false,
      }
    )
    .limit(1);

  if (qualificationError) {
    throw qualificationError;
  }

  const qualification =
    qualificationRows?.[0] ||
    null;

  return {
    lead,
    conversation,
    score,
    qualification,
  };
}


// ------------------------------------------------------------
// DETERMINE BUSINESS UNIT
// ------------------------------------------------------------

function determineBusinessUnit({
  conversation,
  qualification,
  score,
}) {
  const candidates = [
    conversation?.business_unit,
    qualification?.business_unit,
    score?.business_unit,
  ];

  for (const value of candidates) {
    if (
      value === "business_solutions" ||
      value === "admissions"
    ) {
      return value;
    }
  }

  return "business_solutions";
}


// ------------------------------------------------------------
// DETERMINE FOLLOW-UP CHANNEL
// ------------------------------------------------------------

function selectExecutionChannel({
  facts,
  context,
  requestedChannel = null,
}) {
  const commercial =
    safeObject(facts);

  const score = safeObject(context?.score);
  const qualification = safeObject(context?.qualification);
  const routing = getContactRoutingPolicy({
    score: score.overall_score ?? score.score ?? 0,
    confidence: score.scoring_confidence ?? qualification.ai_confidence ?? 0,
    validationState: qualification.validation_state,
    qualificationComplete: Number(qualification.qualification_completeness || 0) >= 100,
    salesReady: qualification.sales_ready === true,
    handoffIntent: qualification.handoff_intent,
    preferredChannel: commercial.preferred_contact_channel,
    whatsappConsent: commercial.whatsapp_consent === true,
    aiCallConsent: commercial.ai_call_consent === true,
  });

  if (
    requestedChannel &&
    [
      "whatsapp",
      "ai_call",
      "human_call",
      "email",
    ].includes(
      requestedChannel
    )
  ) {
    return { channel: requestedChannel, routing };
  }

  if (routing.channels.human_call === "immediate") {
    return { channel: "human_call", routing };
  }

  const preferred =
    commercial
      .preferred_contact_channel;

  if (
    preferred === "whatsapp" &&
    commercial.whatsapp_consent ===
      true
  ) {
    return { channel: "whatsapp", routing };
  }

  if (
    preferred === "ai_call" &&
    commercial.ai_call_consent ===
      true
  ) {
    return { channel: "ai_call", routing };
  }

  if (
    preferred === "email"
  ) {
    return { channel: "email", routing };
  }

  if (
    commercial.whatsapp_consent ===
      true
  ) {
    return { channel: "whatsapp", routing };
  }

  if (
    commercial.ai_call_consent ===
      true
  ) {
    return { channel: "ai_call", routing };
  }

  // Without consent, keep the task within the human CRM workspace. Provider
  // execution can be enabled later without changing qualification.
  return { channel: "human_call", routing };
}


// ------------------------------------------------------------
// FOLLOW-UP JOB TYPE
// ------------------------------------------------------------

function determineJobType(
  question
) {
  const stage =
    question
      ?.commercial_stage;

  if (
    stage ===
    "catalogue"
  ) {
    return "catalogue_follow_up";
  }

  if (
    stage ===
    "commercial_intent"
  ) {
    return "proposal_follow_up";
  }

  if (
    stage ===
    "follow_up"
  ) {
    return "qualification";
  }

  if (
    stage ===
    "consent"
  ) {
    return "qualification";
  }

  return "qualification";
}


// ------------------------------------------------------------
// CREATE OR UPDATE FOLLOW-UP JOB
// ------------------------------------------------------------

async function upsertFollowUpJob({
  supabase,
  organizationId,
  leadId,
  conversationId = null,
  businessUnit,
  channel,
  question,
  reason = null,
}) {
  const targetFactKeys =
    safeArray(
      question?.fact_keys
    );

  const jobType =
    determineJobType(
      question
    );

  const {
    data: existingRows,
    error: existingError,
  } = await supabase
    .from(
      "crm_follow_up_jobs"
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
      channel
    )
    .in(
      "status",
      [
        "pending",
        "scheduled",
      ]
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  const existing =
    existingRows?.[0] ||
    null;

  const now =
    new Date().toISOString();

  const contextSnapshot = {
    question_key:
      question?.key ||
      null,

    question_text:
      question?.text ||
      null,

    options:
      safeArray(
        question?.options
      ),

    commercial_stage:
      question
        ?.commercial_stage ||
      null,

    metadata:
      safeObject(
        question?.metadata
      ),
  };

  if (existing) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "crm_follow_up_jobs"
      )
      .update({
        conversation_id:
          conversationId ||
          existing.conversation_id ||
          null,

        business_unit:
          businessUnit,

        job_type:
          jobType,

        priority:
          Number(
            question?.priority ||
            existing.priority ||
            50
          ),

        reason:
          reason ||
          question?.purpose ||
          existing.reason ||
          null,

        target_fact_keys:
          targetFactKeys,

        context_snapshot:
          contextSnapshot,

        updated_at:
          now,
      })
      .eq(
        "id",
        existing.id
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "crm_follow_up_jobs"
    )
    .insert([
      {
        organization_id:
          organizationId,

        lead_id:
          leadId,

        conversation_id:
          conversationId,

        business_unit:
          businessUnit,

        channel,

        job_type:
          jobType,

        status:
          "pending",

        priority:
          Number(
            question?.priority ||
            50
          ),

        reason:
          reason ||
          question?.purpose ||
          null,

        target_fact_keys:
          targetFactKeys,

        context_snapshot:
          contextSnapshot,
      },
    ])
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}


// ------------------------------------------------------------
// MARK FOLLOW-UP JOB COMPLETED
// ------------------------------------------------------------

async function completeMatchingFollowUpJob({
  supabase,
  organizationId,
  leadId,
  questionKey,
  outcome = "answered",
  outcomeData = {},
}) {
  const {
    data: rows,
    error,
  } = await supabase
    .from(
      "crm_follow_up_jobs"
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
    .in(
      "status",
      [
        "pending",
        "scheduled",
        "processing",
      ]
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(10);

  if (error) {
    throw error;
  }

  const matching =
    safeArray(rows).find(
      (job) =>
        job
          ?.context_snapshot
          ?.question_key ===
        questionKey
    );

  if (!matching) {
    return null;
  }

  const now =
    new Date().toISOString();

  const {
    data: completed,
    error: updateError,
  } = await supabase
    .from(
      "crm_follow_up_jobs"
    )
    .update({
      status:
        "completed",

      completed_at:
        now,

      outcome,

      outcome_data:
        safeObject(
          outcomeData
        ),

      updated_at:
        now,
    })
    .eq(
      "id",
      matching.id
    )
    .select("*")
    .single();

  if (updateError) {
    throw updateError;
  }

  return completed;
}


// ------------------------------------------------------------
// GET NEXT FOLLOW-UP ACTION
// ------------------------------------------------------------

export async function getNextCrmFollowUp({
  supabase,
  organizationId,
  leadId,
  requestedChannel = null,
}) {
  if (
    !supabase ||
    !organizationId ||
    !leadId
  ) {
    throw new Error(
      "Follow-up context is incomplete."
    );
  }

  const context =
    await loadLeadContext({
      supabase,
      organizationId,
      leadId,
    });

  const businessUnit =
    determineBusinessUnit({
      conversation:
        context.conversation,

      qualification:
        context.qualification,

      score:
        context.score,
    });

  const facts =
    await loadCommercialFacts({
      supabase,
      organizationId,
      leadId,
      businessUnit,
    });

  const profile =
    safeObject(
      context.conversation
        ?.extracted_profile
    );

  const execution =
    selectExecutionChannel({
      facts,
      context,
      requestedChannel,
    });
  const channel = execution.channel;
  const routing = execution.routing;

  const question =
    selectNextCommercialQuestion({
      lead:
        context.lead,

      facts:
        facts || {},

      profile,

      channel,

      qualification:
        context.qualification ||
        {},

      score:
        context.score ||
        {},
    });

  if (
    !question ||
    question.complete ||
    !question.key
  ) {
    return {
      complete: true,

      lead:
        context.lead,

      facts,

      score:
        context.score,

      qualification:
        context.qualification,

      question:
        question || null,

      channel:
        null,

      job:
        null,

      routing,
    };
  }

  const job =
    await upsertFollowUpJob({
      supabase,
      organizationId,
      leadId,

      conversationId:
        context.conversation
          ?.id ||
        null,

      businessUnit,

      channel,

      question,

      reason:
        context.qualification
          ?.recommended_next_action ||
        question.purpose,
    });

  return {
    complete: false,

    lead:
      context.lead,

    facts,

    score:
      context.score,

    qualification:
      context.qualification,

    businessUnit,

    channel,

    question,

    job,

    routing,
  };
}


// ------------------------------------------------------------
// APPLY ANSWER + RE-SCORE + RE-QUALIFY
// ------------------------------------------------------------

export async function processCrmFollowUpAnswer({
  supabase,
  organizationId,
  leadId,
  questionKey,
  answer,
  channel,
  metadata = {},
  factConfidence = 95,
}) {
  if (
    !supabase ||
    !organizationId ||
    !leadId
  ) {
    throw new Error(
      "Follow-up context is incomplete."
    );
  }

  if (
    !questionKey
  ) {
    throw new Error(
      "questionKey is required."
    );
  }

  if (
    !cleanText(answer)
  ) {
    throw new Error(
      "answer is required."
    );
  }

  const context =
    await loadLeadContext({
      supabase,
      organizationId,
      leadId,
    });

  const businessUnit =
    determineBusinessUnit({
      conversation:
        context.conversation,

      qualification:
        context.qualification,

      score:
        context.score,
    });

  const factResult =
    await applyCommercialQuestionAnswer({
      supabase,

      organizationId,

      leadId,

      conversationId:
        context.conversation
          ?.id ||
        null,

      businessUnit,

      questionKey,

      answer,

      channel,

      metadata,

      factSource:
        channel ||
        "ai_followup",

      factConfidence,
    });

  await completeMatchingFollowUpJob({
    supabase,
    organizationId,
    leadId,
    questionKey,
    outcome:
      "answered",
    outcomeData: {
      channel:
        channel || null,

      answer_preview:
        cleanText(
          answer,
          500
        ),
    },
  });

  let scoringResult = null;
  let scoringError = null;

  try {
    scoringResult =
      await scoreCrmLead({
        supabase,
        organizationId,
        leadId,
      });
  } catch (error) {
    scoringError =
      error?.message ||
      "Lead scoring failed.";
  }

  let qualificationResult =
    null;

  let qualificationError =
    null;

  try {
    qualificationResult =
      await evaluateAndStoreCrmQualification({
        supabase,
        organizationId,
        leadId,
      });
  } catch (error) {
    qualificationError =
      error?.message ||
      "Qualification evaluation failed.";
  }

  let nextFollowUp = null;
  let nextFollowUpError = null;

  try {
    nextFollowUp =
      await getNextCrmFollowUp({
        supabase,
        organizationId,
        leadId,
        requestedChannel:
          channel || null,
      });
  } catch (error) {
    nextFollowUpError =
      error?.message ||
      "Unable to determine next follow-up.";
  }

  return {
    success: true,

    facts:
      factResult.facts,

    applied_patch:
      factResult.patch,

    scoring:
      scoringResult
        ? {
            recalculated: true,

            overall_score:
              scoringResult
                .score
                ?.overall_score ??
              null,

            routing_band:
              scoringResult
                .score
                ?.routing_band ??
              null,
          }
        : {
            recalculated: false,
            error:
              scoringError,
          },

    qualification:
      qualificationResult
        ? {
            reevaluated: true,

            sales_ready:
              qualificationResult
                .qualification
                ?.sales_ready ??
              false,

            sales_ready_status:
              qualificationResult
                .qualification
                ?.sales_ready_status ??
              null,

            qualification_stage:
              qualificationResult
                .qualification
                ?.qualification_stage ??
              null,

            recommended_route:
              qualificationResult
                .qualification
                ?.recommended_route ??
              null,

            recommended_next_action:
              qualificationResult
                .qualification
                ?.recommended_next_action ??
              null,
          }
        : {
            reevaluated: false,
            error:
              qualificationError,
          },

    next_follow_up:
      nextFollowUp,

    next_follow_up_error:
      nextFollowUpError,
  };
}
