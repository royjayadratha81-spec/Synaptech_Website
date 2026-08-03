import FinanceKPIs from "../components/finance/FinanceKPIs";
import { useEffect, useState } from "react";

import {
  collection,
  doc,
  updateDoc,
  getDocs,
  deleteField,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";
import { supabase } from "../supabase/supabase";

import Background from "../components/ui/Background";
import GlassCard from "../components/ui/GlassCard";
import KpiCard from "../components/dashboard/KpiCard";
import VerifyPaymentModal from "../components/VerifyPaymentModal";

export default function FinanceDashboard() {
    const [students, setStudents] = useState([]);
    const [filter, setFilter] = useState("all");
    const [expectedRevenue, setExpectedRevenue] = useState(0);

const [revenueCollected, setRevenueCollected] = useState(0);

const [outstandingRevenue, setOutstandingRevenue] = useState(0);

const [receiptsUploaded, setReceiptsUploaded] = useState(0);

const [pendingReceipts, setPendingReceipts] = useState(0);
const [unpaidAdmissions, setUnpaidAdmissions] = useState(0);
const [selectedStudent, setSelectedStudent] = useState(null);
const [showVerifyModal, setShowVerifyModal] = useState(false);
    useEffect(() => {
    fetchStudents();
}, []);

const fetchStudents = async () => {

    const snapshot = await getDocs(
    collection(db, "finance")
);

const financeStudents = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
}));
// Total Expected Revenue
const totalExpectedRevenue = financeStudents.reduce(
    (sum, student) => sum + (student.agreedFee || 0),
    0
);

// Total Revenue Collected
const totalRevenueCollected = financeStudents.reduce(
    (sum, student) => sum + (student.amountPaid || 0),
    0
);

// Outstanding Revenue (only genuine dues)
const totalOutstandingRevenue = financeStudents.reduce(
    (sum, student) => {

        if ((student.balanceAmount || 0) > 0) {
            return sum + (student.balanceAmount || 0);
        }

        return sum;

    },
    0
);

// Receipts Uploaded
const totalReceiptsUploaded = financeStudents.filter(
    student => student.paymentProofUploaded
).length;

// Pending Receipts
const totalPendingReceipts =
    financeStudents.length - totalReceiptsUploaded;
const totalUnpaidAdmissions = financeStudents.filter(
    student => (student.amountPaid || 0) === 0
).length;

// Update State
setExpectedRevenue(totalExpectedRevenue);

setRevenueCollected(totalRevenueCollected);

setOutstandingRevenue(totalOutstandingRevenue);

setReceiptsUploaded(totalReceiptsUploaded);

setPendingReceipts(totalPendingReceipts);

setUnpaidAdmissions(totalUnpaidAdmissions);

