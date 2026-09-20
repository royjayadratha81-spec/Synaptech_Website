import { PLATFORM_ROLES } from "../../../shared/platform-access.js";

import {
  authenticatePlatformRequest,
  sendPlatformError,
} from "../_shared/platform-auth.js";
import {
  ensureFinanceQueueForApplication,
  loadAdmissionsContext,
} from "../_shared/admissions-finance-bridge.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function admissionsError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function readBody(req) {
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
      throw admissionsError("The request body must contain valid JSON.", 400);
    }
  }

  throw admissionsError("An Admissions approval request body is required.", 400);
}

function optionalText(value, label, maximumLength) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw admissionsError(`${label} must be text.`, 400);
  }

  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maximumLength) {
    throw admissionsError(`${label} cannot exceed ${maximumLength} characters.`, 400);
  }
  return normalized;
}

function requiredUuid(value, label) {
  const normalized = optionalText(value, label, 36);
  if (!normalized || !UUID_PATTERN.test(normalized)) {
    throw admissionsError(`${label} must be a valid UUID.`, 400);
  }
  return normalized;
}

function resolveMembership(session, requestedOrganizationId) {
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
    throw admissionsError("You do not have access to this organization.", 403);
  }
  if (membership.organization.status !== "active") {
    throw admissionsError("This organization is not active.", 403);
  }
  if (!membership.accessible_modules?.includes("admissions")) {
    throw admissionsError(
      "Admissions access is not enabled for this account.",
      403
    );
  }

  const isSuperAdmin =
    session.platform_user?.platform_role ===
    PLATFORM_ROLES.PLATFORM_SUPER_ADMIN;
  const isTenantAdmin = membership.role === PLATFORM_ROLES.TENANT_ADMIN;

  if (!isSuperAdmin && !isTenantAdmin) {
    throw admissionsError(
      "Only a Platform Super Admin or Tenant Admin can approve an admission for Finance.",
      403
    );
  }

  return membership;
}

function mapDatabaseError(error) {
  if (error?.code === "22023") {
    return admissionsError(error.message || "Admissions approval data is invalid.", 400);
  }
  if (error?.code === "P0002") {
    return admissionsError("Admission application not found.", 404);
  }
  if (error?.code === "P0001" || error?.code === "23505") {
    return admissionsError(
      error.message || "This application cannot be approved in its current state.",
      409
    );
  }

  console.error("Admissions-to-Finance approval failed:", error);
  return admissionsError("Unable to approve this application for Finance.", 500);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const session = await authenticatePlatformRequest(req);
    const body = readBody(req);
    const organizationId = optionalText(
      body.organization_id,
      "Organization ID",
      36
    );

    if (organizationId && !UUID_PATTERN.test(organizationId)) {
      throw admissionsError("Organization ID must be a valid UUID.", 400);
    }

    const applicationId = requiredUuid(body.application_id, "Application ID");
    const decisionNote = optionalText(
      body.decision_note,
      "Admissions decision note",
      2000
    );
    const membership = resolveMembership(session, organizationId);
    const resolvedOrganizationId = membership.organization.id;

    const initialContext = await loadAdmissionsContext({
      supabase: session.supabase,
      organizationId: resolvedOrganizationId,
      applicationId,
    });

    if (
      !String(
        initialContext.candidate.email ||
          initialContext.candidate.email_normalized ||
          ""
      ).trim()
    ) {
      throw admissionsError(
        "Add the candidate email address before approving the application for Finance.",
        409
      );
    }

    const { data, error } = await session.supabase.rpc(
      "admissions_approve_for_finance",
      {
        p_organization_id: resolvedOrganizationId,
        p_application_id: applicationId,
        p_actor_platform_user_id: session.firebase_user.uid,
        p_decision_note: decisionNote,
        p_idempotency_key:
          `admissions-to-finance:${resolvedOrganizationId}:${applicationId}`,
      }
    );

    if (error) throw mapDatabaseError(error);

    const approvedApplication = Array.isArray(data) ? data[0] : data;
    if (!approvedApplication?.id) {
      throw admissionsError(
        "Admissions approval completed without returning the application.",
        500
      );
    }

    const queue = await ensureFinanceQueueForApplication({
      supabase: session.supabase,
      organization: membership.organization,
      application: approvedApplication,
      candidate: initialContext.candidate,
    });

    const refreshedContext = await loadAdmissionsContext({
      supabase: session.supabase,
      organizationId: resolvedOrganizationId,
      applicationId,
    });

    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Vary", "Authorization");

    return res.status(200).json({
      success: true,
      application: refreshedContext.application,
      finance_queue: {
        account_id: queue.financeAccountId,
        student_id: queue.studentId,
        identity_created: queue.identityCreated,
        status: "pending",
      },
      message: "Admission approved and sent to Finance.",
    });
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
