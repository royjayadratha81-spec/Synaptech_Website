// Public, signed-session endpoint for qualification progress telemetry.
// Stores question keys and state only; it never stores answer text, sends a
// communication, recalculates intelligence or changes the pipeline.

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  OMNICHANNEL_CONTENT_VERSION,
  getQuestionSet,
  normalizeBusinessUnit,
} from "../_shared/crm-omnichannel-content-registry.js";

const ALLOWED_EVENTS = new Set([
  "qualification_started",
  "question_answered",
  "qualification_heartbeat",
  "qualification_resumed",
  "qualification_completed",
  "qualification_suppressed",
]);

function cleanText(value, max = 200) {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);
}

function decodeBase64Url(value) {
  return Buffer.from(String(value).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function verifySessionToken(token) {
  const secret = process.env.ENGAGEMENT_SESSION_SECRET;
  const parts = String(token || "").split(".");
  if (!secret || parts.length !== 2) throw new Error("Invalid engagement session.");
  const [payloadPart, signaturePart] = parts;
  const expected = crypto.createHmac("sha256", secret).update(payloadPart).digest();
  const actual = decodeBase64Url(signaturePart);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new Error("Invalid engagement session.");
  }
  const payload = JSON.parse(decodeBase64Url(payloadPart).toString("utf8"));
  if (!payload?.sid || !payload?.lid || !payload?.oid || !payload?.exp) {
    throw new Error("Invalid engagement session.");
  }
  if (Math.floor(Date.now() / 1000) > Number(payload.exp)) {
    throw new Error("Engagement session expired.");
  }
  return payload;
}

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server database configuration is unavailable.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function uniqueKnownQuestionKeys(values, validKeys) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => cleanText(value, 100).toLowerCase())
    .filter((value) => validKeys.has(value)))];
}

