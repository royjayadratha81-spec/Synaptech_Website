// Server-to-server usage snapshot ingestion for both deployment modes.
// Authentication uses a tenant key plus a high-entropy metering API key.

import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "node:crypto";
import { normalizeUsageMetrics, upsertDailyUsage } from "../_shared/crm-usage-metering.js";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("CRM Supabase environment variables are not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function bodyOf(req) {
  if (!req.body) return {};
  if (typeof req.body !== "string") return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

function clean(value, max = 200) {
  const result = String(value ?? "").trim();
  return result ? result.slice(0, max) : null;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function matchesHash(plain, expectedHex) {
  if (!plain || !/^[a-f0-9]{64}$/i.test(expectedHex || "")) return false;
  const actual = Buffer.from(sha256(plain), "hex");
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const tenantKey = clean(req.headers["x-synaptech-tenant"], 120);
    const apiKey = clean(req.headers["x-synaptech-meter-key"], 300);
    const headerEventId = clean(req.headers["x-synaptech-event-id"], 160);
    if (!tenantKey || !apiKey) return res.status(401).json({ error: "Metering credentials required." });

    const supabase = adminClient();
    const connection = await supabase
      .from("crm_tenant_metering_connections")
      .select("*")
      .eq("tenant_key", tenantKey)
      .eq("status", "active")
      .maybeSingle();
    if (connection.error) throw connection.error;
    if (!connection.data || !matchesHash(apiKey, connection.data.api_key_hash)) {
      return res.status(401).json({ error: "Invalid metering credentials." });
    }

    const body = bodyOf(req);
    const usageDate = clean(body.usage_date, 10);
    const eventId = headerEventId || clean(body.event_id, 160);
    if (!eventId) return res.status(400).json({ error: "A unique event_id is required." });
    if (!validDate(usageDate)) return res.status(400).json({ error: "usage_date must be YYYY-MM-DD." });
    const metrics = normalizeUsageMetrics(body.metrics || body);
    const payloadHash = sha256(JSON.stringify({ usage_date: usageDate, metrics }));

    const duplicate = await supabase
      .from("crm_saas_metering_receipts")
      .select("id,payload_hash")
      .eq("connection_id", connection.data.id)
      .eq("event_id", eventId)
      .maybeSingle();
    if (duplicate.error) throw duplicate.error;
    if (duplicate.data) {
      if (duplicate.data.payload_hash !== payloadHash) {
        return res.status(409).json({ error: "event_id was already used with a different payload." });
      }
      return res.status(200).json({ success: true, duplicate: true, event_id: eventId });
    }

    const now = new Date().toISOString();
    const receipt = await supabase.from("crm_saas_metering_receipts").insert({
      connection_id: connection.data.id,
      organization_id: connection.data.organization_id,
      customer_project_id: connection.data.customer_project_id,
      event_id: eventId,
      usage_date: usageDate,
      deployment_mode: connection.data.deployment_mode,
      source_system: connection.data.source_system,
      payload_hash: payloadHash,
      metrics,
      received_at: now,
    });
    if (receipt.error) throw receipt.error;

    const saved = await upsertDailyUsage({
      supabase,
      organizationId: connection.data.organization_id,
      customerProjectId: connection.data.customer_project_id,
      usageDate,
      metrics,
      sourceSnapshot: {
        source: "automatic_tenant_metering",
        connection_id: connection.data.id,
        deployment_mode: connection.data.deployment_mode,
        source_system: connection.data.source_system,
        event_id: eventId,
        received_at: now,
      },
      now,
    });

    const heartbeat = await supabase
      .from("crm_tenant_metering_connections")
      .update({ last_seen_at: now, last_snapshot_at: now, updated_at: now })
      .eq("id", connection.data.id);
    if (heartbeat.error) throw heartbeat.error;

    return res.status(200).json({
      success: true,
      duplicate: false,
      event_id: eventId,
      usage: saved.usage,
      evaluation: saved.evaluation,
    });
  } catch (error) {
    console.error("CRM metering ingest error:", error);
    return res.status(500).json({ error: "Metering service error." });
  }
}

