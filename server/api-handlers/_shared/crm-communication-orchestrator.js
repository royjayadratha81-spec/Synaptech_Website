import { getContactRoutingPolicy } from "./crm-contact-routing-policy.js";

const CHANNELS = new Set(["whatsapp", "ai_call"]);

export function cleanCommunicationText(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function booleanFact(value) {
  return value === true;
}

function currentLocalHour(timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone || "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function timeMinutes(value, fallback) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : fallback;
}

export function isInQuietHours(settings = {}) {
  const now = currentLocalHour(settings.timezone);
  const start = timeMinutes(settings.quiet_hours_start, 20 * 60);
  const end = timeMinutes(settings.quiet_hours_end, 9 * 60);
  if (start === end) return false;
  return start > end ? now >= start || now < end : now >= start && now < end;
}

export function buildCommunicationDecision({
  channel,
  score,
  qualification,
  commercialFacts,
  settings,
  unansweredHumanCalls = 0,
  hoursWithoutHumanContact = 0,
} = {}) {
  if (!CHANNELS.has(channel)) {
    return { allowed: false, reason: "Unsupported communication channel." };
  }

  const facts = commercialFacts || {};
  const routing = getContactRoutingPolicy({
    score: score?.overall_score ?? score?.score ?? 0,
    confidence: score?.scoring_confidence ?? qualification?.ai_confidence ?? 0,
    validationState: qualification?.validation_state,
    qualificationComplete: Number(qualification?.qualification_completeness || 0) >= 100,
    salesReady: qualification?.sales_ready === true,
    handoffIntent: qualification?.handoff_intent,
    conflictingAnswers: qualification?.conflicting_answers === true,
    preferredChannel: facts.preferred_contact_channel,
    whatsappConsent: booleanFact(facts.whatsapp_consent),
    aiCallConsent: booleanFact(facts.ai_call_consent),
    unansweredHumanCalls,
    hoursWithoutHumanContact,
  });

  const consentGranted = channel === "whatsapp"
    ? booleanFact(facts.whatsapp_consent)
    : booleanFact(facts.ai_call_consent);
  const channelEnabled = channel === "whatsapp"
    ? settings?.whatsapp_enabled === true
    : settings?.ai_call_enabled === true;
  const directive = routing.channels[channel];

  let reason = "Approved by the current contact-routing policy.";
  let allowed = true;
  if (!consentGranted) {
    allowed = false;
    reason = `${channel === "whatsapp" ? "WhatsApp" : "AI-call"} consent is required.`;
  } else if (!channelEnabled) {
    allowed = false;
    reason = `${channel === "whatsapp" ? "WhatsApp" : "AI-call"} execution is not enabled for this organization.`;
  } else if (["skip_initially", "avoid", "consent_required"].includes(directive)) {
    allowed = false;
    reason = directive === "skip_initially"
      ? "Direct human contact has priority; this channel must be skipped initially."
      : "The current routing policy does not approve this channel.";
  } else if (isInQuietHours(settings)) {
    allowed = false;
    reason = `The organization is currently inside configured quiet hours (${settings?.timezone || "Asia/Kolkata"}).`;
  }

  return {
    allowed,
    reason,
    channel,
    directive,
    consent_granted: consentGranted,
    channel_enabled: channelEnabled,
    quiet_hours_active: isInQuietHours(settings),
    routing,
  };
}
