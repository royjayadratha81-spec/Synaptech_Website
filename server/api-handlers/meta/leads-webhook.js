// Meta Lead Ads webhook endpoint.
// Phase 1: verification handshake + safe acknowledgement only.
// This file intentionally does NOT write to CRM/Supabase or alter qualification logic.

export default async function handler(req, res) {
  if (req.method === "GET") {
    const mode = req.query?.["hub.mode"];
    const token = req.query?.["hub.verify_token"];
    const challenge = req.query?.["hub.challenge"];
    const expectedToken = process.env.META_LEADS_VERIFY_TOKEN;

    if (!expectedToken) {
      console.error("META_LEADS_VERIFY_TOKEN is not configured.");
      return res.status(500).send("Webhook verify token is not configured");
    }

    if (mode === "subscribe" && token === expectedToken && challenge) {
      return res.status(200).send(String(challenge));
    }

    return res.status(403).send("Webhook verification failed");
  }

  if (req.method === "POST") {
    // Phase 1 only: acknowledge Meta webhook deliveries without touching CRM data.
    // Lead retrieval + CRM insertion will be added and tested in the next phase.
    return res.status(200).json({ received: true });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}