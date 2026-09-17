// api/crm/opportunities.js
//
// CRM Opportunity Reader
//
// Read-only.
// Organization-scoped.
// Does not modify LMS/Admin/lead capture.

import {
  authenticateCrmRequest,
  sendCrmError,
} from "./_auth.js";

export default async function handler(
  req,
  res
) {
  if (req.method !== "GET") {
    res.setHeader(
      "Allow",
      "GET"
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

    const {
      data,
      error,
    } = await supabase
      .from(
        "crm_opportunities"
      )
      .select(`
        *,
        lead:crm_leads(
          id,
          title,
          requirement,
          source,
          medium,
          campaign,
          status
        ),
        company:crm_companies(
          id,
          name
        ),
        contact:crm_contacts(
          id,
          full_name,
          email,
          phone
        ),
        pipeline:crm_pipelines(
          id,
          pipeline_key,
          business_unit,
          name
        ),
        stage:crm_pipeline_stages(
          id,
          name,
          stage_order,
          probability,
          is_closed,
          is_won
        )
      `)
      .eq(
        "organization_id",
        organization.id
      )
      .order(
        "updated_at",
        {
          ascending: false,
        }
      );

    if (error) {
  throw error;
}


// ------------------------------------------------------------
// LOAD ALL CONFIGURED STAGES FOR THE PIPELINES
// ------------------------------------------------------------

const opportunityRows =
  data || [];

const pipelineIds = [
  ...new Set(
    opportunityRows
      .map(
        (opportunity) =>
          opportunity?.pipeline_id
      )
      .filter(Boolean)
  ),
];

let pipelineStages = [];

if (pipelineIds.length > 0) {
  const {
    data: stageRows,
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
    .in(
      "pipeline_id",
      pipelineIds
    )
    .order(
      "stage_order",
      {
        ascending: true,
      }
    );

  if (stageError) {
    throw stageError;
  }

  pipelineStages =
    stageRows || [];
}


// ------------------------------------------------------------
// ATTACH AVAILABLE STAGES TO EACH OPPORTUNITY
// ------------------------------------------------------------

const enrichedOpportunities =
  opportunityRows.map(
    (opportunity) => ({
      ...opportunity,

      available_stages:
        pipelineStages.filter(
          (stage) =>
            stage.pipeline_id ===
            opportunity.pipeline_id
        ),
    })
  );


// ------------------------------------------------------------
// RESPONSE
// ------------------------------------------------------------

return res.status(200).json({
  success: true,
  data:
    enrichedOpportunities,
});
  } catch (error) {
    console.error(
      "CRM opportunity lookup error:",
      error
    );

    return sendCrmError(
      res,
      error
    );
  }
}