import React, { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiClipboard, FiKey, FiRefreshCw, FiShield } from "react-icons/fi";
import { getCrmMeteringConnections, provisionCrmMeteringConnection } from "../services/crmApi";

function makeTenantKey(value) {
  return String(value || "tenant")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "tenant";
}

function displayDate(value) {
  if (!value) return "No snapshot received yet";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en-IN");
}

export default function CrmMeteringConnectionPanel({ customerProjectId, customerName }) {
  const [connections, setConnections] = useState([]);
  const [mode, setMode] = useState("shared_saas");
  const [tenantKey, setTenantKey] = useState(makeTenantKey(customerName));
  const [sourceSystem, setSourceSystem] = useState("synaptech_shared_lms");
  const [frequency, setFrequency] = useState("daily");
  const [generatedKey, setGeneratedKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const connection = useMemo(
    () => connections.find((row) => row.customer_project_id === customerProjectId) || null,
    [connections, customerProjectId]
  );

  async function load() {
    if (!customerProjectId) return;
    try {
      setLoading(true);
      setError("");
      const result = await getCrmMeteringConnections();
      setConnections(result?.connections || []);
    } catch (err) {
      setError(err.message || "Unable to load metering connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [customerProjectId]);

  // Reset one-time key state only when the selected customer changes.
  // A connection refresh after provisioning must not erase the newly displayed key.
  useEffect(() => {
    setGeneratedKey("");
    setNotice("");
    setError("");
    setMode("shared_saas");
    setTenantKey(makeTenantKey(customerName));
    setSourceSystem("synaptech_shared_lms");
    setFrequency("daily");
  }, [customerProjectId, customerName]);

  // Hydrate saved connection settings without touching the one-time readable key.
  useEffect(() => {
    if (connection) {
      setMode(connection.deployment_mode || "shared_saas");
      setTenantKey(connection.tenant_key || makeTenantKey(customerName));
      setSourceSystem(connection.source_system || "synaptech_shared_lms");
      setFrequency(connection.expected_frequency || "daily");
    }
  }, [connection?.id, connection?.updated_at, customerName]);

  async function provision() {
    if (!customerProjectId) return;
    const rotating = Boolean(connection);
    if (rotating && !window.confirm("This will invalidate the previous metering API key. Continue?")) return;
    try {
      setBusy(true);
      setError("");
      setNotice("");
      setGeneratedKey("");
      const result = await provisionCrmMeteringConnection({
        customer_project_id: customerProjectId,
        deployment_mode: mode,
        tenant_key: tenantKey,
        source_system: sourceSystem,
        expected_frequency: frequency,
      });
      setGeneratedKey(result?.api_key || "");
      setNotice(rotating ? "Metering key rotated. Copy the new key now." : "Metering connection created. Copy the key now.");
      await load();
    } catch (err) {
      setError(err.message || "Unable to provision metering connection.");
    } finally {
      setBusy(false);
    }
  }

  async function copyKey() {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setNotice("Metering API key copied. Store it only in the tenant server environment.");
    } catch {
      setError("Automatic copy was blocked. Select and copy the key manually.");
    }
  }

  return (
    <div className="rounded-3xl border border-indigo-200 bg-indigo-50/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">Tenant metering</p>
          <h3 className="mt-2 text-lg font-black text-slate-950">Automatic usage connection</h3>
          <p className="mt-2 text-sm text-slate-500">Connect this won customer to daily contract-usage monitoring.</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold">
          <FiRefreshCw className={loading ? "animate-spin" : ""}/> Refresh
        </button>
      </div>

      {connection && (
        <div className="mt-5 grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm md:grid-cols-3">
          <div><p className="text-xs font-black uppercase text-emerald-700">Status</p><p className="mt-1 flex items-center gap-2 font-bold"><FiCheckCircle/> {connection.status}</p></div>
          <div><p className="text-xs font-black uppercase text-emerald-700">Mode</p><p className="mt-1 font-bold">{connection.deployment_mode === "shared_saas" ? "Shared SaaS" : "White label"}</p></div>
          <div><p className="text-xs font-black uppercase text-emerald-700">Last snapshot</p><p className="mt-1 font-bold">{displayDate(connection.last_snapshot_at)}</p></div>
        </div>
      )}

      {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
      {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</div>}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-bold text-slate-600">Deployment mode
          <select value={mode} onChange={(event) => { const next = event.target.value; setMode(next); setSourceSystem(next === "shared_saas" ? "synaptech_shared_lms" : "synaptech_white_label"); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <option value="shared_saas">Shared multi-tenant SaaS</option>
            <option value="white_label">Separate white-label deployment</option>
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">Reporting frequency
          <select value={frequency} onChange={(event) => setFrequency(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <option value="daily">Daily</option>
            <option value="hourly">Hourly</option>
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">Tenant key
          <input value={tenantKey} onChange={(event) => setTenantKey(makeTenantKey(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"/>
        </label>
        <label className="text-xs font-bold text-slate-600">Source system
          <input value={sourceSystem} onChange={(event) => setSourceSystem(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"/>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button disabled={busy || !customerProjectId || !tenantKey} onClick={provision} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
          <FiKey/> {connection ? "Rotate metering key" : "Create metering connection"}
        </button>
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-500"><FiShield/> The readable key is displayed only once.</span>
      </div>

      {generatedKey && (
        <div className="mt-5 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-amber-800">Copy this secret now</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row">
            <input readOnly value={generatedKey} className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white p-3 font-mono text-xs"/>
            <button onClick={copyKey} className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"><FiClipboard/> Copy key</button>
          </div>
          <p className="mt-3 text-xs font-semibold text-amber-800">Do not paste this into React, VITE variables, screenshots or Supabase. It belongs only in the tenant server environment.</p>
        </div>
      )}
    </div>
  );
}
