// Best-effort browser telemetry. A failure here must never interrupt lead
// capture, the customer-facing AI journey, scoring or qualification.

export async function recordQualificationJourney({
  sessionToken,
  eventType,
  progress = {},
} = {}) {
  if (!sessionToken || !eventType) return false;

  try {
    const response = await fetch("/api/engagement/journey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_token: sessionToken,
        event_type: eventType,
        business_unit: progress.business_unit,
        answered_question_keys: progress.answered_question_keys || [],
        question_key: progress.question_key || null,
        next_question_key: progress.next_question_key || null,
        ...(progress.whatsapp_consent === true ? { whatsapp_consent: true } : {}),
        ...(progress.ai_call_consent === true ? { ai_call_consent: true } : {}),
        ...(progress.callback_consent === true ? { callback_consent: true } : {}),
        ...(progress.callback_requested === true ? { callback_requested: true } : {}),
      }),
      keepalive: true,
    });

    if (!response.ok) {
      console.warn("Qualification journey telemetry was not recorded:", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("Qualification journey telemetry is unavailable:", error);
    return false;
  }
}
