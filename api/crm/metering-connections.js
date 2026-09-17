// Authenticated CRM administration for shared-SaaS / white-label metering links.
// The generated API key is returned once and only its SHA-256 hash is stored.

import { createHash, randomBytes } from "node:crypto";
import { authenticateCrmRequest, sendCrmError } from "./_auth.js";

function bodyOf(req) {
  if (!req.body) return {};
  if (typeof req.body !== "string") return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

function clean(value, max = 200) {
  const result = String(value ?? "").trim();
  return result ? result.slice(0, max) : null;
}

function hashKey(value) {
  return createHash("sha256").update(value).digest("hex");
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { organization, crmUser, supabase } = await authenticateCrmRequest(req);
    if (req.method === "GET") {
      const result = await supabase
        .from("crm_tenant_metering_connections")
        .select("id,organization_id,customer_project_id,deployment_mode,tenant_key,source_system,status,expected_frequency,last_seen_at,last_snapshot_at,metadata,created_at,updated_at")
        .eq("organization_id", organization.id)
        .order("updated_at", { ascending: false });
      if (result.error) throw result.error;
      return res.status(200).json({ success: true, connections: result.data || [] });
    }

    const body = bodyOf(req);
    const customerProjectId = clean(body.customer_project_id, 80);
    const deploymentMode = clean(body.deployment_mode, 30);
    if (!customerProjectId) return res.status(400).json({ error: "Customer project is required." });
    if (!["shared_saas", "white_label"].includes(deploymentMode)) {
      return res.status(400).json({ error: "Deployment mode must be shared_saas or white_label." });
    }

    const project = await supabase
      .from("crm_customer_projects")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("id", customerProjectId)
      .maybeSingle();
    if (project.error) throw project.error;
    if (!project.data) return res.status(404).json({ error: "Customer project not found." });

    const suppliedTenantKey = clean(body.tenant_key, 120);
    const tenantKey = suppliedTenantKey || `tenant_${randomBytes(10).toString("hex")}`;
    const plainApiKey = `smk_${randomBytes(32).toString("base64url")}`;
    const now = new Date().toISOString();
    const payload = {
      organization_id: organization.id,
      customer_project_id: customerProjectId,
      deployment_mode: deploymentMode,
      tenant_key: tenantKey,
      source_system: clean(body.source_system, 120) || "synaptech_lms",
      api_key_hash: hashKey(plainApiKey),
      status: "active",
      expected_frequency: clean(body.expected_frequency, 20) === "hourly" ? "hourly" : "daily",
      metadata: { provisioned_by: crmUser.id, provisioned_at: now },
      updated_at: now,
    };

    const prior = await supabase
      .from("crm_tenant_metering_connections")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("customer_project_id", customerProjectId)
      .maybeSingle();
    if (prior.error) throw prior.error;
    const result = prior.data
      ? await supabase.from("crm_tenant_metering_connections").update(payload).eq("id", prior.data.id).eq("organization_id", organization.id).select("id,customer_project_id,deployment_mode,tenant_key,status,expected_frequency").single()
      : await supabase.from("crm_tenant_metering_connections").insert(payload).select("id,customer_project_id,deployment_mode,tenant_key,status,expected_frequency").single();
    if (result.error) throw result.error;

    return res.status(200).json({
      success: true,
      connection: result.data,
      api_key: plainApiKey,
      warning: "Copy this API key now. It is not stored in readable form and will not be shown again.",
    });
  } catch (error) {
    console.error("CRM metering connection error:", error);
    return sendCrmError(res, error);
  }
}

