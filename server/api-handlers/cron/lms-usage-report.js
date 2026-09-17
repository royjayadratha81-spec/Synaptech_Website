import crypto from "node:crypto";
import {
  collectRealLmsUsage,
  meteringConfiguration,
} from "../_shared/lms-usage-collector.js";

function authorised(req) {
  const secret = String(process.env.CRON_SECRET || "");
  return Boolean(secret) && String(req.headers.authorization || "") === `Bearer ${secret}`;
}

function usageDateForIndia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }
  if (!authorised(req)) return res.status(401).json({ error: "Cron authentication required." });

  try {
    const requestedDate = String(req.query?.usage_date || "").trim();
    const usageDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : usageDateForIndia();
    const metrics = await collectRealLmsUsage({ usageDate });
    const dryRun = String(req.query?.dry_run || "").toLowerCase() === "true";
    if (dryRun) return res.status(200).json({ success: true, dry_run: true, usage_date: usageDate, metrics });

    const { endpoint, tenantKey, apiKey } = meteringConfiguration();
    const eventId = `lms-daily-${tenantKey}-${usageDate}-${crypto.randomUUID()}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Synaptech-Tenant": tenantKey,
        "X-Synaptech-Meter-Key": apiKey,
        "X-Synaptech-Event-Id": eventId,
      },
      body: JSON.stringify({ usage_date: usageDate, metrics }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `Metering endpoint returned ${response.status}.`);

    return res.status(200).json({
      success: true,
      usage_date: usageDate,
      event_id: eventId,
      metrics,
      metering: payload,
    });
  } catch (error) {
    console.error("LMS usage reporting error:", error);
    return res.status(500).json({ error: error?.message || "LMS usage reporting failed." });
  }
}
