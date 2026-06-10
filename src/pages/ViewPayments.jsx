import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function ViewPayments() {

  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {

    const querySnapshot = await getDocs(
      collection(db, "payments")
    );

    const data = querySnapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    }));

    setPayments(data);
  };

  const approvePayment = async (id) => {

    await updateDoc(
      doc(db, "payments", id),
      {
        paymentStatus: "Approved",
      }
    );

    fetchPayments();
  };

  const rejectPayment = async (id) => {

    await updateDoc(
      doc(db, "payments", id),
      {
        paymentStatus: "Rejected",
      }
    );

    fetchPayments();
  };

  return (

    <div className="min-h-screen bg-gray-100 p-8">

      <h1 className="text-4xl font-bold text-blue-700 mb-8">
        Student Payment Verification
      </h1>

      <div className="space-y-6">

        {payments.map((item) => (

          <div
            key={item.id}
            className="bg-white p-6 rounded-2xl shadow-lg"
          >

            <h2 className="text-2xl font-bold">
              {item.studentName}
            </h2>

            <p className="mt-2">
              Email: {item.studentEmail}
            </p>

            <p className="mt-2">
              Submitted On: {item.submittedAt}
            </p>

            <p className="mt-2 font-semibold text-blue-700">
              Status: {item.paymentStatus}
            </p>

            {item.paymentScreenshot && (
              <a
                href={item.paymentScreenshot}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                View Payment Proof
              </a>
            )}

            <div className="mt-4 flex gap-4">

              <button
                onClick={() => approvePayment(item.id)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                Approve
              </button>

              <button
                onClick={() => rejectPayment(item.id)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Reject
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}