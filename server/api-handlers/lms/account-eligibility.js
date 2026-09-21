import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { getFirebaseAdminApp } from "../_shared/platform-auth.js";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

function unavailable(res) {
  return res.status(200).json({
    success: true,
    eligible: false,
    message: "This email is not yet eligible for LMS account activation. Please use the email approved by Admissions or contact Synaptech Education.",
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const email = normalizeEmail(readBody(req).email);
    if (!email || email.length > 320 || !email.includes("@")) {
      return res.status(400).json({ error: "Enter a valid registered email address." });
    }

    const app = getFirebaseAdminApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    let user;

    try {
      user = await auth.getUserByEmail(email);
    } catch (error) {
      if (error?.code === "auth/user-not-found") return unavailable(res);
      throw error;
    }

    const [studentSnapshot, financeSnapshot] = await Promise.all([
      firestore.collection("students").doc(user.uid).get(),
      firestore.collection("finance").doc(user.uid).get(),
    ]);

    if (!studentSnapshot.exists) return unavailable(res);

    const student = studentSnapshot.data() || {};
    const finance = financeSnapshot.exists ? financeSnapshot.data() || {} : {};
    const studentEmail = normalizeEmail(student.email);
    const financeVerified =
      student.financeClearanceStatus === "verified" ||
      finance.financeClearanceStatus === "verified";
    const eligible =
      studentEmail === email &&
      student.approved === true &&
      student.lmsAccess === true &&
      financeVerified &&
      user.disabled !== true;

    if (!eligible) return unavailable(res);

    return res.status(200).json({
      success: true,
      eligible: true,
      email,
      message: "LMS access confirmed. A secure password setup link can now be sent to this email.",
    });
  } catch (error) {
    console.error("LMS account eligibility check failed:", error);
    return res.status(500).json({ error: "LMS account eligibility could not be checked." });
  }
}
