import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaGraduationCap,
  FaLock,
  FaShieldAlt,
  FaSpinner,
  FaWallet,
} from "react-icons/fa";

import {
  approveAdmissionsApplication,
  approveAdmissionsForFinance,
} from "../services/admissionsApi";

function normaliseStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getProgrammeName(application) {
  const snapshot =
    application?.programme_snapshot ||
    application?.program_snapshot ||
    application?.course_snapshot ||
    {};

  return (
    application?.programme_name ||
    application?.program_name ||
    application?.course_name ||
    snapshot?.name ||
    snapshot?.title ||
    "Selected programme"
  );
}

function StatusCard({
  icon: Icon,
  title,
  description,
  badge,
  tone = "emerald",
  children,
}) {
  const tones = {
    emerald: {
      outer: "border-emerald-300/20 bg-emerald-400/[0.08]",
      icon: "bg-emerald-400/15 text-emerald-300",
      title: "text-emerald-100",
      badge: "border-emerald-300/20 bg-emerald-400/10 text-emerald-300",
    },
    violet: {
      outer: "border-violet-300/20 bg-violet-400/[0.08]",
      icon: "bg-violet-400/15 text-violet-300",
      title: "text-violet-100",
      badge: "border-violet-300/20 bg-violet-400/10 text-violet-300",
    },
    amber: {
      outer: "border-amber-300/20 bg-amber-400/[0.08]",
      icon: "bg-amber-400/15 text-amber-300",
      title: "text-amber-100",
      badge: "border-amber-300/20 bg-amber-400/10 text-amber-300",
    },
  };
  const selected = tones[tone] || tones.emerald;

  return (
    <div className={`mt-4 rounded-[22px] border p-4 ${selected.outer}`}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${selected.icon}`}>
            <Icon />
          </div>
          <div>
            <p className={`text-sm font-black ${selected.title}`}>{title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
          </div>
        </div>
        {badge ? (
          <span className={`self-start rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${selected.badge}`}>
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default function AdmissionApprovalPanel({
  application,
  organizationId,
  candidateName = "Candidate",
  canApproveAdmission = false,
  onApproved,
}) {
  const [decisionNote, setDecisionNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    setDecisionNote("");
    setConfirmed(false);
    setError("");
    setResult(null);
  }, [application?.id]);

  const displayedApplication = result?.application || application;
  const status = normaliseStatus(
    displayedApplication?.status || displayedApplication?.application_status
  );
  const programmeName = useMemo(
    () => getProgrammeName(displayedApplication),
    [displayedApplication]
  );
  const approvedForFinanceAt =
    displayedApplication?.admissions_approved_for_finance_at || null;

  if (!displayedApplication?.id) return null;

  if (status === "admitted") {
    return (
      <StatusCard
        icon={FaCheckCircle}
        title="Admission and Finance clearance complete"
        description={`${candidateName} · ${programmeName}`}
        badge="Awaiting LMS access"
        tone="violet"
      >
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-300/15 bg-amber-400/[0.07] px-4 py-3">
          <FaGraduationCap className="mt-0.5 shrink-0 text-amber-300" />
          <div>
            <p className="text-xs font-black text-amber-100">Explicit LMS activation required</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              The student record is ready, but LMS access remains disabled until an authorised administrator activates it from Students.
            </p>
          </div>
        </div>
      </StatusCard>
    );
  }

  if (approvedForFinanceAt && status === "finance_pending") {
    return (
      <StatusCard
        icon={FaWallet}
        title="Approved and sent to Finance"
        description={`${candidateName} · ${programmeName} · ${formatDate(approvedForFinanceAt)}`}
        badge="Finance pending"
        tone="emerald"
      />
    );
  }

  const isLegacyFinalisation = status === "finance_verified";
  if (status !== "finance_pending" && !isLegacyFinalisation) return null;

  if (!canApproveAdmission) {
    return (
      <StatusCard
        icon={FaLock}
        title="Admissions approval restricted"
        description="Only a Platform Super Admin or Tenant Admin can approve this application for the Finance queue."
        badge="Restricted"
        tone="amber"
      />
    );
  }

  async function handleApproval(event) {
    event.preventDefault();
    if (submitting || !confirmed) return;

    setSubmitting(true);
    setError("");

    try {
      const response = isLegacyFinalisation
        ? await approveAdmissionsApplication({
            applicationId: displayedApplication.id,
            organizationId: organizationId || null,
            decisionNote: decisionNote.trim() || null,
            forceRefresh: true,
          })
        : await approveAdmissionsForFinance({
            applicationId: displayedApplication.id,
            organizationId: organizationId || null,
            decisionNote: decisionNote.trim() || null,
            forceRefresh: true,
          });

      setResult(response);
      setConfirmed(false);
      if (typeof onApproved === "function") await onApproved(response);
    } catch (requestError) {
      console.error("Admissions approval failed:", requestError);
      setError(
        requestError?.message || "Admissions approval could not be completed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleApproval}
      className="mt-4 rounded-[22px] border border-violet-300/20 bg-violet-400/[0.07] p-4"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-300">
            <FaShieldAlt />
          </div>
          <div>
            <p className="text-sm font-black text-violet-100">
              {isLegacyFinalisation
                ? "Complete legacy admission"
                : "Approve admission for Finance"}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {candidateName} · {programmeName}
            </p>
          </div>
        </div>
        <span className="self-start rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">
          {isLegacyFinalisation ? "Legacy Finance verified" : "Admissions review"}
        </span>
      </div>

      <label className="mt-5 block">
        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Admissions decision note</span>
        <textarea
          value={decisionNote}
          onChange={(event) => setDecisionNote(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Optional note for the immutable Admissions audit trail"
          className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300/35 focus:ring-2 focus:ring-violet-400/10"
        />
      </label>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={submitting}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-violet-500"
        />
        <span className="text-xs leading-5 text-slate-300">
          {isLegacyFinalisation
            ? "I confirm this legacy Finance-verified admission may be finalized. LMS access will remain a separate action."
            : "I approve this admission and authorise its transfer to Finance. This does not grant LMS access."}
        </span>
      </label>

      {error ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-red-200">
          <FaExclamationTriangle className="mt-0.5 shrink-0" />
          <p className="text-xs leading-5">{error}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={submitting || !confirmed}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 py-3 text-xs font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {submitting ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
          {submitting
            ? "Recording approval"
            : isLegacyFinalisation
              ? "Complete legacy admission"
              : "Approve and send to Finance"}
        </button>
        <p className="flex items-center gap-2 text-[11px] leading-5 text-slate-500">
          <FaLock className="shrink-0" />
          The server records an immutable event. LMS activation remains separate.
        </p>
      </div>
    </form>
  );
}
