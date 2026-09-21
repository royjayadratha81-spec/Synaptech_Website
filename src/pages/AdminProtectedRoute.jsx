import { Navigate, useLocation, useNavigate } from "react-router-dom";

import {
  PlatformSessionProvider,
  usePlatformSession,
} from "../platform/context/PlatformSessionContext";

function AdminAccessGate({ children, requiredModule = "administration" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    firebaseUser,
    session,
    loading,
    error,
    isPlatformSuperAdmin,
    canAccessModule,
    refreshSession,
  } = usePlatformSession();

  if (loading || firebaseUser === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-lg rounded-[30px] border border-slate-200 bg-white p-9 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
          <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            Secure administration
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            Verifying identity and tenant access
          </h1>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <Navigate
        to="/admin-login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-xl rounded-[30px] border border-rose-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-600">
            Access verification failed
          </p>
          <h1 className="mt-3 text-2xl font-black text-slate-950">
            Your secure administration session could not be verified
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            {error || "The platform membership service is unavailable."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={refreshSession}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              Retry verification
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin-login", { replace: true })}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
            >
              Return to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasRequiredAccess =
    isPlatformSuperAdmin || canAccessModule(requiredModule);

  if (!hasRequiredAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-xl rounded-[30px] border border-amber-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
            Tenant permission required
          </p>
          <h1 className="mt-3 text-2xl font-black text-slate-950">
            This workspace is outside your assigned role
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Your Firebase identity is valid, but the secure platform membership does not grant access to the {requiredModule} module.
          </p>
          <button
            type="button"
            onClick={() => navigate("/platform-console", { replace: true })}
            className="mt-6 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950"
          >
            Open permitted workspaces
          </button>
        </div>
      </div>
    );
  }

  return children;
}

export default function AdminProtectedRoute({
  children,
  requiredModule = "administration",
}) {
  return (
    <PlatformSessionProvider>
      <AdminAccessGate requiredModule={requiredModule}>
        {children}
      </AdminAccessGate>
    </PlatformSessionProvider>
  );
}
