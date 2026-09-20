import React, { useEffect, useState } from "react";
import { FiCheckCircle, FiClock, FiPhone, FiRefreshCw } from "react-icons/fi";
import { createCrmHumanCall, getCrmActivities } from "../services/crmApi";

const OUTCOMES = [
  ["positive", "Positive discussion"],
  ["callback_requested", "Callback requested"],
  ["neutral", "Neutral / information required"],
  ["no_answer", "No answer"],
  ["not_interested", "Not interested"],
  ["wrong_number", "Wrong number"],
];
const CONNECTED_OUTCOMES = new Set([
  "positive",
  "neutral",
  "callback_requested",
]);

const EMPTY_ADMISSIONS_EVIDENCE = {
  fee_readiness: "",
  decision_authority: "",
  decision_authority_status: "",
  joining_timeline: "",
  payment_preference: "",
  laptop_readiness: "",
  handoff_intent: "",
};

const ADMISSIONS_EVIDENCE_FIELDS = [
  {
    name: "fee_readiness",
    label: "Course-fee acceptance",
    options: [
      ["Accepted", "Accepted"],
      ["Needs discussion", "Needs discussion"],
      ["Not affordable", "Not affordable"],
      ["Unknown", "Unknown"],
    ],
  },
  {
    name: "decision_authority",
    label: "Final decision-maker",
    options: [
      ["Student", "Student"],
      ["Parent or guardian", "Parent or guardian"],
      ["Student and parent together", "Student and parent together"],
      ["Another person", "Another person"],
      ["Unknown", "Unknown"],
    ],
  },
  {
    name: "decision_authority_status",
    label: "Decision-maker approval",
    options: [
      ["Yes", "Approved / yes"],
      ["Pending discussion", "Pending discussion"],
      ["No", "Not approved / no"],
      ["Unknown", "Unknown"],
    ],
  },
  {
    name: "joining_timeline",
    label: "Expected joining timeline",
    options: [
      ["Within 30 days", "Within 30 days"],
      ["Within 60 days", "Within 60 days"],
      ["Within 90 days", "Within 90 days"],
      ["Later", "Later"],
      ["Unknown", "Unknown"],
    ],
  },
  {
    name: "payment_preference",
    label: "Payment preference",
    options: [
      ["One-time payment", "One-time payment"],
      ["No-cost EMI", "No-cost EMI"],
      ["Needs discussion", "Needs discussion"],
      ["Unknown", "Unknown"],
    ],
  },
  {
    name: "laptop_readiness",
    label: "Laptop readiness",
    options: [
      ["Yes", "Has a suitable laptop"],
      ["I can arrange", "Can arrange a laptop"],
      ["I need advice", "Needs laptop advice"],
      ["Unknown", "Unknown"],
    ],
  },
  {
    name: "handoff_intent",
    label: "Continue with human counsellor",
    options: [
      ["accepted", "Yes, continue counselling"],
      ["declined", "No, declined further counselling"],
      ["undecided", "Undecided"],
    ],
  },
];

function requestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `call-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN");
}

export default function CrmHumanCallPanel({ lead, onActivitySaved }) {
  const businessUnit =
    lead?.qualification_state?.business_unit ||
    lead?.dynamic_score?.business_unit ||
    lead?.metadata?.business_unit ||
    lead?.business_unit ||
    "unclassified";

  const isAdmissions = businessUnit === "admissions";

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(requestId);
  const [form, setForm] = useState({
    outcome: "positive",
    summary: "",
    duration_minutes: "",
    contact_person: "",
    sentiment: "positive",
    decision_maker_confirmed: false,
    next_action: "",
    next_follow_up_at: "",
  });
    const [admissionsEvidence, setAdmissionsEvidence] = useState({
    ...EMPTY_ADMISSIONS_EVIDENCE,
  });

  async function loadActivities() {
    if (!lead?.id) return;
    try {
      setLoading(true);
      const result = await getCrmActivities({ lead_id: lead.id, limit: 20 });
      setActivities(result?.data || []);
    } catch (activityError) {
      setError(activityError?.message || "Unable to load call history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setError("");
    setNotice("");
        setIdempotencyKey(requestId());
    setAdmissionsEvidence({
      ...EMPTY_ADMISSIONS_EVIDENCE,
    });
    loadActivities();
  }, [lead?.id]);

  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }
    function changeAdmissionsEvidence(name, value) {
    setAdmissionsEvidence((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.summary.trim()) {
      setError("Please enter what was discussed during the call.");
      return;
    }
        const connectedCall = CONNECTED_OUTCOMES.has(form.outcome);

    const admissionsEvidencePayload =
      isAdmissions && connectedCall
        ? Object.fromEntries(
            Object.entries(admissionsEvidence).filter(([, value]) =>
              String(value ?? "").trim()
            )
          )
        : {};

    const hasAdmissionsEvidence =
      Object.keys(admissionsEvidencePayload).length > 0;

    try {
      setSaving(true);
      setError("");
      setNotice("");

      const result = await createCrmHumanCall(lead.id, {
        ...form,
        idempotency_key: idempotencyKey,
                business_unit: businessUnit,
        duration_minutes: Number(form.duration_minutes) || 0,
        next_follow_up_at: form.next_follow_up_at
          ? new Date(form.next_follow_up_at).toISOString()
          : null,
                  ...(hasAdmissionsEvidence
          ? {
              admissions_evidence: admissionsEvidencePayload,
            }
          : {}),
      });

      setNotice(result?.message || "Call activity saved.");
      setForm((current) => ({
        ...current,
        summary: "",
        duration_minutes: "",
        next_action: "",
        next_follow_up_at: "",
      }));
            setAdmissionsEvidence({
        ...EMPTY_ADMISSIONS_EVIDENCE,
      });
      setIdempotencyKey(requestId());
      await loadActivities();
      await onActivitySaved?.(result);
    } catch (saveError) {
      // Keep the same request key so retrying cannot duplicate the event/job.
      setError(saveError?.message || "Call activity could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[26px] border border-cyan-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-slate-950 to-cyan-950 p-5 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <FiPhone size={19} />
          </span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">Human engagement</p>
            <h3 className="mt-1 text-lg font-black">Record call discussion</h3>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-300">
          Phase 1 stores auditable call evidence and follow-ups. Existing scoring and Sales-Ready rules remain unchanged.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">
            Call outcome
            <select value={form.outcome} onChange={(e) => change("outcome", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              {OUTCOMES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-700">
            Duration (minutes)
            <input type="number" min="0" max="600" value={form.duration_minutes} onChange={(e) => change("duration_minutes", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="15" />
          </label>
        </div>

        <label className="block text-xs font-bold text-slate-700">
          Discussion summary
          <textarea required rows="4" value={form.summary} onChange={(e) => change("summary", e.target.value)} className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6" placeholder="Requirements, concerns, interest and commitments discussed..." />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">
            Contact person
            <input value={form.contact_person} onChange={(e) => change("contact_person", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Name or role" />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Sentiment
            <select value={form.sentiment} onChange={(e) => change("sentiment", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </label>
        </div>

                {isAdmissions && CONNECTED_OUTCOMES.has(form.outcome) && (
          <fieldset className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
            <legend className="px-2 text-xs font-black uppercase tracking-[0.14em] text-violet-700">
              Admissions qualification confirmations
            </legend>

            <p className="mb-4 text-xs leading-5 text-slate-600">
              Record only facts explicitly confirmed during this call. Leave a
              field blank to retain the student&apos;s existing Aira answer.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {ADMISSIONS_EVIDENCE_FIELDS.map((field) => (
                <label
                  key={field.name}
                  className="text-xs font-bold text-slate-700"
                >
                  {field.label}

                  <select
                    value={admissionsEvidence[field.name]}
                    onChange={(event) =>
                      changeAdmissionsEvidence(
                        field.name,
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-3 text-sm"
                  >
                    <option value="">
                      Not discussed — keep existing answer
                    </option>

                    {field.options.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {isAdmissions && !CONNECTED_OUTCOMES.has(form.outcome) && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
            Qualification confirmations are not recorded for an unanswered,
            wrong-number or not-interested outcome.
          </p>
        )}

        {!isAdmissions && (
          <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.decision_maker_confirmed}
              onChange={(event) =>
                change(
                  "decision_maker_confirmed",
                  event.target.checked
                )
              }
            />
            Decision-maker status was confirmed during this call
          </label>
        )}

        <label className="block text-xs font-bold text-slate-700">
          Next action
          <input value={form.next_action} onChange={(e) => change("next_action", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Send proposal, arrange demo, call again..." />
        </label>

        <label className="block text-xs font-bold text-slate-700">
          Follow-up date and time
          <input type="datetime-local" value={form.next_follow_up_at} onChange={(e) => change("next_follow_up_at", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
        </label>

        {error && <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
        {notice && <p className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">{notice}</p>}

        <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60">
          {saving ? <FiRefreshCw className="animate-spin" /> : <FiCheckCircle />}
          {saving ? "Saving..." : "Save human-call activity"}
        </button>
      </form>

      <div className="border-t border-slate-100 p-5">
        <h4 className="text-sm font-black text-slate-900">Human-call history</h4>
        {loading ? (
          <p className="mt-3 text-xs text-slate-500">Loading calls...</p>
        ) : activities.length ? (
          <div className="mt-3 space-y-3">
            {activities.map((activity) => (
              <article key={activity.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black capitalize text-cyan-700">{String(activity.event_value || "logged").replace(/_/g, " ")}</span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400"><FiClock /> {formatDate(activity.occurred_at)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{activity.metadata?.summary || "No summary"}</p>
                                {activity.metadata?.admissions_evidence &&
                  Object.keys(
                    activity.metadata.admissions_evidence
                  ).length > 0 && (
                    <div className="mt-3 grid gap-2 rounded-xl border border-violet-100 bg-white p-3 sm:grid-cols-2">
                      {Object.entries(
                        activity.metadata.admissions_evidence
                      ).map(([field, value]) => (
                        <p
                          key={field}
                          className="text-xs text-slate-600"
                        >
                          <span className="font-black capitalize text-slate-800">
                            {field.replace(/_/g, " ")}:
                          </span>{" "}
                          {String(value)}
                        </p>
                      ))}
                    </div>
                  )}
                {activity.metadata?.next_action && <p className="mt-2 text-xs font-semibold text-slate-500">Next: {activity.metadata.next_action}</p>}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">No human calls recorded yet.</p>
        )}
      </div>
    </section>
  );
}
