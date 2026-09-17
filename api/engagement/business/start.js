// api/engagement/business/start.js
//
// Synaptech Public Engagement Bridge
// Business Solutions - Session Start V1
//
// PURPOSE:
// Safely connect a public Education Solutions enquiry
// to the existing CRM without exposing /api/crm/*.
//
// IMPORTANT:
// - Public endpoint
// - Uses server-side Supabase service role only
// - Existing synaptech_leads remains the source capture
// - Existing CRM tables are reused
// - No Firebase/Admin authentication exposed to visitor
// - Does NOT modify LMS/Admin logic
// - Does NOT modify api/ai-chat.js
// - Does NOT modify api/chat.js
// - Does NOT modify api/lead.js
//

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";


// ------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------

const CRM_ORG_SLUG =
  process.env.PUBLIC_CRM_ORG_SLUG ||
  "synaptech-education";

const DEFAULT_BUSINESS_UNIT =
  "business_solutions";

const SESSION_TTL_SECONDS =
  60 * 60 * 24; // 24 hours


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
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}


function normalizeEmail(value) {
  return cleanText(
    value,
    200
  ).toLowerCase();
}


function normalizePhone(value) {
  return cleanText(
    value,
    50
  ).replace(/[^\d+]/g, "");
}


function encodeBase64Url(value) {
  return Buffer.from(
    value
  ).toString("base64url");
}


function signSessionPayload(
  payload,
  secret
) {
  const encodedPayload =
    encodeBase64Url(
      JSON.stringify(payload)
    );

  const signature = crypto
    .createHmac(
      "sha256",
      secret
    )
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}


function getSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL;

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (
    !url ||
    !serviceRoleKey
  ) {
    throw new Error(
      "Server database configuration is unavailable."
    );
  }

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}


// ------------------------------------------------------------
// FIND SOURCE SYNAPTECH LEAD
// ------------------------------------------------------------

