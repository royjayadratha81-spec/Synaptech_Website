import { useState } from "react";
import {
  collection,
  getDocs,
  setDoc,
  doc
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

export default function FinanceMigration() {

  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [count, setCount] = useState(0);

  const runMigration = async () => {

    try {

      setRunning(true);

      const snapshot = await getDocs(
        collection(db, "students")
      );

      let updated = 0;

      for (const student of snapshot.docs) {

        const data = student.data();

        if (!data.approved) continue;

        let totalFee = 64900;

if (
  (data.name || "").trim().toLowerCase() ===
  "ansh rana"
) {
  totalFee = 69800;
}
let amountPaid = 0;

const email = (data.email || "").trim().toLowerCase();

if (email.startsWith("avni")) {
  amountPaid = 60000;
}
else if (email === "nityanshnehra@gmail.com") {
  amountPaid = 55000;
}
else if (email === "ranaansh803@gmail.com") {
  amountPaid = 52400;
}
else if (email === "pc259058@gmail.com") {
  amountPaid = 50000;
}

const balanceAmount = totalFee - amountPaid;

const paymentStatus =
  balanceAmount === 0
    ? "Paid"
    : amountPaid === 0
    ? "Pending Payment"
    : "Partially Paid";

        await setDoc(
          doc(db, "finance", student.id),
          {

            studentId: student.id,

            studentName: data.name || "",

            studentEmail: data.email || "",

            course: data.course || "",

            batch: data.batch || "",

           agreedFee: totalFee,

amountPaid: amountPaid,

balanceAmount: balanceAmount,

feeSettled:
  email.startsWith("avni") ||
  email === "nityanshnehra@gmail.com" ||
  email === "pc259058@gmail.com",

paymentStatus:
  email.startsWith("avni") ||
  email === "nityanshnehra@gmail.com" ||
  email === "pc259058@gmail.com"
    ? "Paid"
    : paymentStatus,

            installmentCount: 0,

            nextDueDate: "",

            lastPaymentDate: "",

            createdAt: new Date().toLocaleString(),

            updatedAt: new Date().toLocaleString()

          }
        );

        updated++;

      }

      setCount(updated);

      setCompleted(true);

      alert(`Finance migration completed.\n${updated} records created.`);

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

          Finance Migration

        </h1>

        <p className="mt-4">

          This will create Finance records
          for every approved student.

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

            Records Created : {count}

          </div>

        }

      </div>

    </div>

  );

}