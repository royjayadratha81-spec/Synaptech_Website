import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiAlertCircle,
  FiCheckCircle,
  FiRefreshCw,
  FiTarget,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";

import {
  scoreCrmLead,
  evaluateCrmQualification,
  createCrmOpportunity,
} from "../services/crmApi";

function clamp(value) {
  const number = Number(
    value || 0
  );

  return Math.min(
    100,
    Math.max(0, number)
  );
}

function getBandMeta(
  band
) {
  const key =
    String(
      band || "review"
    ).toLowerCase();

  const map = {
    hot: {
      label: "HOT",
      badge:
        "bg-rose-100 text-rose-700 ring-rose-200",
      bar:
        "from-rose-500 to-orange-500",
      message:
        "Immediate priority follow-up recommended.",
    },

    warm: {
      label: "WARM",
      badge:
        "bg-amber-100 text-amber-700 ring-amber-200",
      bar:
        "from-amber-400 to-orange-500",
      message:
        "Priority follow-up and continued qualification recommended.",
    },

    nurture: {
      label: "NURTURE",
      badge:
        "bg-cyan-100 text-cyan-700 ring-cyan-200",
      bar:
        "from-cyan-400 to-indigo-500",
      message:
        "Continue structured discovery and nurturing.",
    },

    invalid: {
      label: "INVALID",
      badge:
        "bg-rose-100 text-rose-700 ring-rose-200",
      bar:
        "from-rose-500 to-red-600",
      message:
        "Review before active sales or counselling follow-up.",
    },

    review: {
      label: "REVIEW",
      badge:
        "bg-slate-100 text-slate-700 ring-slate-200",
      bar:
        "from-slate-400 to-slate-600",
      message:
        "Human review or additional information is recommended.",
    },
  };

  return (
    map[key] ||
    map.review
  );
}

function ScoreBar({
  label,
  value,
}) {
  const score =
    clamp(value);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-700">
          {label}
        </span>

        <span className="text-sm font-black text-slate-950">
          {score}/100
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-600 transition-all duration-500"
          style={{
            width: `${score}%`,
          }}
        />
      </div>
    </div>
  );
}