setStudents(financeStudents);

};
const handleUploadReceipt = async (student) => {

    const input = document.createElement("input");

    input.type = "file";

    input.accept = ".pdf,.jpg,.jpeg,.png";

    input.onchange = async (e) => {

        const file = e.target.files[0];

        if (!file) return;

        try {

            const fileName =
    `${student.id}_${Date.now()}_${file.name}`;

            const { error } = await supabase.storage
                .from("payments")
                .upload(fileName, file);

            if (error) {
                alert(error.message);
                return;
            }

            const { data } = supabase.storage
                .from("payments")
                .getPublicUrl(fileName);

            await updateDoc(
                doc(db, "finance", student.id),
                {
                    paymentProofUrl: data.publicUrl,
                    paymentProofUploaded: true,
                    paymentProofUploadedAt:
                        new Date().toLocaleString()
                }
            );

            alert("Receipt uploaded successfully.");

            fetchStudents();

        }

        catch (err) {

            console.error(err);

            alert("Upload failed.");

        }

    };

    input.click();

};
const handleVerifyPayment = async (student, data) => {
  

  try {
    const newAmount = Number(data.amountReceived);

const totalPaid =
  Number(student.amountPaid || 0) + newAmount;

const payableAmount =
  Number(student.finalFee ?? (
    Number(student.agreedFee) - Number(student.discount || 0)
  ));

const newBalance = Math.max(0, payableAmount - totalPaid);

const newPaymentStatus =
  newBalance <= 0
    ? "Paid"
    : "Partially Paid";

  // Update Finance document
  await updateDoc(doc(db, "finance", student.id), {

  amountPaid: totalPaid,

  balanceAmount: newBalance,

  paymentStatus: newPaymentStatus,

  verified: true,

  verifiedAt: new Date(),

  verifiedBy: "Finance Admin",

  verificationRemarks: data.remarks || "",

});

const paymentQuery = query(
  collection(db, "payments"),
  where("studentId", "==", student.id)
);

const paymentSnapshot = await getDocs(paymentQuery);

for (const paymentDoc of paymentSnapshot.docs) {

  await updateDoc(doc(db, "payments", paymentDoc.id), {

    paymentStatus: "Verified",

    verified: true,

    verifiedAt: new Date(),

    verifiedBy: "Finance Admin",

    verificationRemarks: data.remarks || "",

    paymentMode: data.paymentMode,

    transactionId: data.transactionId,

  });

}
  // Update Student document
  await updateDoc(doc(db, "students", student.id), {

  status:
    newBalance <= 0
        ? "Active"
        : "Fee Pending",

lmsAccess:
    newBalance <= 0,

paymentStatus:
    newPaymentStatus,

updatedAt:
    new Date(),

});

  // Close the modal
  setShowVerifyModal(false);
  setSelectedStudent(null);

  // Refresh dashboard
  fetchStudents();

  alert("Payment verified successfully.");

} catch (error) {
  console.error(error);
  alert("Verification failed.");
}
};
const filteredStudents = students.filter((student) => {

    switch (filter) {

        case "paid":
    return (student.amountPaid || 0) > 0;

        case "uploaded":
    return student.paymentProofUploaded === true;

case "pendingReceipt":
    return !student.paymentProofUploaded;

        case "outstanding":
    return (student.balanceAmount || 0) > 0;

        case "unpaid":
    return (student.amountPaid || 0) === 0;

        default:
            return true;
    }

});

    return (

        <Background>

            <div className="min-h-screen px-6 lg:px-10 py-8">

                <GlassCard className="w-full max-w-[1800px] mx-auto p-6">

                    <div className="flex justify-between items-center">

                        <div>

                            <h1 className="text-4xl font-bold text-blue-800">

                                Finance Dashboard

                            </h1>

                            <p className="text-gray-600 mt-2">

                                Manage student payments, revenue and finance.

                            </p>
                        <FinanceKPIs
    students={students}
    expectedRevenue={expectedRevenue}
    revenueCollected={revenueCollected}
    outstandingRevenue={outstandingRevenue}
    receiptsUploaded={receiptsUploaded}
    pendingReceipts={pendingReceipts}
    unpaidAdmissions={unpaidAdmissions}
    filter={filter}
    setFilter={setFilter}
/>
<div className="mt-10 overflow-x-auto">

    <table className="w-full border-collapse">

        <thead>

            <tr className="bg-blue-700 text-white">

                <th className="p-3 text-left">
    Student
</th>

<th className="p-3 text-left">
    Course
</th>

<th className="p-3 text-left">
    Batch
</th>

<th className="p-3 text-left">
    Agreed Fee
</th>

<th className="p-3 text-left">
    Amount Received
</th>

<th className="p-3 text-left">
    Balance
</th>

<th className="p-3 text-left">
    Payment Status
</th>
<th className="p-3 text-center">
    Verification
</th>

<th className="p-3 text-center">
    Payment Proof
</th>

<th className="p-3 text-center">
    Action
</th>

            </tr>

        </thead>

        <tbody>

            {
                filteredStudents.map((student) => (

                    <tr
                        key={student.id}
                        className="border-b"
                    >

                        <td className="p-3">
    {student.studentName}
</td>

<td className="p-3">
    {student.course}
</td>

<td className="p-3">
    {student.batch || "-"}
</td>

<td className="p-3 font-semibold">
    ₹{student.agreedFee?.toLocaleString()}
</td>

<td className="p-3 text-green-700 font-semibold">
    ₹{student.amountPaid?.toLocaleString()}
</td>

<td className="p-3 text-red-600 font-semibold">
    ₹{student.balanceAmount?.toLocaleString()}
</td>

<td className="p-3">
    {student.paymentStatus}
</td>
<td className="p-3 text-center">

  {student.verified ? (

    <span className="text-green-600 font-semibold">
      ✅ Verified
    </span>

  ) : (

    <span className="text-orange-600 font-semibold">
      Pending
    </span>

  )}

</td>

<td className="p-3 text-center">

    {student.paymentProofUploaded ? (

        <span className="text-green-600 font-semibold">
            ✅ Uploaded
        </span>

    ) : (

        <span className="text-red-500 font-semibold">
            ❌ Not Uploaded
        </span>

    )}

</td>

<td className="p-3 text-center">

  {student.paymentProofUploaded ? (

    <div className="flex justify-center gap-2">

      <button
        onClick={() => window.open(student.paymentProofUrl, "_blank")}
        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg"
      >
        View
      </button>

      {!student.verified && (
        <button
          onClick={() => {
  setSelectedStudent(student);
  setShowVerifyModal(true);
}}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg"
        >
          Verify
        </button>
      )}

    </div>

  ) : (

    <button
      onClick={() => handleUploadReceipt(student)}
      className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-lg"
    >
      Upload Receipt
    </button>

  )}

</td>

                    </tr>

                ))
            }

        </tbody>

    </table>

</div>

                        </div>

                    </div>

                </GlassCard>

            </div>
            {showVerifyModal && (
  <VerifyPaymentModal
    student={selectedStudent}
    onClose={() => {
      setShowVerifyModal(false);
      setSelectedStudent(null);
    }}
    onConfirm={(remarks) => {
    handleVerifyPayment(selectedStudent, remarks);
}}
  />
)}

        </Background>

    );

}