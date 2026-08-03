import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function AdmissionModal({
    student,
    open,
    onClose,
    onSave,
}) {
    if (!open || !student) return null;

    const [form, setForm] = useState({
        course: student.course || "",
        batchId: "",
        batchName: "",
        agreedFee: "",
        discount: 0,
        paymentPlan: "One Time",
        initialDeposit: 0,
        joiningDate: "",
        remarks: "",
    });
    const [batches, setBatches] = useState([]);
    useEffect(() => {

    const fetchBatches = async () => {

        const snapshot = await getDocs(
            collection(db, "batches")
        );

        const batchList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        setBatches(batchList);

    };

    fetchBatches();

}, []);

    const finalFee =
        Number(form.agreedFee || 0) -
        Number(form.discount || 0);

    const balance =
        finalFee -
        Number(form.initialDeposit || 0);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-8">

                <h2 className="text-3xl font-bold mb-6">
                    Complete Admission
                </h2>

                <div className="grid grid-cols-2 gap-5">

                    <input
                        value={student.name}
                        disabled
                        className="border p-3 rounded-lg bg-gray-100"
                    />

                    <input
                        value={student.email}
                        disabled
                        className="border p-3 rounded-lg bg-gray-100"
                    />

                    <input
                        name="course"
                        value={form.course}
                        onChange={handleChange}
                        placeholder="Course"
                        className="border p-3 rounded-lg"
                    />

                    <select
    name="batchId"
    value={form.batchId}
    onChange={(e) => {

        const selectedBatch = batches.find(
            batch => batch.id === e.target.value
        );

        setForm({
            ...form,
            batchId: selectedBatch?.id || "",
            batchName: selectedBatch?.batchName || "",
        });

    }}
    className="border p-3 rounded-lg"
>

    <option value="">
        Select Batch
    </option>

    {batches.map((batch) => (

        <option
            key={batch.id}
            value={batch.id}
        >
            {batch.batchName}
        </option>

    ))}

</select>

                    <input
                        name="agreedFee"
                        type="number"
                        value={form.agreedFee}
                        onChange={handleChange}
                        placeholder="Agreed Fee"
                        className="border p-3 rounded-lg"
                    />

                    <input
                        name="discount"
                        type="number"
                        value={form.discount}
                        onChange={handleChange}
                        placeholder="Discount"
                        className="border p-3 rounded-lg"
                    />

                    <input
                        value={finalFee}
                        disabled
                        className="border p-3 rounded-lg bg-green-50"
                    />

                    <input
                        name="initialDeposit"
                        type="number"
                        value={form.initialDeposit}
                        onChange={handleChange}
                        placeholder="Initial Deposit"
                        className="border p-3 rounded-lg"
                    />

                    <input
                        value={balance}
                        disabled
                        className="border p-3 rounded-lg bg-blue-50"
                    />

                    <select
                        name="paymentPlan"
                        value={form.paymentPlan}
                        onChange={handleChange}
                        className="border p-3 rounded-lg"
                    >
                        <option>One Time</option>
                        <option>3 EMI</option>
                        <option>6 EMI</option>
                    </select>

                    <input
                        type="date"
                        name="joiningDate"
                        value={form.joiningDate}
                        onChange={handleChange}
                        className="border p-3 rounded-lg"
                    />

                    <textarea
                        name="remarks"
                        value={form.remarks}
                        onChange={handleChange}
                        placeholder="Counsellor Remarks"
                        className="border p-3 rounded-lg col-span-2"
                        rows={4}
                    />

                </div>

                <div className="flex justify-end gap-3 mt-8">

                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-lg bg-gray-400 text-white"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={() =>
                            onSave({
                                ...form,
                                finalFee,
                                balance,
                            })
                        }
                        className="px-6 py-3 rounded-lg bg-blue-600 text-white"
                    >
                        Confirm Admission
                    </button>

                </div>

            </div>

        </div>
    );
}