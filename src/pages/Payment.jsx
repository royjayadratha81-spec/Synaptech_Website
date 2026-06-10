import { supabase } from "../supabase/supabase";

import {
  collection,
  addDoc,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";
import { useState, useEffect } from "react";
export default function Payment() {
    const [paymentFile, setPaymentFile] = useState(null);
    const [paymentStatus, setPaymentStatus] =
  useState("Not Submitted");
  useEffect(() => {
  fetchPaymentStatus();
}, []);

const fetchPaymentStatus = async () => {

  const studentData = JSON.parse(
    localStorage.getItem("studentData")
  );

  const querySnapshot = await getDocs(
    collection(db, "payments")
  );

  const payment = querySnapshot.docs
    .map((doc) => doc.data())
    .find(
      (item) =>
        item.studentEmail ===
        studentData?.email
    );

  if (payment) {
    setPaymentStatus(
      payment.paymentStatus
    );
  }

};
    const handlePaymentSubmit = async () => {

  if (!paymentFile) {
    alert("Please upload payment screenshot");
    return;
  }

  try {

    const fileName =
      `${Date.now()}-${paymentFile.name}`;

    const { error } =
      await supabase.storage
        .from("payments")
        .upload(fileName, paymentFile);

    if (error) {
      console.error(error);
      alert("Upload Failed");
      return;
    }

    const { data: publicUrlData } =
      supabase.storage
        .from("payments")
        .getPublicUrl(fileName);

    const paymentScreenshot =
      publicUrlData.publicUrl;

    const studentData =
      JSON.parse(
        localStorage.getItem("studentData")
      );

    await addDoc(
      collection(db, "payments"),
      {
        studentName:
          studentData?.name || "Unknown",

        studentEmail:
          studentData?.email || "Unknown",

        paymentScreenshot,

        paymentStatus: "Pending",

        submittedAt:
          new Date().toLocaleString(),
      }
    );

    alert(
      "Payment proof submitted successfully"
    );

  } catch (error) {

    console.error(error);

    alert(
      "Payment submission failed"
    );

  }

};
  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-lg">

        <h1 className="text-4xl font-bold text-center text-blue-700 mb-8">
          Course Payment
        </h1>
        <div className="mb-8 bg-blue-50 border border-blue-200 p-4 rounded-xl">

  <h2 className="font-bold text-xl mb-2">
    Payment Status
  </h2>

  <p className="text-lg text-blue-700">
    {paymentStatus}
  </p>

</div>

        <div className="mb-10">

          <h2 className="text-2xl font-bold mb-4">
            Pay via UPI
          </h2>

          <div className="bg-gray-100 p-4 rounded-xl">

            <p className="text-lg">
              UPI ID:
            </p>

            <p className="font-bold text-green-700">
              8800531115@ptsbi
            </p>

          </div>

        </div>

        <div>

          <h2 className="text-2xl font-bold mb-4">
            Pay via Razorpay
          </h2>

          <a
            href="https://razorpay.me/@synaptecheducation"
            target="_blank"
            rel="noreferrer"
            className="inline-block bg-blue-700 text-white px-6 py-3 rounded-xl"
          >
            Pay Now
          </a>

        </div>
        <div className="mt-10 border-t pt-8">

  <h2 className="text-2xl font-bold mb-4">
    Upload Payment Screenshot
  </h2>

  <input
    type="file"
    accept=".jpg,.jpeg,.png,.pdf"
    onChange={(e) =>
      setPaymentFile(e.target.files[0])
    }
    className="w-full border p-3 rounded-xl"
  />

  {paymentFile && (
    <>
      <p className="mt-3 text-green-700">
        Selected File: {paymentFile.name}
      </p>
      <button
        onClick={handlePaymentSubmit}
        className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl"
      >
        Submit Payment Proof
      </button>
    </>
  )}

</div>

      </div>

    </div>
  );
}