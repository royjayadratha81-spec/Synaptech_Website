// Daily provider-side reconciliation. Configure as a Vercel Cron endpoint.

import { createClient } from "@supabase/supabase-js";
import { evaluateUsageAlerts } from "../_shared/crm-usage-metering.js";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("CRM Supabase environment variables are not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  const expected = process.env.CRON_SECRET;
  const supplied = String(req.headers.authorization || "");
  if (!expected || supplied !== `Bearer ${expected}`) return res.status(401).json({ error: "Cron authentication required." });

  try {
    const supabase = adminClient();
    const connections = await supabase
      .from("crm_tenant_metering_connections")
      .select("id,organization_id,customer_project_id,last_snapshot_at,expected_frequency")
      .eq("status", "active");
    if (connections.error) throw connections.error;

    let evaluated = 0;
    for (const connection of connections.data || []) {
      const latest = await supabase
        .from("crm_saas_usage_daily")
        .select("*")
        .eq("organization_id", connection.organization_id)
        .eq("customer_project_id", connection.customer_project_id)
        .order("usage_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest.error) throw latest.error;
      if (!latest.data) continue;
      await evaluateUsageAlerts({
        supabase,
        organizationId: connection.organization_id,
        customerProjectId: connection.customer_project_id,
        usageDate: latest.data.usage_date,
        latestUsage: latest.data,
      });
      evaluated += 1;
    }
    return res.status(200).json({ success: true, connections: (connections.data || []).length, evaluated });
  } catch (error) {
    console.error("CRM usage cron error:", error);
    return res.status(500).json({ error: "Usage reconciliation failed." });
  }
}

