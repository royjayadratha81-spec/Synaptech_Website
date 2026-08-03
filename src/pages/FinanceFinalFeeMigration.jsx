import { useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function FinanceFinalFeeMigration() {

  const [running, setRunning] = useState(false);

  const [updated, setUpdated] = useState(0);

  const runMigration = async () => {

    setRunning(true);

    let count = 0;

    const snapshot = await getDocs(collection(db, "finance"));

    for (const financeDoc of snapshot.docs) {

      const finance = financeDoc.data();


      const finalFee =
  Number(finance.finalFee ??
    (Number(finance.agreedFee) - Number(finance.discount || 0)));

const amountPaid =
  Number(finance.amountPaid || 0);

const balanceAmount =
  Math.max(0, finalFee - amountPaid);

const paymentStatus =
  balanceAmount === 0
    ? "Paid"
    : amountPaid > 0
      ? "Partially Paid"
      : "Pending";

await updateDoc(doc(db, "finance", financeDoc.id), {

  finalFee,

  balanceAmount,

  paymentStatus,

  updatedAt: new Date(),

});

      console.log(
        finance.studentName,
        "-> finalFee:",
        finalFee
      );

      count++;

    }

    setUpdated(count);

    setRunning(false);

    alert(`Migration Completed.\nUpdated ${count} finance records.`);

  };

  return (

    <div className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        Finance Final Fee Migration
      </h1>

      <button
        onClick={runMigration}
        disabled={running}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg"
      >
        {running ? "Running..." : "Run Migration"}
      </button>

      <p className="mt-6">
        Updated: {updated}
      </p>

    </div>

  );

}