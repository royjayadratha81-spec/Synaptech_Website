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
    const requestedBatchId = clean(body.batch_id, 160) || null;
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

    let batchAssignment = null;
    const effectiveBatchId = requestedBatchId || student.batchId || null;
    if (effectiveBatchId) {
      const batchSnapshot = await firestore
        .collection("batches")
        .doc(effectiveBatchId)
        .get();
      if (!batchSnapshot.exists) {
        throw workflowError("The selected Firebase batch was not found.", 409);
      }
      const selectedBatch = batchSnapshot.data();
      if (selectedBatch.active === false) {
        throw workflowError("The selected batch is inactive.", 409);
      }
      batchAssignment = {
        batchId: batchSnapshot.id,
        batchName: selectedBatch.batchName || batchSnapshot.id,
        startDate: selectedBatch.startDate || null,
        endDate: selectedBatch.endDate || null,
      };
    }

    if (["active", "completed", "alumni"].includes(stateKey) && !batchAssignment) {
      throw workflowError(
        "Assign an active Firebase batch before enabling LMS access.",
        409
      );
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

    const analyticsEmail = clean(student.email, 320).toLowerCase();
    const analyticsRef = analyticsEmail
      ? firestore.collection("studentAnalytics").doc(analyticsEmail)
      : null;
    const analyticsSnapshot = next.lmsAccess && analyticsRef
      ? await analyticsRef.get()
      : null;

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
        ...(batchAssignment || {}),
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
    if (next.lmsAccess && analyticsRef && !analyticsSnapshot?.exists) {
      batch.set(analyticsRef, {
        studentEmail: analyticsEmail,
        studentName: student.name || "Student",
        batchId: batchAssignment?.batchId || student.batchId || null,
        batchName: batchAssignment?.batchName || student.batchName || null,
        analyticsBatchId: batchAssignment?.batchId || student.batchId || null,
        assignmentAverage: 0,
        assignmentCount: 0,
        averageScore: 0,
        capstoneAverage: 0,
        capstoneCount: 0,
        highestAssignmentScore: 0,
        highestCapstoneScore: 0,
        highestMiniTestScore: 0,
        highestProjectScore: 0,
        lastLearningActivityDate: null,
        latestEvaluation: null,
        learningStreak: 0,
        longestLearningStreak: 0,
        materialProgress: {},
        miniTestAverage: 0,
        miniTestCount: 0,
        modules: {},
        modulesCompleted: 0,
        overallProgress: 0,
        performanceGrade: "Not graded",
        projectAverage: 0,
        projectCount: 0,
        totalModules: 0,
        organizationId: organization.id,
        studentId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
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
        batchId: batchAssignment?.batchId || student.batchId || null,
        batchName: batchAssignment?.batchName || student.batchName || null,
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
