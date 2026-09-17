// Organization-scoped safety controls for WhatsApp and AI-call orchestration.
// Provider credentials are deliberately not stored by this endpoint.

import { authenticateCrmRequest, sendCrmError } from "./_auth.js";

function bodyOf(req) {
  if (!req.body) return {};
  if (typeof req.body !== "string") return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

function integer(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function validTime(value, fallback) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || "")) ? value : fallback;
}

export default async function handler(req, res) {
  try {
    const { organization, crmUser, supabase } = await authenticateCrmRequest(req);
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("crm_communication_settings")
        .select("*")
        .eq("organization_id", organization.id)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json({
        success: true,
        data: data || {
          organization_id: organization.id,
          timezone: "Asia/Kolkata",
          quiet_hours_start: "20:00",
          quiet_hours_end: "09:00",
          whatsapp_daily_cap: 250,
          ai_call_daily_cap: 100,
          ai_call_monthly_minutes_cap: 3000,
          max_attempts_per_lead: 3,
          whatsapp_enabled: false,
          ai_call_enabled: false,
        },
      });
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed." });
    }
    if (!["admin", "org_admin", "super_admin", "owner"].includes(String(crmUser.role || "").toLowerCase())) {
      return res.status(403).json({ error: "Only a CRM administrator can change communication safety controls." });
    }
    const body = bodyOf(req);
    const payload = {
      organization_id: organization.id,
      timezone: String(body.timezone || "Asia/Kolkata").trim().slice(0, 80),
      quiet_hours_start: validTime(body.quiet_hours_start, "20:00"),
      quiet_hours_end: validTime(body.quiet_hours_end, "09:00"),
      whatsapp_daily_cap: integer(body.whatsapp_daily_cap, 250, 0, 100000),
      ai_call_daily_cap: integer(body.ai_call_daily_cap, 100, 0, 100000),
      ai_call_monthly_minutes_cap: integer(body.ai_call_monthly_minutes_cap, 3000, 0, 10000000),
      max_attempts_per_lead: integer(body.max_attempts_per_lead, 3, 1, 20),
      whatsapp_enabled: body.whatsapp_enabled === true,
      ai_call_enabled: body.ai_call_enabled === true,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("crm_communication_settings")
      .upsert(payload, { onConflict: "organization_id" })
      .select("*")
      .single();
    if (error) throw error;
    return res.status(200).json({
      success: true,
      data,
      message: "Communication safety controls saved. Existing CRM intelligence was not recalculated.",
    });
  } catch (error) {
    return sendCrmError(res, error);
  }
}
