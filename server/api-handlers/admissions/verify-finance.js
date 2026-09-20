import { PLATFORM_ROLES } from "../../../shared/platform-access.js";

import {
  authenticatePlatformRequest,
  sendPlatformError,
} from "../_shared/platform-auth.js";
import {
  loadAdmissionsContext,
  provisionAwaitingLmsStudent,
} from "../_shared/admissions-finance-bridge.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_CLEARANCE_TYPES = new Set([
  "payment_received",
  "installment_approved",
  "scholarship_approved",
  "fee_waived",
]);

const ALLOWED_PAYMENT_METHODS = new Set([
  "cash",
  "upi",
  "bank_transfer",
  "card",
  "cheque",
  "payment_gateway",
  "other",
]);

const ALLOWED_MEMBERSHIP_ROLES = new Set([
  PLATFORM_ROLES.TENANT_ADMIN,
  PLATFORM_ROLES.FINANCE_ADMIN,
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
    "A Finance verification request body is required.",
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

function optionalIsoDate(value) {
  const normalizedValue = optionalText(
    value,
    "Payment date",
    10
  );

  if (!normalizedValue) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    normalizedValue
  );

  if (!match) {
    throw createAdmissionsError(
      "Payment date must use YYYY-MM-DD format.",
      400
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw createAdmissionsError(
      "Payment date is not a valid calendar date.",
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
      "Only a Platform Super Admin, Tenant Admin, or Finance Admin can verify Finance clearance.",
      403
    );
  }

  return membership;
}

function normalizeFinanceVerification(body) {
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

  const clearanceType = requiredText(
    body.clearance_type,
    "Clearance type",
    40
  ).toLowerCase();

  if (!ALLOWED_CLEARANCE_TYPES.has(clearanceType)) {
    throw createAdmissionsError(
      "Clearance type must be payment_received, installment_approved, scholarship_approved, or fee_waived.",
      400
    );
  }

  const rawAmount =
    body.amount_received === undefined ||
    body.amount_received === null ||
    body.amount_received === ""
      ? 0
      : body.amount_received;

  const amountReceived = Number(rawAmount);

  if (!Number.isFinite(amountReceived) || amountReceived < 0) {
    throw createAdmissionsError(
      "Amount received must be a non-negative number.",
      400
    );
  }

  if (
    clearanceType === "payment_received" &&
    amountReceived <= 0
  ) {
    throw createAdmissionsError(
      "Enter a positive amount for payment received.",
      400
    );
  }

  const currency = (
    optionalText(body.currency, "Currency", 3) || "INR"
  ).toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw createAdmissionsError(
      "Currency must be a three-letter code such as INR.",
      400
    );
  }

  const paymentMethod = optionalText(
    body.payment_method,
    "Payment method",
    40
  )?.toLowerCase();

  if (
    paymentMethod &&
    !ALLOWED_PAYMENT_METHODS.has(paymentMethod)
  ) {
    throw createAdmissionsError(
      "Payment method must be cash, upi, bank_transfer, card, cheque, payment_gateway, or other.",
      400
    );
  }

  if (
    clearanceType === "payment_received" &&
    !paymentMethod
  ) {
    throw createAdmissionsError(
      "Payment method is required when recording a received payment.",
      400
    );
  }

  return {
    organizationId,
    applicationId,
    clearanceType,
    amountReceived,
    currency,
    paymentMethod: paymentMethod || null,
    paymentReference: optionalText(
      body.payment_reference,
      "Payment reference",
      200
    ),
    paymentDate: optionalIsoDate(body.payment_date),
    note: optionalText(body.note, "Finance note", 2000),
  };
}

function mapDatabaseError(error) {
  if (error?.code === "22023") {
    return createAdmissionsError(
      error.message || "Finance verification data is invalid.",
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
        "This application cannot be Finance verified in its current state.",
      409
    );
  }

  console.error(
    "Admissions Finance verification database error:",
    error
  );

  return createAdmissionsError(
    "Unable to complete Finance verification.",
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

    const input = normalizeFinanceVerification(
      readRequestBody(req)
    );

    const membership = resolveAdmissionsMembership(
      authenticatedSession,
      input.organizationId
    );

    const organizationId = membership.organization.id;
    const idempotencyKey =
      `admissions-finance:${organizationId}:${input.applicationId}`;

    const { data, error } =
      await authenticatedSession.supabase.rpc(
        "admissions_clear_finance_and_finalize",
        {
          p_organization_id: organizationId,
          p_application_id: input.applicationId,
          p_actor_platform_user_id:
            authenticatedSession.firebase_user.uid,
          p_clearance_type: input.clearanceType,
          p_amount_received: input.amountReceived,
          p_currency: input.currency,
          p_payment_method: input.paymentMethod,
          p_payment_reference: input.paymentReference,
          p_payment_date: input.paymentDate,
          p_note: input.note,
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
        "Finance verification completed without returning the application.",
        500
      );
    }

    const admissionsContext = await loadAdmissionsContext({
      supabase: authenticatedSession.supabase,
      organizationId,
      applicationId: input.applicationId,
    });

    const student = await provisionAwaitingLmsStudent({
      supabase: authenticatedSession.supabase,
      organization: membership.organization,
      application: admissionsContext.application,
      candidate: admissionsContext.candidate,
    });

    const finalContext = await loadAdmissionsContext({
      supabase: authenticatedSession.supabase,
      organizationId,
      applicationId: input.applicationId,
    });

    res.setHeader(
      "Cache-Control",
      "private, no-store, max-age=0"
    );
    res.setHeader("Vary", "Authorization");

    return res.status(200).json({
      success: true,
      application: finalContext.application,
      student,
      lms_access_granted: false,
      message:
        "Finance clearance completed. The student is awaiting explicit LMS activation.",
    });
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
