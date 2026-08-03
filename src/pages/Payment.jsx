import { auth } from "../firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { supabase } from "../supabase/supabase";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";
import { useState, useEffect } from "react";
export default function Payment() {
    const [paymentFile, setPaymentFile] = useState(null);
    const [paymentStatus, setPaymentStatus] =
  useState("Not Submitted");
  const [finance, setFinance] = useState(null);
  const [studentData, setStudentData] = useState(null);

const [loadingFinance, setLoadingFinance] =
  useState(true);
  const [paymentAmount, setPaymentAmount] = useState("");

const [paymentMode, setPaymentMode] = useState("UPI");

const [transactionId, setTransactionId] = useState("");

const [remarks, setRemarks] = useState("");

useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (user) => {

        if (!user) return;

        const studentRef = doc(db, "students", user.uid);

        const studentSnap = await getDoc(studentRef);


        if (studentSnap.exists()) {

    const data = studentSnap.data();

    console.log("Firebase UID:", user.uid);
    console.log("Student Data:", data);

    setStudentData({
        ...data,
      uid: user.uid,
    studentId: user.uid,
    });

}

    });

    return () => unsubscribe();

}, []);

  useEffect(() => {

    if (!studentData) return;

    fetchPaymentStatus();
    fetchFinance();

}, [studentData]);

