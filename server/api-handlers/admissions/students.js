import { getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { sendPlatformError } from "../_shared/platform-auth.js";
import {
  authenticateAdmissionsOperator,
  clean,
} from "../_shared/admissions-operations-auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const organizationId = clean(req.query?.organization_id, 36) || null;
    const { organization } = await authenticateAdmissionsOperator(
      req,
      organizationId
    );
    const app = getApps()[0];
    if (!app) throw new Error("Firebase Admin is not initialized.");

    const snapshot = await getFirestore(app)
      .collection("students")
      .where("organizationId", "==", organization.id)
      .get();

    const students = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .filter((student) => student.archived !== true)
      .sort((a, b) => {
        const left = a.updatedAt?.toMillis?.() || Date.parse(a.updatedAt) || 0;
        const right = b.updatedAt?.toMillis?.() || Date.parse(b.updatedAt) || 0;
        return right - left;
      });

    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    return res.status(200).json({ success: true, organization, students });
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
