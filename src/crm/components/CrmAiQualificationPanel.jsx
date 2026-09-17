import React, { useState } from "react";
import {
  FiZap,
  FiTarget,
  FiClock,
  FiDollarSign,
  FiUserCheck,
  FiActivity,
  FiAlertCircle,
  FiRefreshCw,
  FiTrendingUp,
  FiCheckCircle,
} from "react-icons/fi";

import { qualifyCrmLead } from "../services/crmApi";

const bandMeta = {
  hot: {
    label: "HOT",
    badge:
      "bg-rose-50 text-rose-700 border-rose-200",
  },
  warm: {
    label: "WARM",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200",
  },
  cold: {
    label: "COLD",
    badge:
      "bg-sky-50 text-sky-700 border-sky-200",
  },
  unqualified: {
    label: "UNQUALIFIED",
    badge:
      "bg-slate-100 text-slate-600 border-slate-200",
  },
};

function ValueCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2 text-slate-500">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </span>

        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
          {label}
        </span>
      </div>

      <div className="text-sm font-semibold capitalize text-slate-900">
        {value || "Unknown"}
      </div>
    </div>
  );
}

function InsightBlock({
  title,
  children,
  icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </span>

        <h4 className="text-sm font-bold text-slate-900">
          {title}
        </h4>
      </div>

      <div className="text-sm leading-6 text-slate-600">
        {children || "No information available yet."}
      </div>
    </div>
  );
}

export default function CrmAiQualificationPanel({
  lead,
  initialQualification = null,
  onQualified,
}) {
  const [qualification, setQualification] =
    useState(initialQualification);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const runQualification = async () => {
    if (!lead?.id) {
      setError("Lead ID is missing.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response =
        await qualifyCrmLead(lead.id);

      const nextQualification =
        response?.qualification || null;

      setQualification(
        nextQualification
      );

      if (
        typeof onQualified ===
        "function"
      ) {
        onQualified(
          nextQualification,
          response
        );
      }
    } catch (err) {
      console.error(
        "AI qualification failed:",
        err
      );

      setError(
        err?.message ||
          "Unable to qualify this lead."
      );
    } finally {
      setLoading(false);
    }
  };

  const band =
    qualification?.qualification_band ||
    "unqualified";

  const meta =
    bandMeta[band] ||
    bandMeta.unqualified;

  const score =
    qualification?.score ?? 0;

  const confidence =
    qualification?.ai_confidence ?? 0;

  if (!qualification) {
    return (
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-violet-100/70 blur-3xl" />
        <div className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-cyan-100/60 blur-3xl" />

        <div className="relative z-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                  <FiZap />
                </span>

                <span className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
                  AI Qualification Engine
                </span>
              </div>

              <h3 className="text-2xl font-black tracking-tight text-slate-950">
                Qualify this lead with AI
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Analyze commercial intent, need,
                budget fit, timeline, authority,
                buying signals and recommended
                sales action.
              </p>
            </div>

            <button
              type="button"
              onClick={runQualification}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  Qualifying...
                </>
              ) : (
                <>
                  <FiZap />
                  Run AI Qualification
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <FiAlertCircle className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.09)]">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-100/60 blur-3xl" />
      <div className="absolute -bottom-28 left-16 h-64 w-64 rounded-full bg-cyan-100/50 blur-3xl" />

      <div className="relative z-10">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                <FiZap />
              </span>

              <span className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">
                AI Lead Intelligence
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-black ${meta.badge}`}
              >
                {meta.label}
              </span>
            </div>

            <h3 className="text-2xl font-black tracking-tight text-slate-950">
              AI Qualification Result
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Commercial readiness and recommended
              sales action for this lead.
            </p>
          </div>

          <button
            type="button"
            onClick={runQualification}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <FiRefreshCw
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            {loading
              ? "Re-qualifying..."
              : "Re-run AI"}
          </button>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-[26px] bg-slate-950 p-6 text-white shadow-xl">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  AI Qualification Score
                </div>

                <div className="mt-3 flex items-end gap-2">
                  <span className="text-6xl font-black tracking-tight">
                    {score}
                  </span>

                  <span className="pb-2 text-lg font-semibold text-slate-400">
                    / 100
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  AI Confidence
                </div>

                <div className="mt-1 text-2xl font-black">
                  {confidence}%
                </div>
              </div>
            </div>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{
                  width: `${Math.min(
                    Math.max(score, 0),
                    100
                  )}%`,
                }}
              />
            </div>

            <div className="mt-5 text-sm leading-6 text-slate-300">
              {qualification
                ?.qualification_reason ||
                "No qualification explanation available."}
            </div>
          </div>

          <div className="rounded-[26px] border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6">
            <div className="flex items-center gap-2 text-violet-700">
              <FiTrendingUp />

              <span className="text-xs font-black uppercase tracking-[0.17em]">
                Recommended Action
              </span>
            </div>

            <div className="mt-4 text-lg font-black leading-7 text-slate-950">
              {qualification
                ?.recommended_action ||
                "No action available."}
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold capitalize text-slate-700 shadow-sm">
              <FiClock />

              Priority:
              <span className="text-violet-700">
                {qualification
                  ?.recommended_priority
                  ?.replaceAll("_", " ") ||
                  "nurture"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ValueCard
            icon={<FiTarget />}
            label="Intent"
            value={qualification?.intent_level}
          />

          <ValueCard
            icon={<FiCheckCircle />}
            label="Need Fit"
            value={qualification?.need_fit}
          />

          <ValueCard
            icon={<FiDollarSign />}
            label="Budget Fit"
            value={qualification?.budget_fit}
          />

          <ValueCard
            icon={<FiClock />}
            label="Timeline"
            value={qualification?.timeline_fit}
          />

          <ValueCard
            icon={<FiUserCheck />}
            label="Authority"
            value={
              qualification?.decision_authority
            }
          />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <InsightBlock
            title="Requirements Summary"
            icon={<FiTarget />}
          >
            {
              qualification
                ?.requirements_summary
            }
          </InsightBlock>

          <InsightBlock
            title="Buying Signals"
            icon={<FiTrendingUp />}
          >
            {qualification?.buying_signals}
          </InsightBlock>

          <InsightBlock
            title="Pain Points"
            icon={<FiActivity />}
          >
            {qualification?.pain_points}
          </InsightBlock>

          <InsightBlock
            title="Objections / Friction"
            icon={<FiAlertCircle />}
          >
            {qualification?.objections}
          </InsightBlock>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ValueCard
            icon={<FiTarget />}
            label="Project Type"
            value={qualification?.project_type}
          />

          <ValueCard
            icon={<FiDollarSign />}
            label="Estimated Budget"
            value={
              qualification?.estimated_budget
            }
          />

          <ValueCard
            icon={<FiActivity />}
            label="Business Size"
            value={
              qualification?.business_size
            }
          />
        </div>

        {qualification
          ?.conversation_summary && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
            <div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              AI Context Summary
            </div>

            <p className="text-sm leading-6 text-slate-600">
              {
                qualification
                  .conversation_summary
              }
            </p>
          </div>
        )}

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <FiAlertCircle className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </section>
  );
}