// Synaptech CRM - authenticated manual activity API.
// Phase 1 deliberately stores call evidence without changing qualification
// facts, scoring rules, consent, sales-readiness gates or opportunity data.

import { authenticateCrmRequest, sendCrmError } from "./_auth.js";
import {
  ADMISSIONS_CALL_EVIDENCE_VERSION,
  validateAdmissionsCallEvidence,
} from "../_shared/crm-admissions-call-evidence.js";

import {
  scoreCrmLead,
} from "../_shared/crm-scoring-engine.js";

import {
  evaluateAndStoreCrmQualification,
} from "../_shared/crm-qualification-engine.js";

const OUTCOMES = new Set([
  "positive",
  "neutral",
  "callback_requested",
  "no_answer",
  "wrong_number",
  "not_interested",
]);

function clean(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body !== "string") return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  try {
    const { organization, crmUser, supabase } =
      await authenticateCrmRequest(req);

    if (req.method === "GET") {
      const leadId = clean(req.query?.lead_id, 80);
      const limit = Math.min(100, Math.max(1, Number(req.query?.limit) || 50));

      let query = supabase
        .from("crm_engagement_events")
        .select("id,lead_id,event_type,channel,event_value,metadata,occurred_at,created_at")
        .eq("organization_id", organization.id)
        .eq("event_type", "human_call_logged")
        .order("occurred_at", { ascending: false })
        .limit(limit);

      if (leadId) query = query.eq("lead_id", leadId);

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json({ success: true, data: data || [] });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed." });
    }

    const body = getBody(req);
    const leadId = clean(body.lead_id, 80);
    const outcome = clean(body.outcome, 60).toLowerCase();
    const summary = clean(body.summary, 4000);
    const nextAction = clean(body.next_action, 1000);
    const idempotencyKey = clean(body.idempotency_key, 100);
    const scheduledAt = clean(body.next_follow_up_at, 80) || null;

    if (!leadId) return res.status(400).json({ error: "Lead ID is required." });
    if (!idempotencyKey) {
      return res.status(400).json({ error: "Activity request identifier is required." });
    }
    if (!OUTCOMES.has(outcome)) {
      return res.status(400).json({ error: "A valid call outcome is required." });
    }
    if (!summary) {
      return res.status(400).json({ error: "Call discussion summary is required." });
    }

    const { data: lead, error: leadError } = await supabase
      .from("crm_leads")
      .select("id,organization_id")
      .eq("organization_id", organization.id)
      .eq("id", leadId)
      .maybeSingle();

    if (leadError) throw leadError;
    if (!lead) return res.status(404).json({ error: "CRM lead not found." });
    const {
  data: conversationRows,
  error: conversationError,
} = await supabase
  .from("crm_ai_conversations")
  .select("id,business_unit,updated_at")
  .eq("organization_id", organization.id)
  .eq("lead_id", lead.id)
  .order("updated_at", {
    ascending: false,
  })
  .limit(1);

if (conversationError) {
  throw conversationError;
}

const conversation =
  conversationRows?.[0] || null;

const businessUnit =
  conversation?.business_unit === "admissions" ||
  conversation?.business_unit === "business_solutions"
    ? conversation.business_unit
    : "unclassified";

const suppliedAdmissionsEvidence =
  body.admissions_evidence &&
  typeof body.admissions_evidence === "object" &&
  !Array.isArray(body.admissions_evidence)
    ? body.admissions_evidence
    : {};

const hasAdmissionsEvidence =
  Object.values(
    suppliedAdmissionsEvidence
  ).some(
    (value) =>
      clean(value, 200).length > 0
  );

if (
  hasAdmissionsEvidence &&
  businessUnit !== "admissions"
) {
  return res.status(400).json({
    error:
      "Admissions counselling answers cannot be attached to a non-admissions lead.",
  });
}

const evidenceValidation =
  validateAdmissionsCallEvidence(
    suppliedAdmissionsEvidence,
    outcome
  );

if (!evidenceValidation.valid) {
  return res.status(400).json({
    error:
      evidenceValidation.errors[0] ||
      "The admissions counselling answers are invalid.",

    errors:
      evidenceValidation.errors,
  });
}

const admissionsEvidence =
  evidenceValidation.evidence;

    const { data: previousEvents, error: previousError } = await supabase
      .from("crm_engagement_events")
      .select("id,lead_id,event_type,channel,event_value,metadata,occurred_at")
      .eq("organization_id", organization.id)
      .eq("lead_id", lead.id)
      .eq("event_type", "human_call_logged")
      .contains("metadata", { idempotency_key: idempotencyKey })
      .limit(1);

    if (previousError) throw previousError;

    let event = previousEvents?.[0] || null;
    let created = false;

    if (!event) {
      const metadata = {
  idempotency_key:
    idempotencyKey,

  outcome,

  call_outcome:
    outcome,

  summary,

  next_action:
    nextAction || null,

  duration_minutes:
    Math.max(
      0,
      Number(
        body.duration_minutes
      ) || 0
    ),

  contact_person:
    clean(
      body.contact_person,
      150
    ) || null,

  decision_maker_confirmed:
    body.decision_maker_confirmed ===
    true,

  sentiment:
    clean(
      body.sentiment,
      40
    ) || null,

  recorded_by_user_id:
    crmUser.id,

  recorded_by_name:
    crmUser.full_name ||
    crmUser.email ||
    "CRM user",

  business_unit:
    businessUnit,

  ...(hasAdmissionsEvidence
    ? {
        admissions_evidence_version:
          ADMISSIONS_CALL_EVIDENCE_VERSION,

        admissions_evidence:
          admissionsEvidence,
      }
    : {}),
};

      const { data, error } = await supabase
        .from("crm_engagement_events")
        .insert({
          organization_id: organization.id,
          lead_id: lead.id,
          conversation_id:
  conversation?.id || null,
          event_type: "human_call_logged",
          channel: "human_call",
          event_value: outcome,
          metadata,
        })
        .select("id,lead_id,event_type,channel,event_value,metadata,occurred_at")
        .single();

      if (error) throw error;
      event = data;
      created = true;
    }

    let followUpJob = null;
    if (scheduledAt) {
      const { data: previousJobs, error: jobLookupError } = await supabase
        .from("crm_follow_up_jobs")
        .select("id,status,channel,job_type,scheduled_at,reason,outcome_data")
        .eq("organization_id", organization.id)
        .eq("lead_id", lead.id)
        .contains("context_snapshot", { idempotency_key: idempotencyKey })
        .limit(1);

      if (jobLookupError) throw jobLookupError;
      followUpJob = previousJobs?.[0] || null;

      if (!followUpJob) {
        const { data, error } = await supabase
          .from("crm_follow_up_jobs")
          .insert({
            organization_id: organization.id,
            lead_id: lead.id,
            conversation_id: null,
            business_unit:
  businessUnit === "admissions"
    ? "admissions"
    : "business_solutions",
            channel: "human_call",
            job_type: outcome === "callback_requested" ? "callback" : "qualification",
            status: "scheduled",
            priority: outcome === "callback_requested" ? 85 : 60,
            reason: nextAction || `Follow up after ${outcome.replace(/_/g, " ")} call`,
            scheduled_at: scheduledAt,
            context_snapshot: {
              idempotency_key: idempotencyKey,
              call_event_id: event.id,
              outcome,
              summary,
            },
          })
          .select("id,status,channel,job_type,scheduled_at,reason")
          .single();

        if (error) throw error;
        followUpJob = data;
      }
    }

    let scoringResult = null;
let qualificationResult = null;
let intelligenceRecalculated = false;
let intelligenceWarning = null;

if (
  businessUnit === "admissions" &&
  hasAdmissionsEvidence
) {
  try {
    scoringResult =
      await scoreCrmLead({
        supabase,
        organizationId:
          organization.id,
        leadId:
          lead.id,
      });

    qualificationResult =
      await evaluateAndStoreCrmQualification({
        supabase,
        organizationId:
          organization.id,
        leadId:
          lead.id,
      });

    intelligenceRecalculated =
      true;
  } catch (intelligenceError) {
    console.error(
      "Admissions call was saved, but CRM intelligence recalculation failed.",
      intelligenceError
    );

    intelligenceWarning =
      "The call was saved, but automatic intelligence recalculation failed. Use the existing Recalculate button; do not enter the call again.";
  }
}

        return res
      .status(
        created ? 201 : 200
      )
      .json({
        success: true,
        created,
        event,

        follow_up_job:
          followUpJob,

        business_unit:
          businessUnit,

        intelligence_recalculated:
          intelligenceRecalculated,

        scoring:
          scoringResult,

        qualification:
          qualificationResult,

        warning:
          intelligenceWarning,

        message:
          intelligenceWarning ||
          (
            intelligenceRecalculated
              ? "Call evidence saved. Existing CRM scoring and qualification engines were recalculated."
              : "Call evidence saved. No structured admissions qualification answers were submitted."
          ),
      });
  } catch (error) {
    return sendCrmError(res, error);
  }
}
