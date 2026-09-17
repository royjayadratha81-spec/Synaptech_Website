// Read-only CRM view of qualification progress and recovery plans.

import { authenticateCrmRequest, sendCrmError } from "./_auth.js";

export default async function handler(req, res) {
  try {
    const { organization, supabase } = await authenticateCrmRequest(req);
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed." });
    }

    const limit = Math.min(250, Math.max(1, Number(req.query?.limit) || 100));
    const status = String(req.query?.status || "").trim().toLowerCase();
    const businessUnit = String(req.query?.business_unit || "").trim().toLowerCase();
    let query = supabase
      .from("crm_qualification_journeys")
      .select("id,lead_id,session_id,business_unit,content_version,status,required_question_count,answered_question_count,answered_question_keys,completion_percent,next_question_key,high_intent_signal,callback_requested,last_activity_at,abandoned_at,resumed_at,completed_at,recovery_plan,next_recovery_at,created_at,updated_at")
      .eq("organization_id", organization.id)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (status) query = query.eq("status", status);
    if (businessUnit) query = query.eq("business_unit", businessUnit);
    const result = await query;
    if (result.error) throw result.error;

    const rows = result.data || [];
    return res.status(200).json({
      success: true,
      data: rows,
      summary: {
        total: rows.length,
        active: rows.filter((row) => row.status === "qualification_active").length,
        abandoned: rows.filter((row) => row.status === "abandoned").length,
        recovery_scheduled: rows.filter((row) => row.status === "recovery_scheduled").length,
        completed: rows.filter((row) => row.status === "completed").length,
      },
    });
  } catch (error) {
    return sendCrmError(res, error);
  }
}

