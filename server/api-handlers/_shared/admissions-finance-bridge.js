import { randomBytes } from "node:crypto";

import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function workflowError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getFirebaseAdminApp() {
  const existingApp = getApps()[0];
  if (existingApp) return existingApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw workflowError(
      "Firebase Admin environment variables are not configured.",
      500
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

function clean(value, maximumLength = 1000) {
  return String(value ?? "").trim().slice(0, maximumLength);
}

function normalizeEmail(value) {
  return clean(value, 320).toLowerCase();
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function isUserNotFound(error) {
  return error?.code === "auth/user-not-found";
}

function sourceLabel(application) {
  return application?.intake_route === "crm_won"
    ? "CRM Won"
    : "Manual Admission";
}

function expectedFee(application) {
  const metadata = application?.metadata || {};
  return (
    numberOrNull(metadata.final_value) ??
    numberOrNull(metadata.agreed_fee) ??
    numberOrNull(metadata.final_fee) ??
    0
  );
}

export async function loadAdmissionsContext({
  supabase,
  organizationId,
  applicationId,
}) {
  const { data: application, error: applicationError } = await supabase
    .from("admissions_applications")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError) throw applicationError;
  if (!application) {
    throw workflowError(
      "Admission application not found for this organization.",
      404
    );
  }

  const { data: candidate, error: candidateError } = await supabase
    .from("admissions_candidates")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", application.candidate_id)
    .maybeSingle();

  if (candidateError) throw candidateError;
  if (!candidate) {
    throw workflowError(
      "The candidate linked to this application could not be found.",
      409
    );
  }

  return { application, candidate };
}

async function reserveFirebaseStudentIdentity({
  supabase,
  organization,
  application,
  candidate,
}) {
  const app = getFirebaseAdminApp();
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const email = normalizeEmail(candidate.email || candidate.email_normalized);

  if (!email) {
    throw workflowError(
      "A candidate email address is required before sending the admission to Finance.",
      409
    );
  }

  let userRecord = null;
  let created = false;

  if (application.firebase_uid_reserved) {
    try {
      userRecord = await auth.getUser(application.firebase_uid_reserved);
    } catch (error) {
      if (!isUserNotFound(error)) throw error;
    }
  }

  if (!userRecord) {
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error) {
      if (!isUserNotFound(error)) throw error;
    }
  }

  if (userRecord) {
    const [studentSnapshot, financeSnapshot] = await Promise.all([
      firestore.collection("students").doc(userRecord.uid).get(),
      firestore.collection("finance").doc(userRecord.uid).get(),
    ]);

    const isReservedIdentity =
      userRecord.customClaims?.synaptechAdmissionsReserved === true;
    const isKnownStudent = studentSnapshot.exists || financeSnapshot.exists;

    if (!isKnownStudent && !isReservedIdentity) {
      throw workflowError(
        "This email already belongs to a non-student Firebase account. Use a different student email or resolve the identity conflict before approval.",
        409
      );
    }

    const existingOrganizationId =
      studentSnapshot.data()?.organizationId ||
      financeSnapshot.data()?.organizationId ||
      null;

    if (
      existingOrganizationId &&
      existingOrganizationId !== organization.id
    ) {
      throw workflowError(
        "This Firebase student identity is already assigned to another organization.",
        409
      );
    }
  } else {
    userRecord = await auth.createUser({
      email,
      displayName: clean(candidate.full_name || candidate.name, 300) || undefined,
      password: randomBytes(30).toString("base64url"),
      disabled: true,
      emailVerified: false,
    });

    await auth.setCustomUserClaims(userRecord.uid, {
      ...(userRecord.customClaims || {}),
      synaptechAdmissionsReserved: true,
    });

    created = true;
  }

  if (application.firebase_uid_reserved !== userRecord.uid) {
    const { error } = await supabase
      .from("admissions_applications")
      .update({
        firebase_uid_reserved: userRecord.uid,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organization.id)
      .eq("id", application.id);

    if (error) throw error;
  }

  return {
    auth,
    firestore,
    uid: userRecord.uid,
    email,
    identityCreated: created,
  };
}

export async function ensureFinanceQueueForApplication({
  supabase,
  organization,
  application,
  candidate,
}) {
  const identity = await reserveFirebaseStudentIdentity({
    supabase,
    organization,
    application,
    candidate,
  });

  const financeRef = identity.firestore
    .collection("finance")
    .doc(identity.uid);
  const now = new Date();
  const fee = expectedFee(application);

  await identity.firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(financeRef);
    const current = snapshot.exists ? snapshot.data() : {};

    if (
      current.organizationId &&
      current.organizationId !== organization.id
    ) {
      throw workflowError(
        "The Finance account is already assigned to another organization.",
        409
      );
    }

    const amountPaid = numberOrNull(current.amountPaid) ?? 0;
    const agreedFee =
      numberOrNull(current.agreedFee) ??
      numberOrNull(current.finalFee) ??
      fee;
    const finalFee = numberOrNull(current.finalFee) ?? agreedFee;
    const balanceAmount =
      numberOrNull(current.balanceAmount) ??
      Math.max(0, finalFee - amountPaid);

    transaction.set(
      financeRef,
      {
        studentId: identity.uid,
        firebaseUid: identity.uid,
        studentName: clean(candidate.full_name || candidate.name, 300),
        email: identity.email,
        phone: clean(candidate.phone, 80) || null,
        organizationId: organization.id,
        organizationName: organization.name || null,
        firestoreTenantKey: organization.firestore_tenant_key || null,
        admissionsApplicationId: application.id,
        admissionsCandidateId: candidate.id,
        intakeRoute: application.intake_route || "manual",
        admissionSource: sourceLabel(application),
        course: clean(application.programme_name, 300) || null,
        programmeCode: clean(application.programme_code, 120) || null,
        batch: clean(
          application.batch_preference || application.academic_session,
          200
        ) || null,
        agreedFee,
        finalFee,
        amountPaid,
        balanceAmount,
        paymentStatus:
          current.paymentStatus ||
          (amountPaid > 0 ? "Partially Paid" : "Unpaid"),
        paymentPlan:
          current.paymentPlan ||
          application.metadata?.payment_terms ||
          "Pending setup",
        financeClearanceStatus:
          current.financeClearanceStatus || "pending",
        verified: current.verified === true,
        admissionsApprovedAt:
          application.admissions_approved_for_finance_at ||
          now.toISOString(),
        admissionsApprovedBy:
          application.admissions_approved_for_finance_by || null,
        lmsProvisioningStatus:
          current.lmsProvisioningStatus || "awaiting_finance_clearance",
        updatedAt: now,
        ...(snapshot.exists ? {} : { createdAt: now }),
      },
      { merge: true }
    );
  });

  return {
    studentId: identity.uid,
    identityCreated: identity.identityCreated,
    financeAccountId: identity.uid,
  };
}

