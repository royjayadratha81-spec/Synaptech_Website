// Synaptech CRM - authenticated follow-up task API.
// Reads and updates crm_follow_up_jobs only. It does not touch lead scoring,
// qualification, opportunities, commercial facts, LMS or website data.

import { authenticateCrmRequest, sendCrmError } from "./_auth.js";

const ACTIONS = new Set(["complete", "cancel", "reschedule"]);

function clean(value, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function bodyOf(req) {
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
      const status = clean(req.query?.status, 30).toLowerCase();
      const channel = clean(req.query?.channel, 30).toLowerCase();
      const limit = Math.min(250, Math.max(1, Number(req.query?.limit) || 100));

      let query = supabase
        .from("crm_follow_up_jobs")
        .select("id,organization_id,lead_id,conversation_id,business_unit,channel,job_type,status,priority,reason,scheduled_at,started_at,completed_at,attempt_count,max_attempts,last_error,outcome,outcome_data,context_snapshot,created_at,updated_at")
        .eq("organization_id", organization.id)
        .order("scheduled_at", { ascending: true, nullsFirst: false })
        .limit(limit);

      if (leadId) query = query.eq("lead_id", leadId);
      if (status && status !== "all") query = query.eq("status", status);
      if (channel && channel !== "all") query = query.eq("channel", channel);

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json({ success: true, data: data || [] });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed." });
    }

    const body = bodyOf(req);
    const jobId = clean(body.job_id, 80);
    const action = clean(body.action, 30).toLowerCase();

    if (!jobId) return res.status(400).json({ error: "Follow-up job ID is required." });
    if (!ACTIONS.has(action)) {
      return res.status(400).json({ error: "Unsupported follow-up action." });
    }

    const { data: existing, error: lookupError } = await supabase
      .from("crm_follow_up_jobs")
      .select("id,status,scheduled_at")
      .eq("organization_id", organization.id)
      .eq("id", jobId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!existing) return res.status(404).json({ error: "Follow-up task not found." });

    const now = new Date().toISOString();
    const patch = { updated_at: now };

    if (action === "complete") {
      patch.status = "completed";
      patch.completed_at = now;
      patch.outcome = clean(body.outcome, 500) || "completed_by_crm_user";
      patch.outcome_data = {
        note: clean(body.note, 2000) || null,
        completed_by_user_id: crmUser.id,
        completed_by_name: crmUser.full_name || crmUser.email || "CRM user",
      };
    }

    if (action === "cancel") {
      patch.status = "cancelled";
      patch.completed_at = now;
      patch.outcome = clean(body.outcome, 500) || "cancelled_by_crm_user";
      patch.outcome_data = {
        note: clean(body.note, 2000) || null,
        cancelled_by_user_id: crmUser.id,
      };
    }

    if (action === "reschedule") {
      const scheduledAt = clean(body.scheduled_at, 80);
      if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
        return res.status(400).json({ error: "A valid rescheduled date and time is required." });
      }
      patch.status = "scheduled";
      patch.scheduled_at = new Date(scheduledAt).toISOString();
      patch.completed_at = null;
    }

    const { data, error } = await supabase
      .from("crm_follow_up_jobs")
      .update(patch)
      .eq("organization_id", organization.id)
      .eq("id", jobId)
      .select("id,lead_id,business_unit,channel,job_type,status,priority,reason,scheduled_at,completed_at,outcome,outcome_data,updated_at")
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendCrmError(res, error);
  }
}
