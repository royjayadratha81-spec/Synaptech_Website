// api/crm/create-opportunity.js
//
// Synaptech CRM - Sales-Ready Opportunity Creator V1
//
// PURPOSE:
// Convert a fully Sales-Ready qualified lead into a
// commercial/admissions opportunity.
//
// IMPORTANT:
// - CRM only
// - Existing Firebase/CRM authentication reused
// - Organization isolated
// - Does NOT modify LMS/Admin
// - Does NOT modify synaptech_leads
// - Does NOT change validation/scoring/conversation history
// - A merely VALID lead CANNOT enter the pipeline
// - A score alone CANNOT create an opportunity

import {
  authenticateCrmRequest,
  sendCrmError,
} from "./_auth.js";


// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function cleanText(
  value,
  maxLength = 1000
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
    typeof req.body ===
    "string"
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
    return 10;
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
// OPPORTUNITY TYPE
// ------------------------------------------------------------

function inferOpportunityType({
  businessUnit,
  lead,
  qualification,
}) {
  if (
    businessUnit ===
    "admissions"
  ) {
    return "course_admission";
  }

  const text = [
    lead?.requirement,
    lead?.title,
    qualification
      ?.qualification_reason,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    text.includes("lms") ||
    text.includes(
      "learning management"
    )
  ) {
    return "lms";
  }

  if (text.includes("crm")) {
    return "crm";
  }

  if (text.includes("erp")) {
    return "erp";
  }

  if (text.includes("hrms")) {
    return "hrms";
  }

  if (
    text.includes("website") ||
    text.includes(
      "web development"
    )
  ) {
    return "website";
  }

  if (
    text.includes("software") ||
    text.includes(
      "application"
    )
  ) {
    return "custom_software";
  }

  return "other";
}


// ------------------------------------------------------------
// OPPORTUNITY NAME
// ------------------------------------------------------------

