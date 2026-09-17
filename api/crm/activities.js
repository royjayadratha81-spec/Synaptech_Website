// Synaptech CRM - authenticated manual activity API.
// Phase 1 deliberately stores call evidence without changing qualification
// facts, scoring rules, consent, sales-readiness gates or opportunity data.

import { authenticateCrmRequest, sendCrmError } from "./_auth.js";

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
        idempotency_key: idempotencyKey,
        outcome,
        summary,
        next_action: nextAction || null,
        duration_minutes: Math.max(0, Number(body.duration_minutes) || 0),
        contact_person: clean(body.contact_person, 150) || null,
        decision_maker_confirmed: body.decision_maker_confirmed === true,
        sentiment: clean(body.sentiment, 40) || null,
        recorded_by_user_id: crmUser.id,
        recorded_by_name: crmUser.full_name || crmUser.email || "CRM user",
      };

      const { data, error } = await supabase
        .from("crm_engagement_events")
        .insert({
          organization_id: organization.id,
          lead_id: lead.id,
          conversation_id: null,
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
            business_unit: clean(body.business_unit, 60) || "business_solutions",
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

    return res.status(created ? 201 : 200).json({
      success: true,
      created,
      event,
      follow_up_job: followUpJob,
      intelligence_recalculated: false,
      message:
        "Call evidence saved. Existing scoring and qualification rules were not changed or automatically rerun.",
    });
  } catch (error) {
    return sendCrmError(res, error);
  }
}
