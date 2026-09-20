import { PLATFORM_ROLES } from "../../../shared/platform-access.js";

import {
  authenticatePlatformRequest,
  sendPlatformError,
} from "../_shared/platform-auth.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_MEMBERSHIP_ROLES = new Set([
  PLATFORM_ROLES.TENANT_ADMIN,
]);

function createAdmissionsError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function readRequestBody(req) {
  if (
    req.body &&
    typeof req.body === "object" &&
    !Array.isArray(req.body)
  ) {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      const parsedBody = JSON.parse(req.body);

      if (
        parsedBody &&
        typeof parsedBody === "object" &&
        !Array.isArray(parsedBody)
      ) {
        return parsedBody;
      }
    } catch {
      throw createAdmissionsError(
        "The request body must contain valid JSON.",
        400
      );
    }
  }

  throw createAdmissionsError(
    "An admission approval request body is required.",
    400
  );
}

function optionalText(value, fieldLabel, maximumLength) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw createAdmissionsError(
      `${fieldLabel} must be text.`,
      400
    );
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.length > maximumLength) {
    throw createAdmissionsError(
      `${fieldLabel} cannot exceed ${maximumLength} characters.`,
      400
    );
  }

  return normalizedValue;
}

function requiredText(value, fieldLabel, maximumLength) {
  const normalizedValue = optionalText(
    value,
    fieldLabel,
    maximumLength
  );

  if (!normalizedValue) {
    throw createAdmissionsError(
      `${fieldLabel} is required.`,
      400
    );
  }

  return normalizedValue;
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
        item?.organization?.id === requestedOrganizationId
    );
  } else {
    membership =
      memberships.find(
        (item) =>
          item?.organization?.id ===
          authenticatedSession.default_organization_id
      ) ||
      memberships.find((item) => item?.is_default) ||
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

  const isPlatformSuperAdmin =
    authenticatedSession.platform_user?.platform_role ===
    PLATFORM_ROLES.PLATFORM_SUPER_ADMIN;

  const hasAllowedMembershipRole =
    ALLOWED_MEMBERSHIP_ROLES.has(membership.role);

  if (!isPlatformSuperAdmin && !hasAllowedMembershipRole) {
    throw createAdmissionsError(
      "Only a Platform Super Admin or Tenant Admin can approve an admission.",
      403
    );
  }

  return membership;
}

function normalizeAdmissionApproval(body) {
  const organizationId = optionalText(
    body.organization_id,
    "Organization ID",
    36
  );

  if (organizationId && !UUID_PATTERN.test(organizationId)) {
    throw createAdmissionsError(
      "Organization ID must be a valid UUID.",
      400
    );
  }

  const applicationId = requiredText(
    body.application_id,
    "Application ID",
    36
  );

  if (!UUID_PATTERN.test(applicationId)) {
    throw createAdmissionsError(
      "Application ID must be a valid UUID.",
      400
    );
  }

  return {
    organizationId,
    applicationId,
    decisionNote: optionalText(
      body.decision_note,
      "Admission decision note",
      2000
    ),
  };
}

function mapDatabaseError(error) {
  if (error?.code === "22023") {
    return createAdmissionsError(
      error.message || "Admission approval data is invalid.",
      400
    );
  }

  if (error?.code === "P0002") {
    return createAdmissionsError(
      "Admission application not found for this organization.",
      404
    );
  }

  if (error?.code === "P0001" || error?.code === "23505") {
    return createAdmissionsError(
      error.message ||
        "This application cannot be approved in its current state.",
      409
    );
  }

  console.error(
    "Admission approval database error:",
    error
  );

  return createAdmissionsError(
    "Unable to complete admission approval.",
    500
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  try {
    const authenticatedSession =
      await authenticatePlatformRequest(req);

    const input = normalizeAdmissionApproval(
      readRequestBody(req)
    );

    const membership = resolveAdmissionsMembership(
      authenticatedSession,
      input.organizationId
    );

    const organizationId = membership.organization.id;
    const idempotencyKey =
      `admissions-approval:${organizationId}:${input.applicationId}`;

    const { data, error } =
      await authenticatedSession.supabase.rpc(
        "admissions_approve_application",
        {
          p_organization_id: organizationId,
          p_application_id: input.applicationId,
          p_actor_platform_user_id:
            authenticatedSession.firebase_user.uid,
          p_decision_note: input.decisionNote,
          p_idempotency_key: idempotencyKey,
        }
      );

    if (error) {
      throw mapDatabaseError(error);
    }

    const application = Array.isArray(data)
      ? data[0]
      : data;

    if (!application?.id) {
      throw createAdmissionsError(
        "Admission approval completed without returning the application.",
        500
      );
    }

    res.setHeader(
      "Cache-Control",
      "private, no-store, max-age=0"
    );
    res.setHeader("Vary", "Authorization");

    return res.status(200).json({
      success: true,
      application,
      lms_student_created: false,
      message:
        "Admission approved. LMS student provisioning is still pending.",
    });
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
