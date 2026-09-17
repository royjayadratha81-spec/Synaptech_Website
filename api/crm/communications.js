// Provider-neutral WhatsApp and AI-call queue.
// This endpoint never recalculates scores, changes qualification, marks Sales
// Ready, or creates/updates opportunities.

import { authenticateCrmRequest, sendCrmError } from "./_auth.js";
import {
  buildCommunicationDecision,
  cleanCommunicationText,
} from "../_shared/crm-communication-orchestrator.js";

const CHANNELS = new Set(["whatsapp", "ai_call"]);
const ACTIONS = new Set(["preview", "queue", "cancel", "record_outcome"]);
const OPEN_STATUSES = ["draft", "queued", "processing", "sent", "delivered", "answered"];

function bodyOf(req) {
  if (!req.body) return {};
  if (typeof req.body !== "string") return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

async function loadContext(supabase, organizationId, leadId) {
  const { data: lead, error: leadError } = await supabase
    .from("crm_leads")
    .select("id,organization_id,title,status,contact:crm_contacts(id,full_name,phone,whatsapp_number,email)")
    .eq("organization_id", organizationId)
    .eq("id", leadId)
    .maybeSingle();
  if (leadError) throw leadError;
  if (!lead) {
    const error = new Error("CRM lead not found.");
    error.statusCode = 404;
    throw error;
  }

  const [scoreResult, qualificationResult, factsResult, settingsResult] = await Promise.all([
    supabase.from("crm_lead_scores").select("*").eq("organization_id", organizationId).eq("lead_id", leadId).order("updated_at", { ascending: false }).limit(1),
    supabase.from("crm_lead_qualification_states").select("*").eq("organization_id", organizationId).eq("lead_id", leadId).order("updated_at", { ascending: false }).limit(1),
    supabase.from("crm_commercial_qualification_facts").select("*").eq("organization_id", organizationId).eq("lead_id", leadId).order("updated_at", { ascending: false }).limit(1),
    supabase.from("crm_communication_settings").select("*").eq("organization_id", organizationId).maybeSingle(),
  ]);
  for (const result of [scoreResult, qualificationResult, factsResult, settingsResult]) {
    if (result.error) throw result.error;
  }
  const settings = settingsResult.data || {
    organization_id: organizationId,
    timezone: "Asia/Kolkata",
    quiet_hours_start: "20:00",
    quiet_hours_end: "09:00",
    whatsapp_daily_cap: 250,
    ai_call_daily_cap: 100,
    ai_call_monthly_minutes_cap: 3000,
    max_attempts_per_lead: 3,
    whatsapp_enabled: false,
    ai_call_enabled: false,
  };
  return {
    lead,
    score: scoreResult.data?.[0] || null,
    qualification: qualificationResult.data?.[0] || null,
    commercialFacts: factsResult.data?.[0] || null,
    settings,
  };
}

async function countDailyJobs(supabase, organizationId, channel) {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from("crm_communication_jobs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("channel", channel)
    .gte("created_at", dayStart.toISOString())
    .not("status", "in", "(blocked,cancelled)");
  if (error) throw error;
  return Number(count || 0);
}

export default async function handler(req, res) {
  try {
    const { organization, crmUser, supabase } = await authenticateCrmRequest(req);

    if (req.method === "GET") {
      const leadId = cleanCommunicationText(req.query?.lead_id, 80);
      const channel = cleanCommunicationText(req.query?.channel, 30).toLowerCase();
      const status = cleanCommunicationText(req.query?.status, 30).toLowerCase();
      const limit = Math.min(250, Math.max(1, Number(req.query?.limit) || 100));
      let query = supabase
        .from("crm_communication_jobs")
        .select("id,lead_id,channel,direction,job_type,status,priority,scheduled_at,started_at,completed_at,provider_key,provider_reference,template_key,recipient,content_preview,attempt_count,max_attempts,estimated_cost,actual_cost,duration_seconds,outcome,outcome_data,consent_snapshot,routing_snapshot,last_error,created_at,updated_at")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (leadId) query = query.eq("lead_id", leadId);
      if (CHANNELS.has(channel)) query = query.eq("channel", channel);
      if (status && status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data || [];
      return res.status(200).json({
        success: true,
        data: rows,
        summary: {
          total: rows.length,
          open: rows.filter((row) => OPEN_STATUSES.includes(row.status)).length,
          whatsapp: rows.filter((row) => row.channel === "whatsapp").length,
          ai_call: rows.filter((row) => row.channel === "ai_call").length,
          completed: rows.filter((row) => row.status === "completed").length,
          failed: rows.filter((row) => row.status === "failed").length,
        },
      });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed." });
    }

    const body = bodyOf(req);
    const action = cleanCommunicationText(body.action, 30).toLowerCase();
    if (!ACTIONS.has(action)) return res.status(400).json({ error: "Unsupported communication action." });

    if (["cancel", "record_outcome"].includes(action)) {
      const jobId = cleanCommunicationText(body.job_id, 80);
      if (!jobId) return res.status(400).json({ error: "Communication job ID is required." });
      const { data: job, error: lookupError } = await supabase
        .from("crm_communication_jobs")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("id", jobId)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!job) return res.status(404).json({ error: "Communication job not found." });
      const nextFollowUpAt = action === "record_outcome"
        ? cleanCommunicationText(body.next_follow_up_at, 80)
        : "";
      if (nextFollowUpAt && Number.isNaN(new Date(nextFollowUpAt).getTime())) {
        return res.status(400).json({ error: "A valid next follow-up date and time is required." });
      }
      const now = new Date().toISOString();
      const patch = action === "cancel"
        ? { status: "cancelled", completed_at: now, outcome: "cancelled_by_crm_user", updated_at: now }
        : {
            status: "completed",
            completed_at: now,
            outcome: cleanCommunicationText(body.outcome, 100) || "completed",
            duration_seconds: Math.max(0, Number(body.duration_seconds) || 0),
            outcome_data: {
              note: cleanCommunicationText(body.note, 3000) || null,
              recorded_by_user_id: crmUser.id,
              recorded_by_name: crmUser.full_name || crmUser.email || "CRM user",
            },
            updated_at: now,
          };
      const { data, error } = await supabase
        .from("crm_communication_jobs")
        .update(patch)
        .eq("organization_id", organization.id)
        .eq("id", job.id)
        .select("*")
        .single();
      if (error) throw error;
      await supabase.from("crm_communication_events").insert({
        organization_id: organization.id,
        communication_job_id: job.id,
        lead_id: job.lead_id,
        channel: job.channel,
        event_type: action === "cancel" ? "cancelled" : "outcome_recorded",
        event_payload: patch,
      });
      let followUpJob = null;
      if (action === "record_outcome") {
        const eventType = job.channel === "whatsapp" ? "whatsapp_outcome_recorded" : "ai_call_outcome_recorded";
        const { error: engagementError } = await supabase.from("crm_engagement_events").insert({
          organization_id: organization.id,
          lead_id: job.lead_id,
          conversation_id: null,
          event_type: eventType,
          channel: job.channel,
          event_value: patch.outcome,
          metadata: {
            communication_job_id: job.id,
            duration_seconds: patch.duration_seconds,
            note: patch.outcome_data.note,
            recorded_by_user_id: crmUser.id,
          },
        });
        if (engagementError) throw engagementError;

        if (nextFollowUpAt) {
          const { data: createdFollowUp, error: followUpError } = await supabase
            .from("crm_follow_up_jobs")
            .insert({
              organization_id: organization.id,
              lead_id: job.lead_id,
              conversation_id: null,
              business_unit: "business_solutions",
              channel: job.channel,
              job_type: "follow_up",
              status: "scheduled",
              priority: job.priority,
              reason: cleanCommunicationText(body.next_action, 1000) || `Follow up after ${patch.outcome.replace(/_/g, " ")}`,
              scheduled_at: new Date(nextFollowUpAt).toISOString(),
              context_snapshot: {
                communication_job_id: job.id,
                communication_channel: job.channel,
                outcome: patch.outcome,
              },
            })
            .select("id,lead_id,channel,status,reason,scheduled_at")
            .single();
          if (followUpError) throw followUpError;
          followUpJob = createdFollowUp;
        }
      }
      return res.status(200).json({ success: true, data, follow_up_job: followUpJob, intelligence_recalculated: false });
    }

    const leadId = cleanCommunicationText(body.lead_id, 80);
    const channel = cleanCommunicationText(body.channel, 30).toLowerCase();
    if (!leadId) return res.status(400).json({ error: "Lead ID is required." });
    if (!CHANNELS.has(channel)) return res.status(400).json({ error: "Choose WhatsApp or AI call." });
    const context = await loadContext(supabase, organization.id, leadId);
    const decision = buildCommunicationDecision({
      channel,
      ...context,
      unansweredHumanCalls: Number(body.unanswered_human_calls) || 0,
      hoursWithoutHumanContact: Number(body.hours_without_human_contact) || 0,
    });

    const dailyCount = await countDailyJobs(supabase, organization.id, channel);
    const dailyCap = channel === "whatsapp"
      ? Number(context.settings.whatsapp_daily_cap || 0)
      : Number(context.settings.ai_call_daily_cap || 0);
    if (dailyCap > 0 && dailyCount >= dailyCap) {
      decision.allowed = false;
      decision.reason = `The configured daily ${channel === "whatsapp" ? "WhatsApp" : "AI-call"} cap has been reached.`;
      decision.daily_cap_reached = true;
    }

    if (action === "preview") {
      return res.status(200).json({ success: true, decision, context: {
        lead_id: context.lead.id,
        lead_name: context.lead.contact?.full_name || context.lead.title || "CRM lead",
        recipient: channel === "whatsapp" ? context.lead.contact?.whatsapp_number || context.lead.contact?.phone : context.lead.contact?.phone,
        score: context.score?.overall_score ?? null,
        confidence: context.score?.scoring_confidence ?? context.qualification?.ai_confidence ?? null,
        sales_ready: context.qualification?.sales_ready === true,
      }});
    }

    if (!decision.allowed) return res.status(409).json({ error: decision.reason, decision });
    const recipient = channel === "whatsapp"
      ? context.lead.contact?.whatsapp_number || context.lead.contact?.phone
      : context.lead.contact?.phone;
    if (!recipient) return res.status(400).json({ error: `No ${channel === "whatsapp" ? "WhatsApp" : "telephone"} number is available for this lead.` });
    const idempotencyKey = cleanCommunicationText(body.idempotency_key, 120);
    if (!idempotencyKey) return res.status(400).json({ error: "Communication request identifier is required." });
    const { data, error } = await supabase
      .from("crm_communication_jobs")
      .insert({
        organization_id: organization.id,
        lead_id: context.lead.id,
        channel,
        job_type: cleanCommunicationText(body.job_type, 60) || "qualification",
        status: "queued",
        priority: Math.min(100, Math.max(0, Number(body.priority) || 50)),
        scheduled_at: body.scheduled_at || new Date().toISOString(),
        recipient,
        template_key: cleanCommunicationText(body.template_key, 100) || null,
        content_preview: cleanCommunicationText(body.content_preview, 1000) || null,
        max_attempts: Number(context.settings.max_attempts_per_lead || 3),
        consent_snapshot: {
          whatsapp_consent: context.commercialFacts?.whatsapp_consent === true,
          ai_call_consent: context.commercialFacts?.ai_call_consent === true,
          captured_at: context.commercialFacts?.updated_at || null,
        },
        routing_snapshot: decision,
        request_payload: { provider_execution_pending: true },
        idempotency_key: idempotencyKey,
        created_by_user_id: crmUser.id,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await supabase.from("crm_communication_jobs").select("*").eq("organization_id", organization.id).eq("idempotency_key", idempotencyKey).maybeSingle();
        return res.status(200).json({ success: true, created: false, data: existing, decision, intelligence_recalculated: false });
      }
      throw error;
    }
    return res.status(201).json({
      success: true,
      created: true,
      data,
      decision,
      provider_execution_pending: true,
      intelligence_recalculated: false,
      message: "Communication queued safely. Provider delivery will be activated after provider credentials are configured.",
    });
  } catch (error) {
    return sendCrmError(res, error);
  }
}
