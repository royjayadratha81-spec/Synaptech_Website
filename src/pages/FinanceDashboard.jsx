import FinanceKPIs from "../components/finance/FinanceKPIs";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { supabase } from "../supabase/supabase";
import Background from "../components/ui/Background";
import GlassCard from "../components/ui/GlassCard";
import VerifyPaymentModal from "../components/VerifyPaymentModal";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { FaArrowLeft, FaDownload, FaReceipt, FaShieldAlt, FaWallet, FaChartLine } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function FinanceDashboard() {
  const navigate = useNavigate();
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
    const snapshot = await getDocs(collection(db, "finance"));
    const financeStudents = snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    }));

    const totalExpectedRevenue = financeStudents.reduce(
      (sum, student) => sum + (student.agreedFee || 0),
      0
    );
    const totalRevenueCollected = financeStudents.reduce(
      (sum, student) => sum + (student.amountPaid || 0),
      0
    );
    const totalOutstandingRevenue = financeStudents.reduce(
      (sum, student) => {
        if ((student.balanceAmount || 0) > 0) {
          return sum + (student.balanceAmount || 0);
        }
        return sum;
      },
      0
    );
    const totalReceiptsUploaded = financeStudents.filter(
      (student) => student.paymentProofUploaded
    ).length;
    const totalPendingReceipts =
      financeStudents.length - totalReceiptsUploaded;
    const totalUnpaidAdmissions = financeStudents.filter(
      (student) => (student.amountPaid || 0) === 0
    ).length;

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
        const fileName = `${student.id}_${Date.now()}_${file.name}`;
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
        await updateDoc(doc(db, "finance", student.id), {
          paymentProofUrl: data.publicUrl,
          paymentProofUploaded: true,
          paymentProofUploadedAt: new Date().toLocaleString(),
        });
        alert("Receipt uploaded successfully.");
        fetchStudents();
      } catch (err) {
        console.error(err);
        alert("Upload failed.");
      }
    };
    input.click();
  };

  const handleVerifyPayment = async (student, data) => {
    try {
      const newAmount = Number(data.amountReceived);
      const totalPaid = Number(student.amountPaid || 0) + newAmount;
      const payableAmount = Number(
        student.finalFee ?? (
          Number(student.agreedFee) - Number(student.discount || 0)
        )
      );
      const newBalance = Math.max(0, payableAmount - totalPaid);
      const newPaymentStatus =
        newBalance <= 0 ? "Paid" : "Partially Paid";

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

      await updateDoc(doc(db, "students", student.id), {
        status: newBalance <= 0 ? "Active" : "Fee Pending",
        lmsAccess: newBalance <= 0,
        paymentStatus: newPaymentStatus,
        updatedAt: new Date(),
      });

      setShowVerifyModal(false);
      setSelectedStudent(null);
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

  const statusData = useMemo(
    () => [
      { name: "Paid", value: students.filter((s) => s.paymentStatus === "Paid").length },
      { name: "Partially Paid", value: students.filter((s) => s.paymentStatus === "Partially Paid").length },
      { name: "Unpaid", value: students.filter((s) => (s.amountPaid || 0) === 0).length },
    ].filter((item) => item.value > 0),
    [students]
  );

  const courseRevenue = useMemo(() => {
    const map = {};
    students.forEach((student) => {
      const key = student.course || "Unassigned";
      map[key] = (map[key] || 0) + Number(student.amountPaid || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name: name.length > 16 ? `${name.slice(0, 16)}…` : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [students]);

  const collectionRate = expectedRevenue
    ? Math.round((revenueCollected / expectedRevenue) * 100)
    : 0;

  return (
    <Background>
      <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-[1800px] space-y-6">
          <div className="relative overflow-hidden rounded-[30px] bg-slate-950 px-6 py-7 text-white shadow-[0_25px_80px_rgba(15,23,42,0.20)] md:px-9">
            <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="absolute bottom-[-100px] left-1/3 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <button onClick={() => navigate("/admin")} className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/15">
                  <FaArrowLeft /> Admin Console
                </button>
                <button onClick={() => navigate("/mis-report")} className="ml-2 mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-400/20">
                  <FaChartLine /> Daily MIS
                </button>
                <div className="flex items-center gap-2 text-emerald-300">
                  <FaWallet />
                  <span className="text-[10px] font-black tracking-[0.24em]">FINANCE COMMAND CENTRE</span>
                </div>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] md:text-5xl">Revenue, payments & verification</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  Premium finance workspace powered by the same existing <code className="text-emerald-300">finance</code>, <code className="text-emerald-300">payments</code> and <code className="text-emerald-300">students</code> collections.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Collection rate</p>
                  <p className="mt-1 text-2xl font-black text-emerald-300">{collectionRate}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Accounts</p>
                  <p className="mt-1 text-2xl font-black">{students.length}</p>
                </div>
                <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:col-span-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending proofs</p>
                  <p className="mt-1 text-2xl font-black text-amber-300">{pendingReceipts}</p>
                </div>
              </div>
            </div>
          </div>

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

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <GlassCard className="p-6 md:p-7">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-[0.2em] text-blue-600">REVENUE PERFORMANCE</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">Expected vs collected vs outstanding</h2>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><FaWallet /></div>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "Expected", value: expectedRevenue },
                    { name: "Collected", value: revenueCollected },
                    { name: "Outstanding", value: outstandingRevenue },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} width={75} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Amount"]} />
                    <Bar dataKey="value" fill="#2563eb" radius={[9, 9, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard className="p-6 md:p-7">
              <div className="mb-3">
                <p className="text-[10px] font-black tracking-[0.2em] text-emerald-600">PAYMENT HEALTH</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Account status</h2>
              </div>
              <div className="h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={4}>
                      {statusData.map((_, index) => <Cell key={index} fill={["#10b981", "#f59e0b", "#ef4444"][index % 3]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {statusData.map((item) => (
                  <div key={item.name} className="rounded-xl bg-slate-50 p-2">
                    <p className="text-lg font-black text-slate-800">{item.value}</p>
                    <p className="text-[9px] font-bold uppercase text-slate-400">{item.name}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {courseRevenue.length > 0 && (
            <GlassCard className="p-6 md:p-7">
              <div className="mb-5">
                <p className="text-[10px] font-black tracking-[0.2em] text-violet-600">COURSE REVENUE</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Collected revenue by course</h2>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courseRevenue} layout="vertical" margin={{ left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                    <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Collected"]} />
                    <Bar dataKey="value" fill="#7c3aed" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}

          <GlassCard className="overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between md:p-7">
              <div>
                <p className="text-[10px] font-black tracking-[0.2em] text-slate-500">PAYMENT LEDGER</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Student finance accounts</h2>
                <p className="mt-1 text-sm text-slate-500">Click a KPI above to filter this existing ledger.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
                <FaShieldAlt /> Existing verification workflow preserved
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-left text-[11px] uppercase tracking-wider text-slate-300">
                    <th className="p-4">Student</th>
                    <th className="p-4">Course</th>
                    <th className="p-4">Batch</th>
                    <th className="p-4">Agreed Fee</th>
                    <th className="p-4">Received</th>
                    <th className="p-4">Balance</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Verification</th>
                    <th className="p-4 text-center">Proof</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b border-slate-100 bg-white transition hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-800">{student.studentName}</td>
                      <td className="p-4 text-sm text-slate-600">{student.course}</td>
                      <td className="p-4 text-sm text-slate-600">{student.batch || "-"}</td>
                      <td className="p-4 font-semibold">₹{student.agreedFee?.toLocaleString()}</td>
                      <td className="p-4 font-semibold text-emerald-700">₹{student.amountPaid?.toLocaleString()}</td>
                      <td className="p-4 font-semibold text-red-600">₹{student.balanceAmount?.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black ${student.paymentStatus === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {student.paymentStatus || "Pending"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {student.verified ? <span className="font-bold text-emerald-600">✓ Verified</span> : <span className="font-bold text-amber-600">Pending</span>}
                      </td>
                      <td className="p-4 text-center">
                        {student.paymentProofUploaded ? <span className="font-bold text-emerald-600">✓ Uploaded</span> : <span className="font-bold text-red-500">Not uploaded</span>}
                      </td>
                      <td className="p-4 text-center">
                        {student.paymentProofUploaded ? (
                          <div className="flex justify-center gap-2">
                            <button onClick={() => window.open(student.paymentProofUrl, "_blank")} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"><FaReceipt className="inline mr-1" /> View</button>
                            {!student.verified && (
                              <button onClick={() => { setSelectedStudent(student); setShowVerifyModal(true); }} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Verify</button>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => handleUploadReceipt(student)} className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100"><FaDownload className="inline mr-1" /> Upload</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr><td colSpan="10" className="p-12 text-center text-sm text-slate-500">No finance records match this filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>

      {showVerifyModal && (
        <VerifyPaymentModal
          student={selectedStudent}
          onClose={() => {
            setShowVerifyModal(false);
            setSelectedStudent(null);
          }}
          onConfirm={(remarks) => handleVerifyPayment(selectedStudent, remarks)}
        />
      )}
    </Background>
  );
}
