import React, { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiPhone,
  FiRefreshCw,
} from "react-icons/fi";
import { getCrmFollowUps, updateCrmFollowUp } from "../services/crmApi";

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function taskBucket(task, now = new Date()) {
  const status = String(task?.status || "").toLowerCase();
  if (status === "completed") return "completed";
  if (["cancelled", "failed", "blocked"].includes(status)) return "closed";
  if (!task?.scheduled_at) return "unscheduled";

  const scheduled = new Date(task.scheduled_at);
  if (Number.isNaN(scheduled.getTime())) return "unscheduled";

  const today = startOfDay(now).getTime();
  const taskDay = startOfDay(scheduled).getTime();
  if (taskDay < today) return "overdue";
  if (taskDay === today) return "today";
  return "upcoming";
}

function formatDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not scheduled"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function leadName(lead) {
  return lead?.contact?.full_name || lead?.company?.name || lead?.title || "CRM lead";
}

const FILTERS = [
  ["open", "Open"],
  ["today", "Due today"],
  ["overdue", "Overdue"],
  ["upcoming", "Upcoming"],
  ["completed", "Completed"],
];

export default function CrmFollowUpTasksPanel({
  leads = [],
  onOpenLead,
  compact = false,
}) {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const leadById = useMemo(
    () => new Map(leads.map((lead) => [lead.id, lead])),
    [leads]
  );

  async function load() {
    try {
      setLoading(true);
      setError("");
      const result = await getCrmFollowUps({
        channel: "human_call",
        limit: compact ? 50 : 200,
      });
      setTasks(result?.data || []);
    } catch (loadError) {
      setError(loadError?.message || "Unable to load follow-up tasks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const initial = { open: 0, today: 0, overdue: 0, upcoming: 0, completed: 0 };
    tasks.forEach((task) => {
      const bucket = taskBucket(task);
      if (["today", "overdue", "upcoming", "unscheduled"].includes(bucket)) {
        initial.open += 1;
      }
      if (initial[bucket] !== undefined) initial[bucket] += 1;
    });
    return initial;
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const rows = tasks.filter((task) => {
      const bucket = taskBucket(task);
      if (filter === "open") return ["today", "overdue", "upcoming", "unscheduled"].includes(bucket);
      return bucket === filter;
    });
    return compact ? rows.slice(0, 5) : rows;
  }, [tasks, filter, compact]);

  async function complete(task) {
    if (!window.confirm("Mark this follow-up as completed? This will not change lead scoring or qualification.")) return;
    try {
      setBusyId(task.id);
      setError("");
      await updateCrmFollowUp(task.id, "complete", {
        note: "Completed from CRM follow-up task centre.",
      });
      await load();
    } catch (updateError) {
      setError(updateError?.message || "Follow-up could not be completed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={compact ? "" : "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {!compact && <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Task intelligence</p>}
          <h3 className={`${compact ? "text-xl" : "mt-2 text-2xl"} font-black text-slate-950`}>
            Human-call follow-ups
          </h3>
          <p className="mt-1 text-sm text-slate-500">Live tasks from crm_follow_up_jobs.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
          <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Due today", counts.today, FiCalendar, "text-cyan-700 bg-cyan-50"],
          ["Overdue", counts.overdue, FiAlertCircle, "text-rose-700 bg-rose-50"],
          ["Upcoming", counts.upcoming, FiClock, "text-amber-700 bg-amber-50"],
          ["Completed", counts.completed, FiCheckCircle, "text-emerald-700 bg-emerald-50"],
        ].map(([label, value, Icon, tone]) => (
          <div key={label} className={`rounded-2xl p-3 ${tone}`}>
            <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase">{label}</span><Icon /></div>
            <p className="mt-2 text-2xl font-black">{value}</p>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-full px-3 py-2 text-xs font-bold ${filter === key ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>
              {label} ({counts[key]})
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Loading follow-ups...</p>
        ) : visibleTasks.length ? (
          visibleTasks.map((task) => {
            const lead = leadById.get(task.lead_id);
            const bucket = taskBucket(task);
            const completed = bucket === "completed";
            return (
              <article key={task.id} className={`rounded-2xl border p-4 ${bucket === "overdue" ? "border-rose-200 bg-rose-50/50" : "border-slate-200 bg-slate-50/70"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FiPhone className="text-cyan-700" />
                      <p className="truncate text-sm font-black text-slate-900">{leadName(lead)}</p>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-500">{bucket}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{task.reason || "CRM follow-up"}</p>
                    <p className="mt-1 text-xs text-slate-500">{completed ? `Completed ${formatDate(task.completed_at)}` : `Scheduled ${formatDate(task.scheduled_at)}`}</p>
                  </div>
                  <div className="flex gap-2">
                    {lead && (
                      <button type="button" onClick={() => onOpenLead?.(lead)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">Open lead</button>
                    )}
                    {!completed && (
                      <button type="button" disabled={busyId === task.id} onClick={() => complete(task)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
                        {busyId === task.id ? "Saving..." : "Complete"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center">
            <FiClock className="mx-auto text-slate-400" size={24} />
            <p className="mt-3 text-sm font-bold text-slate-700">No follow-ups in this view</p>
          </div>
        )}
      </div>
    </section>
  );
}
