import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteField,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

export const migrateStudentRecords = async () => {
  try {
    const snapshot = await getDocs(collection(db, "students"));

    for (const studentDoc of snapshot.docs) {
      const data = studentDoc.data();

      const updates = {
        status: data.status || "Registered",
      };

      // Remove old duplicate payment fields
      if ("paymentStatus" in data) {
        updates.paymentStatus = deleteField();
      }

      if ("approved" in data) {
        updates.approved = deleteField();
      }

      if ("approvedAt" in data) {
        updates.approvedAt = deleteField();
      }

      if ("approvedBy" in data) {
        updates.approvedBy = deleteField();
      }

      await updateDoc(
        doc(db, "students", studentDoc.id),
        updates
      );
    }

    console.log("Student migration completed successfully.");
  } catch (error) {
    console.error("Migration Error:", error);
  }
};