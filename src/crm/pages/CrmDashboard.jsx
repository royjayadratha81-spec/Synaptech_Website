import React, { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowRight,
  FiBarChart2,
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiCommand,
  FiDollarSign,
  FiFilter,
  FiGrid,
  FiLayers,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiShield,
  FiTarget,
  FiTrendingUp,
  FiUsers,
  FiX,
  FiZap,
} from "react-icons/fi";

import {
  getCrmLeads,
  getCrmLeadScores,
  getCrmQualificationStates,
  createCrmOpportunity,
  getCrmOpportunities,
  updateCrmOpportunityStage,
  getCrmFollowUps,
  closeCrmOpportunityWon,
} from "../services/crmApi";

import CrmAiQualificationPanel from "../components/CrmAiQualificationPanel";
import CrmLeadValidationPanel from "../components/CrmLeadValidationPanel";
import CrmAiConversationPanel from "../components/CrmAiConversationPanel";
import CrmLeadScorePanel from "../components/CrmLeadScorePanel";
import CrmHumanCallPanel from "../components/CrmHumanCallPanel";
import CrmFollowUpTasksPanel from "../components/CrmFollowUpTasksPanel";
import CrmCustomerSuccessPanel from "../components/CrmCustomerSuccessPanel";
import CrmCommunicationCentre from "../components/CrmCommunicationCentre";

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: FiGrid },
  { key: "leads", label: "Leads", icon: FiTarget },
  { key: "pipeline", label: "Pipeline", icon: FiLayers },
  { key: "companies", label: "Companies", icon: FiBriefcase },
  { key: "contacts", label: "Contacts", icon: FiUsers },
  { key: "activities", label: "Activities", icon: FiActivity },
  { key: "customer_success", label: "Won Customers", icon: FiCheckCircle },
  { key: "reports", label: "Reports", icon: FiBarChart2 },
];

const WORKSPACES = [
  { key: "all", label: "All Business" },
  { key: "admissions", label: "Admissions" },
  { key: "business", label: "Business Solutions" },
];

const STATUS_META = {
  open: "bg-sky-50 text-sky-700 ring-sky-200",
  qualified: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  converted: "bg-violet-50 text-violet-700 ring-violet-200",
  lost: "bg-slate-100 text-slate-600 ring-slate-200",
};

const QUALITY_META = {
  unreviewed: "bg-amber-50 text-amber-700",
  valid: "bg-emerald-50 text-emerald-700",
  invalid: "bg-rose-50 text-rose-700",
};
const QUALIFICATION_META = {
  validation:
    "bg-slate-100 text-slate-700",
  ai_discovery:
    "bg-cyan-50 text-cyan-700",
  discovery_complete:
    "bg-indigo-50 text-indigo-700",
  awaiting_handoff_confirmation:
    "bg-violet-50 text-violet-700",
  sales_ready:
    "bg-emerald-50 text-emerald-700",
  nurture:
    "bg-amber-50 text-amber-700",
  review:
    "bg-orange-50 text-orange-700",
  invalid:
    "bg-rose-50 text-rose-700",
  disqualified:
    "bg-rose-50 text-rose-700",
  deferred:
    "bg-slate-100 text-slate-600",
  lost:
    "bg-slate-100 text-slate-600",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value, includeTime = false) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  });
}

function getLeadName(lead) {
  return (
    lead?.contact?.full_name ||
    lead?.company?.name ||
    lead?.title ||
    "Untitled lead"
  );
}

function getInitials(name) {
  return String(name || "Lead")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/*
  Frontend-only provisional workspace detection.

  IMPORTANT:
  This does not alter the CRM database.
  Later we will replace this with a proper persisted
  business_unit / pipeline configuration.
*/
function getLeadWorkspace(lead) {
  const text = [
    lead?.requirement,
    lead?.title,
    lead?.company?.name,
    lead?.campaign,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const businessTerms = [
    "lms",
    "crm",
    "erp",
    "hrms",
    "website",
    "software",
    "portal",
    "management system",
    "institution management",
    "custom application",
    "business solution",
  ];

  const admissionTerms = [
    "admission",
    "course",
    "data science",
    "data analytics",
    "generative ai",
    "agentic ai",
    "python",
    "student",
    "training",
    "certification",
    "counselling",
  ];

  if (businessTerms.some((term) => text.includes(term))) {
    return "business";
  }

  if (admissionTerms.some((term) => text.includes(term))) {
    return "admissions";
  }

  return "unclassified";
}

function getWorkspaceLabel(lead) {
  const workspace = getLeadWorkspace(lead);

  if (workspace === "business") {
    return "Business Solutions";
  }

  if (workspace === "admissions") {
    return "Admissions";
  }

  return "Unclassified";
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "slate",
  onClick,
}) {
  const tones = {
    slate: "from-slate-950 to-slate-800 text-white",
    cyan: "from-cyan-500 to-sky-600 text-white",
    emerald: "from-emerald-500 to-teal-600 text-white",
    amber: "from-amber-400 to-orange-500 text-slate-950",
    violet: "from-violet-500 to-indigo-600 text-white",
    rose: "from-rose-500 to-pink-600 text-white",
  };

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[24px] border border-white/60 bg-gradient-to-br ${
        tones[tone] || tones.slate
      } p-5 text-left shadow-[0_18px_50px_rgba(15,23,42,0.10)] transition ${
        onClick
          ? "hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
          : ""
      }`}
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">
            {label}
          </p>

          <p className="mt-3 text-3xl font-black tracking-tight">
            {value}
          </p>

          <p className="mt-2 text-sm opacity-75">
            {detail}
          </p>
        </div>

        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
          <Icon size={20} />
        </span>
      </div>
    </Wrapper>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">
          {eyebrow}
        </p>

        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
          {title}
        </h2>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}

function EmptyState({
  icon: Icon = FiTarget,
  title,
  text,
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Icon size={23} />
      </span>

      <h3 className="mt-4 text-base font-bold text-slate-800">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function LeadTable({
  leads,
  loading,
  selectedLead,
  onSelect,
  showLimit = null,
}) {
  const rows = showLimit
    ? leads.slice(0, showLimit)
    : leads;

  if (!loading && rows.length === 0) {
    return (
      <EmptyState
        title="No leads match this view"
        text="Try changing the workspace, search term, date range or filters."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1740px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
            {[
              "Lead",
  "Workspace",
  "Company",
  "Source",
  "Lead Stage",
  "Opportunity",
  "Score",
  "Validation",
  "Qualification",
  "Activity / Next Action",
  "Deal",
  "Sales Ready",
  "Value",
            ].map((heading) => (
              <th
                key={heading}
                className="px-5 py-4 text-xs font-black uppercase tracking-[0.13em] text-slate-500"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading &&
            [1, 2, 3, 4].map((item) => (
              <tr
                key={item}
                className="border-b border-slate-100"
              >
                <td
                  colSpan="13"
                  className="px-5 py-4"
                >
                  <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
                </td>
              </tr>
            ))}

          {!loading &&
            rows.map((lead) => {
              const name =
                getLeadName(lead);

              const status =
                String(
                  lead?.status || "open"
                ).toLowerCase();

              const quality =
                String(
                  lead?.quality_status ||
                    "unreviewed"
                ).toLowerCase();
                const qualificationStage =
  String(
    lead?.qualification_stage ||
      "validation"
  ).toLowerCase();

const qualificationLabel =
  lead?.qualification_state
    ? qualificationStage
        .replace(/_/g, " ")
    : "not evaluated";

const salesReady =
  lead?.sales_ready === true;

              return (
                <tr
                  key={lead.id}
                  onClick={() =>
                    onSelect(lead)
                  }
                  className={`cursor-pointer border-b transition ${
                    selectedLead?.id === lead.id
                      ? "border-cyan-200 bg-cyan-50/80"
                      : "border-slate-100 bg-white hover:bg-slate-50"
                  }`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-sm font-black text-white">
                        {getInitials(name)}
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-[240px] truncate text-sm font-bold text-slate-900">
                          {name}
                        </p>

                        <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500">
                          {lead?.requirement ||
                            lead?.title ||
                            "No requirement supplied"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                      {getWorkspaceLabel(
                        lead
                      )}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {lead?.company?.name ||
                        "—"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {lead?.contact?.email ||
                        "No email"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {lead?.source ||
                        "Direct"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {lead?.stage?.name ||
                        "New"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-sm font-bold text-slate-800">
                      {lead?.latest_opportunity?.stage?.name || "—"}
                    </p>
                    <p className="mt-1 text-[11px] capitalize text-slate-400">
                      {lead?.latest_opportunity?.pipeline?.name || "No opportunity"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <div className="w-[110px]">
                      <div className="mb-2 flex justify-between text-xs">
                        <span className="font-black text-slate-800">
                          {Number(
                            lead?.lead_score ||
                              0
                          )}
                        </span>

                        <span className="text-slate-400">
                          /100
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-600"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                Number(
                                  lead?.lead_score ||
                                    0
                                )
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                        QUALITY_META[
                          quality
                        ] ||
                        QUALITY_META
                          .unreviewed
                      }`}
                    >
                      {quality}
                    </span>
                  </td>
                  <td className="px-5 py-4">
  <span
    className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
      QUALIFICATION_META[
        qualificationStage
      ] ||
      "bg-slate-100 text-slate-600"
    }`}
  >
    {qualificationLabel}
  </span>

  {lead?.qualification_state && (
    <p className="mt-1 text-[11px] text-slate-400">
      {Number(
        lead
          ?.qualification_completeness ||
          0
      )}
      % complete
    </p>
  )}
</td>

                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                      lead?.follow_up_summary?.tone || "bg-slate-100 text-slate-600"
                    }`}>
                      {lead?.follow_up_summary?.label || "No activity"}
                    </span>
                    <p className="mt-1 max-w-[210px] truncate text-[11px] text-slate-400">
                      {lead?.follow_up_summary?.next_action || "No next action"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black uppercase ${
                      lead?.deal_status === "won"
                        ? "bg-emerald-100 text-emerald-800"
                        : lead?.deal_status === "lost"
                          ? "bg-rose-100 text-rose-700"
                          : lead?.deal_status === "open"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-slate-100 text-slate-500"
                    }`}>
                      {lead?.deal_status || "No deal"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
  <span
    className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ring-1 ${
      salesReady
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : "bg-slate-50 text-slate-600 ring-slate-200"
    }`}
  >
    {salesReady
      ? "YES"
      : "NO"}
  </span>

  {lead?.handoff_intent && (
    <p className="mt-1 text-[11px] capitalize text-slate-400">
      {String(
        lead.handoff_intent
      ).replace(
        /_/g,
        " "
      )}
    </p>
  )}
