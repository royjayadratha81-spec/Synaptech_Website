import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase/firebaseConfig";

function waitForUser() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Please sign in again.")), 8000);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout);
      unsubscribe();
      user ? resolve(user) : reject(new Error("Please sign in again."));
    }, reject);
  });
}

async function post(path, payload) {
  const user = await waitForUser();
  const token = await user.getIdToken(true);
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Payment request failed (${response.status}).`);
  return result;
}

export function recordFinancePayment({ organizationId, studentId, amount, paymentMode, transactionId, remarks, paymentId = null, installmentId = null }) {
  return post("/api/payments/record", {
    organization_id: organizationId || null,
    student_id: studentId,
    amount_received: Number(amount),
    payment_mode: paymentMode,
    transaction_id: transactionId,
    remarks,
    payment_id: paymentId,
    installment_id: installmentId,
  });
}

export function saveFinancePaymentPlan({ organizationId, studentId, planType, installments }) {
  return post("/api/payments/plan", {
    organization_id: organizationId || null,
    student_id: studentId,
    plan_type: planType,
    installments,
  });
}
