// Deterministic, provider-neutral recovery planning for incomplete AI journeys.
//
// This module only returns a plan. It does not write data, create jobs, send a
// message, place a call, score a lead or alter qualification/pipeline state.

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, Math.round(number)));
}

function action(channel, sequence, dueAfterMinutes, reason) {
  return Object.freeze({
    channel,
    sequence,
    due_after_minutes: dueAfterMinutes,
    reason,
    execution_status: "planned_only",
  });
}

export function buildAbandonmentRecoveryPlan({
  completionPercent = 0,
  score = 0,
  confidence = 0,
  highIntent = false,
  salesReady = false,
  qualificationComplete = false,
  whatsappConsent = false,
  aiCallConsent = false,
  callbackConsent = false,
  callbackRequested = false,
  suppressed = false,
} = {}) {
  const completion = clampPercent(completionPercent);
  const safeScore = clampPercent(score);
  const safeConfidence = clampPercent(confidence);
  const explicitHighIntent = highIntent === true || safeScore >= 75;
  const actions = [];

  if (suppressed) {
    return Object.freeze({
      policy_version: "2026-09-15.v1",
      segment: "suppressed",
      actions: Object.freeze([]),
      stop_reason: "Lead is suppressed, opted out, closed or otherwise ineligible.",
    });
  }

  if (qualificationComplete || completion >= 100) {
    const humanFirst = salesReady === true && safeScore >= 90 && safeConfidence >= 90;
    return Object.freeze({
      policy_version: "2026-09-15.v1",
      segment: humanFirst ? "completed_human_first" : "completed_not_abandoned",
      actions: Object.freeze(
        humanFirst && (callbackConsent || callbackRequested)
          ? [action("human_call", 1, 0, "Completed 90+/90% Sales Ready journey requires human-first contact.")]
          : []
      ),
      stop_reason: "Completed qualification is handled by the normal contact-routing policy.",
    });
  }

  if (completion >= 70) {
    if (whatsappConsent) {
      actions.push(action("whatsapp", 1, 30, "Resume a substantially completed journey from the next unanswered question."));
      actions.push(action("whatsapp", 2, 24 * 60, "One reminder if the first recovery receives no response."));
    }
    if (aiCallConsent) {
      actions.push(action("ai_call", 1, 24 * 60, "Attempt only after no meaningful WhatsApp or human response."));
    }
    if ((callbackRequested || (callbackConsent && explicitHighIntent)) && safeConfidence >= 90) {
      actions.push(action("human_call", 1, 2 * 60, "High-confidence or requested callback requires prompt human review."));
    } else if (callbackRequested || (callbackConsent && explicitHighIntent)) {
      actions.push(action("human_call", 1, 8 * 60, "Strong intent or requested callback requires same-business-day human review."));
    }
    return Object.freeze({
      policy_version: "2026-09-15.v1",
      segment: "substantially_complete",
      actions: Object.freeze(actions),
      stop_reason: actions.length ? null : "No permitted recovery route is available.",
    });
  }

  if (completion >= 30) {
    if (whatsappConsent) {
      actions.push(action("whatsapp", 1, 60, "Invite the lead to resume from the next unanswered question."));
      actions.push(action("whatsapp", 2, 48 * 60, "Final incomplete-journey reminder if there is no response."));
    }
    if (aiCallConsent) {
      actions.push(action("ai_call", 1, 48 * 60, "One AI-assisted qualification attempt after digital non-response."));
    }
    if (callbackRequested || (callbackConsent && explicitHighIntent)) {
      actions.push(action("human_call", 1, 8 * 60, "Strong intent or callback request requires human review."));
    }
    return Object.freeze({
      policy_version: "2026-09-15.v1",
      segment: "partially_complete",
      actions: Object.freeze(actions),
      stop_reason: actions.length ? null : "No permitted recovery route is available.",
    });
  }

  if (whatsappConsent) {
    actions.push(action("whatsapp", 1, 2 * 60, "Send one low-pressure completion reminder."));
    actions.push(action("whatsapp", 2, 72 * 60, "Send the final completion reminder if there is no response."));
  }
  if (callbackRequested || (callbackConsent && explicitHighIntent)) {
    actions.push(action("human_call", 1, 8 * 60, "A requested callback or captured strong intent requires human review."));
  }

  return Object.freeze({
    policy_version: "2026-09-15.v1",
    segment: "minimally_complete",
    actions: Object.freeze(actions),
    stop_reason: actions.length ? null : "No permitted recovery route is available.",
  });
}

export function firstRecoveryDueAt(abandonedAt, plan) {
  const base = new Date(abandonedAt);
  if (Number.isNaN(base.getTime())) return null;
  const offsets = (plan?.actions || [])
    .map((item) => Number(item.due_after_minutes))
    .filter((value) => Number.isFinite(value) && value >= 0);
  if (!offsets.length) return null;
  return new Date(base.getTime() + Math.min(...offsets) * 60_000).toISOString();
}
