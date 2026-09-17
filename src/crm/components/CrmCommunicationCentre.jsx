import React, { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiMessageCircle,
  FiPhoneCall,
  FiRefreshCw,
  FiShield,
} from "react-icons/fi";
import {
  getCrmCommunications,
  getCrmCommunicationSettings,
  previewCrmCommunication,
  queueCrmCommunication,
  saveCrmCommunicationSettings,
  updateCrmCommunication,
} from "../services/crmApi";

function leadName(lead) {
  return lead?.contact?.full_name || lead?.company?.name || lead?.title || "CRM lead";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

const defaultSettings = {
  timezone: "Asia/Kolkata",
  quiet_hours_start: "20:00",
  quiet_hours_end: "09:00",
  whatsapp_daily_cap: 250,
  ai_call_daily_cap: 100,
  ai_call_monthly_minutes_cap: 3000,
  max_attempts_per_lead: 3,
  whatsapp_enabled: false,
  ai_call_enabled: false,
};

export default function CrmCommunicationCentre({ leads = [], onOpenLead }) {
  const [jobs, setJobs] = useState([]);
  const [summary, setSummary] = useState({});
  const [settings, setSettings] = useState(defaultSettings);
  const [leadId, setLeadId] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const leadById = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads]);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [jobsResult, settingsResult] = await Promise.all([
        getCrmCommunications({ limit: 200 }),
        getCrmCommunicationSettings(),
      ]);
      setJobs(jobsResult?.data || []);
      setSummary(jobsResult?.summary || {});
      setSettings({ ...defaultSettings, ...(settingsResult?.data || {}) });
    } catch (loadError) {
      setError(loadError?.message || "Unable to load the communication centre.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function evaluate() {
    if (!leadId) return setError("Select a lead first.");
    try {
      setBusy(true); setError(""); setMessage("");
      const result = await previewCrmCommunication(leadId, channel);
      setPreview(result);
    } catch (previewError) {
      setPreview(null);
      setError(previewError?.message || "Routing preview failed.");
    } finally { setBusy(false); }
  }

  async function queue() {
    if (!preview?.decision?.allowed) return setError("This channel is not approved by the current routing decision.");
    try {
      setBusy(true); setError(""); setMessage("");
      const result = await queueCrmCommunication(leadId, channel, {
        idempotency_key: `crm-ui-${leadId}-${channel}-${Date.now()}`,
        content_preview: channel === "whatsapp" ? "Approved CRM WhatsApp follow-up" : "Approved CRM AI qualification call",
      });
      setMessage(result?.message || "Communication queued.");
      setPreview(null);
      await load();
    } catch (queueError) {
      setError(queueError?.message || "Communication could not be queued.");
    } finally { setBusy(false); }
  }

  async function saveSettings() {
    try {
      setBusy(true); setError(""); setMessage("");
      const result = await saveCrmCommunicationSettings(settings);
      setSettings({ ...defaultSettings, ...(result?.data || {}) });
      setMessage(result?.message || "Safety controls saved.");
    } catch (saveError) { setError(saveError?.message || "Safety controls could not be saved."); }
    finally { setBusy(false); }
  }

  async function cancel(job) {
    if (!window.confirm("Cancel this queued communication? Lead scoring and pipeline will remain unchanged.")) return;
    try { setBusy(true); setError(""); await updateCrmCommunication(job.id, "cancel"); await load(); }
    catch (cancelError) { setError(cancelError?.message || "Communication could not be cancelled."); }
    finally { setBusy(false); }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-indigo-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">Channel orchestration</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">WhatsApp and AI telecalling</h3>
            <p className="mt-1 text-sm text-slate-500">Provider-neutral queue connected to existing consent and routing evidence.</p>
          </div>
          <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["Open", summary.open || 0, FiClock, "bg-amber-50 text-amber-700"],
            ["WhatsApp", summary.whatsapp || 0, FiMessageCircle, "bg-emerald-50 text-emerald-700"],
            ["AI calls", summary.ai_call || 0, FiPhoneCall, "bg-cyan-50 text-cyan-700"],
            ["Completed", summary.completed || 0, FiCheckCircle, "bg-indigo-50 text-indigo-700"],
            ["Failed", summary.failed || 0, FiAlertCircle, "bg-rose-50 text-rose-700"],
          ].map(([label, value, Icon, tone]) => (
            <div key={label} className={`rounded-2xl p-3 ${tone}`}><div className="flex items-center justify-between text-[11px] font-black uppercase"><span>{label}</span><Icon /></div><p className="mt-2 text-2xl font-black">{value}</p></div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_190px_auto]">
          <select value={leadId} onChange={(event) => { setLeadId(event.target.value); setPreview(null); }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <option value="">Select a lead</option>
            {leads.map((lead) => <option key={lead.id} value={lead.id}>{leadName(lead)} · score {lead.lead_score || 0}</option>)}
          </select>
          <select value={channel} onChange={(event) => { setChannel(event.target.value); setPreview(null); }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <option value="whatsapp">WhatsApp</option><option value="ai_call">AI telecalling</option>
          </select>
          <button type="button" onClick={evaluate} disabled={busy} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">Check routing</button>
        </div>

        {preview && (
          <div className={`mt-4 rounded-2xl border p-4 ${preview.decision?.allowed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-start gap-3"><FiShield className="mt-1 shrink-0" /><div><p className="font-black text-slate-900">{preview.decision?.allowed ? "Approved to queue" : "Channel held safely"}</p><p className="mt-1 text-sm text-slate-700">{preview.decision?.reason}</p><p className="mt-2 text-xs text-slate-600">Score {preview.context?.score ?? "—"} · confidence {preview.context?.confidence ?? "—"}% · Sales Ready {preview.context?.sales_ready ? "Yes" : "No"} · directive {preview.decision?.directive || "—"}</p></div></div>
            {preview.decision?.allowed && <button type="button" onClick={queue} disabled={busy} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">Queue safely</button>}
          </div>
        )}
        {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
        {message && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p>}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black text-slate-950">Safety and cost controls</h3>
        <p className="mt-1 text-sm text-slate-500">Enable a channel only when its provider configuration is ready.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="rounded-xl bg-slate-50 p-3 text-sm font-semibold"><input type="checkbox" checked={settings.whatsapp_enabled} onChange={(e) => setSettings({ ...settings, whatsapp_enabled: e.target.checked })} className="mr-2" />WhatsApp queue enabled</label>
          <label className="rounded-xl bg-slate-50 p-3 text-sm font-semibold"><input type="checkbox" checked={settings.ai_call_enabled} onChange={(e) => setSettings({ ...settings, ai_call_enabled: e.target.checked })} className="mr-2" />AI-call queue enabled</label>
          <label className="text-xs font-bold text-slate-600">Quiet hours start<input type="time" value={String(settings.quiet_hours_start).slice(0,5)} onChange={(e) => setSettings({ ...settings, quiet_hours_start: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-bold text-slate-600">Quiet hours end<input type="time" value={String(settings.quiet_hours_end).slice(0,5)} onChange={(e) => setSettings({ ...settings, quiet_hours_end: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-bold text-slate-600">WhatsApp daily cap<input type="number" min="0" value={settings.whatsapp_daily_cap} onChange={(e) => setSettings({ ...settings, whatsapp_daily_cap: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-bold text-slate-600">AI-call daily cap<input type="number" min="0" value={settings.ai_call_daily_cap} onChange={(e) => setSettings({ ...settings, ai_call_daily_cap: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-bold text-slate-600">Monthly AI minutes<input type="number" min="0" value={settings.ai_call_monthly_minutes_cap} onChange={(e) => setSettings({ ...settings, ai_call_monthly_minutes_cap: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-bold text-slate-600">Maximum attempts<input type="number" min="1" max="20" value={settings.max_attempts_per_lead} onChange={(e) => setSettings({ ...settings, max_attempts_per_lead: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
        </div>
        <button type="button" onClick={saveSettings} disabled={busy} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">Save safety controls</button>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black text-slate-950">Communication register</h3>
        <div className="mt-4 space-y-3">
          {loading ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading communications...</p> : jobs.length ? jobs.map((job) => {
            const lead = leadById.get(job.lead_id);
            const isOpen = ["draft", "queued", "processing"].includes(job.status);
            return <article key={job.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black text-slate-900">{job.channel === "whatsapp" ? "WhatsApp" : "AI telecalling"} · {leadName(lead)}</p><p className="mt-1 text-sm text-slate-600">{job.content_preview || job.job_type} · {job.status}</p><p className="mt-1 text-xs text-slate-500">Scheduled {formatDate(job.scheduled_at)} · attempts {job.attempt_count}/{job.max_attempts}</p></div><div className="flex gap-2">{lead && <button type="button" onClick={() => onOpenLead?.(lead)} className="rounded-xl border bg-white px-3 py-2 text-xs font-bold">Open lead</button>}{isOpen && <button type="button" onClick={() => cancel(job)} disabled={busy} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white">Cancel</button>}</div></div></article>;
          }) : <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center text-sm font-bold text-slate-600">No WhatsApp or AI-call jobs yet</p>}
        </div>
      </div>
    </section>
  );
}
