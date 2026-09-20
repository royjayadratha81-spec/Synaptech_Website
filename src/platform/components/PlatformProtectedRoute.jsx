import { Navigate, useLocation } from "react-router-dom";

import {
  PlatformSessionProvider,
  usePlatformSession,
} from "../context/PlatformSessionContext";

function PlatformAccessGate({
  children,
  requiredModule,
}) {
  const location = useLocation();

  const {
    firebaseUser,
    session,
    loading,
    error,
    canAccessModule,
    refreshSession,
  } = usePlatformSession();

  if (loading || firebaseUser === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07070a] px-6">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-10 py-9 text-center shadow-2xl">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-rose-500" />

          <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-rose-300">
            Secure Access
          </p>

          <h1 className="mt-2 text-2xl font-black text-white">
            Verifying platform session
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
      <div className="flex min-h-screen items-center justify-center bg-[#07070a] px-6">
        <div className="w-full max-w-xl rounded-[30px] border border-red-500/25 bg-red-950/20 p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-300">
            Access verification failed
          </p>

          <h1 className="mt-3 text-2xl font-black text-white">
            The secure platform session could not be loaded
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-100/70">
            {error || "Platform session is unavailable."}
          </p>

          <button
            type="button"
            onClick={refreshSession}
            className="mt-6 rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-400"
          >
            Retry verification
          </button>
        </div>
      </div>
    );
  }

  if (
    requiredModule &&
    !canAccessModule(requiredModule)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07070a] px-6">
        <div className="w-full max-w-xl rounded-[30px] border border-amber-500/25 bg-amber-950/20 p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
            Module restricted
          </p>

          <h1 className="mt-3 text-2xl font-black text-white">
            Your tenant cannot access this module
          </h1>

          <p className="mt-3 text-sm text-amber-100/70">
            Required module: {requiredModule}
          </p>
        </div>
      </div>
    );
  }

  return children;
}

export default function PlatformProtectedRoute({
  children,
  requiredModule,
}) {
  return (
    <PlatformSessionProvider>
      <PlatformAccessGate
        requiredModule={requiredModule}
      >
        {children}
      </PlatformAccessGate>
    </PlatformSessionProvider>
  );
}