const fetchPaymentStatus = async () => {
  if (!studentData) return;


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
const fetchFinance = async () => {
  try {



    if (!studentData?.studentId) {
      setLoadingFinance(false);
      return;
    }
console.log("studentData =", studentData);
console.log("studentData.studentId =", studentData?.studentId);
console.log("studentData.uid =", studentData?.uid);
    const financeRef = doc(
      db,
      "finance",
      studentData.studentId
    );

    const financeSnap = await getDoc(financeRef);
    console.log("Finance Exists =", financeSnap.exists());
    console.log("Finance Exists =", financeSnap.exists());

    if (financeSnap.exists()) {
      setFinance(financeSnap.data());
    } 

    setLoadingFinance(false);

  } catch (error) {

    console.error(error);

    setLoadingFinance(false);

  }
};
    const handlePaymentSubmit = async () => {
      if (!studentData) {
        alert("Student information not loaded.");
        return;
      }

  if (!paymentFile) {
    alert("Please upload payment screenshot");
    return;
  }
  // Validate Amount
  if (!paymentAmount) {
    alert("Please enter the payment amount.");
    return;
  }

  if (Number(paymentAmount) <= 0) {
    alert("Payment amount must be greater than zero.");
    return;
  }

  if (Number(paymentAmount) > finance.balanceAmount) {
    alert("Payment amount cannot exceed the outstanding balance.");
    return;
  }

  // Validate Transaction ID
  if (!transactionId.trim()) {
    alert("Please enter the transaction ID.");
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

    await addDoc(
      collection(db, "payments"),
  {
    studentId: studentData.studentId,

    studentName: studentData.name,

    studentEmail: studentData.email,

    paymentAmount: Number(paymentAmount),

    paymentMode: paymentMode,

    transactionId: transactionId,

    paymentScreenshot: paymentScreenshot,

    remarks: remarks,

    paymentStatus: "Pending",

    verified: false,

    verifiedBy: "",

    verifiedAt: null,

    verificationRemarks: "",

    submittedAt: new Date(),

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
        <div className="mb-8 bg-blue-50 border border-blue-200 p-6 rounded-xl">

  <h2 className="font-bold text-2xl text-blue-700 mb-5">
    Finance Summary
  </h2>

  {loadingFinance ? (

    <p>Loading finance details...</p>

  ) : finance ? (

    <div className="grid grid-cols-2 gap-5">

  <div>
    <p className="text-gray-500">Course Fee</p>
    <p className="font-bold text-lg">
      ₹{finance.agreedFee?.toLocaleString()}
    </p>
  </div>

  <div>
    <p className="text-gray-500">Scholarship / Discount</p>
    <p className="font-bold text-lg text-green-700">
      ₹{finance.discount?.toLocaleString()}
    </p>
  </div>

  <div>
    <p className="text-gray-500">Final Payable</p>
    <p className="font-bold text-lg">
      ₹{finance.finalFee?.toLocaleString()}
    </p>
  </div>

  <div>
    <p className="text-gray-500">Payment Plan</p>
    <p className="font-bold text-lg">
      {finance.paymentPlan}
    </p>
  </div>

  <div>
    <p className="text-gray-500">Amount Paid</p>
    <p className="font-bold text-lg text-green-700">
      ₹{finance.amountPaid?.toLocaleString()}
    </p>
  </div>

  <div>
    <p className="text-gray-500">Balance Due</p>
    <p className="font-bold text-lg text-red-600">
      ₹{finance.balanceAmount?.toLocaleString()}
    </p>
  </div>

  <div>
    <p className="text-gray-500">Payment Status</p>
    <p className="font-bold text-blue-700">
      {finance.paymentStatus}
    </p>
  </div>

</div>

  ) : (

    <p className="text-red-600">
      Finance record not found.
    </p>

  )}

</div>

        {finance?.balanceAmount > 0 && (
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
)}

{finance?.balanceAmount > 0 && (
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
)}
        {finance?.balanceAmount > 0 && (
<div className="mt-10 border-t pt-8">

  <h2 className="text-2xl font-bold mb-6">
  Submit Payment
</h2>

{/* Amount */}
<div className="mb-4">
  <label className="block mb-2 font-semibold">
    Amount Paying Today
  </label>

  <input
    type="number"
    value={paymentAmount}
    onChange={(e) => setPaymentAmount(e.target.value)}
    className="w-full border rounded-xl p-3"
    placeholder="Enter amount"
  />
</div>

{/* Payment Mode */}
<div className="mb-4">
  <label className="block mb-2 font-semibold">
    Payment Mode
  </label>

  <select
    value={paymentMode}
    onChange={(e) => setPaymentMode(e.target.value)}
    className="w-full border rounded-xl p-3"
  >
    <option>UPI</option>
    <option>Razorpay</option>
    <option>Bank Transfer</option>
    <option>Cash</option>
  </select>
</div>

{/* Transaction ID */}
<div className="mb-4">
  <label className="block mb-2 font-semibold">
    Transaction ID
  </label>

  <input
    type="text"
    value={transactionId}
    onChange={(e) => setTransactionId(e.target.value)}
    className="w-full border rounded-xl p-3"
    placeholder="Enter transaction/reference ID"
  />
</div>

{/* Remarks */}
<div className="mb-4">
  <label className="block mb-2 font-semibold">
    Remarks (Optional)
  </label>

  <textarea
    value={remarks}
    onChange={(e) => setRemarks(e.target.value)}
    className="w-full border rounded-xl p-3"
    rows={3}
    placeholder="First EMI, Balance Payment, etc."
  />
</div>

{/* Upload Receipt */}
<div className="mb-4">
  <label className="block mb-2 font-semibold">
    Upload Payment Receipt
  </label>

  <input
    type="file"
    accept=".jpg,.jpeg,.png,.pdf"
    onChange={(e) => setPaymentFile(e.target.files[0])}
    className="w-full border rounded-xl p-3"
  />
</div>

{paymentFile && (
  <p className="text-green-700 mb-4">
    Selected File: {paymentFile.name}
  </p>
)}

<button
  onClick={handlePaymentSubmit}
  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl"
>
  Submit Payment
</button>

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
)}
{finance?.balanceAmount === 0 && (
  <div className="mt-8 bg-green-50 border border-green-300 rounded-xl p-6">
    <h2 className="text-2xl font-bold text-green-700 mb-3">
      ✅ Payment Completed
    </h2>

    <p className="text-lg text-green-700">
      Your course fee has been paid in full.
    </p>

    <p className="text-gray-600 mt-2">
      No further payment is required.
    </p>
  </div>
)}


      </div>

    </div>
  );
}