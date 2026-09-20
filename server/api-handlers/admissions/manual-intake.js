import { sendPlatformError } from "../_shared/platform-auth.js";
import {
  authenticateAdmissionsOperator,
  clean,
  normalizeEmail,
  readJsonBody,
  workflowError,
} from "../_shared/admissions-operations-auth.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optionalAmount(value) {
  if (value === "" || value === null || value === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw workflowError("Agreed fee must be a non-negative number.", 400);
  }
  return amount;
}

function normalizeInput(body) {
  const fullName = clean(body.full_name, 300);
  const email = normalizeEmail(body.email);
  const programmeName = clean(body.programme_name, 300);

  if (!fullName) throw workflowError("Student name is required.", 400);
  if (!EMAIL_PATTERN.test(email)) {
    throw workflowError("Enter a valid student email address.", 400);
  }
  if (!programmeName) throw workflowError("Programme is required.", 400);

  return {
    organizationId: clean(body.organization_id, 36) || null,
    fullName,
    email,
    phone: clean(body.phone, 80) || null,
    city: clean(body.city, 160) || null,
    guardianName: clean(body.guardian_name, 300) || null,
    guardianEmail: normalizeEmail(body.guardian_email) || null,
    guardianPhone: clean(body.guardian_phone, 80) || null,
    programmeCode: clean(body.programme_code, 120) || null,
    programmeName,
    deliveryMode: clean(body.delivery_mode, 40).toLowerCase() || null,
    academicSession: clean(body.academic_session, 120) || null,
    batchPreference: clean(body.batch_preference, 200) || null,
    agreedFee: optionalAmount(body.agreed_fee),
    currency: clean(body.currency, 3).toUpperCase() || "INR",
    paymentTerms: clean(body.payment_terms, 300) || null,
    note: clean(body.note, 2000) || null,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const input = normalizeInput(readJsonBody(req));
    const { session, organization } =
      await authenticateAdmissionsOperator(
        req,
        input.organizationId,
        { allowAdmissionsCounsellor: true }
      );
    const supabase = session.supabase;
    const { data, error } = await supabase.rpc(
      "admissions_create_manual_intake",
      {
        p_organization_id: organization.id,
        p_actor_platform_user_id: session.firebase_user.uid,
        p_full_name: input.fullName,
        p_email: input.email,
        p_phone: input.phone,
        p_city: input.city,
        p_guardian_name: input.guardianName,
        p_guardian_email: input.guardianEmail,
        p_guardian_phone: input.guardianPhone,
        p_programme_code: input.programmeCode,
        p_programme_name: input.programmeName,
        p_delivery_mode: input.deliveryMode,
        p_academic_session: input.academicSession,
        p_batch_preference: input.batchPreference,
        p_agreed_fee: input.agreedFee,
        p_currency: input.currency,
        p_payment_terms: input.paymentTerms,
        p_note: input.note,
      }
    );

    if (error) throw error;
    const candidate = data?.candidate;
    const application = data?.application;
    if (!candidate?.id || !application?.id) {
      throw workflowError("Manual intake completed without returning its records.", 500);
    }

    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    return res.status(201).json({
      success: true,
      organization,
      candidate,
      application,
      message:
        "Student registered in Admissions. Approval is required before the Finance queue.",
    });
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
