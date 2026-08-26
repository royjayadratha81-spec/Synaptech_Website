// Vercel serverless lead/engagement notification endpoint.
// Configure Twilio server-side environment variables for WhatsApp alerts.

function clean(value, max = 800) {
  return String(value ?? "").replace(/[<>]/g, "").slice(0, max);
}

function formatLead(payload) {
  const lead = payload.lead || {};
  const event = payload.event || "chat_event";
  const lines = [
    `SYNAPTECH WEBSITE ALERT: ${event.replaceAll("_", " ").toUpperCase()}`,
    `Time: ${clean(payload.timestamp, 80)}`,
    `Page: ${clean(payload.page, 250)}`,
    `Session: ${clean(payload.sessionId, 80)}`,
  ];

  if (lead.name) lines.push(`Name: ${clean(lead.name, 100)}`);
  if (lead.phone) lines.push(`Mobile: ${clean(lead.phone, 40)}`);
  if (lead.email) lines.push(`Email: ${clean(lead.email, 120)}`);
  if (lead.place) lines.push(`Place: ${clean(lead.place, 120)}`);
  if (lead.lookingFor) lines.push(`Looking for: ${clean(lead.lookingFor, 80)}`);
  if (lead.program) lines.push(`Program: ${clean(lead.program, 120)}`);
  if (payload.topic) lines.push(`Topic: ${clean(payload.topic, 150)}`);
  if (payload.score !== undefined) lines.push(`Lead score: ${clean(payload.score, 10)}/100`);
  if (payload.intent) lines.push(`Intent: ${clean(payload.intent, 60)}`);
  if (payload.question) lines.push(`Question: ${clean(payload.question, 1200)}`);
  if (lead.question) lines.push(`Counsellor query: ${clean(lead.question, 1200)}`);

  return lines.join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const payload = req.body || {};
    const body = formatLead(payload);
    console.log(body);

    const required = [
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
      process.env.TWILIO_WHATSAPP_FROM,
      process.env.SYNAPTECH_ALERT_WHATSAPP || "+919560940039",
    ];

    if (required.some((value) => !value)) {
      return res.status(200).json({ ok: true, notified: false, mode: "log-only" });
    }

    const form = new URLSearchParams();
    form.set("From", process.env.TWILIO_WHATSAPP_FROM);
    form.set("To", `whatsapp:${process.env.SYNAPTECH_ALERT_WHATSAPP || "+919560940039"}`);
    form.set("Body", body);

    const credentials = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    if (!response.ok) {
      console.error("Twilio notification error:", await response.text());
      return res.status(502).json({ ok: false, notified: false });
    }

    return res.status(200).json({ ok: true, notified: true });
  } catch (error) {
    console.error("Lead endpoint error:", error);
    return res.status(500).json({ ok: false });
  }
}
