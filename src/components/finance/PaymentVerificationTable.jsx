import { useEffect, useState } from "react";
import { getPendingPayments } from "../../services/financeService";

export default function PaymentVerificationTable() {

    const [payments, setPayments] = useState([]);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {

    const data = await getPendingPayments();

    setPayments(data);

};

    return (

        <div className="bg-white rounded-xl shadow p-6 mt-8">

            <h2 className="text-2xl font-bold text-blue-700 mb-4">

                Pending Payment Verification

            </h2>

            <div className="overflow-x-auto">

                <table className="w-full border-collapse">

                    <thead>

                        <tr className="bg-blue-700 text-white">

                            <th className="p-3 text-left">Student</th>

                            <th className="p-3 text-left">Amount</th>

                            <th className="p-3 text-left">Mode</th>

                            <th className="p-3 text-left">Transaction ID</th>

                            <th className="p-3 text-center">Receipt</th>

                            <th className="p-3 text-center">Status</th>

                            <th className="p-3 text-center">Action</th>

                        </tr>

                    </thead>

                    <tbody>

                        {payments.map(payment => (

                            <tr
                                key={payment.id}
                                className="border-b"
                            >

                                <td className="p-3">
                                    {payment.studentName}
                                </td>

                                <td className="p-3">
                                    ₹{payment.paymentAmount?.toLocaleString()}
                                </td>

                                <td className="p-3">
                                    {payment.paymentMode}
                                </td>

                                <td className="p-3">
                                    {payment.transactionId}
                                </td>

                                <td className="text-center">

                                    <button
                                        className="bg-green-600 text-white px-3 py-1 rounded-lg"
                                    >
                                        View
                                    </button>

                                </td>

                                <td className="text-center">

                                    <span className="text-orange-600 font-semibold">

                                        Pending

                                    </span>

                                </td>

                                <td className="text-center">

                                    <button
                                        className="bg-blue-600 text-white px-3 py-1 rounded-lg"
                                    >
                                        Verify
                                    </button>

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </div>

    );

}