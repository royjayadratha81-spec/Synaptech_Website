// Detects inactive qualification journeys and stores a provider-neutral
// recovery plan. It does not create communication jobs or contact leads.

import { createClient } from "@supabase/supabase-js";
import {
  buildAbandonmentRecoveryPlan,
  firstRecoveryDueAt,
} from "../_shared/crm-abandonment-recovery-policy.js";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("CRM Supabase environment variables are not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }
  const expected = process.env.CRON_SECRET;
  if (!expected || String(req.headers.authorization || "") !== `Bearer ${expected}`) {
    return res.status(401).json({ error: "Cron authentication required." });
  }

  try {
    const supabase = adminClient();
    const inactiveBefore = new Date(Date.now() - 15 * 60_000).toISOString();
    const journeysResult = await supabase
      .from("crm_qualification_journeys")
      .select("*")
      .eq("status", "qualification_active")
      .lt("completion_percent", 100)
      .lte("last_activity_at", inactiveBefore)
      .order("last_activity_at", { ascending: true })
      .limit(200);
    if (journeysResult.error) throw journeysResult.error;

    const outcomes = [];
    for (const journey of journeysResult.data || []) {
      const [scoreResult, qualificationResult] = await Promise.all([
        supabase.from("crm_lead_scores").select("overall_score,scoring_confidence").eq("organization_id", journey.organization_id).eq("lead_id", journey.lead_id).order("updated_at", { ascending: false }).limit(1),
        supabase.from("crm_lead_qualification_states").select("sales_ready,qualification_completeness").eq("organization_id", journey.organization_id).eq("lead_id", journey.lead_id).order("updated_at", { ascending: false }).limit(1),
      ]);
      if (scoreResult.error) throw scoreResult.error;
      if (qualificationResult.error) throw qualificationResult.error;

      const score = scoreResult.data?.[0] || {};
      const qualification = qualificationResult.data?.[0] || {};
      const abandonedAt = new Date().toISOString();
      const plan = buildAbandonmentRecoveryPlan({
        completionPercent: journey.completion_percent,
        score: score.overall_score,
        confidence: score.scoring_confidence,
        highIntent: journey.high_intent_signal,
        salesReady: qualification.sales_ready === true,
        qualificationComplete: Number(qualification.qualification_completeness || 0) >= 100,
        whatsappConsent: journey.whatsapp_consent_snapshot === true,
        aiCallConsent: journey.ai_call_consent_snapshot === true,
        callbackConsent: journey.callback_consent_snapshot === true,
        callbackRequested: journey.callback_requested === true,
      });
      const nextRecoveryAt = firstRecoveryDueAt(abandonedAt, plan);

      const updateResult = await supabase
        .from("crm_qualification_journeys")
        .update({
          status: plan.actions.length ? "recovery_scheduled" : "abandoned",
          abandoned_at: abandonedAt,
          recovery_plan: plan,
          next_recovery_at: nextRecoveryAt,
          updated_at: abandonedAt,
        })
        .eq("organization_id", journey.organization_id)
        .eq("id", journey.id);
      if (updateResult.error) throw updateResult.error;

      const eventResult = await supabase.from("crm_qualification_journey_events").insert({
        organization_id: journey.organization_id,
        journey_id: journey.id,
        lead_id: journey.lead_id,
        event_type: "qualification_abandoned",
        event_payload: {
          completion_percent: journey.completion_percent,
          recovery_plan: plan,
          provider_execution_requested: false,
        },
      });
      if (eventResult.error) throw eventResult.error;

      outcomes.push({
        journey_id: journey.id,
        status: plan.actions.length ? "recovery_scheduled" : "abandoned",
        segment: plan.segment,
        planned_actions: plan.actions.length,
        next_recovery_at: nextRecoveryAt,
      });
    }

    return res.status(200).json({
      success: true,
      inactive_before: inactiveBefore,
      evaluated: outcomes.length,
      outcomes,
      communication_jobs_created: 0,
      provider_execution_requested: false,
      intelligence_recalculated: false,
    });
  } catch (error) {
    console.error("CRM abandonment planning error:", error);
    return res.status(500).json({ error: "Abandonment planning failed." });
  }
}

