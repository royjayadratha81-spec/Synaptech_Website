import { useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteField,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

export default function PaymentMigration() {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [updatedCount, setUpdatedCount] = useState(0);

  const runMigration = async () => {
  try {
    setRunning(true);

    const snapshot = await getDocs(collection(db, "students"));

    let updated = 0;
    let skipped = 0;

    for (const student of snapshot.docs) {
      const studentData = student.data();

      // Finance document has the same ID as the student document
      const financeRef = doc(db, "finance", student.id);
      const financeSnap = await getDoc(financeRef);

      if (!financeSnap.exists()) {
        console.log(
          `⏭ ${studentData.name || student.id} -> No Finance Record`
        );
        skipped++;
        continue;
      }

      const finance = financeSnap.data();
      const protectedStatuses = [
  "Active",
  "Completed",
  "Alumni",
];

const currentStatus = studentData.status || "Registered";

if (protectedStatuses.includes(currentStatus)) {
  console.log(
    `⏭ ${studentData.name || student.id} -> Protected Status (${currentStatus})`
  );

  skipped++;
  continue;
}

      let newStatus = studentData.status || "Registered";

// Never downgrade LMS access if it's already true
let lmsAccess = studentData.lmsAccess || false;

      switch (finance.paymentStatus) {
  case "Paid":
    newStatus = "Admitted";
    lmsAccess = true;
    break;

  case "Partially Paid":
    newStatus = "Fee Pending";
    // Keep existing LMS access if already true
    lmsAccess = studentData.lmsAccess || false;
    break;

  case "Pending Payment":
    newStatus = "Fee Pending";
    // Keep existing LMS access if already true
    lmsAccess = studentData.lmsAccess || false;
    break;

  default:
    newStatus = studentData.status || "Registered";
    lmsAccess = studentData.lmsAccess || false;
}
console.log(student.id, studentData);
      const needsUpdate =
  studentData.status !== newStatus ||
  studentData.lmsAccess !== lmsAccess ||
  "paymentStatus" in studentData ||
  "approved" in studentData ||
  "approvedAt" in studentData ||
  "approvedBy" in studentData;

if (!needsUpdate) {
  console.log(
    `⏭ ${studentData.name || student.id} -> Already Migrated`
  );
  skipped++;
  continue;
}
console.log({
  student: studentData.name,
  hasPaymentStatus: "paymentStatus" in studentData,
  needsUpdate,
});

await updateDoc(doc(db, "students", student.id), {
  status: newStatus,
  lmsAccess,

  paymentStatus: deleteField(),
  approved: deleteField(),
  approvedAt: deleteField(),
  approvedBy: deleteField(),

  updatedAt: new Date(),
});

updated++;

      console.log(
        `✓ ${studentData.name || student.id} -> ${newStatus}`
      );
    }

    setUpdatedCount(updated);
    setCompleted(true);

    alert(
      `Migration Completed\n\nUpdated : ${updated}\nSkipped : ${skipped}`
    );

    console.log("=================================");
    console.log(`Students Updated : ${updated}`);
    console.log(`Students Skipped : ${skipped}`);
    console.log("=================================");
  } catch (err) {
    console.error("Migration Error:", err);
    alert("Migration Failed");
  }

  setRunning(false);
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="bg-white shadow-xl rounded-2xl p-10 w-[500px]">

        <h1 className="text-3xl font-bold text-blue-700 mb-6">
          Payment Migration
        </h1>

        <p className="mb-6">
          This will update every approved student
          who is missing a Payment Status.
        </p>

        <button
          disabled={running}
          onClick={runMigration}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
        >
          {running
            ? "Running..."
            : "Run Migration"}
        </button>

        {completed && (
          <div className="mt-6 p-4 rounded-xl bg-green-100 text-green-800">

            Migration Successful

            <br />

            Students Updated :
            {" "}
            {updatedCount}

          </div>
        )}

      </div>

    </div>
  );
}