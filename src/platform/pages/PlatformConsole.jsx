import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

import {
  FaArrowRight,
  FaBell,
  FaBuilding,
  FaChalkboardTeacher,
  FaChartBar,
  FaCheckCircle,
  FaDatabase,
  FaExternalLinkAlt,
  FaGraduationCap,
  FaLayerGroup,
  FaRobot,
  FaShieldAlt,
  FaSignOutAlt,
  FaSyncAlt,
  FaUserGraduate,
  FaWallet,
} from "react-icons/fa";

import logo from "../../assets/Synaptech_Education_Logo.png";
import { auth } from "../../firebase/firebaseConfig";

import { usePlatformSession } from "../context/PlatformSessionContext";

const moduleDefinitions = [
  {
    key: "administration",
    name: "Administration",
    eyebrow: "PLATFORM CONTROL",
    description:
      "Institute administration, student operations and academic controls.",
    path: "/admin",
    icon: FaShieldAlt,
    gradient: "from-rose-500 to-red-700",
  },
  {
    key: "crm",
    name: "CRM & AI Funnel",
    eyebrow: "REVENUE INTELLIGENCE",
    description:
      "Lead intelligence, Aira qualification, human calls and sales pipeline.",
    path: "/crm",
    icon: FaRobot,
    gradient: "from-cyan-500 to-blue-700",
  },
    {
    key: "admissions",
    name: "Admissions",
    eyebrow: "ADMISSION LIFECYCLE",
    description:
      "Candidate applications, admission review and controlled Finance handoff.",
    path: "/platform-admissions",
    icon: FaUserGraduate,
    gradient: "from-violet-500 to-purple-700",
  },
  {
    key: "finance",
    name: "Finance",
    eyebrow: "FINANCIAL CONTROL",
    description:
      "Fee records, receipts, payment verification and financial visibility.",
    path: "/finance",
    icon: FaWallet,
    gradient: "from-emerald-500 to-green-700",
  },
  {
    key: "lms",
    name: "Learning Management",
    eyebrow: "LEARNING OPERATIONS",
    description:
      "Courses, batches, learning resources and student delivery operations.",
    path: "/admin",
    icon: FaGraduationCap,
    gradient: "from-blue-500 to-indigo-700",
  },
  {
    key: "faculty",
    name: "Faculty Portal",
    eyebrow: "ACADEMIC NETWORK",
    description:
      "Faculty profiles, assignments and academic delivery management.",
    path: "/admin/faculty",
    icon: FaChalkboardTeacher,
    gradient: "from-fuchsia-500 to-violet-700",
  },
  {
    key: "analytics_mis",
    name: "Analytics & MIS",
    eyebrow: "DECISION INTELLIGENCE",
    description:
      "Management reporting, operational intelligence and institute analytics.",
    path: "/mis-report",
    icon: FaChartBar,
    gradient: "from-amber-500 to-orange-700",
  },
  {
    key: "notifications",
    name: "Notification Centre",
    eyebrow: "ACTION INTELLIGENCE",
    description:
      "Platform, CRM, admission, Finance and LMS alerts in one workspace.",
    path: null,
    icon: FaBell,
    gradient: "from-pink-500 to-rose-700",
  },
];

