import {
  authenticatePlatformRequest,
  sendPlatformError,
} from "../_shared/platform-auth.js";
import { PLATFORM_ROLES } from "../../../shared/platform-access.js";

const READ_LIMIT = 100;

function createAdmissionsError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getQueryString(value) {
  if (Array.isArray(value)) {
    return String(value[0] || "").trim() || null;
  }

  if (typeof value === "string") {
    return value.trim() || null;
  }

  return null;
}

function resolveAdmissionsMembership(
  authenticatedSession,
  requestedOrganizationId
) {
  const memberships = Array.isArray(
    authenticatedSession.memberships
  )
    ? authenticatedSession.memberships
    : [];

  let membership = null;

  if (requestedOrganizationId) {
    membership = memberships.find(
      (item) =>
        item?.organization?.id ===
        requestedOrganizationId
    );
  } else {
    membership =
      memberships.find(
        (item) =>
          item?.organization?.id ===
          authenticatedSession.default_organization_id
      ) ||
      memberships.find(
        (item) => item?.is_default
      ) ||
      memberships[0] ||
      null;
  }

  if (!membership?.organization) {
    throw createAdmissionsError(
      "You do not have access to this organization.",
      403
    );
  }

  if (membership.organization.status !== "active") {
    throw createAdmissionsError(
      "This organization is not active.",
      403
    );
  }

  const accessibleModules = Array.isArray(
    membership.accessible_modules
  )
    ? membership.accessible_modules
    : [];

  if (!accessibleModules.includes("admissions")) {
    throw createAdmissionsError(
      "Admissions access is not enabled for this account.",
      403
    );
  }

  return membership;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  try {
    const authenticatedSession =
      await authenticatePlatformRequest(req);

    const requestedOrganizationId =
      getQueryString(
        req.query?.organization_id
      );

    const membership =
      resolveAdmissionsMembership(
        authenticatedSession,
        requestedOrganizationId
      );

    const organization =
      membership.organization;

    const organizationId =
      organization.id;

    const supabase =
      authenticatedSession.supabase;
      const canVerifyFinance =
  authenticatedSession.platform_user?.platform_role ===
    PLATFORM_ROLES.PLATFORM_SUPER_ADMIN ||
  membership.role ===
    PLATFORM_ROLES.TENANT_ADMIN ||
  membership.role ===
    PLATFORM_ROLES.FINANCE_ADMIN;
        const canApproveAdmission =
      authenticatedSession.platform_user?.platform_role ===
        PLATFORM_ROLES.PLATFORM_SUPER_ADMIN ||
      membership.role ===
        PLATFORM_ROLES.TENANT_ADMIN;

    const [
      candidateResult,
      applicationResult,
    ] = await Promise.all([
      supabase
        .from("admissions_candidates")
        .select("*", {
          count: "exact",
        })
        .eq(
          "organization_id",
          organizationId
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(READ_LIMIT),

      supabase
        .from("admissions_applications")
        .select("*", {
          count: "exact",
        })
        .eq(
          "organization_id",
          organizationId
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(READ_LIMIT),
    ]);

    if (candidateResult.error) {
      console.error(
        "Admissions candidate lookup failed:",
        candidateResult.error
      );

      throw createAdmissionsError(
        "Unable to load admissions candidates.",
        500
      );
    }

    if (applicationResult.error) {
      console.error(
        "Admissions application lookup failed:",
        applicationResult.error
      );

      throw createAdmissionsError(
        "Unable to load admissions applications.",
        500
      );
    }

    res.setHeader(
      "Cache-Control",
      "private, no-store, max-age=0"
    );

    res.setHeader(
      "Vary",
      "Authorization"
    );

    return res.status(200).json({
      read_only: true,

      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        tenant_mode:
          organization.tenant_mode,
      },
      access: {
  platform_role:
    authenticatedSession.platform_user
      ?.platform_role || null,

  membership_role:
    membership.role || null,

  can_verify_finance:
    canVerifyFinance,
            can_approve_admission:
          canApproveAdmission,
},

      summary: {
        candidate_count:
          candidateResult.count || 0,
        application_count:
          applicationResult.count || 0,
      },

      candidates:
        candidateResult.data || [],

      applications:
        applicationResult.data || [],

      result_limit: READ_LIMIT,
    });
  } catch (error) {
    return sendPlatformError(
      res,
      error
    );
  }
}