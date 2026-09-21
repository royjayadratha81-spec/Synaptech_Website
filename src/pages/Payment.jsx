import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { supabase } from "../supabase/supabase";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const showDate = (value) => {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-IN") : "—";
};

export default function Payment() {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [finance, setFinance] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ amount: "", mode: "UPI", reference: "", remarks: "", file: null });

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    if (!user) return undefined;
    const stopStudent = onSnapshot(doc(db, "students", user.uid), (snap) => setStudent(snap.exists() ? { id: snap.id, ...snap.data() } : null));
    const stopFinance = onSnapshot(doc(db, "finance", user.uid), (snap) => { setFinance(snap.exists() ? { id: snap.id, ...snap.data() } : null); setLoading(false); });
    const stopPayments = onSnapshot(query(collection(db, "payments"), where("studentId", "==", user.uid)), (snap) => {
      setPayments(snap.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0)));
    });
    return () => { stopStudent(); stopFinance(); stopPayments(); };
  }, [user]);

  const finalFee = Number(finance?.finalFee ?? (Number(finance?.agreedFee || 0) - Number(finance?.discount || 0)));
  const installments = Array.isArray(finance?.installments) ? finance.installments : [];
  const nextDue = useMemo(() => installments.find((item) => item.status !== "Paid"), [installments]);

  const submit = async () => {
    const amount = Number(form.amount);
    if (!student || !finance) return alert("Finance information is unavailable.");
    if (!form.file) return alert("Please upload the payment receipt.");
    if (!Number.isFinite(amount) || amount <= 0) return alert("Enter a valid amount.");
    if (amount > Number(finance.balanceAmount || 0)) return alert("Payment cannot exceed the outstanding balance.");
    if (!form.reference.trim() && form.mode !== "Cash") return alert("Enter the transaction/reference ID.");
    try {
      setSubmitting(true);
      const fileName = `${user.uid}/${Date.now()}-${form.file.name}`;
      const { error } = await supabase.storage.from("payments").upload(fileName, form.file);
      if (error) throw error;
      const { data } = supabase.storage.from("payments").getPublicUrl(fileName);
      await addDoc(collection(db, "payments"), {
        studentId: user.uid,
        studentName: student.name || null,
        studentEmail: student.email || user.email,
        organizationId: student.organizationId || finance.organizationId || null,
        paymentAmount: amount,
        paymentMode: form.mode,
        transactionId: form.reference.trim() || null,
        remarks: form.remarks.trim() || null,
        paymentScreenshot: data.publicUrl,
        installmentId: nextDue?.id || null,
        paymentStatus: "Pending",
        verified: false,
        submittedAt: new Date(),
      });
      setForm({ amount: "", mode: "UPI", reference: "", remarks: "", file: null });
      alert("Payment proof submitted. Finance verification is pending.");
    } catch (error) {
      console.error(error);
      alert(error.message || "Payment submission failed.");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#f7faf4] p-10 text-lg text-slate-700">Loading payment account…</div>;
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fbfcf7] via-[#f3faef] to-[#fff9dc] px-4 py-8 text-slate-800 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <section className="rounded-[30px] border border-emerald-100 bg-white/90 p-7 shadow-[0_24px_70px_rgba(65,90,50,0.12)] md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Student finance account</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900 md:text-5xl">Payments & EMI status</h1>
          <p className="mt-3 text-lg leading-7 text-slate-600">Live Finance information for {student?.name || user?.email}. Submitted payments appear immediately and remain pending until Finance verifies them.</p>
        </section>
        {!finance ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-lg text-amber-900">Finance account not found.</div> : <>
          <section className="grid gap-4 md:grid-cols-4">
            {[['Final payable', money(finalFee), 'text-slate-900'], ['Amount paid', money(finance.amountPaid), 'text-emerald-700'], ['Balance due', money(finance.balanceAmount), 'text-red-600'], ['Status', finance.paymentStatus || 'Unpaid', 'text-blue-700']].map(([label, value, colour]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${colour}`}>{value}</p></div>)}
          </section>
          <section className="rounded-[26px] border border-emerald-100 bg-white p-6 shadow-sm md:p-8"><h2 className="text-2xl font-black">Payment schedule</h2><p className="mt-1 text-base text-slate-600">{finance.paymentPlanType || finance.paymentPlan || "Schedule not configured"}</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-base"><thead><tr className="border-b bg-emerald-50 text-emerald-900"><th className="p-4">Milestone</th><th className="p-4">Due date</th><th className="p-4">Amount</th><th className="p-4">Paid</th><th className="p-4">Status</th></tr></thead><tbody>{installments.length ? installments.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="p-4 font-bold">{item.label}</td><td className="p-4">{showDate(item.dueDate)}</td><td className="p-4">{money(item.amount)}</td><td className="p-4 text-emerald-700">{money(item.amountPaid)}</td><td className="p-4"><span className={`rounded-full px-3 py-1.5 text-sm font-bold ${item.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : item.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' : 'bg-red-50 text-red-700'}`}>{item.status}</span></td></tr>) : <tr><td colSpan="5" className="p-6 text-slate-500">Finance has not configured the instalment schedule yet.</td></tr>}</tbody></table></div></section>
          {Number(finance.balanceAmount || 0) > 0 && <section className="rounded-[26px] border border-amber-200 bg-[#fffdf4] p-6 shadow-sm md:p-8"><h2 className="text-2xl font-black">Submit a payment receipt</h2><div className="mt-6 grid gap-4 md:grid-cols-2"><label className="text-base font-bold">Amount<input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3.5 text-base" /></label><label className="text-base font-bold">Payment mode<select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3.5 text-base"><option>UPI</option><option>Razorpay</option><option>Bank Transfer</option><option>Cash</option><option>Card</option></select></label><label className="text-base font-bold">Transaction/reference ID<input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3.5 text-base" /></label><label className="text-base font-bold">Receipt<input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-base" /></label></div><label className="mt-4 block text-base font-bold">Remarks<textarea rows="3" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3.5 text-base" /></label><button disabled={submitting} onClick={submit} className="mt-5 rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-black text-white disabled:opacity-50">{submitting ? "Submitting…" : "Submit payment proof"}</button></section>}
          <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm md:p-8"><h2 className="text-2xl font-black">Payment history</h2><div className="mt-5 space-y-3">{payments.length ? payments.map((payment) => <div key={payment.id} className="grid gap-2 rounded-2xl border border-slate-200 p-4 text-base md:grid-cols-4"><strong>{money(payment.paymentAmount)}</strong><span>{payment.paymentMode || "—"}</span><span>{showDate(payment.verifiedAt || payment.submittedAt)}</span><span className={payment.verified ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>{payment.verified ? "Verified" : "Pending verification"}</span></div>) : <p className="text-base text-slate-500">No payment submissions yet.</p>}</div></section>
        </>}
      </div>
    </div>
  );
}
