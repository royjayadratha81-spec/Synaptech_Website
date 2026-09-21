import { useMemo, useState } from "react";

const today = () => new Date().toISOString().slice(0, 10);

export default function PaymentPlanModal({ student, onClose, onSave, saving }) {
  const finalFee = Number(student?.finalFee ?? (Number(student?.agreedFee || 0) - Number(student?.discount || 0)));
  const [planType, setPlanType] = useState(student?.paymentPlanType || student?.paymentPlan || "EMI");
  const [rows, setRows] = useState(
    Array.isArray(student?.installments) && student.installments.length
      ? student.installments.map((item) => ({ ...item }))
      : [{ id: "initial_payment", label: "Initial payment", dueDate: today(), amount: finalFee }]
  );
  const total = useMemo(() => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0), [rows]);
  const update = (index, key, value) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  const add = () => setRows((current) => [...current, { id: `installment_${current.length + 1}`, label: `Instalment ${current.length + 1}`, dueDate: today(), amount: 0 }]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-emerald-100 bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Payment schedule</p><h2 className="mt-1 text-3xl font-black text-slate-900">{student?.studentName}</h2><p className="mt-2 text-base text-slate-600">Final payable: <strong>₹{finalFee.toLocaleString("en-IN")}</strong></p></div>
          <button onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2 text-base font-bold text-slate-700">Close</button>
        </div>
        <label className="mt-7 block text-base font-bold text-slate-700">Payment plan</label>
        <select value={planType} onChange={(event) => setPlanType(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-base"><option>EMI</option><option>Full Payment</option><option>Custom</option></select>
        <div className="mt-6 space-y-3">
          {rows.map((row, index) => (
            <div key={row.id || index} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.2fr_1fr_1fr_auto]">
              <input value={row.label} onChange={(event) => update(index, "label", event.target.value)} className="rounded-xl border border-slate-300 bg-white p-3 text-base" placeholder="Milestone" />
              <input type="date" value={row.dueDate || ""} onChange={(event) => update(index, "dueDate", event.target.value)} className="rounded-xl border border-slate-300 bg-white p-3 text-base" />
              <input type="number" value={row.amount} onChange={(event) => update(index, "amount", event.target.value)} className="rounded-xl border border-slate-300 bg-white p-3 text-base" placeholder="Amount" />
              <button disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="rounded-xl px-3 text-base font-bold text-red-600 disabled:opacity-30">Remove</button>
            </div>
          ))}
        </div>
        <button onClick={add} className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-base font-bold text-emerald-800">+ Add instalment</button>
        <div className={`mt-6 rounded-2xl p-4 text-base font-bold ${total === finalFee ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>Scheduled total: ₹{total.toLocaleString("en-IN")} · Required: ₹{finalFee.toLocaleString("en-IN")}</div>
        <div className="mt-6 flex justify-end gap-3"><button onClick={onClose} className="rounded-xl bg-slate-100 px-5 py-3 text-base font-bold">Cancel</button><button disabled={saving || total !== finalFee} onClick={() => onSave({ planType, installments: rows })} className="rounded-xl bg-emerald-600 px-5 py-3 text-base font-bold text-white disabled:opacity-40">{saving ? "Saving…" : "Save payment plan"}</button></div>
      </div>
    </div>
  );
}
