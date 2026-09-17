// Synaptech CRM - explicit work-order / Close Won handler.
// A completed follow-up never calls this endpoint automatically.

import { authenticateCrmRequest, sendCrmError } from "./_auth.js";

function clean(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function bodyOf(req) {
  if (!req.body) return {};
  if (typeof req.body !== "string") return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { organization, crmUser, supabase } = await authenticateCrmRequest(req);
    const body = bodyOf(req);
    const opportunityId = clean(body.opportunity_id, 80);
    const workOrderNumber = clean(body.work_order_number, 120);
    const workOrderDate = clean(body.work_order_date, 40);
    const finalValue = Number(body.final_value);

    if (!opportunityId) return res.status(400).json({ error: "Opportunity ID is required." });
    if (!workOrderNumber) return res.status(400).json({ error: "Work-order number is required." });
    if (!workOrderDate || Number.isNaN(new Date(workOrderDate).getTime())) {
      return res.status(400).json({ error: "A valid work-order date is required." });
    }
    if (!Number.isFinite(finalValue) || finalValue < 0) {
      return res.status(400).json({ error: "A valid final deal value is required." });
    }

    const { data: opportunity, error: opportunityError } = await supabase
      .from("crm_opportunities")
      .select("id,organization_id,lead_id,pipeline_id,stage_id,status,estimated_value")
      .eq("organization_id", organization.id)
      .eq("id", opportunityId)
      .maybeSingle();
    if (opportunityError) throw opportunityError;
    if (!opportunity) return res.status(404).json({ error: "Opportunity not found." });

    const { data: wonStages, error: wonStageError } = await supabase
      .from("crm_pipeline_stages")
      .select("id,name,probability,is_closed,is_won")
      .eq("pipeline_id", opportunity.pipeline_id)
      .eq("is_closed", true)
      .eq("is_won", true)
      .order("stage_order", { ascending: true })
      .limit(1);
    if (wonStageError) throw wonStageError;
    const wonStage = wonStages?.[0];
    if (!wonStage) {
      return res.status(409).json({
        error: "This pipeline has no stage configured as closed and won.",
      });
    }

    const idempotencyKey = `work_order:${opportunity.id}:${workOrderNumber.toLowerCase()}`;
    const { data: priorEvents, error: priorError } = await supabase
      .from("crm_engagement_events")
      .select("id,metadata,occurred_at")
      .eq("organization_id", organization.id)
      .eq("lead_id", opportunity.lead_id)
      .eq("event_type", "work_order_received")
      .contains("metadata", { idempotency_key: idempotencyKey })
      .limit(1);
    if (priorError) throw priorError;

    const now = new Date().toISOString();
    const metadata = {
      idempotency_key: idempotencyKey,
      opportunity_id: opportunity.id,
      work_order_number: workOrderNumber,
      work_order_date: new Date(workOrderDate).toISOString().slice(0, 10),
      final_value: finalValue,
      currency: clean(body.currency, 10) || "INR",
      package_name: clean(body.package_name, 300) || null,
      billing_frequency: clean(body.billing_frequency, 50) || null,
      payment_terms: clean(body.payment_terms, 1000) || null,
      expected_start_date: clean(body.expected_start_date, 40) || null,
      document_reference: clean(body.document_reference, 1000) || null,
      notes: clean(body.notes, 3000) || null,
      recorded_by_user_id: crmUser.id,
      recorded_by_name: crmUser.full_name || crmUser.email || "CRM user",
    };

    const { data: workOrder, error: workOrderError } = await supabase
      .from("crm_work_orders")
      .upsert({
        organization_id: organization.id,
        lead_id: opportunity.lead_id,
        opportunity_id: opportunity.id,
        work_order_number: workOrderNumber,
        work_order_date: metadata.work_order_date,
        final_value: finalValue,
        currency: metadata.currency,
        package_name: metadata.package_name,
        billing_frequency: metadata.billing_frequency,
        payment_terms: metadata.payment_terms,
        expected_start_date: metadata.expected_start_date,
        document_reference: metadata.document_reference,
        notes: metadata.notes,
        recorded_by_user_id: crmUser.id,
        recorded_by_name: metadata.recorded_by_name,
        updated_at: now,
      }, { onConflict: "organization_id,opportunity_id" })
      .select("*")
      .single();
    if (workOrderError) throw workOrderError;

    let event = priorEvents?.[0] || null;
    if (!event) {
      const { data, error } = await supabase
        .from("crm_engagement_events")
        .insert({
          organization_id: organization.id,
          lead_id: opportunity.lead_id,
          event_type: "work_order_received",
          channel: "human_call",
          event_value: workOrderNumber,
          metadata,
          occurred_at: now,
        })
        .select("id,event_type,event_value,metadata,occurred_at")
        .single();
      if (error) throw error;
      event = data;
    }

    const { data: updatedOpportunity, error: updateError } = await supabase
      .from("crm_opportunities")
      .update({
        stage_id: wonStage.id,
        status: "won",
        probability: 100,
        estimated_value: finalValue,
        last_activity_at: now,
        updated_at: now,
      })
      .eq("organization_id", organization.id)
      .eq("id", opportunity.id)
      .select("*")
      .single();
    if (updateError) throw updateError;

    // Close only still-open sales follow-ups. Historical completed work remains.
    const { error: followUpError } = await supabase
      .from("crm_follow_up_jobs")
      .update({
        status: "cancelled",
        completed_at: now,
        outcome: "deal_won",
        outcome_data: {
          note: "Closed automatically because the work order was recorded.",
          opportunity_id: opportunity.id,
          work_order_number: workOrderNumber,
        },
        updated_at: now,
      })
      .eq("organization_id", organization.id)
      .eq("lead_id", opportunity.lead_id)
      .in("status", ["pending", "scheduled", "processing"]);
    if (followUpError) throw followUpError;

    return res.status(200).json({
      success: true,
      opportunity: updatedOpportunity,
      stage: wonStage,
      work_order_event: event,
      work_order: workOrder,
      message: "Work order recorded and opportunity closed as won.",
    });
  } catch (error) {
    return sendCrmError(res, error);
  }
}
