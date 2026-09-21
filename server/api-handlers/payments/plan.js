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
    const planType = clean(body.plan_type, 60) || "EMI";
    const rawInstallments = Array.isArray(body.installments) ? body.installments : [];
    if (!studentId) throw workflowError("Student ID is required.", 400);
    if (!rawInstallments.length || rawInstallments.length > 24) throw workflowError("Add between 1 and 24 payment milestones.", 400);

    const { session, organization } = await authenticateAdmissionsOperator(req, organizationId);
    const app = getApps()[0];
    if (!app) throw new Error("Firebase Admin is not initialized.");
    const firestore = getFirestore(app);
    const financeRef = firestore.collection("finance").doc(studentId);
    const studentRef = firestore.collection("students").doc(studentId);
    const [financeSnapshot, studentSnapshot] = await Promise.all([financeRef.get(), studentRef.get()]);
    if (!financeSnapshot.exists || !studentSnapshot.exists) throw workflowError("Finance or student record not found.", 404);
    const finance = financeSnapshot.data();
    const student = studentSnapshot.data();
    if ((finance.organizationId || student.organizationId) && (finance.organizationId || student.organizationId) !== organization.id) {
      throw workflowError("Finance account does not belong to this organization.", 403);
    }

    const finalFee = money(finance.finalFee ?? Math.max(0, money(finance.agreedFee || 0) - money(finance.discount || 0)));
    const existingPaid = money(finance.amountPaid || 0);
    const installments = rawInstallments.map((item, index) => {
      const amount = money(item.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw workflowError(`Milestone ${index + 1} needs a valid amount.`, 400);
      const dueDate = clean(item.dueDate, 20);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw workflowError(`Milestone ${index + 1} needs a due date.`, 400);
      return { id: clean(item.id, 80) || `installment_${index + 1}`, label: clean(item.label, 120) || `Instalment ${index + 1}`, dueDate, amount, amountPaid: 0, status: "Unpaid" };
    });
    const scheduledTotal = money(installments.reduce((sum, item) => sum + item.amount, 0));
    if (scheduledTotal !== finalFee) throw workflowError(`Payment milestones must total the final payable fee of ₹${finalFee.toLocaleString("en-IN")}.`, 400);

    let remainingPaid = existingPaid;
    for (const installment of installments) {
      const allocation = money(Math.min(remainingPaid, installment.amount));
      installment.amountPaid = allocation;
      installment.status = allocation >= installment.amount ? "Paid" : allocation > 0 ? "Partially Paid" : "Unpaid";
      remainingPaid = money(remainingPaid - allocation);
    }
    await financeRef.update({
      paymentPlan: planType,
      paymentPlanType: planType,
      installments,
      paymentScheduleUpdatedAt: FieldValue.serverTimestamp(),
      paymentScheduleUpdatedBy: session.platform_user?.firebase_uid || session.firebase_user?.uid || "finance-admin",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return res.status(200).json({ success: true, paymentPlan: planType, installments });
  } catch (error) {
    return sendPlatformError(res, error, "Payment plan could not be saved.");
  }
}
