// Synaptech CRM - post-sale lifecycle, payments, contracts and usage.
// Isolated from qualification/scoring/pipeline engines.

import { authenticateCrmRequest, sendCrmError } from "./_auth.js";

function bodyOf(req) {
  if (!req.body) return {};
  if (typeof req.body !== "string") return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

function clean(value, max = 2000) {
  const result = String(value ?? "").trim();
  return result ? result.slice(0, max) : null;
}

function numeric(value, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : fallback;
}

async function loadPostSale(supabase, organizationId) {
  const queries = await Promise.all([
    supabase.from("crm_work_orders").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("crm_customer_projects").select("*").eq("organization_id", organizationId).order("updated_at", { ascending: false }),
    supabase.from("crm_deal_payments").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("crm_saas_contracts").select("*").eq("organization_id", organizationId).order("updated_at", { ascending: false }),
    supabase.from("crm_saas_usage_daily").select("*").eq("organization_id", organizationId).order("usage_date", { ascending: false }).limit(120),
    supabase.from("crm_saas_usage_alerts").select("*").eq("organization_id", organizationId).order("last_detected_at", { ascending: false }).limit(100),
  ]);

  const failure = queries.find((query) => query.error);
  if (failure?.error) throw failure.error;

  const [workOrders, projects, payments, contracts, usage, alerts] = queries.map((query) => query.data || []);
  const leadIds = [...new Set(workOrders.map((row) => row.lead_id).filter(Boolean))];
  let leads = [];
  if (leadIds.length) {
    const result = await supabase
      .from("crm_leads")
      .select("id,title,requirement,status,company:crm_companies(id,name),contact:crm_contacts(id,full_name,email,phone)")
      .eq("organization_id", organizationId)
      .in("id", leadIds);
    if (result.error) throw result.error;
    leads = result.data || [];
  }

  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const projectByWorkOrder = new Map(projects.map((project) => [project.work_order_id, project]));
  const paymentsByWorkOrder = new Map();
  payments.forEach((payment) => {
    const rows = paymentsByWorkOrder.get(payment.work_order_id) || [];
    rows.push(payment);
    paymentsByWorkOrder.set(payment.work_order_id, rows);
  });

  const customers = workOrders.map((workOrder) => {
    const paymentRows = paymentsByWorkOrder.get(workOrder.id) || [];
    const amountDue = paymentRows.reduce((sum, row) => sum + numeric(row.amount_due), 0);
    const amountReceived = paymentRows.reduce((sum, row) => sum + numeric(row.amount_received), 0);
    return {
      work_order: workOrder,
      lead: leadById.get(workOrder.lead_id) || null,
      project: projectByWorkOrder.get(workOrder.id) || null,
      payments: paymentRows,
      payment_summary: {
        amount_due: amountDue,
        amount_received: amountReceived,
        balance: Math.max(0, amountDue - amountReceived),
        overdue_count: paymentRows.filter((row) => row.payment_status === "overdue").length,
      },
    };
  });

  return { customers, contracts, usage, alerts };
}

async function writeEvent(supabase, organizationId, leadId, type, value, metadata) {
  const { error } = await supabase.from("crm_engagement_events").insert({
    organization_id: organizationId,
    lead_id: leadId,
    event_type: type,
    channel: "crm",
    event_value: value || null,
    metadata: metadata || {},
    occurred_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { organization, crmUser, supabase } = await authenticateCrmRequest(req);
    if (req.method === "GET") {
      return res.status(200).json({ success: true, data: await loadPostSale(supabase, organization.id) });
    }

    const body = bodyOf(req);
    const action = clean(body.action, 80);
    const now = new Date().toISOString();

    if (action === "update_project") {
      const projectId = clean(body.project_id, 80);
      const allowed = {
        lifecycle_stage: clean(body.lifecycle_stage, 80),
        implementation_percent: Math.min(100, Math.round(numeric(body.implementation_percent))),
        planned_start_date: clean(body.planned_start_date, 40),
        actual_start_date: clean(body.actual_start_date, 40),
        target_go_live_date: clean(body.target_go_live_date, 40),
        actual_go_live_date: clean(body.actual_go_live_date, 40),
        handover_date: clean(body.handover_date, 40),
        customer_acceptance_date: clean(body.customer_acceptance_date, 40),
        project_owner_user_id: crmUser.id,
        project_owner_name: crmUser.full_name || crmUser.email,
        notes: clean(body.notes, 5000),
        updated_at: now,
      };
      Object.keys(allowed).forEach((key) => allowed[key] === null && delete allowed[key]);
      const result = await supabase.from("crm_customer_projects").update(allowed)
        .eq("organization_id", organization.id).eq("id", projectId).select("*").single();
      if (result.error) throw result.error;
      await writeEvent(supabase, organization.id, result.data.lead_id, "customer_lifecycle_updated", allowed.lifecycle_stage, { project_id: projectId, ...allowed });
      return res.status(200).json({ success: true, project: result.data });
    }

    if (action === "record_payment") {
      const workOrderId = clean(body.work_order_id, 80);
      const lookup = await supabase.from("crm_work_orders").select("id,lead_id,opportunity_id")
        .eq("organization_id", organization.id).eq("id", workOrderId).maybeSingle();
      if (lookup.error) throw lookup.error;
      if (!lookup.data) return res.status(404).json({ error: "Work order not found." });
      const amountDue = numeric(body.amount_due);
      const amountReceived = numeric(body.amount_received);
      const paymentStatus = clean(body.payment_status, 30) || (amountReceived >= amountDue && amountDue > 0 ? "paid" : amountReceived > 0 ? "partial" : "pending");
      const payload = {
        organization_id: organization.id,
        lead_id: lookup.data.lead_id,
        opportunity_id: lookup.data.opportunity_id,
        work_order_id: lookup.data.id,
        invoice_number: clean(body.invoice_number, 120),
        milestone: clean(body.milestone, 160) || "Payment",
        amount_due: amountDue,
        amount_received: amountReceived,
        currency: clean(body.currency, 10) || "INR",
        due_date: clean(body.due_date, 40),
        paid_at: paymentStatus === "paid" ? (clean(body.paid_at, 50) || now) : null,
        payment_status: paymentStatus,
        payment_reference: clean(body.payment_reference, 500),
        notes: clean(body.notes, 3000),
        recorded_by_user_id: crmUser.id,
        recorded_by_name: crmUser.full_name || crmUser.email,
        updated_at: now,
      };
      const result = await supabase.from("crm_deal_payments").upsert(payload, { onConflict: "organization_id,work_order_id,milestone" }).select("*").single();
      if (result.error) throw result.error;
      await writeEvent(supabase, organization.id, lookup.data.lead_id, "payment_updated", paymentStatus, { payment_id: result.data.id, amount_due: amountDue, amount_received: amountReceived });
      return res.status(200).json({ success: true, payment: result.data });
    }

    if (action === "upsert_contract") {
      const customerProjectId = clean(body.customer_project_id, 80);
      if (!customerProjectId) return res.status(400).json({ error: "Customer project is required." });
      const projectLookup = await supabase.from("crm_customer_projects").select("id")
        .eq("organization_id", organization.id).eq("id", customerProjectId).maybeSingle();
      if (projectLookup.error) throw projectLookup.error;
      if (!projectLookup.data) return res.status(404).json({ error: "Customer project not found." });
      const payload = {
        organization_id: organization.id,
        customer_project_id: customerProjectId,
        plan_name: clean(body.plan_name, 200) || "Custom",
        contract_start_date: clean(body.contract_start_date, 40),
        contract_end_date: clean(body.contract_end_date, 40),
        status: clean(body.status, 30) || "active",
        contracted_students: body.contracted_students === "" ? null : numeric(body.contracted_students),
        contracted_staff_users: body.contracted_staff_users === "" ? null : numeric(body.contracted_staff_users),
        monthly_lead_limit: body.monthly_lead_limit === "" ? null : numeric(body.monthly_lead_limit),
        monthly_whatsapp_limit: body.monthly_whatsapp_limit === "" ? null : numeric(body.monthly_whatsapp_limit),
        monthly_ai_call_minutes: body.monthly_ai_call_minutes === "" ? null : numeric(body.monthly_ai_call_minutes),
        storage_limit_gb: body.storage_limit_gb === "" ? null : numeric(body.storage_limit_gb),
        overage_policy: clean(body.overage_policy, 30) || "alert_only",
        updated_at: now,
      };
      if (!payload.contract_start_date) return res.status(400).json({ error: "Contract start date is required." });
      const prior = await supabase.from("crm_saas_contracts").select("id")
        .eq("organization_id", organization.id).eq("customer_project_id", customerProjectId).maybeSingle();
      if (prior.error) throw prior.error;
      const result = prior.data
        ? await supabase.from("crm_saas_contracts").update(payload).eq("id", prior.data.id).eq("organization_id", organization.id).select("*").single()
        : await supabase.from("crm_saas_contracts").insert(payload).select("*").single();
      if (result.error) throw result.error;
      return res.status(200).json({ success: true, contract: result.data });
    }

    if (action === "record_usage") {
      const customerProjectId = clean(body.customer_project_id, 80);
      if (!customerProjectId) return res.status(400).json({ error: "Customer project is required." });
      const projectLookup = await supabase.from("crm_customer_projects").select("id")
        .eq("organization_id", organization.id).eq("id", customerProjectId).maybeSingle();
      if (projectLookup.error) throw projectLookup.error;
      if (!projectLookup.data) return res.status(404).json({ error: "Customer project not found." });
      const payload = {
        organization_id: organization.id,
        customer_project_id: customerProjectId,
        usage_date: clean(body.usage_date, 40) || now.slice(0, 10),
        active_students: Math.round(numeric(body.active_students)),
        active_staff_users: Math.round(numeric(body.active_staff_users)),
        leads_created: Math.round(numeric(body.leads_created)),
        whatsapp_messages: Math.round(numeric(body.whatsapp_messages)),
        whatsapp_conversations: Math.round(numeric(body.whatsapp_conversations)),
        ai_call_minutes: numeric(body.ai_call_minutes),
        ai_qualification_runs: Math.round(numeric(body.ai_qualification_runs)),
        storage_used_gb: numeric(body.storage_used_gb),
        api_requests: Math.round(numeric(body.api_requests)),
        source_snapshot: { source: clean(body.source, 80) || "manual_crm", recorded_by: crmUser.id },
        updated_at: now,
      };
      const prior = await supabase.from("crm_saas_usage_daily").select("id")
        .eq("organization_id", organization.id).eq("customer_project_id", customerProjectId).eq("usage_date", payload.usage_date).maybeSingle();
      if (prior.error) throw prior.error;
      const result = prior.data
        ? await supabase.from("crm_saas_usage_daily").update(payload).eq("id", prior.data.id).eq("organization_id", organization.id).select("*").single()
        : await supabase.from("crm_saas_usage_daily").insert(payload).select("*").single();
      if (result.error) throw result.error;

      // Reconcile alert-only contract usage after every daily snapshot.
      const contractResult = await supabase.from("crm_saas_contracts").select("*")
        .eq("organization_id", organization.id).eq("customer_project_id", customerProjectId).maybeSingle();
      if (contractResult.error) throw contractResult.error;
      if (contractResult.data) {
        const monthStart = `${payload.usage_date.slice(0, 7)}-01`;
        const monthUsage = await supabase.from("crm_saas_usage_daily").select("*")
          .eq("organization_id", organization.id).eq("customer_project_id", customerProjectId)
          .gte("usage_date", monthStart).lte("usage_date", payload.usage_date);
        if (monthUsage.error) throw monthUsage.error;
        const rows = monthUsage.data || [];
        const comparisons = [
          ["active_students", contractResult.data.contracted_students, payload.active_students],
          ["active_staff_users", contractResult.data.contracted_staff_users, payload.active_staff_users],
          ["monthly_leads", contractResult.data.monthly_lead_limit, rows.reduce((s, r) => s + numeric(r.leads_created), 0)],
          ["monthly_whatsapp", contractResult.data.monthly_whatsapp_limit, rows.reduce((s, r) => s + numeric(r.whatsapp_messages), 0)],
          ["monthly_ai_call_minutes", contractResult.data.monthly_ai_call_minutes, rows.reduce((s, r) => s + numeric(r.ai_call_minutes), 0)],
          ["storage_gb", contractResult.data.storage_limit_gb, payload.storage_used_gb],
        ];
        for (const [metricKey, limit, observed] of comparisons) {
          if (!(Number(limit) > 0)) continue;
          const percent = (Number(observed) / Number(limit)) * 100;
          const existing = await supabase.from("crm_saas_usage_alerts").select("id")
            .eq("organization_id", organization.id).eq("customer_project_id", customerProjectId)
            .eq("metric_key", metricKey).eq("status", "open").maybeSingle();
          if (existing.error) throw existing.error;
          if (percent >= 80) {
            const alertPayload = {
              organization_id: organization.id,
              customer_project_id: customerProjectId,
              contract_id: contractResult.data.id,
              metric_key: metricKey,
              severity: percent >= 100 ? "critical" : "warning",
              contracted_value: Number(limit),
              observed_value: Number(observed),
              usage_percent: Math.round(percent * 100) / 100,
              status: "open",
              last_detected_at: now,
              metadata: { usage_date: payload.usage_date, overage_policy: contractResult.data.overage_policy },
            };
            const alertResult = existing.data
              ? await supabase.from("crm_saas_usage_alerts").update(alertPayload).eq("id", existing.data.id)
              : await supabase.from("crm_saas_usage_alerts").insert(alertPayload);
            if (alertResult.error) throw alertResult.error;
          } else if (existing.data) {
            const resolved = await supabase.from("crm_saas_usage_alerts").update({ status: "resolved", resolved_at: now, last_detected_at: now })
              .eq("organization_id", organization.id).eq("id", existing.data.id);
            if (resolved.error) throw resolved.error;
          }
        }
      }
      return res.status(200).json({ success: true, usage: result.data });
    }

    return res.status(400).json({ error: "Unsupported post-sale action." });
  } catch (error) {
    console.error("CRM post-sale error:", error);
    return sendCrmError(res, error);
  }
}