function statusForEvent(eventType, priorStatus) {
  if (eventType === "qualification_completed") return "completed";
  if (eventType === "qualification_suppressed") return "suppressed";
  if (eventType === "qualification_resumed") {
    return ["completed", "suppressed", "closed"].includes(priorStatus)
      ? priorStatus
      : "qualification_active";
  }
  return ["completed", "suppressed", "closed"].includes(priorStatus)
    ? priorStatus
    : "qualification_active";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method not allowed." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const eventType = cleanText(body.event_type, 80).toLowerCase();
    if (!ALLOWED_EVENTS.has(eventType)) {
      return res.status(400).json({ success: false, error: "Unsupported journey event." });
    }

    const session = verifySessionToken(body.session_token);
    const businessUnit = normalizeBusinessUnit(session.bu || body.business_unit);
    const questionSet = getQuestionSet(businessUnit);
    if (!businessUnit || !questionSet) {
      return res.status(400).json({ success: false, error: "Unsupported business unit." });
    }

    const supabase = adminClient();
    const leadResult = await supabase
      .from("crm_leads")
      .select("id,organization_id,status")
      .eq("organization_id", session.oid)
      .eq("id", session.lid)
      .maybeSingle();
    if (leadResult.error) throw leadResult.error;
    if (!leadResult.data) return res.status(404).json({ success: false, error: "CRM lead not found." });

    const existingResult = await supabase
      .from("crm_qualification_journeys")
      .select("*")
      .eq("organization_id", session.oid)
      .eq("session_id", session.sid)
      .maybeSingle();
    if (existingResult.error) throw existingResult.error;

    const validKeys = new Set(questionSet.questions.map((question) => question.key));
    const priorKeys = uniqueKnownQuestionKeys(existingResult.data?.answered_question_keys, validKeys);
    const submittedKeys = uniqueKnownQuestionKeys(body.answered_question_keys, validKeys);
    const singleKey = cleanText(body.question_key, 100).toLowerCase();
    const answeredKeys = uniqueKnownQuestionKeys(
      [...priorKeys, ...submittedKeys, ...(validKeys.has(singleKey) ? [singleKey] : [])],
      validKeys
    );
    const requiredKeys = questionSet.questions.filter((question) => question.required !== false).map((question) => question.key);
    const requiredAnswered = requiredKeys.filter((key) => answeredKeys.includes(key)).length;
    const completionPercent = requiredKeys.length
      ? Math.min(100, Math.round((requiredAnswered / requiredKeys.length) * 100))
      : 0;
    if (eventType === "qualification_completed" && completionPercent < 100) {
      return res.status(409).json({
        success: false,
        error: "Mandatory qualification questions are incomplete.",
        completion_percent: completionPercent,
        answered_question_count: requiredAnswered,
        required_question_count: requiredKeys.length,
      });
    }
    if (
      eventType === "qualification_resumed" &&
      ["completed", "suppressed", "closed"].includes(existingResult.data?.status)
    ) {
      return res.status(409).json({
        success: false,
        error: "This qualification journey can no longer be resumed.",
      });
    }
    const nextQuestionKey = cleanText(body.next_question_key, 100).toLowerCase();
    const safeNextQuestionKey = validKeys.has(nextQuestionKey) ? nextQuestionKey : null;
    const now = new Date().toISOString();
    const nextStatus = statusForEvent(eventType, existingResult.data?.status);
    const implicitlyResumed = ["abandoned", "recovery_scheduled"].includes(existingResult.data?.status)
      && ["question_answered", "qualification_heartbeat"].includes(eventType);
    const resumed = eventType === "qualification_resumed" || implicitlyResumed;

    const payload = {
      organization_id: session.oid,
      lead_id: session.lid,
      session_id: session.sid,
      business_unit: businessUnit,
      content_version: OMNICHANNEL_CONTENT_VERSION,
      status: nextStatus,
      required_question_count: requiredKeys.length,
      answered_question_count: requiredAnswered,
      answered_question_keys: answeredKeys,
      completion_percent: completionPercent,
      next_question_key: eventType === "qualification_completed" ? null : safeNextQuestionKey,
      high_intent_signal: existingResult.data?.high_intent_signal === true || body.high_intent_signal === true,
      whatsapp_consent_snapshot: typeof body.whatsapp_consent === "boolean"
        ? body.whatsapp_consent
        : existingResult.data?.whatsapp_consent_snapshot ?? false,
      ai_call_consent_snapshot: typeof body.ai_call_consent === "boolean"
        ? body.ai_call_consent
        : existingResult.data?.ai_call_consent_snapshot ?? false,
      callback_consent_snapshot: typeof body.callback_consent === "boolean"
        ? body.callback_consent
        : existingResult.data?.callback_consent_snapshot ?? false,
      callback_requested: existingResult.data?.callback_requested === true || body.callback_requested === true,
      last_activity_at: now,
      abandoned_at: resumed ? null : existingResult.data?.abandoned_at || null,
      resumed_at: resumed ? now : existingResult.data?.resumed_at || null,
      completed_at: eventType === "qualification_completed" ? now : existingResult.data?.completed_at || null,
      suppressed_at: eventType === "qualification_suppressed" ? now : existingResult.data?.suppressed_at || null,
      recovery_plan: resumed ? {} : existingResult.data?.recovery_plan || {},
      next_recovery_at: resumed ? null : existingResult.data?.next_recovery_at || null,
      updated_at: now,
    };

    const journeyResult = existingResult.data
      ? await supabase.from("crm_qualification_journeys").update(payload).eq("id", existingResult.data.id).select("*").single()
      : await supabase.from("crm_qualification_journeys").insert({ ...payload, started_at: now }).select("*").single();
    if (journeyResult.error) throw journeyResult.error;

    const eventResult = await supabase.from("crm_qualification_journey_events").insert({
      organization_id: session.oid,
      journey_id: journeyResult.data.id,
      lead_id: session.lid,
      event_type: eventType,
      event_payload: {
        question_key: validKeys.has(singleKey) ? singleKey : null,
        completion_percent: journeyResult.data.completion_percent,
        next_question_key: journeyResult.data.next_question_key,
        content_version: OMNICHANNEL_CONTENT_VERSION,
      },
    });
    if (eventResult.error) throw eventResult.error;

    return res.status(200).json({
      success: true,
      journey: {
        status: journeyResult.data.status,
        business_unit: journeyResult.data.business_unit,
        content_version: journeyResult.data.content_version,
        completion_percent: journeyResult.data.completion_percent,
        answered_question_count: journeyResult.data.answered_question_count,
        required_question_count: journeyResult.data.required_question_count,
        next_question_key: journeyResult.data.next_question_key,
      },
      intelligence_recalculated: false,
      provider_execution_requested: false,
    });
  } catch (error) {
    const message = String(error?.message || "");
    const unauthorized = message.includes("engagement session");
    console.error("Qualification journey telemetry error:", error);
    return res.status(unauthorized ? 401 : 500).json({
      success: false,
      error: unauthorized ? "Invalid or expired engagement session." : "Unable to record qualification progress.",
    });
  }
}
