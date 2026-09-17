// api/crm/leads/[id].js
//
// CRM-only single-lead API.
//
// GET:
//   Returns one CRM lead belonging to the authenticated
//   user's CRM organization.
//
// PUT/PATCH/DELETE are intentionally NOT implemented yet.
// We will add controlled CRM updates only after the
// read functionality is verified.
//
// Existing Synaptech website/LMS APIs are untouched.

import {
  authenticateCrmRequest,
  sendCrmError,
} from "../_auth.js";

export default async function handler(req, res) {
  try {
    const {
      crmUser,
      organization,
      supabase,
    } = await authenticateCrmRequest(req);

    if (req.method !== "GET") {
      return res.status(405).json({
        error: "Method not allowed.",
      });
    }

    const leadId = req.query?.id;

    if (!leadId) {
      return res.status(400).json({
        error: "Lead ID is required.",
      });
    }

    /*
     * IMPORTANT:
     *
     * organization_id is always applied.
     *
     * This prevents a CRM user from requesting
     * a lead belonging to another organization.
     */
    const {
      data,
      error,
    } = await supabase
      .from("crm_leads")
      .select(
        `
        id,
        organization_id,
        company_id,
        contact_id,
        pipeline_id,
        stage_id,
        owner_user_id,
        source_lead_id,
        source_table,
        title,
        requirement,
        source,
        medium,
        campaign,
        term,
        content,
        landing_page,
        quality_status,
        lead_score,
        status,
        next_follow_up_at,
        last_contacted_at,
        converted_at,
        lost_at,
        lost_reason,
        estimated_value,
        currency,
        source_snapshot,
        metadata,
        created_at,
        updated_at,

        company:crm_companies (
          id,
          name,
          website,
          industry,
          company_size,
          phone,
          email,
          address,
          city,
          state,
          country,
          postal_code,
          status,
          owner_user_id,
          notes,
          metadata,
          created_at,
          updated_at
        ),

        contact:crm_contacts (
          id,
          company_id,
          first_name,
          last_name,
          full_name,
          email,
          phone,
          alternate_phone,
          designation,
          department,
          whatsapp_number,
          city,
          state,
          country,
          is_primary,
          owner_user_id,
          notes,
          metadata,
          created_at,
          updated_at
        ),

        pipeline:crm_pipelines (
          id,
          name,
          description,
          is_default,
          is_active
        ),

        stage:crm_pipeline_stages (
          id,
          pipeline_id,
          name,
          description,
          stage_order,
          probability,
          is_closed,
          is_won
        ),

        owner:crm_users (
          id,
          firebase_uid,
          full_name,
          email,
          role,
          status
        )
        `
      )
      .eq(
        "id",
        leadId
      )
      .eq(
        "organization_id",
        organization.id
      )
      .maybeSingle();

    if (error) {
      console.error(
        "CRM single lead query failed:",
        error
      );

      const queryError = new Error(
        "Unable to load CRM lead."
      );

      queryError.statusCode = 500;

      throw queryError;
    }

    if (!data) {
      const notFoundError = new Error(
        "CRM lead not found."
      );

      notFoundError.statusCode = 404;

      throw notFoundError;
    }

    return res.status(200).json({
      success: true,

      organization: {
        id: organization.id,
        name: organization.name,
      },

      user: {
        id: crmUser.id,
        full_name: crmUser.full_name,
        email: crmUser.email,
        role: crmUser.role,
      },

      data,
    });
  } catch (error) {
    return sendCrmError(
      res,
      error
    );
  }
}