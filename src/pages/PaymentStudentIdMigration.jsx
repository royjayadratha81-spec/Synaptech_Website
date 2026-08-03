import { useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

export default function PaymentStudentIdMigration() {

  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [updatedCount, setUpdatedCount] = useState(0);
  const runMigration = async () => {

  try {

    setRunning(true);

    // Read all students
    const studentSnapshot = await getDocs(
      collection(db, "students")
    );

    // Read all payments
    const paymentSnapshot = await getDocs(
      collection(db, "payments")
    );

    let updated = 0;

    // Create email → studentId lookup
    const studentMap = {};

    studentSnapshot.docs.forEach((student) => {

      const data = student.data();

      if (data.email) {

        studentMap[
          data.email.trim().toLowerCase()
        ] = student.id;

      }

    });

    // Update every payment
    for (const payment of paymentSnapshot.docs) {

      const paymentData = payment.data();

      const email =
        (paymentData.studentEmail || "")
          .trim()
          .toLowerCase();

      const studentId = studentMap[email];

if (!studentId) continue;

// Skip if studentId already exists
if (
  paymentData.studentId &&
  paymentData.studentId.trim() !== ""
) {
  continue;
}

await updateDoc(
  doc(db, "payments", payment.id),
  {
    studentId: studentId,
  }
);

updated++;

    }

    setUpdatedCount(updated);
    setCompleted(true);

    alert(
      `Migration completed.\n${updated} payment(s) updated.`
    );

  }
  catch (err) {

    console.error(err);

    alert("Migration Failed");

  }

  setRunning(false);

};
  return (

  <div className="min-h-screen bg-gray-100 flex justify-center items-center">

    <div className="bg-white rounded-2xl shadow-xl p-10 w-[600px]">

      <h1 className="text-3xl font-bold text-blue-700">
        Payment Student ID Migration
      </h1>

      <p className="mt-4">
        This will update every payment record
        with the correct Student ID.
      </p>

      <button
        disabled={running}
        onClick={runMigration}
        className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
      >
        {running ? "Running..." : "Run Migration"}
      </button>

      {
        completed &&

        <div className="mt-6 bg-green-100 p-4 rounded-xl">

          Migration Completed

          <br />

          Payments Updated : {updatedCount}

        </div>
      }

    </div>

  </div>

);
}