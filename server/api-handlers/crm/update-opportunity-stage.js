// api/crm/update-opportunity-stage.js
//
// Synaptech CRM - Opportunity Stage Update V1
//
// PURPOSE:
// Persist movement of an existing CRM opportunity
// through its configured commercial/admissions pipeline.
//
// IMPORTANT:
// - CRM only
// - Existing Firebase/CRM authentication reused
// - Organization isolated
// - Updates crm_opportunities only
// - Does NOT modify crm_leads
// - Does NOT modify synaptech_leads
// - Does NOT modify LMS/Admin
// - Does NOT modify AI validation/scoring/qualification
// - Destination stage MUST belong to the opportunity's pipeline
//

import {
  authenticateCrmRequest,
  sendCrmError,
} from "./_auth.js";


// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function cleanText(
  value,
  maxLength = 500
) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}


function getRequestBody(req) {
  if (!req.body) {
    return {};
  }

  if (
    typeof req.body === "string"
  ) {
    try {
      return JSON.parse(
        req.body
      );
    } catch {
      return {};
    }
  }

  return req.body;
}


function clampProbability(value) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(number)
    )
  );
}


// ------------------------------------------------------------
// HANDLER
// ------------------------------------------------------------

export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    res.setHeader(
      "Allow",
      "POST"
    );

    return res.status(405).json({
      error:
        "Method not allowed.",
    });
  }

  try {
    const {
      organization,
      supabase,
    } =
      await authenticateCrmRequest(
        req
      );

    if (!organization?.id) {
      return res.status(403).json({
        error:
          "CRM organization context is unavailable.",
      });
    }


    // --------------------------------------------------------
    // REQUEST
    // --------------------------------------------------------

    const body =
      getRequestBody(req);

    const opportunityId =
      cleanText(
        body?.opportunity_id ||
          body?.opportunityId,
        100
      );

    const stageId =
      cleanText(
        body?.stage_id ||
          body?.stageId,
        100
      );

    if (!opportunityId) {
      return res.status(400).json({
        error:
          "opportunity_id is required.",
      });
    }

    if (!stageId) {
      return res.status(400).json({
        error:
          "stage_id is required.",
      });
    }


    // --------------------------------------------------------
    // LOAD OPPORTUNITY
    // --------------------------------------------------------

    const {
      data: opportunity,
      error: opportunityError,
    } = await supabase
      .from(
        "crm_opportunities"
      )
      .select(`
        id,
        organization_id,
        lead_id,
        pipeline_id,
        stage_id,
        business_unit,
        opportunity_name,
        status,
        estimated_value,
        probability,
        weighted_value
      `)
      .eq(
        "organization_id",
        organization.id
      )
      .eq(
        "id",
        opportunityId
      )
      .maybeSingle();

    if (opportunityError) {
      throw opportunityError;
    }

    if (!opportunity) {
      return res.status(404).json({
        error:
          "CRM opportunity not found.",
      });
    }

    if (!opportunity.pipeline_id) {
      return res.status(409).json({
        error:
          "This opportunity is not assigned to a CRM pipeline.",
      });
    }


    // --------------------------------------------------------
    // LOAD DESTINATION STAGE
    //
    // SECURITY / DATA INTEGRITY RULE:
    // The requested stage must belong to the SAME pipeline
    // already assigned to the opportunity.
    // --------------------------------------------------------

    const {
      data: destinationStage,
      error: stageError,
    } = await supabase
      .from(
        "crm_pipeline_stages"
      )
      .select(`
        id,
        pipeline_id,
        name,
        stage_order,
        probability,
        is_closed,
        is_won
      `)
      .eq(
        "id",
        stageId
      )
      .eq(
        "pipeline_id",
        opportunity.pipeline_id
      )
      .maybeSingle();

    if (stageError) {
      throw stageError;
    }

    if (!destinationStage) {
      return res.status(409).json({
        error:
          "The selected stage does not belong to this opportunity's pipeline.",
      });
    }


    // --------------------------------------------------------
    // NO-OP PROTECTION
    // --------------------------------------------------------

    if (
      opportunity.stage_id ===
      destinationStage.id
    ) {
      return res.status(200).json({
        success: true,
        updated: false,
        opportunity,
        stage:
          destinationStage,
        message:
          "Opportunity is already in this stage.",
      });
    }


    // --------------------------------------------------------
    // DERIVE COMMERCIAL STATE
    //
    // OPEN STAGE:
    //   status = open
    //
    // CLOSED + WON:
    //   status = won
    //
    // CLOSED + NOT WON:
    //   status = lost
    //
    // We derive this from pipeline configuration rather than
    // trusting arbitrary frontend status values.
    // --------------------------------------------------------

    const probability =
      clampProbability(
        destinationStage
          ?.probability
      );

    let nextStatus =
      "open";

    if (
      destinationStage
        ?.is_closed === true
    ) {
      nextStatus =
        destinationStage
          ?.is_won === true
          ? "won"
          : "lost";
    }


    // --------------------------------------------------------
    // WEIGHTED VALUE
    // --------------------------------------------------------

    const estimatedValue =
      Number(
        opportunity
          ?.estimated_value ||
          0
      );

    const safeEstimatedValue =
      Number.isFinite(
        estimatedValue
      )
        ? Math.max(
            estimatedValue,
            0
          )
        : 0;

    const weightedValue =
      Math.round(
        safeEstimatedValue *
          (probability / 100)
      );


    // --------------------------------------------------------
    // PERSIST OPPORTUNITY STAGE
    // --------------------------------------------------------

    const now =
      new Date().toISOString();

    const {
      data: updatedOpportunity,
      error: updateError,
    } = await supabase
      .from(
        "crm_opportunities"
      )
      .update({
        stage_id:
          destinationStage.id,

        probability,

        status:
          nextStatus,

        last_activity_at:
          now,

        updated_at:
          now,
      })
      .eq(
        "organization_id",
        organization.id
      )
      .eq(
        "id",
        opportunity.id
      )
      .select("*")
      .single();

    if (updateError) {
      console.error(
        "CRM opportunity stage update failed:",
        updateError
      );

      throw updateError;
    }


    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      updated: true,

      opportunity:
        updatedOpportunity,

      previous_stage_id:
        opportunity.stage_id,

      stage: {
        id:
          destinationStage.id,

        name:
          destinationStage.name,

        stage_order:
          destinationStage.stage_order,

        probability,

        is_closed:
          destinationStage.is_closed,

        is_won:
          destinationStage.is_won,
      },

      commercial_state: {
        status:
          nextStatus,

        estimated_value:
          safeEstimatedValue,

        probability,

        weighted_value:
          weightedValue,
      },

      message:
        `Opportunity moved to ${destinationStage.name}.`,
    });
  } catch (error) {
    console.error(
      "CRM update opportunity stage error:",
      error
    );

    return sendCrmError(
      res,
      error
    );
  }
}
