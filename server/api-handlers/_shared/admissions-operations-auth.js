import { PLATFORM_ROLES } from "../../../shared/platform-access.js";
import { authenticatePlatformRequest } from "./platform-auth.js";

const ALLOWED_ROLES = new Set([
  PLATFORM_ROLES.TENANT_ADMIN,
  PLATFORM_ROLES.ADMISSIONS_COUNSELLOR,
]);

export function workflowError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function clean(value, maximumLength = 1000) {
  return String(value ?? "").trim().slice(0, maximumLength);
}

export function normalizeEmail(value) {
  return clean(value, 320).toLowerCase();
}

export function readJsonBody(req) {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      const parsed = JSON.parse(req.body);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      throw workflowError("The request body must contain valid JSON.", 400);
    }
  }

  return {};
}

export async function authenticateAdmissionsOperator(
  req,
  requestedOrganizationId = null,
  { allowAdmissionsCounsellor = false } = {}
) {
  const session = await authenticatePlatformRequest(req);
  const memberships = Array.isArray(session.memberships)
    ? session.memberships
    : [];

  const membership = requestedOrganizationId
    ? memberships.find(
        (item) => item?.organization?.id === requestedOrganizationId
      )
    : memberships.find(
        (item) =>
          item?.organization?.id === session.default_organization_id
      ) || memberships.find((item) => item?.is_default) || memberships[0];

  if (!membership?.organization) {
    throw workflowError(
      "You do not have access to the requested organization.",
      403
    );
  }

  if (membership.organization.status !== "active") {
    throw workflowError("This organization is not active.", 403);
  }

  const isSuperAdmin =
    session.platform_user?.platform_role ===
    PLATFORM_ROLES.PLATFORM_SUPER_ADMIN;
  const roleAllowed = allowAdmissionsCounsellor
    ? ALLOWED_ROLES.has(membership.role)
    : membership.role === PLATFORM_ROLES.TENANT_ADMIN;

  if (!isSuperAdmin && !roleAllowed) {
    throw workflowError(
      allowAdmissionsCounsellor
        ? "Only an authorized Admissions operator may perform this action."
        : "Only a Platform Super Admin or Tenant Admin may manage student access.",
      403
    );
  }

  const enabledModules = Array.isArray(membership.accessible_modules)
    ? membership.accessible_modules
    : [];

  if (!isSuperAdmin && !enabledModules.includes("admissions")) {
    throw workflowError(
      "Admissions access is not enabled for this organization.",
      403
    );
  }

  return { session, membership, organization: membership.organization };
}
