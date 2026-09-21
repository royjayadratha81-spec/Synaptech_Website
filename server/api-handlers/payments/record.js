import { getApps } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { sendPlatformError } from "../_shared/platform-auth.js";
import { authenticateAdmissionsOperator, clean, readJsonBody, workflowError } from "../_shared/admissions-operations-auth.js";

const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const body = readJsonBody(req);
    const organizationId = clean(body.organization_id, 36) || null;
    const studentId = clean(body.student_id, 128);
    const amount = money(body.amount_received);
    const paymentMode = clean(body.payment_mode, 80) || "Manual";
    const transactionId = clean(body.transaction_id, 180) || null;
    const remarks = clean(body.remarks, 2000) || null;
    const submittedPaymentId = clean(body.payment_id, 128) || null;
    const requestedInstallmentId = clean(body.installment_id, 128) || null;

    if (!studentId) throw workflowError("Student ID is required.", 400);
    if (!Number.isFinite(amount) || amount <= 0) throw workflowError("Payment amount must be greater than zero.", 400);

    const { session, organization } = await authenticateAdmissionsOperator(req, organizationId);
    const app = getApps()[0];
    if (!app) throw new Error("Firebase Admin is not initialized.");
    const firestore = getFirestore(app);
    const financeRef = firestore.collection("finance").doc(studentId);
    const studentRef = firestore.collection("students").doc(studentId);
    const ledgerRef = submittedPaymentId
      ? firestore.collection("payments").doc(submittedPaymentId)
      : firestore.collection("payments").doc();

    const result = await firestore.runTransaction(async (transaction) => {
      const [financeSnapshot, studentSnapshot, submittedSnapshot] = await Promise.all([
        transaction.get(financeRef),
        transaction.get(studentRef),
        submittedPaymentId ? transaction.get(ledgerRef) : Promise.resolve(null),
      ]);
      if (!financeSnapshot.exists) throw workflowError("Finance account not found.", 404);
      if (!studentSnapshot.exists) throw workflowError("Student record not found.", 404);

      const finance = financeSnapshot.data();
      const student = studentSnapshot.data();
      const recordOrganizationId = finance.organizationId || student.organizationId;
      if (recordOrganizationId && recordOrganizationId !== organization.id) {
        throw workflowError("Finance account does not belong to this organization.", 403);
      }
      if (submittedSnapshot?.exists && submittedSnapshot.data()?.verified === true) {
        throw workflowError("This payment has already been verified.", 409);
      }

      const agreedFee = money(finance.agreedFee || 0);
      const discount = money(finance.discount || 0);
      const finalFee = money(finance.finalFee ?? Math.max(0, agreedFee - discount));
      const amountPaid = money(finance.amountPaid || 0);
      const balanceBefore = money(Math.max(0, finalFee - amountPaid));
      if (amount > balanceBefore) throw workflowError("Payment cannot exceed the outstanding balance.", 400);

      const totalPaid = money(amountPaid + amount);
      const balanceAmount = money(Math.max(0, finalFee - totalPaid));
      const paymentStatus = balanceAmount === 0 ? "Paid" : "Partially Paid";
      let remaining = amount;
      const now = new Date().toISOString();
      const installments = Array.isArray(finance.installments)
        ? finance.installments.map((item) => ({ ...item }))
        : [];

      const allocationOrder = requestedInstallmentId
        ? [...installments.keys()].sort((a, b) => (installments[a].id === requestedInstallmentId ? -1 : installments[b].id === requestedInstallmentId ? 1 : a - b))
        : [...installments.keys()];
      for (const index of allocationOrder) {
        if (remaining <= 0) break;
        const installment = installments[index];
        const due = money(installment.amount || 0);
        const paid = money(installment.amountPaid || 0);
        const allocation = money(Math.min(remaining, Math.max(0, due - paid)));
        if (allocation <= 0) continue;
        installment.amountPaid = money(paid + allocation);
        installment.status = installment.amountPaid >= due ? "Paid" : "Partially Paid";
        installment.lastPaidAt = now;
        remaining = money(remaining - allocation);
      }

      const ledger = {
        studentId,
        studentName: student.name || finance.studentName || null,
        studentEmail: student.email || finance.studentEmail || null,
        organizationId: organization.id,
        paymentAmount: amount,
        paymentMode,
        transactionId,
        remarks,
        installmentId: requestedInstallmentId,
        paymentStatus: "Verified",
        verified: true,
        verifiedAt: FieldValue.serverTimestamp(),
        verifiedBy: session.platform_user?.firebase_uid || session.firebase_user?.uid || "finance-admin",
        source: submittedPaymentId ? "student_submission" : "finance_manual",
        submittedAt: submittedSnapshot?.exists ? submittedSnapshot.data()?.submittedAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      };
      transaction.set(ledgerRef, ledger, { merge: submittedPaymentId === null ? false : true });
      transaction.update(financeRef, {
        finalFee,
        amountPaid: totalPaid,
        balanceAmount,
        paymentStatus,
        installments,
        verified: true,
        financeClearanceStatus: "verified",
        lastPaymentDate: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(studentRef, {
        paymentStatus,
        financeClearanceStatus: "verified",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { totalPaid, balanceAmount, paymentStatus, ledgerId: ledgerRef.id };
    });

    return res.status(200).json({ success: true, account: result });
  } catch (error) {
    return sendPlatformError(res, error, "Payment could not be recorded.");
  }
}
