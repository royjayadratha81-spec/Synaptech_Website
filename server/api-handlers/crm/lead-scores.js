// api/crm/lead-scores.js
//
// CRM Dynamic Lead Score Reader
//
// Read-only endpoint.
// Does not calculate scores.
// Does not modify crm_leads.
// Does not modify LMS/Admin/website capture.

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
      error: "Method not allowed.",
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
      .from("crm_lead_scores")
      .select(`
        id,
        lead_id,
        scoring_profile_id,
        scoring_version,
        business_unit,
        overall_score,
        lead_quality_score,
        fit_score,
        intent_score,
        engagement_score,
        readiness_score,
        source_quality_score,
        economic_score,
        scoring_confidence,
        routing_band,
        recommended_route,
        recommended_action,
        positive_factors,
        negative_factors,
        missing_high_value_fields,
        calculated_at,
        updated_at
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

    return res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error(
      "CRM lead score lookup error:",
      error
    );

    return sendCrmError(
      res,
      error
    );
  }
}