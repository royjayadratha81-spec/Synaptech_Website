// Shared usage persistence and contract-alert evaluation.
// This module is isolated from lead scoring, qualification, routing and pipeline logic.

export function nonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function normalizeUsageMetrics(input = {}) {
  return {
    active_students: Math.round(nonNegativeNumber(input.active_students)),
    active_staff_users: Math.round(nonNegativeNumber(input.active_staff_users)),
    leads_created: Math.round(nonNegativeNumber(input.leads_created)),
    whatsapp_messages: Math.round(nonNegativeNumber(input.whatsapp_messages)),
    whatsapp_conversations: Math.round(nonNegativeNumber(input.whatsapp_conversations)),
    ai_call_minutes: nonNegativeNumber(input.ai_call_minutes),
    ai_qualification_runs: Math.round(nonNegativeNumber(input.ai_qualification_runs)),
    storage_used_gb: nonNegativeNumber(input.storage_used_gb),
    api_requests: Math.round(nonNegativeNumber(input.api_requests)),
  };
}

function monthStartOf(usageDate) {
  return `${usageDate.slice(0, 7)}-01`;
}

export async function evaluateUsageAlerts({
  supabase,
  organizationId,
  customerProjectId,
  usageDate,
  latestUsage,
  now = new Date().toISOString(),
}) {
  const contractResult = await supabase
    .from("crm_saas_contracts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("customer_project_id", customerProjectId)
    .maybeSingle();
  if (contractResult.error) throw contractResult.error;
  if (!contractResult.data) return { evaluated: false, reason: "no_active_contract" };

  const monthUsage = await supabase
    .from("crm_saas_usage_daily")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("customer_project_id", customerProjectId)
    .gte("usage_date", monthStartOf(usageDate))
    .lte("usage_date", usageDate);
  if (monthUsage.error) throw monthUsage.error;

  const rows = monthUsage.data || [];
  const contract = contractResult.data;
  const sum = (key) => rows.reduce((total, row) => total + nonNegativeNumber(row[key]), 0);
  const comparisons = [
    ["active_students", contract.contracted_students, latestUsage.active_students],
    ["active_staff_users", contract.contracted_staff_users, latestUsage.active_staff_users],
    ["monthly_leads", contract.monthly_lead_limit, sum("leads_created")],
    ["monthly_whatsapp", contract.monthly_whatsapp_limit, sum("whatsapp_messages")],
    ["monthly_ai_call_minutes", contract.monthly_ai_call_minutes, sum("ai_call_minutes")],
    ["storage_gb", contract.storage_limit_gb, latestUsage.storage_used_gb],
  ];

  const outcomes = [];
  for (const [metricKey, rawLimit, rawObserved] of comparisons) {
    const limit = Number(rawLimit);
    if (!(limit > 0)) continue;
    const observed = nonNegativeNumber(rawObserved);
    const percent = (observed / limit) * 100;
    const existing = await supabase
      .from("crm_saas_usage_alerts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("customer_project_id", customerProjectId)
      .eq("metric_key", metricKey)
      .eq("status", "open")
      .maybeSingle();
    if (existing.error) throw existing.error;

    if (percent >= 80) {
      const alert = {
        organization_id: organizationId,
        customer_project_id: customerProjectId,
        contract_id: contract.id,
        metric_key: metricKey,
        severity: percent >= 100 ? "critical" : "warning",
        contracted_value: limit,
        observed_value: observed,
        usage_percent: Math.round(percent * 100) / 100,
        status: "open",
        last_detected_at: now,
        resolved_at: null,
        metadata: { usage_date: usageDate, overage_policy: contract.overage_policy },
      };
      const result = existing.data
        ? await supabase.from("crm_saas_usage_alerts").update(alert).eq("id", existing.data.id)
        : await supabase.from("crm_saas_usage_alerts").insert(alert);
      if (result.error) throw result.error;
      outcomes.push({ metric_key: metricKey, severity: alert.severity, usage_percent: alert.usage_percent });
    } else if (existing.data) {
      const resolved = await supabase
        .from("crm_saas_usage_alerts")
        .update({ status: "resolved", resolved_at: now, last_detected_at: now })
        .eq("organization_id", organizationId)
        .eq("id", existing.data.id);
      if (resolved.error) throw resolved.error;
    }
  }

  return { evaluated: true, alerts: outcomes };
}

export async function upsertDailyUsage({
  supabase,
  organizationId,
  customerProjectId,
  usageDate,
  metrics,
  sourceSnapshot,
  now = new Date().toISOString(),
}) {
  const normalized = normalizeUsageMetrics(metrics);
  const payload = {
    organization_id: organizationId,
    customer_project_id: customerProjectId,
    usage_date: usageDate,
    ...normalized,
    source_snapshot: sourceSnapshot || {},
    updated_at: now,
  };
  const prior = await supabase
    .from("crm_saas_usage_daily")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("customer_project_id", customerProjectId)
    .eq("usage_date", usageDate)
    .maybeSingle();
  if (prior.error) throw prior.error;

  const result = prior.data
    ? await supabase.from("crm_saas_usage_daily").update(payload).eq("id", prior.data.id).select("*").single()
    : await supabase.from("crm_saas_usage_daily").insert(payload).select("*").single();
  if (result.error) throw result.error;

  const evaluation = await evaluateUsageAlerts({
    supabase,
    organizationId,
    customerProjectId,
    usageDate,
    latestUsage: result.data,
    now,
  });
  return { usage: result.data, evaluation };
}

