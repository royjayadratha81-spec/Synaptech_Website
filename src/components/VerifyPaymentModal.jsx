import { useState } from "react";

export default function VerifyPaymentModal({
  student,
  onClose,
  onConfirm,
}) {
  const [remarks, setRemarks] = useState("");

const [amountReceived, setAmountReceived] = useState(
  student.balanceAmount || 0
);

const [paymentMode, setPaymentMode] = useState("UPI");

const [transactionId, setTransactionId] = useState("");

  if (!student) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[650px] p-6">

        <h2 className="text-2xl font-bold text-blue-700 mb-6">
          Verify Payment
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-6">

          <div>
            <label className="text-gray-500 text-sm">
              Student
            </label>

            <div className="font-semibold">
              {student.studentName}
            </div>
          </div>

          <div>
            <label className="text-gray-500 text-sm">
              Course
            </label>

            <div className="font-semibold">
              {student.course}
            </div>
          </div>

          <div>
            <label className="text-gray-500 text-sm">
              Amount Paid
            </label>

            <div className="font-semibold text-green-700">
              ₹{student.amountPaid?.toLocaleString()}
            </div>
          </div>

          <div>
            <label className="text-gray-500 text-sm">
              Balance
            </label>

            <div className="font-semibold text-red-600">
              ₹{student.balanceAmount?.toLocaleString()}
            </div>
          </div>

        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">

  <div>
    <label className="block text-gray-600 mb-2">
      Amount Received Now
    </label>

    <input
      type="number"
      value={amountReceived}
      onChange={(e) => setAmountReceived(Number(e.target.value))}
      className="w-full border rounded-lg p-3"
    />
  </div>

  <div>
    <label className="block text-gray-600 mb-2">
      Payment Mode
    </label>

    <select
      value={paymentMode}
      onChange={(e) => setPaymentMode(e.target.value)}
      className="w-full border rounded-lg p-3"
    >
      <option>UPI</option>
      <option>Bank Transfer</option>
      <option>Cash</option>
      <option>Cheque</option>
      <option>Card</option>
    </select>
  </div>

</div>

<div className="mb-6">

  <label className="block text-gray-600 mb-2">
    Transaction ID
  </label>

  <input
    type="text"
    value={transactionId}
    onChange={(e)=>setTransactionId(e.target.value)}
    className="w-full border rounded-lg p-3"
    placeholder="Transaction ID / UTR / Cheque No"
  />

</div>
        <div className="mb-6">

          <label className="block text-gray-600 mb-2">
            Verification Remarks
          </label>

          <textarea
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full border rounded-lg p-3"
            placeholder="Optional remarks..."
          />

        </div>

        <div className="flex justify-end gap-3">

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
          >
            Cancel
          </button>

          <button
            onClick={() =>
  onConfirm({
    remarks,
    amountReceived,
    paymentMode,
    transactionId,
  })
}
            className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            Verify Payment
          </button>

        </div>

      </div>
    </div>
  );
}