function formatLabel(value) {
  if (!value) return "Not assigned";

  return String(value)
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function SummaryCard({
  icon,
  eyebrow,
  value,
  description,
  accent,
}) {
  return (
    <div className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.055] p-5 shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/20">
      <div
        className={`absolute -right-12 -top-12 h-32 w-32 rounded-full ${accent} opacity-10 blur-3xl`}
      />

      <div className="relative">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent} text-white shadow-lg`}
        >
          {icon}
        </div>

        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          {eyebrow}
        </p>

        <p className="mt-2 text-xl font-black text-white">
          {value}
        </p>

        <p className="mt-2 text-xs leading-5 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function PlatformModuleCard({
  module,
  enabled,
  accessible,
  onOpen,
}) {
  const Icon = module.icon;
  const operational = Boolean(module.path);

  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.065]">
      <div
        className={`absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${module.gradient} opacity-[0.12] blur-3xl`}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${module.gradient} text-lg text-white shadow-lg`}
          >
            <Icon />
          </div>

          <span
            className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
              enabled && accessible
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-slate-700 bg-slate-800/70 text-slate-500"
            }`}
          >
            {enabled && accessible
              ? "Access granted"
              : "Restricted"}
          </span>
        </div>

        <p className="mt-5 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
          {module.eyebrow}
        </p>

        <h2 className="mt-2 text-xl font-black text-white">
          {module.name}
        </h2>

        <p className="mt-2 min-h-[60px] text-sm leading-6 text-slate-400">
          {module.description}
        </p>

        <button
          type="button"
          disabled={
            !enabled ||
            !accessible ||
            !operational
          }
          onClick={() => onOpen(module.path)}
          className={`mt-5 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-black transition ${
            enabled &&
            accessible &&
            operational
              ? "bg-white text-slate-950 hover:bg-rose-100"
              : "cursor-not-allowed border border-white/10 bg-white/[0.035] text-slate-500"
          }`}
        >
          <span>
            {!enabled || !accessible
              ? "Module unavailable"
              : operational
                ? "Open workspace"
                : "Workspace coming next"}
          </span>

          {operational &&
          enabled &&
          accessible ? (
            <FaArrowRight />
          ) : (
            <FaLayerGroup />
          )}
        </button>
      </div>
    </div>
  );
}

export default function PlatformConsole() {
  const navigate = useNavigate();

  const {
    platformUser,
    organization,
    defaultMembership,
    platformRole,
    tenantRole,
    isPlatformSuperAdmin,
    refreshSession,
  } = usePlatformSession();

  const enabledModules =
    defaultMembership?.enabled_modules || [];

  const accessibleModules =
    defaultMembership?.accessible_modules || [];

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      localStorage.removeItem("isAdmin");
      localStorage.removeItem("adminEmail");

      navigate("/admin-login", {
        replace: true,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-48 -top-48 h-[520px] w-[520px] rounded-full bg-red-700/15 blur-[130px]" />
        <div className="absolute right-0 top-1/4 h-[520px] w-[520px] rounded-full bg-violet-700/10 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
        <header className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.09] via-white/[0.045] to-red-950/20 shadow-[0_35px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
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
                    <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-red-300">
                      Platform Control Plane
                    </span>

                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                      <FaCheckCircle />
                      Secure
                    </span>
                  </div>

                  <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
                    Synaptech SaaS Command Centre
                  </h1>

                  <p className="mt-1 text-sm text-slate-400">
                    Secure multi-tenant platform administration
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={refreshSession}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-xs font-black transition hover:bg-white/10"
                >
                  <FaSyncAlt />
                  Refresh access
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/platform-session-check"
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-xs font-black transition hover:bg-white/10"
                >
                  <FaShieldAlt />
                  Verify session
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-xs font-black shadow-lg shadow-red-950/40 transition hover:bg-red-400"
                >
                  <FaSignOutAlt />
                  Secure logout
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-7 md:px-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">
                {isPlatformSuperAdmin
                  ? "Platform Super Administrator"
                  : formatLabel(platformRole)}
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] md:text-5xl">
                Welcome,{" "}
                {platformUser?.display_name ||
                  "Platform Administrator"}
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
                Control tenant access, enabled modules
                and institute operations without changing
                the existing CRM, LMS or Finance data
                contracts.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/25 px-5 py-4 backdrop-blur-xl">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Current organisation
              </p>

              <p className="mt-2 flex items-center gap-2 text-lg font-black">
                <FaBuilding className="text-red-300" />
                {organization?.name ||
                  "No organisation"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {organization?.slug || "—"}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<FaShieldAlt />}
            eyebrow="Platform role"
            value={formatLabel(platformRole)}
            description="Global platform authority verified by the secure server."
            accent="bg-gradient-to-br from-red-500 to-rose-700"
          />

          <SummaryCard
            icon={<FaBuilding />}
            eyebrow="Tenant mode"
            value={formatLabel(
              organization?.tenant_mode
            )}
            description="The active product configuration for this organisation."
            accent="bg-gradient-to-br from-violet-500 to-purple-700"
          />

          <SummaryCard
            icon={<FaLayerGroup />}
            eyebrow="Enabled modules"
            value={`${enabledModules.length} modules`}
            description="Server-controlled organisation entitlements."
            accent="bg-gradient-to-br from-cyan-500 to-blue-700"
          />

          <SummaryCard
            icon={<FaDatabase />}
            eyebrow="Tenant membership"
            value={formatLabel(tenantRole)}
            description={`Membership status: ${formatLabel(
              defaultMembership?.status
            )}`}
            accent="bg-gradient-to-br from-emerald-500 to-green-700"
          />
        </section>

        <section className="mt-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">
                Module Entitlements
              </p>

              <h2 className="mt-2 text-2xl font-black md:text-3xl">
                Platform workspaces
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
  Existing working modules open their
  current pages. Admissions now uses its
  secured tenant-scoped foundation. The
  Notification Centre remains isolated
  until its data architecture is added.
</p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-slate-400">
              {accessibleModules.length} accessible
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {moduleDefinitions.map((module) => (
              <PlatformModuleCard
                key={module.key}
                module={module}
                enabled={enabledModules.includes(
                  module.key
                )}
                accessible={accessibleModules.includes(
                  module.key
                )}
                onOpen={(path) => navigate(path)}
              />
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 shadow-xl md:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
              Existing Operations
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Continue to established workspaces
            </h2>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                {
                  name: "Current Admin",
                  path: "/admin",
                  icon: FaShieldAlt,
                },
                {
                  name: "CRM Command Centre",
                  path: "/crm",
                  icon: FaRobot,
                },
                {
                  name: "Finance Dashboard",
                  path: "/finance",
                  icon: FaWallet,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() =>
                      navigate(item.path)
                    }
                    className="group flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
                        <Icon />
                      </span>

                      <span className="text-sm font-black">
                        {item.name}
                      </span>
                    </span>

                    <FaExternalLinkAlt className="text-xs text-slate-600 transition group-hover:text-cyan-300" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[30px] border border-emerald-400/15 bg-gradient-to-br from-emerald-400/10 to-cyan-400/[0.035] p-6 shadow-xl md:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
              Foundation Status
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Secure foundation active
            </h2>

            <div className="mt-5 space-y-3">
              {[
                "Firebase identity verified",
                "Platform role verified",
                "Tenant membership verified",
                "Module entitlements verified",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-slate-300"
                >
                  <FaCheckCircle className="text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-8 flex flex-col justify-between gap-3 border-t border-white/10 py-6 text-xs text-slate-600 sm:flex-row">
          <span>
            Synaptech Education · Secure SaaS Platform
          </span>

          <span>
            Read-only platform control foundation
          </span>
        </footer>
      </div>
    </div>
  );
}