import React, { useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiRefreshCw,
  FiShield,
  FiTarget,
  FiZap,
  FiMail,
  FiPhone,
  FiCopy,
  FiBriefcase,
  FiBarChart2,
} from "react-icons/fi";

import { validateCrmLead } from "../services/crmApi";

const STATUS_META = {
  valid: {
    label: "VALID",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    panel:
      "from-emerald-500 to-teal-600",
    icon: FiCheckCircle,
  },

  needs_review: {
    label: "NEEDS REVIEW",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700",
    panel:
      "from-amber-400 to-orange-500",
    icon: FiAlertCircle,
  },

  suspected_invalid: {
    label: "SUSPECTED INVALID",
    badge:
      "border-rose-200 bg-rose-50 text-rose-700",
    panel:
      "from-rose-500 to-pink-600",
    icon: FiAlertCircle,
  },
};

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.13em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-xl font-black text-slate-950">
            {value}
          </p>

          {detail && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {detail}
            </p>
          )}
        </div>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon size={16} />
        </span>
      </div>
    </div>
  );
}

function SignalList({
  title,
  items = [],
  tone = "positive",
}) {
  const toneMeta = {
    positive: {
      wrapper:
        "border-emerald-100 bg-emerald-50/60",
      icon: "text-emerald-600",
      iconComponent: FiCheckCircle,
    },

    warning: {
      wrapper:
        "border-amber-100 bg-amber-50/60",
      icon: "text-amber-600",
      iconComponent: FiAlertCircle,
    },

    blocking: {
      wrapper:
        "border-rose-100 bg-rose-50/60",
      icon: "text-rose-600",
      iconComponent: FiAlertCircle,
    },
  };

  const meta =
    toneMeta[tone] ||
    toneMeta.positive;

  const SignalIcon =
    meta.iconComponent;

  if (!items?.length) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border p-4 ${meta.wrapper}`}
    >
      <p className="text-sm font-black text-slate-900">
        {title}
      </p>

      <div className="mt-3 space-y-2">
        {items.map(
          (item, index) => (
            <div
              key={`${item}-${index}`}
              className="flex items-start gap-2"
            >
              <SignalIcon
                size={15}
                className={`mt-0.5 shrink-0 ${meta.icon}`}
              />

              <p className="text-sm leading-6 text-slate-700">
                {item}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function CrmLeadValidationPanel({
  lead,
  initialValidation = null,
  onValidated,
}) {
  const [
    validation,
    setValidation,
  ] = useState(
    initialValidation
  );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function runValidation() {
    if (!lead?.id) {
      setError(
        "Lead ID is missing."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response =
        await validateCrmLead(
          lead.id
        );

      const nextValidation =
        response?.validation ||
        null;

      setValidation(
        nextValidation
      );

      if (
        typeof onValidated ===
        "function"
      ) {
        onValidated(
          nextValidation,
          response
        );
      }
    } catch (err) {
      console.error(
        "CRM lead validation failed:",
        err
      );

      setError(
        err?.message ||
          "Unable to validate this lead."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!validation) {
    return (
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-white to-cyan-50/40 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-100/70 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg">
                  <FiShield />
                </span>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
                    Validation Intelligence
                  </p>

                  <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                    Verify lead quality
                  </h3>
                </div>
              </div>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
                Check contact plausibility,
                duplicate signals,
                test/spam indicators,
                information completeness
                and provisional business
                classification before AI
                qualification.
              </p>
            </div>

            <button
              type="button"
              onClick={runValidation}
              disabled={loading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <FiShield />
                  Validate Lead
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <FiAlertCircle className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </section>
    );
  }

  const status =
    validation?.validation_status ||
    "needs_review";

  const meta =
    STATUS_META[status] ||
    STATUS_META.needs_review;

  const StatusIcon =
    meta.icon;

  const validationScore =
    Number(
      validation?.validation_score ||
        0
    );

  const confidence =
    Number(
      validation?.validation_confidence ||
        0
    );

  const spamScore =
    Number(
      validation?.spam_score ||
        0
    );

  const completeness =
    Number(
      validation?.completeness_score ||
        0
    );

  const businessUnit =
    validation?.business_unit ===
    "business_solutions"
      ? "Business Solutions"
      : validation?.business_unit ===
        "admissions"
      ? "Admissions"
      : "Unclassified";

  return (
    <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div
        className={`bg-gradient-to-br ${meta.panel} p-6 text-white`}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                <StatusIcon />
              </span>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] opacity-80">
                  Validation Intelligence
                </p>

                <h3 className="mt-1 text-2xl font-black tracking-tight">
                  Lead Quality Assessment
                </h3>
              </div>

              <span
                className={`rounded-full border bg-white px-3 py-1.5 text-xs font-black ${meta.badge}`}
              >
                {meta.label}
              </span>
            </div>

            <p className="mt-4 max-w-xl text-sm leading-7 text-white/85">
              {validation?.validation_reason ||
                "Lead validation completed."}
            </p>
          </div>

          <button
            type="button"
            onClick={runValidation}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-60"
          >
            <FiRefreshCw
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            {loading
              ? "Revalidating..."
              : "Revalidate"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-black/10 p-4 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-70">
              Quality Score
            </p>

            <p className="mt-2 text-3xl font-black">
              {validationScore}
              <span className="text-sm font-bold opacity-70">
                /100
              </span>
            </p>
          </div>

          <div className="rounded-2xl bg-black/10 p-4 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-70">
              Confidence
            </p>

            <p className="mt-2 text-3xl font-black">
              {confidence}%
            </p>
          </div>

          <div className="rounded-2xl bg-black/10 p-4 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-70">
              Spam Risk
            </p>

            <p className="mt-2 text-3xl font-black">
              {spamScore}%
            </p>
          </div>

          <div className="rounded-2xl bg-black/10 p-4 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-70">
              Completeness
            </p>

            <p className="mt-2 text-3xl font-black">
              {completeness}%
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            icon={FiMail}
            label="Email"
            value={
              validation?.email_status ||
              "Unknown"
            }
          />

          <MetricCard
            icon={FiPhone}
            label="Phone"
            value={
              validation?.phone_status ||
              "Unknown"
            }
          />

          <MetricCard
            icon={FiCopy}
            label="Duplicate"
            value={
              validation?.duplicate_status ||
              "None"
            }
            detail={
              validation
                ?.duplicate_lead_ids
                ?.length
                ? `${validation.duplicate_lead_ids.length} related lead(s)`
                : "No matching CRM lead"
            }
          />

          <MetricCard
            icon={FiBriefcase}
            label="Business Unit"
            value={businessUnit}
            detail={`Confidence ${
              Number(
                validation?.business_unit_confidence ||
                  0
              )
            }%`}
          />

          <MetricCard
            icon={FiTarget}
            label="Test Signal"
            value={
              validation?.test_signal
                ? "Detected"
                : "Not detected"
            }
          />

          <MetricCard
            icon={FiBarChart2}
            label="Version"
            value={
              validation?.validation_version ||
              "v1"
            }
          />
        </div>

        <div className="mt-5 space-y-4">
          <SignalList
            title="Positive signals"
            items={
              validation?.positive_signals ||
              []
            }
            tone="positive"
          />

          <SignalList
            title="Warnings"
            items={
              validation?.warning_signals ||
              []
            }
            tone="warning"
          />

          <SignalList
            title="Blocking signals"
            items={
              validation?.blocking_signals ||
              []
            }
            tone="blocking"
          />
        </div>

        <div className="mt-5 rounded-[22px] border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
              <FiZap />
            </span>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-violet-700">
                Recommended Action
              </p>

              <p className="mt-2 text-sm font-semibold leading-7 text-slate-800">
                {validation?.recommended_action ||
                  "Review this lead before proceeding."}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}