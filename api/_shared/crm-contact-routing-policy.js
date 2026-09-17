// Synaptech CRM contact-channel routing policy.
//
// This policy controls contact orchestration only. It never validates a lead,
// changes a score, marks a lead Sales Ready, or creates an opportunity.

function clamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, Math.round(number)));
}

export function getContactRoutingPolicy({
  score,
  confidence,
  validationState,
  qualificationComplete,
  salesReady,
  handoffIntent,
  conflictingAnswers = false,
  preferredChannel = null,
  whatsappConsent = false,
  aiCallConsent = false,
  unansweredHumanCalls = 0,
  hoursWithoutHumanContact = 0,
} = {}) {
  const safeScore = clamp(score);
  const safeConfidence = clamp(confidence);
  const acceptedHandoff = ["requested", "accepted"].includes(
    String(handoffIntent || "").toLowerCase()
  );
  const verifiedReady =
    validationState === "valid" &&
    qualificationComplete === true &&
    salesReady === true &&
    acceptedHandoff &&
    conflictingAnswers !== true;

  let strategy = "long_term_nurture";
  let immediateAction = "Keep in long-term nurture.";
  let whatsapp = "limited";
  let aiCall = "avoid";
  let humanCall = "not_required";

  if (conflictingAnswers || validationState !== "valid") {
    strategy = "verification";
    immediateAction = "Verify incomplete or conflicting qualification facts.";
    whatsapp = whatsappConsent ? "recommended" : "consent_required";
    aiCall = aiCallConsent ? "optional_verification" : "consent_required";
  } else if (safeScore >= 90 && safeConfidence >= 90 && verifiedReady) {
    strategy = "human_first";
    immediateAction = "Assign an immediate human sales call.";
    humanCall = "immediate";
    whatsapp = "skip_initially";
    aiCall = "skip_initially";
  } else if (safeScore >= 75 && safeConfidence >= 75) {
    strategy = "assisted_confirmation";
    immediateAction = "Use a human call or WhatsApp confirmation.";
    humanCall = "recommended";
    whatsapp = whatsappConsent ? "recommended" : "consent_required";
    aiCall = aiCallConsent ? "optional" : "consent_required";
  } else if (safeScore >= 50) {
    strategy = "automated_nurture";
    immediateAction = "Start automated nurture and monitor engagement.";
    whatsapp = whatsappConsent ? "recommended" : "consent_required";
    aiCall = aiCallConsent ? "conditional_on_engagement" : "consent_required";
  }

  // High-priority leads may fall back to an approved digital channel after
  // human contact fails. This does not revoke their Sales Ready state.
  const humanFallbackDue =
    strategy === "human_first" &&
    (Number(unansweredHumanCalls) >= 2 || Number(hoursWithoutHumanContact) >= 24);

  if (humanFallbackDue) {
    if (whatsappConsent) whatsapp = "fallback_due";
    if (aiCallConsent && !whatsappConsent) aiCall = "fallback_due";
  }

  const preferred = String(preferredChannel || "").toLowerCase();
  if (preferred === "whatsapp" && whatsappConsent) whatsapp = "preferred";
  if (preferred === "ai_call" && aiCallConsent) aiCall = "preferred";
  if (preferred === "human_call") humanCall = "preferred";

  return {
    policy_version: "v1",
    strategy,
    immediate_action: immediateAction,
    pipeline_blocked_by_channels: false,
    verified_sales_ready: verifiedReady,
    channels: {
      human_call: humanCall,
      whatsapp,
      ai_call: aiCall,
    },
    fallback: {
      due: humanFallbackDue,
      after_unanswered_human_calls: 2,
      after_hours_without_human_contact: 24,
    },
    evidence: {
      score: safeScore,
      confidence: safeConfidence,
      validation_state: validationState || null,
      qualification_complete: qualificationComplete === true,
      sales_ready: salesReady === true,
      handoff_intent: handoffIntent || null,
    },
  };
}
