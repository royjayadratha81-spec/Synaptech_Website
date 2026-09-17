// api/crm/qualification-states.js
//
// CRM Sales-Ready Qualification State Reader
//
// Read-only endpoint.
// Does not calculate qualification.
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
      .from(
        "crm_lead_qualification_states"
      )
      .select("*")
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
      "CRM qualification state lookup error:",
      error
    );

    return sendCrmError(
      res,
      error
    );
  }
}