function FactorList({
  title,
  icon: Icon,
  items,
  emptyText,
  tone = "positive",
}) {
  const list =
    Array.isArray(items)
      ? items
      : [];

  const toneClasses =
    tone === "negative"
      ? {
          box:
            "border-rose-100 bg-rose-50/70",
          icon:
            "bg-rose-100 text-rose-700",
          text:
            "text-rose-900",
        }
      : tone === "missing"
        ? {
            box:
              "border-amber-100 bg-amber-50/70",
            icon:
              "bg-amber-100 text-amber-700",
            text:
              "text-amber-900",
          }
        : {
            box:
              "border-emerald-100 bg-emerald-50/70",
            icon:
              "bg-emerald-100 text-emerald-700",
            text:
              "text-emerald-900",
          };

  return (
    <div
      className={`rounded-2xl border p-4 ${toneClasses.box}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${toneClasses.icon}`}
        >
          <Icon size={15} />
        </span>

        <h4
          className={`text-sm font-black ${toneClasses.text}`}
        >
          {title}
        </h4>
      </div>

      {list.length ? (
        <div className="mt-3 space-y-2">
          {list
            .slice(0, 6)
            .map(
              (
                item,
                index
              ) => (
                <div
                  key={`${item}-${index}`}
                  className="flex gap-2 text-sm leading-5 text-slate-700"
                >
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />

                  <span>
                    {String(
                      item
                    ).replace(
                      /_/g,
                      " "
                    )}
                  </span>
                </div>
              )
            )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          {emptyText}
        </p>
      )}
    </div>
  );
}

export default function CrmLeadScorePanel({
  lead,
  refreshKey = 0,
}) {
  const [
    scoreData,
    setScoreData,
  ] = useState(null);
  const [
  qualificationData,
  setQualificationData,
] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  async function loadScore() {
  if (!lead?.id) {
    return;
  }

  try {
    setLoading(true);
    setError("");

    const scoreResult =
      await scoreCrmLead(
        lead.id
      );

    setScoreData(
      scoreResult
    );

    const qualificationResult =
      await evaluateCrmQualification(
        lead.id
      );

    setQualificationData(
      qualificationResult
    );
  } catch (err) {
    console.error(
      "CRM score / qualification panel error:",
      err
    );

    setError(
      err?.message ||
        "Unable to calculate lead qualification."
    );
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    loadScore();
  }, [
    lead?.id,
    refreshKey,
  ]);

  const score =
    scoreData?.score ||
    null;
    const qualification =
  qualificationData
    ?.qualification ||
  null;

const completeness =
  clamp(
    qualification
      ?.qualification_completeness
  );

const salesReady =
  qualification
    ?.sales_ready === true;

const qualificationStage =
  String(
    qualification
      ?.qualification_stage ||
      "validation"
  ).replace(
    /_/g,
    " "
  );

const salesReadyStatus =
  String(
    qualification
      ?.sales_ready_status ||
      "not_ready"
  ).replace(
    /_/g,
    " "
  );

const handoffIntent =
  String(
    qualification
      ?.handoff_intent ||
      "not_asked"
  ).replace(
    /_/g,
    " "
  );

  const overall =
    clamp(
      score?.overall_score
    );

  const confidence =
    clamp(
      score
        ?.scoring_confidence
    );

  const bandMeta =
    useMemo(
      () =>
        getBandMeta(
          score?.routing_band
        ),
      [
        score
          ?.routing_band,
      ]
    );

  if (!lead) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-5 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
              <FiTrendingUp />
            </span>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">
                Lead Score & Routing Intelligence
              </p>

              <h3 className="mt-1 text-lg font-black">
                Dynamic Qualification Score
              </h3>

              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-300">
                Deterministic scoring from validation, AI discovery, engagement and readiness evidence.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadScore}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiRefreshCw
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            {loading
              ? "Scoring..."
              : "Recalculate"}
          </button>
          
        </div>
      </div>

      {error ? (
        <div className="p-5">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="mt-0.5 shrink-0 text-rose-600" />

              <div>
                <p className="text-sm font-black text-rose-900">
                  Score unavailable
                </p>

                <p className="mt-1 text-sm text-rose-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : loading &&
        !score ? (
        <div className="p-5">
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      ) : score ? (
        <div className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Overall score
              </p>

              <div className="mt-3 flex items-end gap-2">
                <span className="text-5xl font-black tracking-tight text-slate-950">
                  {overall}
                </span>

                <span className="pb-1 text-sm font-bold text-slate-400">
                  /100
                </span>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${bandMeta.bar}`}
                  style={{
                    width: `${overall}%`,
                  }}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ring-1 ${bandMeta.badge}`}
                >
                  {bandMeta.label}
                </span>

                <span className="text-xs font-semibold text-slate-500">
                  Confidence {confidence}%
                </span>
              </div>
            </div>

            <div className="rounded-[22px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-cyan-50 p-5">
              <div className="flex items-center gap-2">
                <FiZap className="text-indigo-700" />

                <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-700">
                  Recommended routing
                </p>
              </div>

              <h4 className="mt-3 text-lg font-black text-slate-950">
                {score?.recommended_route
                  ? String(
                      score.recommended_route
                    ).replace(
                      /_/g,
                      " "
                    )
                  : "Human review"}
              </h4>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {score?.recommended_action ||
                  bandMeta.message}
              </p>

              <div className="mt-4 rounded-xl border border-white/70 bg-white/70 px-3 py-2">
                <p className="text-xs font-semibold text-slate-500">
                  Business unit
                </p>

                <p className="mt-1 text-sm font-black text-slate-900">
                  {String(
                    score?.business_unit ||
                      "unclassified"
                  ).replace(
                    /_/g,
                    " "
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-5">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-700">
        Sales-Ready Qualification Intelligence
      </p>

      <h4 className="mt-1 text-lg font-black text-slate-950">
        Human Handoff Readiness
      </h4>

      <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
        Final qualification is evaluated separately from lead authenticity and dynamic scoring.
      </p>
    </div>

    <span
      className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-black ring-1 ${
        salesReady
          ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
          : "bg-amber-100 text-amber-700 ring-amber-200"
      }`}
    >
      {salesReady
        ? "SALES READY"
        : "NOT SALES READY"}
    </span>
  </div>

  <div className="mt-5 grid gap-3 sm:grid-cols-2">
    <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-400">
        Qualification completeness
      </p>

      <div className="mt-2 flex items-end gap-1">
        <span className="text-3xl font-black text-slate-950">
          {completeness}
        </span>

        <span className="pb-1 text-sm font-bold text-slate-400">
          %
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500"
          style={{
            width: `${completeness}%`,
          }}
        />
      </div>
    </div>

    <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-400">
        Qualification stage
      </p>

      <p className="mt-2 text-base font-black capitalize text-slate-950">
        {qualificationStage}
      </p>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {qualification
          ?.qualification_reason ||
          "Qualification evidence is still being evaluated."}
      </p>
    </div>

    <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-400">
        Buyer / handoff intent
      </p>

      <p className="mt-2 text-base font-black capitalize text-slate-950">
        {handoffIntent}
      </p>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {qualification
          ?.handoff_channel
          ? `Preferred handoff: ${String(
              qualification.handoff_channel
            ).replace(
              /_/g,
              " "
            )}`
          : "No explicit human-contact channel confirmed yet."}
      </p>
    </div>

    <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-400">
        Final qualification status
      </p>

      <p className="mt-2 text-base font-black capitalize text-slate-950">
        {salesReadyStatus}
      </p>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {qualification
          ?.recommended_route
          ? `Route: ${String(
              qualification.recommended_route
            ).replace(
              /_/g,
              " "
            )}`
          : "No final human route has been assigned."}
      </p>
    </div>
  </div>

  {Array.isArray(
    qualification
      ?.missing_critical_fields
  ) &&
  qualification
    .missing_critical_fields
    .length > 0 ? (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
        Critical information still required
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {qualification
          .missing_critical_fields
          .map((field) => (
            <span
              key={field}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-amber-900 ring-1 ring-amber-200"
            >
              {String(field).replace(
                /_/g,
                " "
              )}
            </span>
          ))}
      </div>
    </div>
  ) : null}

  <div className="mt-4 rounded-2xl border border-violet-100 bg-white/80 p-4">
    <p className="text-xs font-black uppercase tracking-[0.12em] text-violet-700">
      Next best action
    </p>

    <p className="mt-2 text-sm leading-6 text-slate-700">
      {qualification
        ?.recommended_next_action ||
        "Continue qualification until enough evidence exists for a safe human handoff."}
    </p>
  </div>
</div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <FiTarget className="text-cyan-700" />

              <h4 className="text-sm font-black text-slate-950">
                Qualification components
              </h4>
            </div>

            <div className="space-y-4">
              <ScoreBar
                label="Lead quality"
                value={
                  score
                    ?.lead_quality_score
                }
              />

              <ScoreBar
                label="Fit"
                value={
                  score?.fit_score
                }
              />

              <ScoreBar
                label="Intent"
                value={
                  score
                    ?.intent_score
                }
              />

              <ScoreBar
                label="Engagement"
                value={
                  score
                    ?.engagement_score
                }
              />

              <ScoreBar
                label="Readiness"
                value={
                  score
                    ?.readiness_score
                }
              />
            </div>
          </div>

          <div className="grid gap-4">
            <FactorList
              title="Positive factors"
              icon={FiCheckCircle}
              items={
                score
                  ?.positive_factors
              }
              emptyText="No strong positive factors have been established yet."
            />

            <FactorList
              title="Missing high-value information"
              icon={FiTarget}
              items={
                score
                  ?.missing_high_value_fields
              }
              emptyText="No critical high-value fields are currently missing."
              tone="missing"
            />

            <FactorList
              title="Risk / negative factors"
              icon={FiAlertCircle}
              items={
                score
                  ?.negative_factors
              }
              emptyText="No material negative factors are currently recorded."
              tone="negative"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Scoring note
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Source-quality economics, CPL, CAC and ROAS are not yet connected, so they do not influence this score.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <p className="text-sm text-slate-500">
            No scoring result is currently available.
          </p>
        </div>
      )}
    </section>
  );
}