export async function provisionAwaitingLmsStudent({
  supabase,
  organization,
  application,
  candidate,
}) {
  const queue = await ensureFinanceQueueForApplication({
    supabase,
    organization,
    application,
    candidate,
  });

  const app = getFirebaseAdminApp();
  const firestore = getFirestore(app);
  const studentRef = firestore.collection("students").doc(queue.studentId);
  const financeRef = firestore.collection("finance").doc(queue.financeAccountId);
  const now = new Date();

  await firestore.runTransaction(async (transaction) => {
    const [studentSnapshot, financeSnapshot] = await Promise.all([
      transaction.get(studentRef),
      transaction.get(financeRef),
    ]);

    const currentStudent = studentSnapshot.exists ? studentSnapshot.data() : {};
    const currentFinance = financeSnapshot.exists ? financeSnapshot.data() : {};
    const alreadyActive = currentStudent.lmsAccess === true;

    transaction.set(
      studentRef,
      {
        firebaseUid: queue.studentId,
        name: clean(candidate.full_name || candidate.name, 300),
        email: normalizeEmail(candidate.email || candidate.email_normalized),
        phone: clean(candidate.phone, 80) || null,
        course: clean(application.programme_name, 300) || null,
        programmeCode: clean(application.programme_code, 120) || null,
        batch: clean(
          application.batch_preference || application.academic_session,
          200
        ) || null,
        organizationId: organization.id,
        organizationName: organization.name || null,
        firestoreTenantKey: organization.firestore_tenant_key || null,
        admissionsApplicationId: application.id,
        admissionsCandidateId: candidate.id,
        admissionSource: sourceLabel(application),
        approved: true,
        lmsAccess: alreadyActive,
        status: alreadyActive
          ? currentStudent.status || "Active"
          : "Awaiting LMS Access",
        paymentStatus: currentFinance.paymentStatus || "Unpaid",
        financeClearanceStatus: "verified",
        financeVerifiedAt:
          application.finance_verified_at || now.toISOString(),
        updatedAt: now,
        ...(studentSnapshot.exists ? {} : { createdAt: now }),
      },
      { merge: true }
    );

    transaction.set(
      financeRef,
      {
        financeClearanceStatus: "verified",
        verified: true,
        verifiedAt: application.finance_verified_at || now,
        admissionsFinalizedAt: application.admitted_at || now,
        studentRecordReady: true,
        lmsProvisioningStatus: alreadyActive
          ? "active"
          : "awaiting_lms_access",
        updatedAt: now,
      },
      { merge: true }
    );
  });

  const { error } = await supabase
    .from("admissions_applications")
    .update({
      lms_student_reference: queue.studentId,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organization.id)
    .eq("id", application.id)
    .is("lms_student_reference", null);

  if (error) throw error;

  return {
    studentId: queue.studentId,
    status: "Awaiting LMS Access",
    lmsAccess: false,
  };
}
