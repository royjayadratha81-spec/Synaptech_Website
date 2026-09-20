import { getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { sendPlatformError } from "../_shared/platform-auth.js";
import {
  authenticateAdmissionsOperator,
  clean,
  readJsonBody,
  workflowError,
} from "../_shared/admissions-operations-auth.js";

const STATES = Object.freeze({
  awaiting_lms_access: {
    label: "Awaiting LMS Access",
    lmsAccess: false,
    disabled: true,
    provisioning: "awaiting_lms_access",
  },
  active: {
    label: "Active",
    lmsAccess: true,
    disabled: false,
    provisioning: "active",
  },
  lms_access_denied: {
    label: "LMS Access Denied",
    lmsAccess: false,
    disabled: true,
    provisioning: "denied",
  },
  completed: {
    label: "Completed",
    lmsAccess: true,
    disabled: false,
    provisioning: "completed",
  },
  alumni: {
    label: "Alumni",
    lmsAccess: true,
    disabled: false,
    provisioning: "alumni",
  },
  archive: {
    label: "Archived",
    lmsAccess: false,
    disabled: true,
    provisioning: "archived",
  },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const body = readJsonBody(req);
    const organizationId = clean(body.organization_id, 36) || null;
    const studentId = clean(body.student_id, 128);
    const stateKey = clean(body.state, 60).toLowerCase();
    const note = clean(body.note, 2000) || null;
    const next = STATES[stateKey];

    if (!studentId) throw workflowError("Student ID is required.", 400);
    if (!next) throw workflowError("Unknown student lifecycle state.", 400);

    const { session, organization } =
      await authenticateAdmissionsOperator(req, organizationId);
    const app = getApps()[0];
    if (!app) throw new Error("Firebase Admin is not initialized.");
    const firestore = getFirestore(app);
    const auth = getAuth(app);
    const studentRef = firestore.collection("students").doc(studentId);
    const financeRef = firestore.collection("finance").doc(studentId);
    const [studentSnapshot, financeSnapshot] = await Promise.all([
      studentRef.get(),
      financeRef.get(),
    ]);

    if (!studentSnapshot.exists) {
      throw workflowError("Student record not found.", 404);
    }

    const student = studentSnapshot.data();
    const finance = financeSnapshot.exists ? financeSnapshot.data() : {};

    if (student.organizationId !== organization.id) {
      throw workflowError("Student does not belong to this organization.", 403);
    }

    if (
      ["active", "completed", "alumni"].includes(stateKey) &&
      finance.financeClearanceStatus !== "verified"
    ) {
      throw workflowError(
        "Finance clearance must be verified before LMS access can be enabled.",
        409
      );
    }

    await auth.updateUser(studentId, { disabled: next.disabled });

    const now = new Date();
    const batch = firestore.batch();
    batch.set(
      studentRef,
      {
        status: next.label,
        lmsAccess: next.lmsAccess,
        archived: stateKey === "archive",
        lifecycleState: stateKey,
        lifecycleNote: note,
        lifecycleUpdatedAt: now,
        lifecycleUpdatedBy: session.firebase_user.uid,
        updatedAt: now,
      },
      { merge: true }
    );
    batch.set(
      financeRef,
      {
        lmsProvisioningStatus: next.provisioning,
        lmsAccess: next.lmsAccess,
        updatedAt: now,
      },
      { merge: true }
    );
    batch.set(firestore.collection("studentLifecycleEvents").doc(), {
      organizationId: organization.id,
      studentId,
      admissionsApplicationId: student.admissionsApplicationId || null,
      fromStatus: student.status || null,
      toStatus: next.label,
      state: stateKey,
      lmsAccess: next.lmsAccess,
      authDisabled: next.disabled,
      note,
      actorFirebaseUid: session.firebase_user.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return res.status(200).json({
      success: true,
      student: {
        id: studentId,
        status: next.label,
        lifecycleState: stateKey,
        lmsAccess: next.lmsAccess,
        archived: stateKey === "archive",
      },
      message:
        stateKey === "archive"
          ? "Student archived. Finance and audit history were preserved."
          : `${next.label} saved successfully.`,
    });
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
