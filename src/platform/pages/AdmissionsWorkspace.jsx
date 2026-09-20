import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  FaArrowLeft,
  FaBuilding,
  FaCalendarAlt,
  FaCheckCircle,
  FaClipboardCheck,
  FaDatabase,
  FaEnvelope,
  FaExclamationTriangle,
  FaGraduationCap,
  FaLock,
  FaPhone,
  FaShieldAlt,
  FaSyncAlt,
  FaUserGraduate,
  FaWallet,
} from "react-icons/fa";

import logo from "../../assets/Synaptech_Education_Logo.png";
import AdmissionApprovalPanel from "../components/AdmissionApprovalPanel";

import {
  getAdmissionsOverview,
} from "../services/admissionsApi";

function formatLabel(value) {
  if (!value) {
    return "Not specified";
  }

  return String(value)
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function formatDate(value) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function firstValue(
  record,
  fieldNames,
  fallback = "—"
) {
  for (const fieldName of fieldNames) {
    const value = record?.[fieldName];

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return fallback;
}

function getProgrammeName(application) {
  const directValue = firstValue(
    application,
    [
      "programme_name",
      "program_name",
      "course_name",
      "programme",
      "program",
    ],
    null
  );

  if (directValue) {
    return String(directValue);
  }

  const snapshot =
    application?.programme_snapshot ||
    application?.program_snapshot ||
    application?.course_snapshot ||
    {};

  return String(
    firstValue(
      snapshot,
      [
        "name",
        "title",
        "programme_name",
        "program_name",
        "course_name",
      ],
      "Programme pending"
    )
  );
}

function MetricCard({
  icon: Icon,
  eyebrow,
  value,
  description,
  gradient,
}) {
  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/20">
      <div
        className={`absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-3xl`}
      />

      <div className="relative">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-xl`}
        >
          <Icon />
        </div>

        <p className="mt-5 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
          {eyebrow}
        </p>

        <p className="mt-2 text-3xl font-black tracking-tight text-white">
          {value}
        </p>

        <p className="mt-2 text-xs leading-5 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-xl text-violet-300">
        <Icon />
      </div>

      <h3 className="mt-5 text-lg font-black text-white">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}

export default function AdmissionsWorkspace() {
  const navigate = useNavigate();

  const [overview, setOverview] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadOverview = useCallback(
    async ({
      forceRefresh = false,
      background = false,
    } = {}) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const result =
          await getAdmissionsOverview({
            forceRefresh,
          });

        setOverview(result);
      } catch (requestError) {
        console.error(
          "Admissions workspace load failed:",
          requestError
        );

        setError(
          requestError?.message ||
            "Admissions data could not be loaded."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const candidates =
    overview?.candidates || [];

  const applications =
    overview?.applications || [];

  const candidateById = useMemo(
    () =>
      new Map(
        candidates.map((candidate) => [
          String(candidate.id),
          candidate,
        ])
      ),
    [candidates]
  );

  const candidateCount = Number(
    overview?.summary?.candidate_count ??
      candidates.length
  );

  const applicationCount = Number(
    overview?.summary?.application_count ??
      applications.length
  );

  return (
    <div className="min-h-screen bg-[#06070b] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-56 -top-52 h-[600px] w-[600px] rounded-full bg-violet-700/20 blur-[150px]" />
        <div className="absolute right-[-180px] top-[18%] h-[560px] w-[560px] rounded-full bg-cyan-500/10 blur-[150px]" />
        <div className="absolute bottom-[-220px] left-[28%] h-[560px] w-[560px] rounded-full bg-fuchsia-600/10 blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
        <header className="overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-white/[0.095] via-white/[0.045] to-violet-950/25 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <div className="border-b border-white/10 px-6 py-5 md:px-8">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-20 items-center justify-center rounded-2xl border border-white/10 bg-black/40 p-2">
                  <img
                    src={logo}
                    alt="Synaptech Education"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-violet-300">
                      Admissions Control Plane
                    </span>

                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                      <FaCheckCircle />
                      Secure
                    </span>

                    <span className="flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">
                      <FaLock />
                      Audited actions
                    </span>
                  </div>

                  <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
                    Admissions Command Centre
                  </h1>

                  <p className="mt-1 text-sm text-slate-400">
                    Candidate intake, application visibility and controlled Finance handoff
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/platform-console"
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-xs font-black transition hover:bg-white/10"
                >
                  <FaArrowLeft />
                  Platform console
                </button>

                <button
                  type="button"
                  disabled={refreshing}
                  onClick={() =>
                    loadOverview({
                      forceRefresh: true,
                      background: true,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-4 py-3 text-xs font-black shadow-lg shadow-violet-950/40 transition hover:bg-violet-400 disabled:cursor-wait disabled:opacity-70"
                >
                  <FaSyncAlt
                    className={
                      refreshing
                        ? "animate-spin"
                        : ""
                    }
                  />

                  {refreshing
                    ? "Refreshing"
                    : "Refresh admissions"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-7 md:px-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-300">
                Admission lifecycle intelligence
              </p>

              <h2 className="mt-2 max-w-4xl text-3xl font-black tracking-[-0.035em] md:text-5xl">
                One controlled path from candidate to admitted learner
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
                CRM-qualified candidates and manually entered applicants remain outside the LMS until Finance verifies payment and admission is formally approved.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/25 px-5 py-4 backdrop-blur-xl">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Current organisation
              </p>

              <p className="mt-2 flex items-center gap-2 text-lg font-black">
                <FaBuilding className="text-violet-300" />

                {overview?.organization?.name ||
                  "Synaptech Education"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {overview?.organization?.slug ||
                  "Secure tenant workspace"}
              </p>
            </div>
          </div>
        </header>

        {error ? (
          <section className="mt-6 rounded-[28px] border border-red-400/20 bg-red-400/10 p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-400/15 text-red-300">
                  <FaExclamationTriangle />
                </div>

                <div>
                  <p className="text-sm font-black text-red-200">
                    Admissions data could not be loaded
                  </p>

                  <p className="mt-1 text-sm text-red-200/70">
                    {error}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadOverview({
                    forceRefresh: true,
                  })
                }
                className="rounded-2xl bg-white px-5 py-3 text-xs font-black text-slate-950"
              >
                Try again
              </button>
            </div>
          </section>
        ) : null}

        {loading && !overview ? (
          <section className="mt-6 flex min-h-[360px] items-center justify-center rounded-[32px] border border-white/10 bg-white/[0.045]">
            <div className="text-center">
              <FaSyncAlt className="mx-auto animate-spin text-2xl text-violet-300" />

              <p className="mt-4 text-sm font-bold text-slate-300">
                Loading secured admissions data…
              </p>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={FaUserGraduate}
                eyebrow="Candidate profiles"
                value={candidateCount}
                description="Pre-admission identities currently held outside the LMS."
                gradient="from-violet-500 to-purple-700"
              />

              <MetricCard
                icon={FaClipboardCheck}
                eyebrow="Applications"
                value={applicationCount}
                description="Admission applications visible to the active tenant."
                gradient="from-cyan-500 to-blue-700"
              />

              <MetricCard
                icon={FaShieldAlt}
                eyebrow="Data boundary"
                value="Tenant scoped"
                description="The server restricts results to the verified organisation."
                gradient="from-emerald-500 to-green-700"
              />

              <MetricCard
                icon={FaLock}
                eyebrow="Operating mode"
                value="Controlled"
                description="Admissions approval is audited; Finance and LMS remain separate gates."
                gradient="from-rose-500 to-red-700"
              />
            </section>

            <section className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-xl md:p-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-300">
                  Controlled Admission Architecture
                </p>

                <h2 className="mt-2 text-2xl font-black md:text-3xl">
                  Candidate-to-student lifecycle
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  Admissions approves first, Finance clears payment terms next, and LMS access is activated separately from Students.
                </p>
              </div>

              <div className="mt-7 grid gap-4 lg:grid-cols-4">
                {[
                  {
                    number: "01",
                    title: "Candidate",
                    detail: `${candidateCount} profiles`,
                    icon: FaUserGraduate,
                    colour:
                      "border-violet-300/20 bg-violet-400/10 text-violet-300",
                  },
                  {
                    number: "02",
                    title: "Application",
                    detail: `${applicationCount} applications`,
                    icon: FaClipboardCheck,
                    colour:
                      "border-cyan-300/20 bg-cyan-400/10 text-cyan-300",
                  },
                  {
                    number: "03",
                    title: "Finance verification",
                    detail: "Payment-controlled gate",
                    icon: FaWallet,
                    colour:
                      "border-emerald-300/20 bg-emerald-400/10 text-emerald-300",
                  },
                  {
                    number: "04",
                    title: "LMS student",
                    detail: "Created only after approval",
                    icon: FaGraduationCap,
                    colour:
                      "border-amber-300/20 bg-amber-400/10 text-amber-300",
                  },
                ].map((stage) => {
                  const Icon = stage.icon;

                  return (
                    <div
                      key={stage.number}
                      className="relative rounded-[24px] border border-white/10 bg-black/20 p-5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black tracking-[0.2em] text-slate-600">
                          {stage.number}
                        </span>

                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${stage.colour}`}
                        >
                          <Icon />
                        </span>
                      </div>

                      <h3 className="mt-5 text-lg font-black">
                        {stage.title}
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        {stage.detail}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mt-8 grid gap-5 xl:grid-cols-2">
              <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
                      Candidate Registry
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      Pre-admission candidates
                    </h2>
                  </div>

                  <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-black text-violet-300">
                    {candidateCount}
                  </span>
                </div>

                <div className="mt-6">
                  {candidates.length === 0 ? (
                    <EmptyState
                      icon={FaUserGraduate}
                      title="No candidates yet"
                      description="Candidate profiles will appear here when CRM-qualified leads, website enrolments or authorised manual admissions enter the new workflow."
                    />
                  ) : (
                    <div className="space-y-3">
                      {candidates.map(
                        (candidate, index) => {
                          const candidateName =
                            firstValue(
                              candidate,
                              [
                                "full_name",
                                "name",
                                "display_name",
                              ],
                              "Unnamed candidate"
                            );

                          const email =
                            firstValue(
                              candidate,
                              ["email"],
                              null
                            );

                          const phone =
                            firstValue(
                              candidate,
                              [
                                "phone",
                                "mobile",
                                "phone_number",
                              ],
                              null
                            );

                          const source =
                            firstValue(
                              candidate,
                              [
                                "source",
                                "source_type",
                                "origin",
                              ],
                              "Not specified"
                            );

                          return (
                            <div
                              key={
                                candidate.id ||
                                index
                              }
                              className="rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-violet-300/20 hover:bg-violet-400/[0.055]"
                            >
                              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                                <div>
                                  <p className="font-black text-white">
                                    {String(
                                      candidateName
                                    )}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    Source:{" "}
                                    {formatLabel(
                                      source
                                    )}
                                  </p>
                                </div>

                                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                  Candidate
                                </span>
                              </div>

                              <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                                {email ? (
                                  <span className="flex items-center gap-2">
                                    <FaEnvelope className="text-violet-300" />
                                    {String(email)}
                                  </span>
                                ) : null}

                                {phone ? (
                                  <span className="flex items-center gap-2">
                                    <FaPhone className="text-violet-300" />
                                    {String(phone)}
                                  </span>
                                ) : null}

                                <span className="flex items-center gap-2">
                                  <FaCalendarAlt className="text-violet-300" />
                                  {formatDate(
                                    candidate.created_at
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                      Application Queue
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      Admission applications
                    </h2>
                  </div>

                  <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-300">
                    {applicationCount}
                  </span>
                </div>

                <div className="mt-6">
                  {applications.length === 0 ? (
                    <EmptyState
                      icon={FaClipboardCheck}
                      title="No applications yet"
                      description="Applications will appear here after a candidate enters the formal Admissions stage. No existing LMS student has been moved or changed."
                    />
                  ) : (
                    <div className="space-y-3">
                      {applications.map(
                        (application, index) => {
                          const linkedCandidate =
                            candidateById.get(
                              String(
                                application.candidate_id
                              )
                            );

                          const applicantName =
                            firstValue(
                              linkedCandidate,
                              [
                                "full_name",
                                "name",
                                "display_name",
                              ],
                              firstValue(
                                application,
                                [
                                  "candidate_name",
                                  "applicant_name",
                                ],
                                "Candidate"
                              )
                            );

                          const status =
                            firstValue(
                              application,
                              [
                                "status",
                                "application_status",
                              ],
                              "draft"
                            );

                          return (
                            <div
                              key={
                                application.id ||
                                index
                              }
                              className="rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-cyan-300/20 hover:bg-cyan-400/[0.055]"
                            >
                              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                                <div>
                                  <p className="font-black text-white">
                                    {String(
                                      applicantName
                                    )}
                                  </p>

                                  <p className="mt-1 text-sm font-bold text-cyan-200">
                                    {getProgrammeName(
                                      application
                                    )}
                                  </p>
                                </div>

                                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">
                                  {formatLabel(
                                    status
                                  )}
                                </span>
                              </div>

                              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                                <FaCalendarAlt className="text-cyan-300" />

                                {formatDate(
                                  application.created_at ||
                                    application.submitted_at
                                )}
                              </div>
<AdmissionApprovalPanel
  application={application}
  organizationId={
    overview?.organization?.id || null
  }
  candidateName={String(applicantName)}
  canApproveAdmission={
    overview?.access
      ?.can_approve_admission === true
  }
  onApproved={() =>
    loadOverview({
      forceRefresh: true,
      background: true,
    })
  }
/>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[30px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-violet-400/[0.035] p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
                  Architecture Safeguard
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Existing systems remain untouched
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  CRM remains the lead and opportunity authority. Admissions records approval before the Finance queue, Finance remains the payment-clearance authority, and LMS activation remains an explicit Students action.
                </p>
              </div>

              <div className="rounded-[30px] border border-emerald-300/15 bg-emerald-400/[0.07] p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                    <FaDatabase />
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                      Secure Data Status
                    </p>

                    <h2 className="mt-2 text-xl font-black">
                      Tenant isolation active
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Firebase identity, platform role, membership and Admissions entitlement are checked by the server for every request.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        <footer className="mt-8 flex flex-col justify-between gap-3 border-t border-white/10 py-6 text-xs text-slate-600 sm:flex-row">
          <span>
            Synaptech Education · Admissions Command Centre
          </span>

          <span>
            Controlled workflow · Admissions approval cannot grant LMS access
          </span>
        </footer>
      </div>
    </div>
  );
}