async function findSourceLead({
  supabase,
  sourceLeadId,
  phone,
  email,
}) {
  if (sourceLeadId) {
    const {
      data,
      error,
    } = await supabase
      .from("synaptech_leads")
      .select("*")
      .eq(
        "id",
        sourceLeadId
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    /*
      Protect against someone submitting an arbitrary
      source_lead_id belonging to another prospect.
    */
    const storedPhone =
      normalizePhone(data.phone);

    const storedEmail =
      normalizeEmail(data.email);

    const phoneMatches =
      Boolean(phone) &&
      storedPhone === phone;

    const emailMatches =
      Boolean(email) &&
      storedEmail === email;

    if (
      !phoneMatches &&
      !emailMatches
    ) {
      return null;
    }

    return data;
  }


  // ----------------------------------------------------------
  // FALLBACK:
  // Current EducationSolutions form does not yet return
  // the inserted source lead ID.
  //
  // Until we connect that ID directly, locate the latest
  // matching source record by phone, then email.
  // ----------------------------------------------------------

  if (phone) {
    const {
      data,
      error,
    } = await supabase
      .from("synaptech_leads")
      .select("*")
      .eq(
        "phone",
        phone
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1);

    if (error) {
      throw error;
    }

    if (data?.[0]) {
      return data[0];
    }
  }


  if (email) {
    const {
      data,
      error,
    } = await supabase
      .from("synaptech_leads")
      .select("*")
      .ilike(
        "email",
        email
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1);

    if (error) {
      throw error;
    }

    if (data?.[0]) {
      return data[0];
    }
  }

  return null;
}


// ------------------------------------------------------------
// FIND / CREATE COMPANY
// ------------------------------------------------------------

async function resolveCompany({
  supabase,
  organizationId,
  companyName,
}) {
  if (!companyName) {
    return null;
  }

  const {
    data: existingRows,
    error: lookupError,
  } = await supabase
    .from("crm_companies")
    .select(
      "id, name"
    )
    .eq(
      "organization_id",
      organizationId
    )
    .limit(500);

  if (lookupError) {
    throw lookupError;
  }

  const normalizedName =
    companyName.toLowerCase();

  const existing =
    (existingRows || []).find(
      (row) =>
        cleanText(
          row?.name,
          250
        ).toLowerCase() ===
        normalizedName
    );

  if (existing) {
    return existing;
  }

  const {
    data: created,
    error: createError,
  } = await supabase
    .from("crm_companies")
    .insert({
      organization_id:
        organizationId,

      name:
        companyName,

      status:
        "prospect",
    })
    .select(
      "id, name"
    )
    .single();

  if (createError) {
    throw createError;
  }

  return created;
}


// ------------------------------------------------------------
// FIND / CREATE CONTACT
// ------------------------------------------------------------

async function resolveContact({
  supabase,
  organizationId,
  companyId,
  name,
  phone,
  email,
}) {
  let existing = null;


  if (phone) {
    const {
      data,
      error,
    } = await supabase
      .from("crm_contacts")
      .select(
        "id, full_name, email, phone, company_id"
      )
      .eq(
        "organization_id",
        organizationId
      )
      .eq(
        "phone",
        phone
      )
      .limit(1);

    if (error) {
      throw error;
    }

    existing =
      data?.[0] || null;
  }


  if (
    !existing &&
    email
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("crm_contacts")
      .select(
        "id, full_name, email, phone, company_id"
      )
      .eq(
        "organization_id",
        organizationId
      )
      .ilike(
        "email",
        email
      )
      .limit(1);

    if (error) {
      throw error;
    }

    existing =
      data?.[0] || null;
  }


  if (existing) {
    return existing;
  }


  const {
    data: created,
    error: createError,
  } = await supabase
    .from("crm_contacts")
    .insert({
      organization_id:
        organizationId,

      company_id:
        companyId || null,

      full_name:
        name,

      email:
        email || null,

      phone:
        phone,

      is_primary:
        true,
    })
    .select(
      "id, full_name, email, phone, company_id"
    )
    .single();

  if (createError) {
    throw createError;
  }

  return created;
}


// ------------------------------------------------------------
// RESOLVE BUSINESS PIPELINE
// ------------------------------------------------------------

async function resolveBusinessPipeline({
  supabase,
  organizationId,
  businessUnit,
}) {
  let pipeline = null;


  /*
    Preferred SaaS-compatible lookup:
    use configured business_unit.
  */
  const {
    data: businessRows,
    error: businessError,
  } = await supabase
    .from("crm_pipelines")
    .select(
      "id, name, pipeline_key, business_unit"
    )
    .eq(
      "organization_id",
      organizationId
    )
    .eq(
      "business_unit",
      businessUnit
    )
    .eq(
      "is_active",
      true
    )
    .limit(1);

  if (businessError) {
    throw businessError;
  }

  pipeline =
    businessRows?.[0] ||
    null;


  /*
    Backward-compatible fallback for the pipeline
    created during the original Synaptech CRM migration.
  */
  if (!pipeline) {
    const {
      data: fallbackRows,
      error: fallbackError,
    } = await supabase
      .from("crm_pipelines")
      .select(
        "id, name, pipeline_key, business_unit"
      )
      .eq(
        "organization_id",
        organizationId
      )
      .eq(
        "is_active",
        true
      )
      .limit(1);

    if (fallbackError) {
      throw fallbackError;
    }

    pipeline =
      fallbackRows?.[0] ||
      null;
  }


  if (!pipeline) {
    throw new Error(
      "Business Solutions CRM pipeline is not configured."
    );
  }


  const {
    data: stageRows,
    error: stageError,
  } = await supabase
    .from(
      "crm_pipeline_stages"
    )
    .select(
      "id, name, stage_order, probability"
    )
    .eq(
      "pipeline_id",
      pipeline.id
    )
    .order(
      "stage_order",
      {
        ascending: true,
      }
    )
    .limit(1);

  if (stageError) {
    throw stageError;
  }

  const firstStage =
    stageRows?.[0] ||
    null;

  if (!firstStage) {
    throw new Error(
      "Business Solutions pipeline has no entry stage."
    );
  }

  return {
    pipeline,
    firstStage,
  };
}


// ------------------------------------------------------------
// FIND / CREATE CRM LEAD
// ------------------------------------------------------------

async function resolveCrmLead({
  supabase,
  organization,
  sourceLead,
  company,
  contact,
  pipeline,
  firstStage,
  businessUnit,
}) {
  const {
    data: existingRows,
    error: existingError,
  } = await supabase
    .from("crm_leads")
    .select(
      "id, source_lead_id, contact_id, company_id, status"
    )
    .eq(
      "organization_id",
      organization.id
    )
    .eq(
      "source_lead_id",
      sourceLead.id
    )
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  const existing =
    existingRows?.[0] ||
    null;

  if (existing) {
    return {
      lead: existing,
      created: false,
    };
  }


  const requirement =
    cleanText(
      sourceLead.requirement,
      2000
    );

  const companyName =
    cleanText(
      sourceLead.organization,
      250
    );

  const title =
    companyName
      ? `${companyName} - ${
          requirement ||
          "Business Enquiry"
        }`
      : requirement ||
        "Business Enquiry";

  const now =
    new Date().toISOString();


  const source =
    cleanText(
      sourceLead.source,
      100
    ) || "website";

  const medium =
    cleanText(
      sourceLead.medium,
      100
    ) ||
    (businessUnit === "admissions" ? "website_admissions" : "education_solutions");

  const campaign =
    cleanText(
      sourceLead.campaign,
      200
    ) || null;

  const landingPage =
    cleanText(
      sourceLead.landing_page,
      500
    ) ||
    (businessUnit === "admissions" ? "/" : "/education-solutions");


  const sourceSnapshot = {
    id:
      sourceLead.id,

    name:
      cleanText(
        sourceLead.name,
        200
      ),

    phone:
      cleanText(
        sourceLead.phone,
        80
      ),

    email:
      cleanText(
        sourceLead.email,
        200
      ) || null,

    organization:
      companyName || null,

    requirement:
      requirement || null,

    source:
      sourceLead.source ||
      null,

    medium:
      sourceLead.medium ||
      null,

    campaign:
      sourceLead.campaign ||
      null,

    term:
      sourceLead.term ||
      null,

    content:
      sourceLead.content ||
      null,

    landing_page:
      sourceLead.landing_page ||
      landingPage,

    created_at:
      sourceLead.created_at ||
      null,
  };


  const {
    data: createdLead,
    error: createError,
  } = await supabase
    .from("crm_leads")
    .insert({
      organization_id:
        organization.id,

      company_id:
        company?.id ||
        null,

      contact_id:
        contact?.id ||
        null,

      pipeline_id:
        pipeline.id,

      stage_id:
        firstStage.id,

      source_lead_id:
        sourceLead.id,

      source_table:
        "synaptech_leads",

      title,

      requirement:
        requirement || null,

      source,

      medium,

      campaign,

      term:
        cleanText(
          sourceLead.term,
          200
        ) || null,

      content:
        cleanText(
          sourceLead.content,
          500
        ) || null,

      landing_page:
        landingPage,

      quality_status:
        "unreviewed",

      lead_score:
        0,

      status:
        "open",

      source_snapshot:
        sourceSnapshot,

      metadata: {
        business_unit:
          businessUnit,

        engagement_source:
          businessUnit === "admissions" ? "synaptech_education" : "education_solutions",

        customer_engagement:
          true,
      },

      created_at:
        sourceLead.created_at ||
        now,

      updated_at:
        now,
    })
    .select(
      "id, source_lead_id, contact_id, company_id, status"
    )
    .single();

  if (createError) {
    throw createError;
  }

  return {
    lead: createdLead,
    created: true,
  };
}


// ------------------------------------------------------------
// HANDLER
// ------------------------------------------------------------

export default async function handler(
  req,
  res
) {
  res.setHeader(
    "Cache-Control",
    "no-store"
  );

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
    const body =
      req.body || {};

    const requestedBusinessUnit =
      cleanText(body.business_unit, 80)
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

    const businessUnit =
      requestedBusinessUnit === "admissions"
        ? "admissions"
        : DEFAULT_BUSINESS_UNIT;

    const name =
      cleanText(
        body.name,
        200
      );

    const phone =
      normalizePhone(
        body.phone
      );

    const email =
      normalizeEmail(
        body.email
      );

    const sourceLeadId =
      cleanText(
        body.source_lead_id ||
          body.sourceLeadId,
        100
      );


    if (!name) {
      return res.status(400).json({
        error:
          "Name is required.",
      });
    }

    if (!phone) {
      return res.status(400).json({
        error:
          "Phone number is required.",
      });
    }


    const sessionSecret =
      process.env
        .ENGAGEMENT_SESSION_SECRET;

    if (!sessionSecret) {
      console.error(
        "ENGAGEMENT_SESSION_SECRET is missing."
      );

      return res.status(500).json({
        error:
          "Customer engagement service is not configured.",
      });
    }


    const supabase =
      getSupabaseAdmin();


    // --------------------------------------------------------
    // ORGANIZATION
    // --------------------------------------------------------

    const {
      data: organization,
      error: organizationError,
    } = await supabase
      .from(
        "crm_organizations"
      )
      .select(
        "id, name, slug"
      )
      .eq(
        "slug",
        CRM_ORG_SLUG
      )
      .maybeSingle();

    if (organizationError) {
      throw organizationError;
    }

    if (!organization) {
      return res.status(503).json({
        error:
          "CRM organization is not configured.",
      });
    }


    // --------------------------------------------------------
    // ORIGINAL SOURCE LEAD
    // --------------------------------------------------------

    const sourceLead =
      await findSourceLead({
        supabase,
        sourceLeadId,
        phone,
        email,
      });

    if (!sourceLead) {
      return res.status(404).json({
        error:
          "We could not locate the submitted enquiry. Please submit the enquiry form first.",
      });
    }


    // --------------------------------------------------------
    // COMPANY
    // --------------------------------------------------------

    const company =
      await resolveCompany({
        supabase,

        organizationId:
          organization.id,

        companyName:
          cleanText(
            sourceLead.organization,
            250
          ),
      });


    // --------------------------------------------------------
    // CONTACT
    // --------------------------------------------------------

    const contact =
      await resolveContact({
        supabase,

        organizationId:
          organization.id,

        companyId:
          company?.id ||
          null,

        name:
          cleanText(
            sourceLead.name,
            200
          ) || name,

        phone:
          normalizePhone(
            sourceLead.phone
          ) || phone,

        email:
          normalizeEmail(
            sourceLead.email
          ) || email,
      });


    // --------------------------------------------------------
    // BUSINESS PIPELINE
    // --------------------------------------------------------

    const {
      pipeline,
      firstStage,
    } =
      await resolveBusinessPipeline({
        supabase,

        organizationId:
          organization.id,

        businessUnit,
      });


    // --------------------------------------------------------
    // CRM LEAD
    // --------------------------------------------------------

    const {
      lead,
      created,
    } =
      await resolveCrmLead({
        supabase,
        organization,
        sourceLead,
        company,
        contact,
        pipeline,
        firstStage,
        businessUnit,
      });


    // --------------------------------------------------------
    // PUBLIC SESSION TOKEN
    //
    // The browser gets an opaque signed token.
    // It does NOT receive the organization UUID or CRM lead ID.
    // --------------------------------------------------------

    const nowSeconds =
      Math.floor(
        Date.now() / 1000
      );

    const sessionId =
      crypto.randomUUID();

    const token =
      signSessionPayload(
        {
          sid:
            sessionId,

          oid:
            organization.id,

          lid:
            lead.id,

          bu:
            businessUnit,

          ch:
            "web_chat",

          iat:
            nowSeconds,

          exp:
            nowSeconds +
            SESSION_TTL_SECONDS,
        },
        sessionSecret
      );


    // --------------------------------------------------------
    // PUBLIC-SAFE RESPONSE
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      session: {
        id:
          sessionId,

        token,

        expires_in:
          SESSION_TTL_SECONDS,

        business_unit:
          businessUnit,
      },

      lead: {
        linked: true,

        newly_created_in_crm:
          created,
      },

      next_step:
        "ai_discovery",
    });
  } catch (error) {
    console.error(
      "Business engagement start error:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to start the customer engagement session.",
    });
  }
}
