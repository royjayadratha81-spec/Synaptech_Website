import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  FaBuilding,
  FaCheckCircle,
  FaLock,
  FaShieldAlt,
} from "react-icons/fa";

import { auth } from "../firebase/firebaseConfig";
import { getPlatformSession } from "../platform/services/platformSessionApi";

const STAFF_ROLES = new Set([
  "tenant_admin",
  "admissions_counsellor",
  "sales_manager",
  "sales_executive",
  "finance_admin",
  "faculty",
  "mis_viewer",
]);

const moduleLandingPages = [
  ["administration", "/admin"],
  ["admissions", "/platform-admissions"],
  ["finance", "/finance"],
  ["crm", "/crm"],
  ["analytics_mis", "/admin-analytics"],
  ["faculty", "/admin/faculty"],
];

function isInternalPath(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

function defaultStaffDestination(session) {
  if (session?.platform_user?.platform_role === "platform_super_admin") {
    return "/platform-console";
  }

  const accessibleModules = new Set(
    (session?.memberships || []).flatMap(
      (membership) => membership.accessible_modules || []
    )
  );

  return (
    moduleLandingPages.find(([moduleKey]) => accessibleModules.has(moduleKey))?.[1] ||
    "/platform-console"
  );
}

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, password);

      const session = await getPlatformSession({ forceRefresh: true });
      const memberships = session?.memberships || [];
      const isPlatformSuperAdmin =
        session?.platform_user?.platform_role === "platform_super_admin";
      const hasStaffMembership = memberships.some(
        (membership) =>
          membership.status === "active" &&
          STAFF_ROLES.has(membership.role) &&
          (membership.accessible_modules || []).length > 0
      );

      if (!isPlatformSuperAdmin && !hasStaffMembership) {
        await signOut(auth);
        throw new Error(
          "This account has no active staff membership. Student accounts must use the LMS sign-in page."
        );
      }

      // Retained only for compatibility with older screens. Route authority is
      // now the verified Firebase identity plus the server platform session.
      localStorage.setItem("isAdmin", "true");
      localStorage.setItem("adminEmail", normalizedEmail);

      const requestedPath = location.state?.from;
      const destination = isInternalPath(requestedPath)
        ? requestedPath
        : defaultStaffDestination(session);

      navigate(destination, { replace: true });
    } catch (loginError) {
      console.error("Secure administration sign-in failed:", loginError);
      localStorage.removeItem("isAdmin");
      localStorage.removeItem("adminEmail");
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Administration sign-in failed."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50 to-amber-50 px-5 py-10">
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-emerald-200/45 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-amber-200/45 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[36px] border border-white bg-white/90 shadow-[0_35px_120px_rgba(15,23,42,0.16)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="bg-slate-950 p-8 text-white sm:p-10 lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
            <FaShieldAlt /> Secure control plane
          </div>
          <h1 className="mt-8 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
            Administration access
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
            Sign in with your Firebase account. Your platform role, tenant membership and enabled modules are then verified securely before any workspace opens.
          </p>

          <div className="mt-9 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm font-bold text-slate-200">
              <FaCheckCircle className="text-emerald-300" /> Firebase identity verification
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm font-bold text-slate-200">
              <FaBuilding className="text-amber-300" /> Tenant membership and module access
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm font-bold text-slate-200">
              <FaLock className="text-cyan-300" /> No Firestore password comparison
            </div>
          </div>
        </section>

        <form onSubmit={handleLogin} className="p-8 sm:p-10 lg:p-12">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
            Staff sign in
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Welcome back
          </h2>
          <p className="mt-2 text-base leading-7 text-slate-600">
            Students should continue through the LMS landing page.
          </p>

          <label className="mt-8 block text-sm font-black text-slate-800">
            Work email
            <input
              type="email"
              value={email}
              autoComplete="email"
              required
              placeholder="name@organisation.com"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="mt-5 block text-sm font-black text-slate-800">
            Password
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              required
              placeholder="Enter your Firebase password"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-800">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-7 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:from-emerald-500 hover:to-teal-500 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? "Verifying secure access…" : "Sign in securely"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/lms")}
            className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Go to Student LMS
          </button>
        </form>
      </div>
    </div>
  );
}