function buildOpportunityName({
  businessUnit,
  lead,
}) {
  const personOrCompany =
    lead?.company?.name ||
    lead?.contact?.full_name ||
    lead?.title ||
    "CRM Lead";

  if (
    businessUnit ===
    "admissions"
  ) {
    return `${personOrCompany} - Course Admission`;
  }

  const requirement =
    cleanText(
      lead?.requirement ||
        lead?.title ||
        "Business Solution",
      120
    );

  return `${personOrCompany} - ${requirement}`;
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
      crmUser,
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

    const body =
      getRequestBody(req);

    const leadId =
      cleanText(
        body?.lead_id ||
          body?.leadId,
        100
      );

    if (!leadId) {
      return res.status(400).json({
        error:
          "lead_id is required.",
      });
    }


    // --------------------------------------------------------
    // LOAD LEAD
    // --------------------------------------------------------

    const {
      data: lead,
      error: leadError,
    } = await supabase
      .from("crm_leads")
      .select(`
        id,
        organization_id,
        company_id,
        contact_id,
        title,
        requirement,
        source,
        medium,
        campaign,
        status,
        estimated_value,
        company:crm_companies(
          id,
          name
        ),
        contact:crm_contacts(
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq(
        "organization_id",
        organization.id
      )
      .eq(
        "id",
        leadId
      )
      .maybeSingle();

    if (leadError) {
      throw leadError;
    }

    if (!lead) {
      return res.status(404).json({
        error:
          "CRM lead not found.",
      });
    }


    // --------------------------------------------------------
    // LOAD LATEST QUALIFICATION STATE
    // --------------------------------------------------------

    const {
      data:
        qualificationRows,
      error:
        qualificationError,
    } = await supabase
      .from(
        "crm_lead_qualification_states"
      )
      .select("*")
      .eq(
        "organization_id",
        organization.id
      )
      .eq(
        "lead_id",
        lead.id
      )
      .order(
        "updated_at",
        {
          ascending: false,
        }
      )
      .limit(1);

    if (
      qualificationError
    ) {
      throw qualificationError;
    }

    const qualification =
      qualificationRows?.[0] ||
      null;

    if (!qualification) {
      return res.status(409).json({
        error:
          "This lead has not completed Sales-Ready Qualification evaluation.",
      });
    }


    // --------------------------------------------------------
    // HARD AUTHENTICITY GATE
    // --------------------------------------------------------

    if (
      qualification
        ?.validation_state !==
      "valid"
    ) {
      return res.status(409).json({
        error:
          "Lead has not passed authenticity validation and cannot enter the opportunity pipeline.",

        gate: {
          validation_state:
            qualification
              ?.validation_state ||
            null,
        },
      });
    }


    // --------------------------------------------------------
    // HARD SALES-READY GATE
    // --------------------------------------------------------

    if (
      qualification
        ?.sales_ready !== true
    ) {
      return res.status(409).json({
        error:
          "Lead is not Sales-Ready and cannot enter the opportunity pipeline.",

        gate: {
          sales_ready: false,

          sales_ready_status:
            qualification
              ?.sales_ready_status ||
            null,

          qualification_stage:
            qualification
              ?.qualification_stage ||
            null,

          qualification_completeness:
            qualification
              ?.qualification_completeness ??
            null,

          handoff_intent:
            qualification
              ?.handoff_intent ||
            null,
        },
      });
    }


    // --------------------------------------------------------
    // HARD HUMAN-HANDOFF INTENT GATE
    // --------------------------------------------------------

    const handoffIntent =
      qualification
        ?.handoff_intent;

    const handoffAccepted =
      [
        "requested",
        "accepted",
      ].includes(
        handoffIntent
      );

    if (!handoffAccepted) {
      return res.status(409).json({
        error:
          "Lead has not explicitly requested or accepted human follow-up.",

        gate: {
          sales_ready: true,

          handoff_intent:
            handoffIntent ||
            "not_asked",
        },
      });
    }


    // --------------------------------------------------------
    // PREVENT DUPLICATE OPEN OPPORTUNITY
    // --------------------------------------------------------

    const {
      data:
        existingRows,
      error:
        existingError,
    } = await supabase
      .from(
        "crm_opportunities"
      )
      .select("*")
      .eq(
        "organization_id",
        organization.id
      )
      .eq(
        "lead_id",
        lead.id
      )
      .eq(
        "status",
        "open"
      )
      .limit(1);

    if (existingError) {
      throw existingError;
    }

    const existingOpportunity =
      existingRows?.[0] ||
      null;

    if (
      existingOpportunity
    ) {
      return res
        .status(200)
        .json({
          success: true,

          created: false,

          opportunity:
            existingOpportunity,

          message:
            "An open opportunity already exists for this lead.",
        });
    }


    // --------------------------------------------------------
    // BUSINESS UNIT
    // --------------------------------------------------------

    const businessUnit =
      [
        "admissions",
        "business_solutions",
      ].includes(
        qualification
          ?.business_unit
      )
        ? qualification
            .business_unit
        : "unclassified";

// --------------------------------------------------------
// RESOLVE PIPELINE + QUALIFIED ENTRY STAGE
// --------------------------------------------------------

const pipelineKey =
  businessUnit === "admissions"
    ? "admissions_conversion"
    : "business_solutions_sales";

const {
  data: pipelineRows,
  error: pipelineError,
} = await supabase
  .from("crm_pipelines")
  .select(`
    id,
    organization_id,
    pipeline_key,
    business_unit,
    name,
    is_active
  `)
  .eq(
    "organization_id",
    organization.id
  )
  .eq(
    "pipeline_key",
    pipelineKey
  )
  .eq(
    "is_active",
    true
  )
  .limit(1);

if (pipelineError) {
  throw pipelineError;
}

const pipeline =
  pipelineRows?.[0] || null;

if (!pipeline) {
  return res.status(409).json({
    error:
      "No active CRM pipeline is configured for this business unit.",
    business_unit:
      businessUnit,
    expected_pipeline_key:
      pipelineKey,
  });
}

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
  .eq(
    "pipeline_id",
    pipeline.id
  )
  .eq(
    "name",
    "Qualified"
  )
  .eq(
    "is_closed",
    false
  )
  .limit(1);

if (stageError) {
  throw stageError;
}

const qualifiedStage =
  stageRows?.[0] || null;

if (!qualifiedStage) {
  return res.status(409).json({
    error:
      "Qualified entry stage is not configured for this pipeline.",
    pipeline_id:
      pipeline.id,
    pipeline_name:
      pipeline.name,
  });
}
    // --------------------------------------------------------
    // COMMERCIAL VALUE
    // --------------------------------------------------------

    const requestedValue =
      Number(
        body
          ?.estimated_value ??
        lead
          ?.estimated_value ??
        0
      );

    const estimatedValue =
      Number.isFinite(
        requestedValue
      )
        ? Math.max(
            requestedValue,
            0
          )
        : 0;

    const probability =
  clampProbability(
    qualifiedStage
      ?.probability ??
    25
  );


    // --------------------------------------------------------
    // CREATE OPPORTUNITY
    // --------------------------------------------------------

    const now =
      new Date().toISOString();

    const opportunityRow = {
      organization_id:
        organization.id,

      lead_id:
        lead.id,

      company_id:
        lead?.company_id ||
        null,

      contact_id:
        lead?.contact_id ||
        null,

      

      pipeline_id:
  pipeline.id,

stage_id:
  qualifiedStage.id,

      business_unit:
        businessUnit,

      opportunity_name:
        cleanText(
          body
            ?.opportunity_name ||
            buildOpportunityName({
              businessUnit,
              lead,
            }),
          250
        ),

      opportunity_type:
        inferOpportunityType({
          businessUnit,
          lead,
          qualification,
        }),

      status:
        "open",

      estimated_value:
        estimatedValue,

      currency:
        cleanText(
          body?.currency ||
            "INR",
          10
        ) || "INR",

      probability,

      expected_close_date:
        body
          ?.expected_close_date ||
        null,

      created_from_qualification:
        true,

      qualification_state_id:
        qualification.id,

      handoff_intent:
        qualification
          .handoff_intent,

      owner_crm_user_id:
        crmUser?.id ||
        null,

      next_follow_up_at:
        body
          ?.next_follow_up_at ||
        null,

      next_action:
        cleanText(
          body
            ?.next_action ||
            qualification
              ?.recommended_next_action ||
            "",
          500
        ) || null,

      last_activity_at:
        now,

      updated_at:
        now,
    };


    const {
      data:
        savedOpportunity,
      error: saveError,
    } = await supabase
      .from(
        "crm_opportunities"
      )
      .insert(
        opportunityRow
      )
      .select("*")
      .single();

    if (saveError) {
      console.error(
        "CRM opportunity creation failed:",
        saveError
      );

      throw saveError;
    }


    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,

      created: true,

      opportunity:
        savedOpportunity,

      message:
        businessUnit ===
        "admissions"
          ? "Sales-Ready admissions lead entered the opportunity layer."
          : "Sales-Ready business lead entered the opportunity layer.",

      gate: {
        validation_passed:
          true,

        sales_ready:
          true,

        handoff_intent:
          qualification
            .handoff_intent,

        qualification_state_id:
          qualification.id,
          pipeline_id:
  pipeline.id,

pipeline_name:
  pipeline.name,

stage_id:
  qualifiedStage.id,

stage_name:
  qualifiedStage.name,

stage_probability:
  probability,
      },
    });
  } catch (error) {
    console.error(
      "CRM create opportunity error:",
      error
    );

    return sendCrmError(
      res,
      error
    );
  }
}