import React, { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiCheckCircle, FiDollarSign, FiRefreshCw, FiUsers } from "react-icons/fi";
import { getCrmPostSale, updateCrmPostSale } from "../services/crmApi";
import CrmMeteringConnectionPanel from "./CrmMeteringConnectionPanel";

const STAGES = [
  "work_order_received", "advance_pending", "advance_received", "implementation_planned",
  "implementation_started", "configuration", "data_migration", "integration", "training",
  "uat", "handover_completed", "live", "active_subscription", "renewal_due", "suspended", "churned",
];

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
const label = (value) => String(value || "—").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function CrmCustomerSuccessPanel() {
  const [data, setData] = useState({ customers: [], contracts: [], usage: [], alerts: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [projectForm, setProjectForm] = useState({});
  const [paymentForm, setPaymentForm] = useState({ milestone: "Advance", amount_due: "", amount_received: "", payment_status: "pending" });
  const [contractForm, setContractForm] = useState({ plan_name: "CRM + AI Funnel", contract_start_date: "", contracted_students: "", contracted_staff_users: "", monthly_lead_limit: "", monthly_whatsapp_limit: "", monthly_ai_call_minutes: "", storage_limit_gb: "", overage_policy: "alert_only" });
  const [usageForm, setUsageForm] = useState({ usage_date: new Date().toISOString().slice(0, 10), active_students: "", active_staff_users: "", leads_created: "", whatsapp_messages: "", whatsapp_conversations: "", ai_call_minutes: "", ai_qualification_runs: "", storage_used_gb: "", api_requests: "" });

  async function load() {
    try {
      setError("");
      setLoading(true);
      const result = await getCrmPostSale();
      const next = result?.data || { customers: [], contracts: [], usage: [], alerts: [] };
      setData(next);
      if (!selectedId && next.customers?.[0]?.work_order?.id) setSelectedId(next.customers[0].work_order.id);
    } catch (err) {
      setError(err.message || "Unable to load customer-success data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const selected = useMemo(() => data.customers.find((row) => row.work_order.id === selectedId) || null, [data.customers, selectedId]);
  const contract = useMemo(() => data.contracts.find((row) => row.customer_project_id === selected?.project?.id) || null, [data.contracts, selected]);
  const latestUsage = useMemo(() => data.usage.find((row) => row.customer_project_id === selected?.project?.id) || null, [data.usage, selected]);

  useEffect(() => {
    if (!selected) return;
    setProjectForm({
      lifecycle_stage: selected.project?.lifecycle_stage || "work_order_received",
      implementation_percent: selected.project?.implementation_percent ?? 0,
      planned_start_date: selected.project?.planned_start_date || "",
      target_go_live_date: selected.project?.target_go_live_date || "",
      actual_go_live_date: selected.project?.actual_go_live_date || "",
      handover_date: selected.project?.handover_date || "",
      notes: selected.project?.notes || "",
    });
  }, [selectedId, selected?.project?.updated_at]);

  useEffect(() => {
    if (!selected) return;
    setContractForm({
      plan_name: contract?.plan_name || "CRM + AI Funnel",
      contract_start_date: contract?.contract_start_date || selected.work_order.work_order_date || "",
      contract_end_date: contract?.contract_end_date || "",
      contracted_students: contract?.contracted_students ?? "",
      contracted_staff_users: contract?.contracted_staff_users ?? "",
      monthly_lead_limit: contract?.monthly_lead_limit ?? "",
      monthly_whatsapp_limit: contract?.monthly_whatsapp_limit ?? "",
      monthly_ai_call_minutes: contract?.monthly_ai_call_minutes ?? "",
      storage_limit_gb: contract?.storage_limit_gb ?? "",
      overage_policy: contract?.overage_policy || "alert_only",
      status: contract?.status || "active",
    });
  }, [selectedId, contract?.updated_at]);

  async function save(action, payload, message) {
    try {
      setBusy(true); setError(""); setNotice("");
      await updateCrmPostSale(action, payload);
      setNotice(message);
      await load();
    } catch (err) {
      setError(err.message || "Update failed.");
    } finally { setBusy(false); }
  }

  const totalWon = data.customers.length;
  const totalRevenue = data.customers.reduce((sum, row) => sum + Number(row.work_order.final_value || 0), 0);
  const received = data.customers.reduce((sum, row) => sum + Number(row.payment_summary.amount_received || 0), 0);
  const openAlerts = data.alerts.filter((row) => row.status === "open").length;

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Post-sale operations</p><h2 className="mt-2 text-2xl font-black text-slate-950">Customers, delivery and usage</h2><p className="mt-2 text-sm text-slate-500">Live records from work orders, payments, customer projects, contracts and usage tables.</p></div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"><FiRefreshCw className={loading ? "animate-spin" : ""}/> Refresh</button>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        {[[FiUsers,"Won customers",totalWon],[FiDollarSign,"Won revenue",money(totalRevenue)],[FiCheckCircle,"Payments received",money(received)],[FiAlertTriangle,"Open usage alerts",openAlerts]].map(([Icon,title,value]) => <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="text-cyan-600"/><p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">{title}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}</p></div>)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-5"><h3 className="font-black">Customer register</h3></div>
          {data.customers.map((row) => <button key={row.work_order.id} onClick={() => setSelectedId(row.work_order.id)} className={`w-full border-b border-slate-100 p-5 text-left ${selectedId === row.work_order.id ? "bg-cyan-50" : "hover:bg-slate-50"}`}><p className="font-black text-slate-900">{row.lead?.company?.name || row.lead?.contact?.full_name || "Won customer"}</p><p className="mt-1 text-xs text-slate-500">{row.work_order.work_order_number} · {money(row.work_order.final_value)}</p><span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{label(row.project?.lifecycle_stage)}</span></button>)}
          {!loading && !data.customers.length && <p className="p-6 text-sm text-slate-500">No won customers found.</p>}
        </div>

        {selected && <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h3 className="text-xl font-black">Implementation and go-live</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <select value={projectForm.lifecycle_stage || ""} onChange={(e)=>setProjectForm({...projectForm,lifecycle_stage:e.target.value})} className="rounded-xl border border-slate-200 p-3">{STAGES.map((stage)=><option key={stage} value={stage}>{label(stage)}</option>)}</select>
              <input type="number" min="0" max="100" value={projectForm.implementation_percent ?? 0} onChange={(e)=>setProjectForm({...projectForm,implementation_percent:e.target.value})} placeholder="Implementation %" className="rounded-xl border border-slate-200 p-3"/>
              <label className="text-xs font-bold text-slate-500">Planned start<input type="date" value={projectForm.planned_start_date || ""} onChange={(e)=>setProjectForm({...projectForm,planned_start_date:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/></label>
              <label className="text-xs font-bold text-slate-500">Target go-live<input type="date" value={projectForm.target_go_live_date || ""} onChange={(e)=>setProjectForm({...projectForm,target_go_live_date:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/></label>
              <label className="text-xs font-bold text-slate-500">Actual go-live<input type="date" value={projectForm.actual_go_live_date || ""} onChange={(e)=>setProjectForm({...projectForm,actual_go_live_date:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/></label>
              <label className="text-xs font-bold text-slate-500">Handover date<input type="date" value={projectForm.handover_date || ""} onChange={(e)=>setProjectForm({...projectForm,handover_date:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/></label>
            </div>
            <textarea value={projectForm.notes || ""} onChange={(e)=>setProjectForm({...projectForm,notes:e.target.value})} placeholder="Implementation notes" className="mt-4 min-h-24 w-full rounded-xl border border-slate-200 p-3"/>
            <button disabled={busy} onClick={()=>save("update_project",{project_id:selected.project.id,...projectForm},"Customer lifecycle updated.")} className="mt-4 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50">Save lifecycle</button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6"><h3 className="text-lg font-black">Record payment milestone</h3><div className="mt-4 space-y-3"><input value={paymentForm.milestone} onChange={(e)=>setPaymentForm({...paymentForm,milestone:e.target.value})} placeholder="Milestone" className="w-full rounded-xl border p-3"/><input type="number" value={paymentForm.amount_due} onChange={(e)=>setPaymentForm({...paymentForm,amount_due:e.target.value})} placeholder="Amount due" className="w-full rounded-xl border p-3"/><input type="number" value={paymentForm.amount_received} onChange={(e)=>setPaymentForm({...paymentForm,amount_received:e.target.value})} placeholder="Amount received" className="w-full rounded-xl border p-3"/><select value={paymentForm.payment_status} onChange={(e)=>setPaymentForm({...paymentForm,payment_status:e.target.value})} className="w-full rounded-xl border p-3">{["pending","partial","paid","overdue","cancelled","refunded"].map((item)=><option key={item}>{item}</option>)}</select><button disabled={busy} onClick={()=>save("record_payment",{work_order_id:selected.work_order.id,...paymentForm},"Payment milestone saved.")} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white">Save payment</button></div></div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6"><h3 className="text-lg font-black">SaaS contract limits</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><input value={contractForm.plan_name} onChange={(e)=>setContractForm({...contractForm,plan_name:e.target.value})} placeholder="Plan" className="rounded-xl border p-3"/><input type="date" value={contractForm.contract_start_date} onChange={(e)=>setContractForm({...contractForm,contract_start_date:e.target.value})} className="rounded-xl border p-3"/><input type="number" value={contractForm.contracted_students} onChange={(e)=>setContractForm({...contractForm,contracted_students:e.target.value})} placeholder="Student limit" className="rounded-xl border p-3"/><input type="number" value={contractForm.contracted_staff_users} onChange={(e)=>setContractForm({...contractForm,contracted_staff_users:e.target.value})} placeholder="Staff limit" className="rounded-xl border p-3"/><input type="number" value={contractForm.monthly_lead_limit} onChange={(e)=>setContractForm({...contractForm,monthly_lead_limit:e.target.value})} placeholder="Monthly leads" className="rounded-xl border p-3"/><input type="number" value={contractForm.monthly_whatsapp_limit} onChange={(e)=>setContractForm({...contractForm,monthly_whatsapp_limit:e.target.value})} placeholder="WhatsApp limit" className="rounded-xl border p-3"/><input type="number" value={contractForm.monthly_ai_call_minutes} onChange={(e)=>setContractForm({...contractForm,monthly_ai_call_minutes:e.target.value})} placeholder="AI-call minutes" className="rounded-xl border p-3"/><input type="number" value={contractForm.storage_limit_gb} onChange={(e)=>setContractForm({...contractForm,storage_limit_gb:e.target.value})} placeholder="Storage GB" className="rounded-xl border p-3"/></div><button disabled={busy} onClick={()=>save("upsert_contract",{customer_project_id:selected.project.id,...contractForm},"Contract limits saved.")} className="mt-4 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white">Save contract</button>{latestUsage && <p className="mt-4 text-xs text-slate-500">Latest usage: {latestUsage.active_students} students · {latestUsage.leads_created} leads · {latestUsage.ai_call_minutes} AI-call minutes.</p>}</div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-black">Record customer usage snapshot</h3>
            <p className="mt-2 text-sm text-slate-500">Manual testing entry now; later this will be populated automatically from each tenant.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <input type="date" value={usageForm.usage_date} onChange={(e)=>setUsageForm({...usageForm,usage_date:e.target.value})} className="rounded-xl border p-3"/>
              {[["active_students","Active students"],["active_staff_users","Active staff"],["leads_created","Leads today"],["whatsapp_messages","WhatsApp messages"],["whatsapp_conversations","WhatsApp conversations"],["ai_call_minutes","AI-call minutes"],["ai_qualification_runs","AI qualifications"],["storage_used_gb","Storage GB"],["api_requests","API requests"]].map(([key,placeholder])=><input key={key} type="number" min="0" value={usageForm[key]} onChange={(e)=>setUsageForm({...usageForm,[key]:e.target.value})} placeholder={placeholder} className="rounded-xl border p-3"/>)}
            </div>
            <button disabled={busy || !contract} onClick={()=>save("record_usage",{customer_project_id:selected.project.id,...usageForm},"Usage snapshot saved and limits evaluated.")} className="mt-4 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">Save usage and evaluate alerts</button>
            {!contract && <p className="mt-2 text-xs font-semibold text-amber-600">Save the customer contract limits before recording usage.</p>}
          </div>

          <CrmMeteringConnectionPanel
            customerProjectId={selected.project?.id}
            customerName={selected.lead?.company?.name || selected.lead?.contact?.full_name || "Won customer"}
          />

          {data.alerts.filter((row)=>row.customer_project_id===selected.project?.id && row.status==="open").length > 0 && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6"><h3 className="font-black text-rose-800">Active usage red flags</h3><div className="mt-4 space-y-2">{data.alerts.filter((row)=>row.customer_project_id===selected.project?.id && row.status==="open").map((row)=><div key={row.id} className="rounded-xl bg-white p-4 text-sm"><span className="font-black text-rose-700">{label(row.metric_key)}: {Number(row.usage_percent || 0).toFixed(0)}%</span><span className="ml-2 text-slate-500">({row.observed_value} used / {row.contracted_value} contracted)</span></div>)}</div></div>}
        </div>}
      </div>
    </section>
  );
}