</td>

                  <td className="px-5 py-4">
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(
                        lead?.latest_opportunity
                          ?.estimated_value ??
                          lead?.estimated_value
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(
                        lead?.created_at
                      )}
                    </p>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

function LeadDrawer({
  lead,
  onClose,
  onQualified,
  validation,
  onValidated,
  onScoreUpdated,
  scoreRefreshKey,
  opportunity,
  opportunityBusy,
  onCreateOpportunity,
  onCloseWon,
  closeWonBusy,
  onActivitySaved,
}) {
  if (!lead) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close lead details"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-[680px] overflow-y-auto border-l border-slate-200 bg-[#f8fafc] shadow-[-30px_0_80px_rgba(15,23,42,0.18)]">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
                <FiZap />
                Lead Intelligence
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                {getLeadName(lead)}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {lead?.requirement ||
                  lead?.title ||
                  "No requirement supplied"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-100"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-950">
                Lead details
              </h3>

              <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                {getWorkspaceLabel(
                  lead
                )}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [
                  "Company",
                  lead?.company?.name ||
                    "—",
                ],
                [
                  "Contact",
                  lead?.contact
                    ?.full_name ||
                    getLeadName(lead),
                ],
                [
                  "Email",
                  lead?.contact?.email ||
                    "—",
                ],
                [
                  "Phone",
                  lead?.contact?.phone ||
                    "—",
                ],
                [
                  "Source",
                  lead?.source ||
                    "Direct",
                ],
                [
                  "Campaign",
                  lead?.campaign ||
                    "—",
                ],
                [
                  "Lead stage",
                  lead?.stage?.name ||
                    "New",
                ],
                [
                  "Opportunity stage",
                  lead?.latest_opportunity?.stage?.name || "—",
                ],
                [
                  "Activity status",
                  lead?.follow_up_summary?.label || "No activity",
                ],
                [
                  "Deal status",
                  lead?.deal_status || "No deal",
                ],
                [
                  "Status",
                  lead?.status ||
                    "open",
                ],
                [
                  "Quality",
                  lead?.quality_status ||
                    "unreviewed",
                ],
                [
                  "Lead score",
                  `${Number(
                    lead?.lead_score || 0
                  )}/100`,
                ],
                [
                  "Deal value",
                  formatCurrency(
                    lead?.latest_opportunity
                      ?.estimated_value ??
                      lead?.estimated_value
                  ),
                ],
                [
                  "Created",
                  formatDate(
                    lead?.created_at,
                    true
                  ),
                ],
              ].map(
                ([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">
                      {label}
                    </p>

                    <p className="mt-2 break-words text-sm font-semibold text-slate-900">
                      {value}
                    </p>
                  </div>
                )
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">
                Requirement
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                {lead?.requirement ||
                  lead?.title ||
                  "No requirement supplied."}
              </p>
            </div>
          </section>
          <CrmLeadValidationPanel
  key={`validation-${lead.id}`}
  lead={lead}
  initialValidation={
    validation
  }
  onValidated={(
    nextValidation
  ) =>
    onValidated?.(
      lead,
      nextValidation
    )
  }
/>
<CrmAiConversationPanel
  key={`conversation-${lead.id}`}
  lead={lead}
  onScoreUpdated={
    onScoreUpdated
  }
/>
<CrmHumanCallPanel
  key={`human-call-${lead.id}`}
  lead={lead}
  onActivitySaved={onActivitySaved}
/>
<CrmLeadScorePanel
  key={`score-${lead.id}`}
  lead={lead}
  refreshKey={
    scoreRefreshKey
  }
/>

          <CrmAiQualificationPanel
            key={lead.id}
            lead={lead}
            onQualified={onQualified}
          />

          <OpportunityCreationPanel
            lead={lead}
            opportunity={opportunity}
            busy={opportunityBusy}
            onCreate={onCreateOpportunity}
            onCloseWon={onCloseWon}
            closeWonBusy={closeWonBusy}
          />
        </div>
      </aside>
    </div>
  );
}

function InfoModal({
  modal,
  onClose,
}) {
  if (!modal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-lg rounded-[28px] border border-white/60 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.30)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <FiZap size={20} />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <FiX />
          </button>
        </div>

        <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          {modal.title}
        </h3>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          {modal.text}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
        >
          Understood
          <FiArrowRight />
        </button>
      </div>
    </div>
  );
}
function OpportunityStageModal({
  opportunity,
  busy,
  onClose,
  onMove,
}) {
  if (!opportunity) {
    return null;
  }

  const stages = Array.isArray(
    opportunity?.available_stages
  )
    ? [...opportunity.available_stages].sort(
        (a, b) =>
          Number(a?.stage_order ?? 999) -
          Number(b?.stage_order ?? 999)
      )
    : [];

  const currentStageId =
    opportunity?.stage_id ||
    opportunity?.stage?.id ||
    null;

  const currentStageName =
    opportunity?.stage?.name ||
    "Unassigned";

  const pipelineName =
    opportunity?.pipeline?.name ||
    "Opportunity Pipeline";

  const opportunityName =
    opportunity?.opportunity_name ||
    opportunity?.company?.name ||
    opportunity?.contact?.full_name ||
    "Opportunity";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close stage editor"
        onClick={
          busy ? undefined : onClose
        }
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-xl overflow-hidden rounded-[30px] border border-white/60 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.32)]">
        <div className="border-b border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 px-6 py-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                <FiLayers />
                Pipeline movement
              </div>

              <h3 className="mt-3 text-2xl font-black tracking-tight">
                Move opportunity
              </h3>

              <p className="mt-2 text-sm text-slate-300">
                {opportunityName}
              </p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiX />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
                Pipeline
              </p>

              <p className="mt-2 text-sm font-bold text-slate-900">
                {pipelineName}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-cyan-600">
                Current stage
              </p>

              <p className="mt-2 text-sm font-black text-cyan-900">
                {currentStageName}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Select destination stage
            </p>

            {stages.length ? (
              <div className="mt-3 space-y-2">
                {stages.map((stage) => {
                  const isCurrent =
                    stage.id ===
                    currentStageId;

                  return (
                    <button
                      type="button"
                      key={stage.id}
                      disabled={
                        busy || isCurrent
                      }
                      onClick={() =>
                        onMove(
                          opportunity,
                          stage.id
                        )
                      }
                      className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${
                        isCurrent
                          ? "cursor-default border-cyan-200 bg-cyan-50"
                          : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/40"
                      } ${
                        busy
                          ? "cursor-wait opacity-60"
                          : ""
                      }`}
                    >
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {stage.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Probability{" "}
                          {Number(
                            stage?.probability ??
                              0
                          )}
                          %
                        </p>
                      </div>

                      {isCurrent ? (
                        <span className="rounded-full bg-cyan-100 px-3 py-1.5 text-xs font-black text-cyan-700">
                          Current
                        </span>
                      ) : (
                        <FiArrowRight className="text-slate-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-800">
                  No configured pipeline stages were returned for this opportunity.
                </p>
              </div>
            )}
          </div>

          <p className="mt-5 text-xs leading-5 text-slate-400">
            Stage changes are saved to the opportunity pipeline.
            Lead qualification and LMS data are not changed.
          </p>
        </div>
      </div>
    </div>
  );
}
export default function CrmDashboard() {
  const [leads, setLeads] =
    useState([]);
    const [
  opportunities,
  setOpportunities,
] = useState([]);

  const [
    organization,
    setOrganization,
  ] = useState(null);

  const [crmUser, setCrmUser] =
    useState(null);

  const [
    pagination,
    setPagination,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    activeView,
    setActiveView,
  ] = useState("overview");

  const [
    workspace,
    setWorkspace,
  ] = useState("all");

  const [search, setSearch] =
    useState("");

  const [
    selectedLead,
    setSelectedLead,
  ] = useState(null);

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    qualityFilter,
    setQualityFilter,
  ] = useState("all");

  const [
    dateRange,
    setDateRange,
  ] = useState("all");

  const [
    filterOpen,
    setFilterOpen,
  ] = useState(false);

  const [
    dateOpen,
    setDateOpen,
  ] = useState(false);

  const [
    notificationsOpen,
    setNotificationsOpen,
  ] = useState(false);

  const [modal, setModal] =
    useState(null);
    const [
  stageEditorOpportunity,
  setStageEditorOpportunity,
] = useState(null);

const [
  stageUpdateBusy,
  setStageUpdateBusy,
] = useState(false);
    const [
  validationsByLead,
  setValidationsByLead,
] = useState({});
const [
  scoreRefreshByLead,
  setScoreRefreshByLead,
] = useState({});
const [
  opportunityCreateBusyLeadId,
  setOpportunityCreateBusyLeadId,
] = useState(null);
const [closeWonBusyOpportunityId, setCloseWonBusyOpportunityId] = useState(null);

  
async function loadDashboard(
    refreshingRequest = false
  ) {
    try {
      setError("");

      if (refreshingRequest) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [
  result,
  scoreResult,
  qualificationResult,
  followUpResult,
] = await Promise.all([
  getCrmLeads({
    page: 1,
    limit: 100,
  }),

  getCrmLeadScores(),

  getCrmQualificationStates(),
  getCrmFollowUps({ limit: 250 }),
]);

let opportunityResult = {
  data: [],
};

try {
  opportunityResult =
    await getCrmOpportunities();
} catch (opportunityError) {
  console.error(
    "CRM opportunity loading error:",
    opportunityError
  );

  opportunityResult = {
    data: [],
  };
}

const incomingLeads =
  result?.data || [];

const scoreRows =
  scoreResult?.data || [];
  const qualificationRows =
  qualificationResult?.data || [];
  const opportunityRows =
  opportunityResult?.data || [];
  const followUpRows = followUpResult?.data || [];

const scoreByLead =
  new Map();

scoreRows.forEach(
  (score) => {
    if (
      score?.lead_id &&
      !scoreByLead.has(
        score.lead_id
      )
    ) {
      scoreByLead.set(
        score.lead_id,
        score
      );
    }
  }
);
const qualificationByLead =
  new Map();

qualificationRows.forEach(
  (qualification) => {
    if (
      qualification?.lead_id &&
      !qualificationByLead.has(
        qualification.lead_id
      )
    ) {
      qualificationByLead.set(
        qualification.lead_id,
        qualification
      );
    }
  }
);

// Opportunity value is stored in crm_opportunities, not crm_leads. Keep the
// latest opportunity attached even after it becomes won/lost so the lead row
// does not lose its commercial history.
const openOpportunityByLead =
  new Map();
const latestOpportunityByLead = new Map();

opportunityRows.forEach(
  (opportunity) => {
    if (opportunity?.lead_id && !latestOpportunityByLead.has(opportunity.lead_id)) {
      latestOpportunityByLead.set(opportunity.lead_id, opportunity);
    }
    if (
      opportunity?.lead_id &&
      String(
        opportunity?.status || "open"
      ).toLowerCase() === "open" &&
      !openOpportunityByLead.has(
        opportunity.lead_id
      )
    ) {
      openOpportunityByLead.set(
        opportunity.lead_id,
        opportunity
      );
    }
  }
);

const followUpsByLead = new Map();
followUpRows.forEach((task) => {
  if (!task?.lead_id) return;
  const rows = followUpsByLead.get(task.lead_id) || [];
  rows.push(task);
  followUpsByLead.set(task.lead_id, rows);
});

function summarizeFollowUps(rows = []) {
  const openStatuses = new Set(["pending", "scheduled", "processing"]);
  const open = rows.filter((row) => openStatuses.has(String(row?.status || "").toLowerCase()));
  const completed = rows.filter((row) => String(row?.status || "").toLowerCase() === "completed");
  const now = Date.now();
  const next = [...open].sort((a, b) => {
    const aTime = a?.scheduled_at ? new Date(a.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b?.scheduled_at ? new Date(b.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  })[0] || null;

  if (next) {
    const due = next?.scheduled_at ? new Date(next.scheduled_at).getTime() : null;
    const overdue = Number.isFinite(due) && due < now;
    return {
      label: overdue ? "Overdue" : "Follow-up due",
      tone: overdue ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700",
      next_action: next.reason || next.job_type || "Scheduled follow-up",
      scheduled_at: next.scheduled_at || null,
      open_count: open.length,
      completed_count: completed.length,
    };
  }

  if (completed.length) {
    const latestCompleted = [...completed].sort(
      (a, b) => new Date(b.completed_at || b.updated_at || 0) - new Date(a.completed_at || a.updated_at || 0)
    )[0];
    return {
      label: "Completed",
      tone: "bg-emerald-50 text-emerald-700",
      next_action: latestCompleted?.reason || "No pending follow-up",
      scheduled_at: null,
      open_count: 0,
      completed_count: completed.length,
    };
  }

  return { label: "No activity", tone: "bg-slate-100 text-slate-600", next_action: null, open_count: 0, completed_count: 0 };
}

const enrichedLeads =
  incomingLeads.map(
    (lead) => {
      const dynamicScore =
        scoreByLead.get(
          lead.id
        ) || null;

      const qualificationState =
        qualificationByLead.get(
          lead.id
        ) || null;

      const openOpportunity =
        openOpportunityByLead.get(
          lead.id
        ) || null;
      const latestOpportunity = latestOpportunityByLead.get(lead.id) || openOpportunity;
      const followUpSummary = summarizeFollowUps(followUpsByLead.get(lead.id) || []);

      return {
        ...lead,

        open_opportunity:
          openOpportunity,
        latest_opportunity: latestOpportunity,
        deal_status: latestOpportunity ? String(latestOpportunity.status || "open").toLowerCase() : null,
        follow_up_summary: followUpSummary,

        legacy_lead_score:
          lead?.lead_score ?? 0,

        lead_score:
          dynamicScore
            ?.overall_score ??
          lead?.lead_score ??
          0,

        dynamic_score:
          dynamicScore,

        qualification_state:
          qualificationState,

        sales_ready:
          qualificationState
            ?.sales_ready === true,

        sales_ready_status:
          qualificationState
            ?.sales_ready_status ||
          "not_ready",

        qualification_stage:
          qualificationState
            ?.qualification_stage ||
          null,

        qualification_completeness:
          Number(
            qualificationState
              ?.qualification_completeness ||
            0
          ),

        handoff_intent:
          qualificationState
            ?.handoff_intent ||
          "not_asked",
      };
    }
  );
setOpportunities(
  opportunityRows
);
setLeads(enrichedLeads);

      setSelectedLead(
        (currentLead) => {
          if (!currentLead) {
            return null;
          }

          return (
            enrichedLeads.find(
              (lead) =>
                lead.id ===
                currentLead.id
            ) || currentLead
          );
        }
      );

      setOrganization(
        result?.organization ||
          null
      );

      setCrmUser(
        result?.user ||
          null
      );

      setPagination(
        result?.pagination ||
          null
      );
    } catch (err) {
      console.error(
        "CRM dashboard error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load CRM data."
      );
        } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }


  // ------------------------------------------------------------
  // OPPORTUNITY STAGE UPDATE
  // ------------------------------------------------------------

  async function handleOpportunityStageUpdate(
    opportunity,
    destinationStageId
  ) {
    if (
      !opportunity?.id ||
      !destinationStageId
    ) {
      return;
    }

    try {
      setStageUpdateBusy(true);
      setError("");

      await updateCrmOpportunityStage(
        opportunity.id,
        destinationStageId
      );

      setStageEditorOpportunity(
        null
      );

      await loadDashboard(true);
    } catch (stageUpdateError) {
      console.error(
        "CRM opportunity stage update error:",
        stageUpdateError
      );

      setError(
        stageUpdateError?.message ||
          "Opportunity stage could not be updated."
      );
    } finally {
      setStageUpdateBusy(false);
    }
  }

  async function handleCreateOpportunity(
    lead,
    payload
  ) {
    if (!lead?.id || lead?.sales_ready !== true) {
      return;
    }

    try {
      setOpportunityCreateBusyLeadId(lead.id);
      setError("");

      const result = await createCrmOpportunity(
        lead.id,
        payload
      );

      setModal({
        title: result?.created
          ? "Opportunity created"
          : "Opportunity already exists",
        text:
          result?.message ||
          "The Sales-Ready lead is now available in the pipeline.",
      });

      await loadDashboard(true);
    } catch (opportunityError) {
      console.error(
        "CRM opportunity creation error:",
        opportunityError
      );

      setError(
        opportunityError?.message ||
          "Opportunity could not be created."
      );
    } finally {
      setOpportunityCreateBusyLeadId(null);
    }
  }

  async function handleCloseWon(opportunity, payload) {
    if (!opportunity?.id) return;
    try {
      setCloseWonBusyOpportunityId(opportunity.id);
      setError("");
      const result = await closeCrmOpportunityWon(opportunity.id, payload);
      setModal({
        title: "Deal finalised",
        text: result?.message || "The work order was recorded and the opportunity was closed as won.",
      });
      await loadDashboard(true);
    } catch (closeError) {
      setError(closeError?.message || "The work order could not be recorded.");
    } finally {
      setCloseWonBusyOpportunityId(null);
    }
  }


  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredLeads =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const now =
        new Date();

      return leads.filter(
        (lead) => {
          if (
            workspace !==
              "all" &&
            getLeadWorkspace(
              lead
            ) !== workspace
          ) {
            return false;
          }

          if (
            statusFilter !==
              "all" &&
            String(
              lead?.status ||
                "open"
            ).toLowerCase() !==
              statusFilter
          ) {
            return false;
          }

          if (
            qualityFilter !==
              "all" &&
            String(
              lead?.quality_status ||
                "unreviewed"
            ).toLowerCase() !==
              qualityFilter
          ) {
            return false;
          }

          if (
            dateRange !== "all"
          ) {
            const created =
              new Date(
                lead?.created_at
              );

            if (
              Number.isNaN(
                created.getTime()
              )
            ) {
              return false;
            }

            const days =
              dateRange === "7"
                ? 7
                : 30;

            const cutoff =
              new Date(now);

            cutoff.setDate(
              cutoff.getDate() -
                days
            );

            if (
              created < cutoff
            ) {
              return false;
            }
          }

          if (!query) {
            return true;
          }

          const searchable = [
            lead?.title,
            lead?.requirement,
            lead?.source,
            lead?.medium,
            lead?.campaign,
            lead?.company?.name,
            lead?.contact
              ?.full_name,
            lead?.contact?.email,
            lead?.contact?.phone,
            lead?.stage?.name,
            lead?.status,
            lead?.quality_status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }, [
      leads,
      workspace,
      search,
      statusFilter,
      qualityFilter,
      dateRange,
    ]);
const filteredOpportunities =
  useMemo(() => {
    const query =
      search
        .trim()
        .toLowerCase();

    const now =
      new Date();

    return opportunities.filter(
      (opportunity) => {
        // --------------------------------------
        // WORKSPACE FILTER
        // --------------------------------------

        if (
          workspace ===
            "admissions" &&
          opportunity
            ?.business_unit !==
            "admissions"
        ) {
          return false;
        }

        if (
          workspace ===
            "business" &&
          opportunity
            ?.business_unit !==
            "business_solutions"
        ) {
          return false;
        }

        // --------------------------------------
        // DATE FILTER
        // --------------------------------------

        if (
          dateRange !== "all"
        ) {
          const created =
            new Date(
              opportunity
                ?.created_at
            );

          if (
            Number.isNaN(
              created.getTime()
            )
          ) {
            return false;
          }

          const days =
            dateRange === "7"
              ? 7
              : 30;

          const cutoff =
            new Date(now);

          cutoff.setDate(
            cutoff.getDate() -
              days
          );

          if (
            created < cutoff
          ) {
            return false;
          }
        }

        // --------------------------------------
        // SEARCH FILTER
        // --------------------------------------

        if (!query) {
          return true;
        }

        const searchable = [
          opportunity
            ?.opportunity_name,
          opportunity
            ?.opportunity_type,
          opportunity
            ?.business_unit,
          opportunity
            ?.status,
          opportunity
            ?.company?.name,
          opportunity
            ?.contact?.full_name,
          opportunity
            ?.contact?.email,
          opportunity
            ?.pipeline?.name,
          opportunity
            ?.stage?.name,
          opportunity
            ?.lead?.requirement,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(
          query
        );
      }
    );
  }, [
    opportunities,
    workspace,
    search,
    dateRange,
  ]);
  const metrics =
    useMemo(() => {
      const total =
        filteredLeads.length;

      const open =
        filteredLeads.filter(
          (lead) =>
            String(
              lead?.status ||
                ""
            ).toLowerCase() ===
            "open"
        ).length;

      // Current handoff queue only. Won/lost leads keep their historical
      // qualification evidence but no longer inflate the active KPI.
      const salesReady = filteredLeads.filter((lead) => {
        const dealStatus = String(lead?.deal_status || "").toLowerCase();
        return lead?.sales_ready === true && !["won", "lost"].includes(dealStatus);
      }).length;
  const inDiscovery =
  filteredLeads.filter(
    (lead) =>
      [
        "ai_discovery",
        "discovery_complete",
        "awaiting_handoff_confirmation",
        "nurture",
      ].includes(
        String(
          lead
            ?.qualification_stage ||
            ""
        ).toLowerCase()
      )
  ).length;

      const review =
        filteredLeads.filter(
          (lead) => {
            const qualityStatus = String(
              lead?.quality_status || "unreviewed"
            ).toLowerCase();

            const qualificationStage = String(
              lead?.qualification_stage || ""
            ).toLowerCase();

            return (
              ["unreviewed", "needs_review"].includes(qualityStatus) ||
              qualificationStage === "review"
            );
          }
        ).length;

      const invalid =
        filteredLeads.filter(
          (lead) =>
            String(
              lead?.quality_status ||
                ""
            ).toLowerCase() ===
            "invalid"
        ).length;

      const wonOpportunities = filteredOpportunities.filter(
        (opportunity) => String(opportunity?.status || "").toLowerCase() === "won"
      );

      const lostOpportunities = filteredOpportunities.filter(
        (opportunity) => String(opportunity?.status || "").toLowerCase() === "lost"
      );

      const converted = wonOpportunities.length;

      const scored =
        filteredLeads.filter(
          (lead) =>
            Number(
              lead?.lead_score ||
                0
            ) > 0
        ).length;

      const followUps = filteredLeads.filter(
        (lead) => Number(lead?.follow_up_summary?.open_count || 0) > 0
      ).length;

      const openOpportunities =
  filteredOpportunities.filter(
    (opportunity) =>
      String(
        opportunity?.status ||
          ""
      ).toLowerCase() ===
      "open"
  );

const pipelineValue =
  openOpportunities.reduce(
    (sum, opportunity) =>
      sum +
      Number(
        opportunity
          ?.estimated_value ||
          0
      ),
    0
  );

const weightedPipelineValue =
  openOpportunities.reduce(
    (sum, opportunity) => {
      const value =
        Number(
          opportunity
            ?.estimated_value ||
            0
        );

      const probability =
        Number(
          opportunity
            ?.stage?.probability ??
          opportunity
            ?.probability ??
          0
        );

      return (
        sum +
        value *
          (probability / 100)
      );
    },
    0
  );

const opportunityCount =
  openOpportunities.length;

const wonRevenue = wonOpportunities.reduce(
  (sum, opportunity) =>
    sum + Number(opportunity?.actual_value || opportunity?.estimated_value || 0),
  0
);

      // Lead-to-opportunity conversion is derived from actual
      // opportunity rows. A Sales-Ready lead is not counted as
      // converted until an opportunity has been created.
      const conversionRate =
        total
          ? Math.round(
              (wonOpportunities.length /
                total) *
                100
            )
          : 0;

      return {
  total,
  open,
  salesReady,
  inDiscovery,
  review,
  invalid,
  converted,
  scored,
  followUps,

  pipelineValue,
  weightedPipelineValue,
  opportunityCount,
  wonCount: wonOpportunities.length,
  lostCount: lostOpportunities.length,
  wonRevenue,

  conversionRate,
};
    }, [
  filteredLeads,
  filteredOpportunities,
]);

  const sourceSummary =
    useMemo(() => {
      const map = {};

      filteredLeads.forEach(
        (lead) => {
          const source =
            String(
              lead?.source ||
                "Direct"
            ).trim() ||
            "Direct";

          if (!map[source]) {
            map[source] = {
              source,
              count: 0,
              value: 0,
            };
          }

          map[source].count +=
            1;

          map[source].value +=
            Number(
              lead?.estimated_value ||
                0
            );
        }
      );

      return Object.values(
        map
      ).sort(
        (a, b) =>
          b.count - a.count
      );
    }, [filteredLeads]);

  const stageSummary =
  useMemo(() => {
    const map = {};

    filteredOpportunities.forEach(
      (opportunity) => {
        const stageName =
          opportunity?.stage?.name ||
          "Unassigned";

        const stageOrder =
          Number(
            opportunity?.stage
              ?.stage_order ??
              999
          );

        const probability =
          Number(
            opportunity?.stage
              ?.probability ??
              opportunity
                ?.probability ??
              0
          );

        const pipelineName =
          opportunity?.pipeline
            ?.name ||
          "Opportunity Pipeline";

        const pipelineKey =
          opportunity?.pipeline
            ?.pipeline_key ||
          "unknown";

        const key =
          `${pipelineKey}:${stageName}`;

        if (!map[key]) {
          map[key] = {
            key,
            stage: stageName,
            stageOrder,
            probability,
            pipelineName,
            pipelineKey,
            count: 0,
            value: 0,
            weightedValue: 0,
            opportunities: [],
          };
        }

        const value =
          Number(
            opportunity
              ?.estimated_value ||
              0
          );

        map[key].count += 1;

        map[key].value +=
          value;

        map[key].weightedValue +=
          value *
          (probability / 100);

        map[key].opportunities.push(
          opportunity
        );
      }
    );

    return Object.values(map).sort(
      (a, b) => {
        if (
          a.pipelineName !==
          b.pipelineName
        ) {
          return a.pipelineName
            .localeCompare(
              b.pipelineName
            );
        }

        return (
          a.stageOrder -
          b.stageOrder
        );
      }
    );
  }, [filteredOpportunities]);

  const companies =
    useMemo(() => {
      const map =
        new Map();

      filteredLeads.forEach(
        (lead) => {
          const company =
            lead?.company;

          if (!company?.name) {
            return;
          }

          const key =
            company.id ||
            company.name.toLowerCase();

          if (!map.has(key)) {
            map.set(key, {
              ...company,
              leads: 0,
              value: 0,
            });
          }

          const current =
            map.get(key);

          current.leads += 1;

          current.value +=
            Number(
              lead?.estimated_value ||
                0
            );
        }
      );

      return Array.from(
        map.values()
      );
    }, [filteredLeads]);

  const contacts =
    useMemo(
      () =>
        filteredLeads
          .filter(
            (lead) =>
              lead?.contact
          )
          .map((lead) => ({
            ...lead.contact,
            lead,
          })),
      [filteredLeads]
    );

  const followUpLeads =
    useMemo(
      () =>
        filteredLeads
          .filter(
            (lead) =>
              lead?.next_follow_up_at
          )
          .sort(
            (a, b) =>
              new Date(
                a.next_follow_up_at
              ).getTime() -
              new Date(
                b.next_follow_up_at
              ).getTime()
          ),
      [filteredLeads]
    );

  function openLead(lead) {
    setSelectedLead(lead);
  }
  function handleLeadValidated(
  lead,
  validation
) {
  if (
    !lead?.id ||
    !validation
  ) {
    return;
  }

  setValidationsByLead(
    (current) => ({
      ...current,
      [lead.id]:
        validation,
    })
  );

  loadDashboard(true);
}
async function handleScoreUpdated(
  scoreResponse
) {
  const leadId =
    scoreResponse?.score
      ?.lead_id;

  if (!leadId) {
    return;
  }

  // Force only this lead's score panel
  // to reload its fresh CRM score.
  setScoreRefreshByLead(
    (current) => ({
      ...current,
      [leadId]:
        Number(
          current[leadId] || 0
        ) + 1,
    })
  );

  // Refresh dashboard data so the
  // lead table, KPI and selected lead
  // use the newly saved dynamic score.
  await loadDashboard(true);
}

  function showBackendPending(
    title,
    text
  ) {
    setModal({
      title,
      text,
    });
  }

  function renderOverview() {
    return (
      <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            icon={FiUsers}
            label="Total leads"
            value={metrics.total}
            detail="Current CRM view"
            tone="slate"
            onClick={() =>
              setActiveView(
                "leads"
              )
            }
          />

          <KpiCard
  icon={FiCheckCircle}
  label="Sales-Ready Qualified"
  value={
    metrics.salesReady
  }
  detail="Ready for human handoff"
  tone="emerald"
  onClick={() =>
    setActiveView(
      "leads"
    )
  }
/>

          <KpiCard
            icon={FiAlertCircle}
            label="Needs review"
            value={
              metrics.review
            }
            detail="Awaiting validation"
            tone="amber"
            onClick={() => {
              setQualityFilter(
                "unreviewed"
              );
              setActiveView(
                "leads"
              );
            }}
          />

          <KpiCard
  icon={FiZap}
  label="AI Discovery"
  value={
    metrics.inDiscovery
  }
  detail="Qualification in progress"
  tone="cyan"
  onClick={() =>
    setActiveView(
      "leads"
    )
  }
/>

          <KpiCard
  icon={FiDollarSign}
  label="Pipeline value"
  value={formatCurrency(
    metrics.pipelineValue
  )}
  detail={`${
    metrics.opportunityCount
  } open ${
    metrics.opportunityCount ===
    1
      ? "opportunity"
      : "opportunities"
  } • Weighted ${formatCurrency(
    metrics.weightedPipelineValue
  )}`}
  tone="violet"
  onClick={() =>
    setActiveView(
      "pipeline"
    )
  }
/>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              eyebrow="Acquisition intelligence"
              title="Lead source performance"
              description="Real source distribution from the CRM leads currently loaded."
            />

            {sourceSummary.length ? (
              <div className="space-y-3">
                {sourceSummary
                  .slice(0, 8)
                  .map(
                    (item) => {
                      const share =
                        metrics.total
                          ? Math.round(
                              (item.count /
                                metrics.total) *
                                100
                            )
                          : 0;

                      return (
                        <button
                          type="button"
                          key={
                            item.source
                          }
                          onClick={() => {
                            setSearch(
                              item.source
                            );
                            setActiveView(
                              "leads"
                            );
                          }}
                          className="w-full rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-left transition hover:border-cyan-200 hover:bg-cyan-50/50"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {
                                  item.source
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  item.count
                                }{" "}
                                lead
                                {item.count ===
                                1
                                  ? ""
                                  : "s"}
                              </p>
                            </div>

                            <span className="text-sm font-black text-cyan-700">
                              {
                                share
                              }
                              %
                            </span>
                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-600"
                              style={{
                                width: `${share}%`,
                              }}
                            />
                          </div>
                        </button>
                      );
                    }
                  )}
              </div>
            ) : (
              <EmptyState
                icon={
                  FiBarChart2
                }
                title="No source data yet"
                text="Source attribution will appear here as leads enter the CRM."
              />
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              eyebrow="Priority centre"
              title="Follow-ups"
              description="Upcoming CRM follow-ups."
              action={
                <button
                  type="button"
                  onClick={() =>
                    setActiveView(
                      "activities"
                    )
                  }
                  className="text-sm font-bold text-cyan-700"
                >
                  View all →
                </button>
              }
            />

            <CrmFollowUpTasksPanel
              compact
              leads={filteredLeads}
              onOpenLead={openLead}
            />
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="p-6">
            <SectionTitle
              eyebrow="Live lead inbox"
              title="Recent leads"
              description="Click any lead to open its Lead Intelligence drawer."
              action={
                <button
                  type="button"
                  onClick={() =>
                    setActiveView(
                      "leads"
                    )
                  }
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
                >
                  View all leads
                </button>
              }
            />
          </div>

          <LeadTable
            leads={
              filteredLeads
            }
            loading={loading}
            selectedLead={
              selectedLead
            }
            onSelect={
              openLead
            }
            showLimit={7}
          />
        </section>
      </>
    );
  }

  function renderLeads() {
    return (
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="p-6">
          <SectionTitle
            eyebrow="Lead management"
            title="Lead inbox"
            description={`${filteredLeads.length} leads in the current view. Click a row to open Lead Intelligence.`}
          />
        </div>

        <LeadTable
          leads={filteredLeads}
          loading={loading}
          selectedLead={
            selectedLead
          }
          onSelect={openLead}
        />
      </section>
    );
  }

  function renderPipeline() {
    return (
      <section>
        <SectionTitle
          eyebrow="Pipeline"
          title="Opportunity pipeline"
          description="Sales-ready opportunities grouped by their actual commercial pipeline stage."
          action={
            <button
              type="button"
              onClick={() =>
                showBackendPending(
                  "Pipeline editing",
                  "Stage changes will be connected to the CRM lead update endpoint in the next backend phase. This view remains read-only so we do not create unpersisted fake data."
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
            >
              Manage stages
            </button>
          }
        />

        {stageSummary.length ? (
          <div className="grid gap-5 xl:grid-cols-4">
            {stageSummary.map(
              (stage) => (
                <div
                  key={
                    stage.key
                  }
                  className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-950">
                        {
                          stage.stage
                        }
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
  {stage.count}{" "}
  {stage.count === 1
    ? "opportunity"
    : "opportunities"}
</p>
                    </div>

                    <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-black text-cyan-700">
                      {formatCurrency(
                        stage.value
                      )}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {stage.opportunities.map(
  (opportunity) => (
                        <div
  key={opportunity.id}
  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-cyan-200 hover:bg-cyan-50/40"
>
  <p className="truncate text-sm font-bold text-slate-900">
    {opportunity?.opportunity_name ||
      opportunity?.company?.name ||
      opportunity?.contact?.full_name ||
      "Opportunity"}
  </p>

  <p className="mt-1 truncate text-xs text-slate-500">
    {opportunity?.lead?.requirement ||
      opportunity?.opportunity_type ||
      "Opportunity"}
  </p>

  <div className="mt-3 flex justify-between text-xs">
    <span>
      Probability{" "}
      {Number(
        opportunity?.stage?.probability ??
          opportunity?.probability ??
          0
      )}
      %
    </span>

    <span className="font-black">
      {formatCurrency(
        opportunity?.estimated_value ||
          0
      )}
    </span>
  </div>

  <div className="mt-4 grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => {
        const linkedLead =
          filteredLeads.find(
            (lead) =>
              lead.id ===
              opportunity.lead_id
          );

        if (linkedLead) {
          openLead(linkedLead);
        }
      }}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
    >
      View Lead
    </button>

    <button
      type="button"
      onClick={() =>
        setStageEditorOpportunity(
          opportunity
        )
      }
      className="rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-black text-white transition hover:bg-cyan-700"
    >
      Move Stage
    </button>
  </div>
</div>
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <EmptyState
  icon={FiLayers}
  title="No opportunities in pipeline"
  text="Sales-ready opportunities will appear here after qualification and human-handoff intent are confirmed."
/>
        )}
      </section>
    );
  }

  function renderCompanies() {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <SectionTitle
          eyebrow="Accounts"
          title="Companies"
          description="Organizations associated with CRM leads."
        />

        {companies.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {companies.map(
              (company) => (
                <button
                  type="button"
                  key={
                    company.id ||
                    company.name
                  }
                  onClick={() => {
                    setSearch(
                      company.name
                    );
                    setActiveView(
                      "leads"
                    );
                  }}
                  className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-5 text-left hover:border-cyan-200 hover:bg-cyan-50/50"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <FiBriefcase />
                    </span>

                    <div>
                      <h3 className="text-base font-black text-slate-950">
                        {
                          company.name
                        }
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          company.leads
                        }{" "}
                        linked leads
                      </p>
                    </div>
                  </div>

                  <p className="mt-5 text-sm font-bold text-slate-800">
                    {formatCurrency(
                      company.value
                    )}{" "}
                    pipeline
                  </p>
                </button>
              )
            )}
          </div>
        ) : (
          <EmptyState
            icon={FiBriefcase}
            title="No companies linked yet"
            text="Company records linked to leads will appear here."
          />
        )}
      </section>
    );
  }

  function renderContacts() {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <SectionTitle
          eyebrow="People"
          title="Contacts"
          description="Contacts associated with CRM leads."
        />

        {contacts.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {contacts.map(
              (
                contact,
                index
              ) => (
                <button
                  type="button"
                  key={
                    contact.id ||
                    `${
                      contact.email ||
                      "contact"
                    }-${index}`
                  }
                  onClick={() =>
                    openLead(
                      contact.lead
                    )
                  }
                  className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-5 text-left hover:border-cyan-200 hover:bg-cyan-50/50"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-sm font-black text-white">
                      {getInitials(
                        contact.full_name ||
                          "Contact"
                      )}
                    </span>

                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black text-slate-950">
                        {contact.full_name ||
                          "Unnamed contact"}
                      </h3>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {contact.email ||
                          "No email"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-slate-600">
                    {contact.phone ||
                      "No phone"}
                  </p>
                </button>
              )
            )}
          </div>
        ) : (
          <EmptyState
            icon={FiUsers}
            title="No contacts linked yet"
            text="Contact records will appear here."
          />
        )}
      </section>
    );
  }

  function renderActivities() {
    return (
      <div className="space-y-7">
        <CrmFollowUpTasksPanel
          leads={filteredLeads}
          onOpenLead={openLead}
        />
        <CrmCommunicationCentre
          leads={filteredLeads}
          onOpenLead={openLead}
        />
      </div>
    );
  }

  function renderCustomerSuccess() {
    return <CrmCustomerSuccessPanel />;
  }

  function renderReports() {
    const wonRows = filteredOpportunities.filter(
      (opportunity) => String(opportunity?.status || "").toLowerCase() === "won"
    );

    return (
      <section className="space-y-7">
        <SectionTitle
          eyebrow="Reporting"
          title="CRM performance"
          description="Reporting calculated from actual CRM lead data."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            icon={FiTarget}
            label="Active Sales Ready"
            value={metrics.salesReady}
            detail="Current human-handoff queue"
            tone="cyan"
            onClick={() => setActiveView("leads")}
          />

          <KpiCard
            icon={FiTrendingUp}
            label="Won conversion"
            value={`${metrics.conversionRate}%`}
            detail={`${metrics.wonCount} won deal(s)`}
            tone="emerald"
          />

          <KpiCard
            icon={FiDollarSign}
            label="Won revenue"
            value={formatCurrency(metrics.wonRevenue)}
            detail="Finalised commercial value"
            tone="violet"
          />

          <KpiCard
            icon={FiShield}
            label="Invalid"
            value={metrics.invalid}
            detail="Flagged records"
            tone="rose"
            onClick={() => {
              setQualityFilter("invalid");
              setActiveView("leads");
            }}
          />

          <KpiCard
            icon={FiClock}
            label="Follow-ups"
            value={metrics.followUps}
            detail="Open scheduled actions"
            tone="amber"
            onClick={() => setActiveView("activities")}
          />

          <KpiCard
            icon={FiLayers}
            label="Open pipeline"
            value={formatCurrency(metrics.pipelineValue)}
            detail={`${metrics.opportunityCount} open opportunity(s)`}
            tone="slate"
            onClick={() => setActiveView("pipeline")}
          />
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Commercial register</p>
              <h3 className="mt-2 text-xl font-black text-slate-950">Won deals</h3>
              <p className="mt-1 text-sm text-slate-500">Live finalised opportunities. Select a row to open the complete lead record.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
              {wonRows.length} won
            </span>
          </div>

          {wonRows.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Customer / lead</th>
                    <th className="px-6 py-4">Stage</th>
                    <th className="px-6 py-4">Final value</th>
                    <th className="px-6 py-4">Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {wonRows.map((opportunity) => {
                    const lead = filteredLeads.find((item) => item.id === opportunity.lead_id);
                    return (
                      <tr
                        key={opportunity.id}
                        onClick={() => lead && openLead(lead)}
                        className="cursor-pointer border-t border-slate-100 hover:bg-emerald-50/40"
                      >
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{lead?.company?.name || opportunity?.company?.name || getLeadName(lead) || "Won deal"}</p>
                          <p className="mt-1 text-xs text-slate-500">{lead ? getLeadName(lead) : opportunity?.contact?.full_name || "—"}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-emerald-700">Won</td>
                        <td className="px-6 py-4 text-sm font-black text-slate-900">{formatCurrency(opportunity?.actual_value || opportunity?.estimated_value)}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(opportunity?.closed_at || opportunity?.updated_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={FiCheckCircle} title="No won deals in this view" text="Finalised opportunities will appear here after a work order is recorded." />
          )}
        </div>
      </section>
    );
  }

  function renderIntelligence() {
    const ordered = [
      ...filteredLeads,
    ].sort(
      (a, b) =>
        Number(
          b?.lead_score || 0
        ) -
        Number(
          a?.lead_score || 0
        )
    );

    return (
      <section>
        <SectionTitle
          eyebrow="AI intelligence"
          title="Lead scoring & qualification"
          description="Select a lead to review its evidence and run the live AI qualification engine."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard
            icon={FiCheckCircle}
            label="Valid"
            value={metrics.genuine}
            detail="Quality status valid"
            tone="emerald"
          />

          <KpiCard
            icon={FiAlertCircle}
            label="Review"
            value={metrics.review}
            detail="Awaiting review"
            tone="amber"
          />

          <KpiCard
            icon={FiZap}
            label="Scored"
            value={metrics.scored}
            detail="Score above zero"
            tone="violet"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <LeadTable
            leads={ordered}
            loading={loading}
            selectedLead={
              selectedLead
            }
            onSelect={openLead}
          />
        </div>
      </section>
    );
  }

  function renderSettings() {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <SectionTitle
          eyebrow="Configuration"
          title="CRM settings"
          description="Current organization and CRM-user context."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
              Organization
            </p>

            <p className="mt-3 text-lg font-black text-slate-950">
              {organization?.name ||
                "Synaptech"}
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
              CRM User
            </p>

            <p className="mt-3 text-lg font-black text-slate-950">
              {crmUser?.full_name ||
                "CRM Admin"}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {crmUser?.role ||
                "CRM User"}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-cyan-100 bg-cyan-50/60 p-5">
          <h3 className="text-base font-black text-slate-950">
            Upcoming SaaS configuration
          </h3>

          <p className="mt-2 text-sm leading-7 text-slate-600">
            Products, courses,
            qualification rules,
            pipelines, counsellor
            routing, AI settings,
            permissions and
            white-label configuration
            will be connected here
            without disturbing your
            existing LMS/Admin logic.
          </p>
        </div>
      </section>
    );
  }

  function renderActiveView() {
    switch (activeView) {
      case "leads":
        return renderLeads();

      case "pipeline":
        return renderPipeline();

      case "companies":
        return renderCompanies();

      case "contacts":
        return renderContacts();

      case "activities":
        return renderActivities();

      case "customer_success":
        return renderCustomerSuccess();

      case "reports":
        return renderReports();

      case "intelligence":
        return renderIntelligence();

      case "settings":
        return renderSettings();

      default:
        return renderOverview();
    }
  }

  const activeLabel =
    NAV_ITEMS.find(
      (item) =>
        item.key === activeView
    )?.label ||
    (activeView ===
    "intelligence"
      ? "Lead Intelligence"
      : activeView ===
        "settings"
      ? "Settings"
      : "Overview");

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="hidden w-[285px] shrink-0 bg-slate-950 text-white lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950">
                <FiZap
                  size={21}
                />
              </div>

              <div>
                <p className="text-lg font-black">
                  Synaptech
                </p>

                <p className="mt-0.5 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
                  CRM + AI
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6">
            <p className="px-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Workspace
            </p>

            <nav className="mt-3 space-y-1.5">
              {NAV_ITEMS.map(
                (item) => {
                  const Icon =
                    item.icon;

                  const active =
                    activeView ===
                    item.key;

                  return (
                    <button
                      type="button"
                      key={
                        item.key
                      }
                      onClick={() =>
                        setActiveView(
                          item.key
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                        active
                          ? "bg-white text-slate-950 shadow-lg"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon
                        size={18}
                      />

                      <span>
                        {
                          item.label
                        }
                      </span>

                      {item.key ===
                        "leads" && (
                        <span className="ml-auto rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-700">
                          {pagination?.total ??
                            leads.length}
                        </span>
                      )}
                    </button>
                  );
                }
              )}
            </nav>

            <div className="my-6 border-t border-white/10" />

            <p className="px-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Intelligence
            </p>

            <button
              type="button"
              onClick={() =>
                setActiveView(
                  "intelligence"
                )
              }
              className="mt-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <FiShield />
              Lead Scoring
            </button>

            <button
              type="button"
              onClick={() =>
                showBackendPending(
                  "AI Sales Assistant",
                  "The live qualification engine is already connected. The conversational AI Sales Assistant will be connected after the validation, progressive qualification and activity APIs so it can work from real CRM history."
                )
              }
              className="mt-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <FiZap />
              AI Assistant
            </button>
          </div>

          <div className="border-t border-white/10 p-4">
            <button
              type="button"
              onClick={() =>
                setActiveView(
                  "settings"
                )
              }
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <FiSettings />
              Settings
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
            <div className="flex min-h-[82px] items-center justify-between gap-4 px-5 sm:px-7 xl:px-9">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  CRM
                  <FiChevronRight />
                  <span className="text-slate-700">
                    {activeLabel}
                  </span>
                </div>

                <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                  Revenue & Admissions
                  Command Centre
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    showBackendPending(
                      "Global CRM Search",
                      "Use the live lead search below. Cross-module global search will be connected when Companies, Contacts, Activities and Documents have their persistent APIs."
                    )
                  }
                  className="hidden h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500 md:flex"
                >
                  <FiCommand />
                  Search CRM
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setNotificationsOpen(
                        (value) =>
                          !value
                      )
                    }
                    className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"
                  >
                    <FiBell />

                    {metrics.followUps >
                      0 && (
                      <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-[320px] rounded-[22px] border border-slate-200 bg-white p-4 shadow-2xl">
                      <p className="text-sm font-black text-slate-950">
                        CRM Notifications
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {metrics.followUps
                          ? `${metrics.followUps} follow-up(s) currently scheduled.`
                          : "No follow-up notifications currently due."}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    loadDashboard(
                      true
                    )
                  }
                  disabled={
                    refreshing
                  }
                  className="flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-60"
                >
                  <FiRefreshCw
                    className={
                      refreshing
                        ? "animate-spin"
                        : ""
                    }
                  />

                  <span className="hidden sm:inline">
                    Refresh
                  </span>
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1680px] px-5 py-7 sm:px-7 xl:px-9">
            {/* PREMIUM HERO */}
            <section className="relative overflow-hidden rounded-[32px] bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.16)] sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_70%_100%,rgba(99,102,241,0.22),transparent_34%)]" />

              <div className="relative grid gap-7 xl:grid-cols-[1fr_auto] xl:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Live CRM Workspace
                  </div>

                  <h2 className="mt-5 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                    Turn enquiries
                    into{" "}
                    <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                      qualified
                      opportunities.
                    </span>
                  </h2>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                    Lead capture,
                    validation,
                    qualification,
                    pipeline and
                    follow-up intelligence
                    in one premium
                    workspace.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveView(
                          "pipeline"
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950"
                    >
                      <FiLayers />
                      View pipeline
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        showBackendPending(
                          "Add CRM Activity",
                          "Persistent activity creation will be connected to the CRM activities API in the next backend phase."
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white"
                    >
                      <FiActivity />
                      Add activity
                    </button>
                  </div>
                </div>

                <div className="grid min-w-[300px] grid-cols-3 gap-3">
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <FiTarget className="text-cyan-300" />

                    <p className="mt-5 text-2xl font-black">
                      {
                        metrics.total
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Leads
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <FiTrendingUp className="text-emerald-300" />

                    <p className="mt-5 text-2xl font-black">
                      {
                        metrics.conversionRate
                      }
                      %
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Conversion
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <FiDollarSign className="text-violet-300" />

                    <p className="mt-5 truncate text-lg font-black">
                      {formatCurrency(
                        metrics.pipelineValue
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Pipeline
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* WORKSPACE + SEARCH + FILTERS */}
            <section className="mt-6 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  {WORKSPACES.map(
                    (item) => (
                      <button
                        type="button"
                        key={
                          item.key
                        }
                        onClick={() =>
                          setWorkspace(
                            item.key
                          )
                        }
                        className={`rounded-2xl px-4 py-2.5 text-sm font-bold ${
                          workspace ===
                          item.key
                            ? "bg-slate-950 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {
                          item.label
                        }
                      </button>
                    )
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      value={
                        search
                      }
                      onChange={(
                        e
                      ) =>
                        setSearch(
                          e.target
                            .value
                        )
                      }
                      placeholder="Search leads..."
                      className="h-11 w-[230px] rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterOpen(
                          !filterOpen
                        );
                        setDateOpen(
                          false
                        );
                      }}
                      className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
                    >
                      <FiFilter />
                      Filter
                      <FiChevronDown />
                    </button>

                    {filterOpen && (
                      <div className="absolute right-0 z-20 mt-2 w-[300px] rounded-[22px] border border-slate-200 bg-white p-4 shadow-2xl">
                        <p className="text-sm font-black">
                          Lead Filters
                        </p>

                        <label className="mt-4 block text-xs font-bold text-slate-500">
                          Status
                        </label>

                        <select
                          value={
                            statusFilter
                          }
                          onChange={(
                            e
                          ) =>
                            setStatusFilter(
                              e
                                .target
                                .value
                            )
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                        >
                          <option value="all">
                            All
                          </option>
                          <option value="open">
                            Open
                          </option>
                          <option value="qualified">
                            Qualified
                          </option>
                          <option value="converted">
                            Converted
                          </option>
                          <option value="lost">
                            Lost
                          </option>
                        </select>

                        <label className="mt-4 block text-xs font-bold text-slate-500">
                          Quality
                        </label>

                        <select
                          value={
                            qualityFilter
                          }
                          onChange={(
                            e
                          ) =>
                            setQualityFilter(
                              e
                                .target
                                .value
                            )
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                        >
                          <option value="all">
                            All
                          </option>
                          <option value="unreviewed">
                            Unreviewed
                          </option>
                          <option value="valid">
                            Valid
                          </option>
                          <option value="invalid">
                            Invalid
                          </option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setDateOpen(
                          !dateOpen
                        );
                        setFilterOpen(
                          false
                        );
                      }}
                      className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
                    >
                      <FiCalendar />

                      {dateRange ===
                      "all"
                        ? "All dates"
                        : dateRange ===
                          "7"
                        ? "Last 7 days"
                        : "Last 30 days"}

                      <FiChevronDown />
                    </button>

                    {dateOpen && (
                      <div className="absolute right-0 z-20 mt-2 w-[190px] rounded-[20px] border border-slate-200 bg-white p-2 shadow-2xl">
                        {[
                          [
                            "all",
                            "All dates",
                          ],
                          [
                            "7",
                            "Last 7 days",
                          ],
                          [
                            "30",
                            "Last 30 days",
                          ],
                        ].map(
                          ([
                            value,
                            label,
                          ]) => (
                            <button
                              type="button"
                              key={
                                value
                              }
                              onClick={() => {
                                setDateRange(
                                  value
                                );
                                setDateOpen(
                                  false
                                );
                              }}
                              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-slate-50"
                            >
                              {
                                label
                              }
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {error && (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="mt-6">
              {renderActiveView()}
            </div>

            <footer className="pb-5 pt-8 text-center text-xs text-slate-400">
              {organization?.name ||
                "Synaptech"}{" "}
              · CRM + AI Workspace
            </footer>
          </div>
        </main>
      </div>

      <LeadDrawer
  lead={selectedLead}
  onClose={() =>
    setSelectedLead(
      null
    )
  }
  onQualified={() =>
    loadDashboard(
      true
    )
  }
  validation={
    selectedLead?.id
      ? validationsByLead[
          selectedLead.id
        ] || null
      : null
  }
  onValidated={
  handleLeadValidated
}
onScoreUpdated={
  handleScoreUpdated
}
scoreRefreshKey={
  selectedLead?.id
    ? scoreRefreshByLead[
        selectedLead.id
      ] || 0
    : 0
}
opportunity={
  selectedLead?.id
    ? opportunities.find(
        (item) =>
          item?.lead_id === selectedLead.id
      ) || null
    : null
}
opportunityBusy={
  selectedLead?.id === opportunityCreateBusyLeadId
}
onCreateOpportunity={
  handleCreateOpportunity
}
onCloseWon={handleCloseWon}
closeWonBusy={
  Boolean(selectedLead?.latest_opportunity?.id) &&
  selectedLead.latest_opportunity.id === closeWonBusyOpportunityId
}
onActivitySaved={() =>
  loadDashboard(true)
}

/>

      <InfoModal
        modal={modal}
        onClose={() =>
          setModal(null)
        }
      />
      <OpportunityStageModal
  opportunity={
    stageEditorOpportunity
  }
  busy={
    stageUpdateBusy
  }
  onClose={() =>
    setStageEditorOpportunity(
      null
    )
  }
  onMove={
    handleOpportunityStageUpdate
  }
/>
    </div>
  );
}

function OpportunityCreationPanel({
  lead,
  opportunity,
  busy,
  onCreate,
  onCloseWon,
  closeWonBusy,
}) {
  const [estimatedValue, setEstimatedValue] =
    useState(lead?.estimated_value || "");
  const [expectedCloseDate, setExpectedCloseDate] =
    useState("");
  const [workOrderNumber, setWorkOrderNumber] = useState("");
  const [workOrderDate, setWorkOrderDate] = useState("");
  const [finalValue, setFinalValue] = useState("");
  const [packageName, setPackageName] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [expectedStartDate, setExpectedStartDate] = useState("");
  const [documentReference, setDocumentReference] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  useEffect(() => {
    setEstimatedValue(lead?.estimated_value || "");
    setExpectedCloseDate("");
    setWorkOrderNumber("");
    setWorkOrderDate("");
    setFinalValue(opportunity?.estimated_value || "");
    setPackageName("");
    setPaymentTerms("");
    setExpectedStartDate("");
    setDocumentReference("");
    setCloseNotes("");
  }, [lead?.id, lead?.estimated_value, opportunity?.id, opportunity?.estimated_value]);

  const salesReady = lead?.sales_ready === true;
  const opportunityStatus = String(opportunity?.status || "").toLowerCase();
  const dealWon = opportunityStatus === "won";

  return (
    <section className="rounded-[26px] border border-violet-200 bg-gradient-to-br from-white to-violet-50 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
            Opportunity conversion
          </p>
          <h3 className="mt-2 text-xl font-black text-slate-950">
            {opportunity
              ? "Opportunity created"
              : "Move qualified lead to pipeline"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {opportunity
              ? dealWon
                ? "The work order has been recorded and this opportunity is closed as won."
                : "This lead already has an opportunity in the commercial pipeline."
              : salesReady
                ? "The lead has passed the Sales-Ready gate. Confirm its commercial value and create the opportunity."
                : "Opportunity creation unlocks only after validation, qualification and explicit human-handoff intent pass."}
          </p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          opportunity || salesReady
            ? "bg-violet-600 text-white"
            : "bg-slate-100 text-slate-400"
        }`}>
          {opportunity ? <FiCheckCircle size={20} /> : <FiBriefcase size={20} />}
        </span>
      </div>

      {opportunity ? (
        <>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-violet-100 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">Pipeline stage</p>
            <p className="mt-2 text-sm font-black text-slate-900">{opportunity?.stage?.name || "Qualified"}</p>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">Estimated value</p>
            <p className="mt-2 text-sm font-black text-slate-900">{formatCurrency(opportunity?.estimated_value)}</p>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">Deal status</p>
            <p className={`mt-2 text-sm font-black uppercase ${dealWon ? "text-emerald-700" : "text-violet-700"}`}>
              {opportunityStatus || "open"}
            </p>
          </div>
        </div>

        {!dealWon && opportunityStatus !== "lost" && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Work-order confirmation</p>
            <h4 className="mt-2 text-lg font-black text-slate-950">Record work order / Close Won</h4>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Use only after the customer has issued the work order. Completing calls alone will not close the deal.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">Work-order number *
                <input value={workOrderNumber} onChange={(event) => setWorkOrderNumber(event.target.value)} disabled={closeWonBusy} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-400" />
              </label>
              <label className="text-xs font-bold text-slate-700">Work-order date *
                <input type="date" value={workOrderDate} onChange={(event) => setWorkOrderDate(event.target.value)} disabled={closeWonBusy} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-400" />
              </label>
              <label className="text-xs font-bold text-slate-700">Final deal value (INR) *
                <input type="number" min="0" value={finalValue} onChange={(event) => setFinalValue(event.target.value)} disabled={closeWonBusy} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-400" />
              </label>
              <label className="text-xs font-bold text-slate-700">Package / solution
                <input value={packageName} onChange={(event) => setPackageName(event.target.value)} disabled={closeWonBusy} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-400" />
              </label>
              <label className="text-xs font-bold text-slate-700">Expected implementation start
                <input type="date" value={expectedStartDate} onChange={(event) => setExpectedStartDate(event.target.value)} disabled={closeWonBusy} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-400" />
              </label>
              <label className="text-xs font-bold text-slate-700">Work-order document reference
                <input value={documentReference} onChange={(event) => setDocumentReference(event.target.value)} placeholder="File URL or reference" disabled={closeWonBusy} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-400" />
              </label>
            </div>
            <label className="mt-3 block text-xs font-bold text-slate-700">Payment terms
              <textarea value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} rows="2" disabled={closeWonBusy} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-400" />
            </label>
            <label className="mt-3 block text-xs font-bold text-slate-700">Commercial notes
              <textarea value={closeNotes} onChange={(event) => setCloseNotes(event.target.value)} rows="2" disabled={closeWonBusy} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-400" />
            </label>

            <button
              type="button"
              disabled={closeWonBusy || !workOrderNumber.trim() || !workOrderDate || finalValue === ""}
              onClick={() => {
                if (!window.confirm("Record this work order and close the opportunity as won?")) return;
                onCloseWon?.(opportunity, {
                  work_order_number: workOrderNumber.trim(),
                  work_order_date: workOrderDate,
                  final_value: Number(finalValue),
                  currency: "INR",
                  package_name: packageName.trim() || null,
                  payment_terms: paymentTerms.trim() || null,
                  expected_start_date: expectedStartDate || null,
                  document_reference: documentReference.trim() || null,
                  notes: closeNotes.trim() || null,
                });
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {closeWonBusy ? <FiRefreshCw className="animate-spin" /> : <FiCheckCircle />}
              {closeWonBusy ? "Closing deal..." : "Record Work Order & Close Won"}
            </button>
          </div>
        )}
        </>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">
              Estimated value (INR)
              <input
                type="number"
                min="0"
                step="1"
                value={estimatedValue}
                onChange={(event) => setEstimatedValue(event.target.value)}
                disabled={!salesReady || busy}
                placeholder="e.g. 1000000"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-violet-400 disabled:bg-slate-100"
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Expected close date
              <input
                type="date"
                value={expectedCloseDate}
                onChange={(event) => setExpectedCloseDate(event.target.value)}
                disabled={!salesReady || busy}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-violet-400 disabled:bg-slate-100"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={!salesReady || busy}
            onClick={() =>
              onCreate?.(lead, {
                estimated_value: Number(estimatedValue || 0),
                expected_close_date: expectedCloseDate || null,
              })
            }
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {busy ? <FiRefreshCw className="animate-spin" /> : <FiBriefcase />}
            {busy ? "Creating opportunity..." : "Create Opportunity"}
          </button>
        </>
      )}
    </section>
  );
}
