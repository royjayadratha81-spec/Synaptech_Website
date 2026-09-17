// api/crm/leads.js
//
// CRM-only Leads API.
//
// This endpoint:
// - reads CRM leads
// - verifies the existing Firebase user through _auth.js
// - restricts all reads to the authenticated user's organization
//
// It does NOT modify:
// - synaptech_leads
// - api/lead.js
// - existing Admin logic
// - LMS data
// - existing authentication
//
// POST is intentionally not implemented yet.
// We will add lead creation/synchronization only after
// the read layer is verified.

import {
  authenticateCrmRequest,
  sendCrmError,
} from "./_auth.js";

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

    /*
     * Optional filters:
     *
     * ?status=open
     * ?quality_status=valid
     * ?pipeline_id=...
     * ?stage_id=...
     * ?owner_user_id=...
     *
     * Pagination:
     *
     * ?page=1
     * ?limit=25
     */

    const {
      status,
      quality_status,
      pipeline_id,
      stage_id,
      owner_user_id,
      page = "1",
      limit = "25",
    } = req.query || {};

    const parsedPage = Math.max(
      1,
      Number.parseInt(page, 10) || 1
    );

    const parsedLimit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(limit, 10) || 25
      )
    );

    const from =
      (parsedPage - 1) * parsedLimit;

    const to =
      from + parsedLimit - 1;

    /*
     * Select only CRM data.
     *
     * Related company/contact/pipeline/stage/owner
     * information is included so the frontend can
     * display a useful lead list without exposing
     * unrelated organizations.
     */
    let query = supabase
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
          phone,
          email,
          city,
          state,
          country,
          status
        ),

        contact:crm_contacts (
          id,
          first_name,
          last_name,
          full_name,
          email,
          phone,
          whatsapp_number,
          designation,
          department,
          is_primary
        ),

        pipeline:crm_pipelines (
          id,
          name,
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
          full_name,
          email,
          role,
          status
        )
        `,
        {
          count: "exact",
        }
      )
      /*
       * CRITICAL:
       * Always scope CRM records to the
       * authenticated user's organization.
       */
      .eq(
        "organization_id",
        organization.id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .range(from, to);

    /*
     * Apply optional filters.
     */
    if (status) {
      query = query.eq(
        "status",
        status
      );
    }

    if (quality_status) {
      query = query.eq(
        "quality_status",
        quality_status
      );
    }

    if (pipeline_id) {
      query = query.eq(
        "pipeline_id",
        pipeline_id
      );
    }

    if (stage_id) {
      query = query.eq(
        "stage_id",
        stage_id
      );
    }

    /*
     * Owner filtering is restricted to the
     * organization's CRM users through the
     * crm_leads.organization_id filter above.
     */
    if (owner_user_id) {
      query = query.eq(
        "owner_user_id",
        owner_user_id
      );
    }

    const {
      data,
      error,
      count,
    } = await query;

    if (error) {
      console.error(
        "CRM leads query failed:",
        error
      );

      const queryError = new Error(
        "Unable to load CRM leads."
      );

      queryError.statusCode = 500;

      throw queryError;
    }

    const total =
      Number.isInteger(count)
        ? count
        : 0;

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(
            total / parsedLimit
          );

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

      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages,
      },

      data: data || [],
    });
  } catch (error) {
    return sendCrmError(
      res,
      error
    );
  }
}