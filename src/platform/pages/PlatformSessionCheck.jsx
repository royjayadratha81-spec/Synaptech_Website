import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  KeyRound,
  Layers3,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { getPlatformSession } from "../services/platformSessionApi";

import synaptechLogo from "../../assets/Synaptech_Education_Logo.png";

function formatLabel(value) {
  if (!value) {
    return "Not available";
  }

  return String(value)
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

export default function PlatformSessionCheck() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSession = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      setError("");

      try {
        const nextSession =
          await getPlatformSession({
            forceRefresh,
          });

        setSession(nextSession);
      } catch (requestError) {
        console.error(
          "Platform session check failed:",
          requestError
        );

        setSession(null);

        setError(
          requestError?.message ||
            "Unable to verify the platform session."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadSession(false);
  }, [loadSession]);

  const defaultMembership = useMemo(() => {
    if (!session?.memberships?.length) {
      return null;
    }

    return (
      session.memberships.find(
        (membership) => membership.is_default
      ) ||
      session.memberships[0]
    );
  }, [session]);

  const organization =
    defaultMembership?.organization || null;

  const accessibleModules =
    defaultMembership?.accessible_modules || [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060608] px-5 py-8 text-white sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-red-600/20 blur-[130px]" />

        <div className="absolute -right-32 top-1/3 h-[440px] w-[440px] rounded-full bg-fuchsia-700/10 blur-[150px]" />

        <div className="absolute bottom-0 left-1/3 h-[300px] w-[500px] bg-gradient-to-r from-red-600/10 to-transparent blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-6 rounded-[30px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-24 items-center justify-center rounded-2xl border border-red-500/20 bg-black/60 p-2 shadow-[0_0_35px_rgba(239,68,68,0.12)]">
              <img
                src={synaptechLogo}
                alt="Synaptech Education"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.28em] text-red-400">
                Secure access foundation
              </p>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Platform Session Verification
              </h1>

              <p className="mt-2 max-w-2xl text-base leading-7 text-zinc-400">
                Read-only verification of Firebase identity,
                tenant membership and enabled SaaS modules.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadSession(true)}
            disabled={loading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-400/25 bg-gradient-to-r from-red-600 to-rose-500 px-6 py-3 text-base font-extrabold text-white shadow-[0_14px_40px_rgba(225,29,47,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(225,29,47,0.38)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2
                size={19}
                className="animate-spin"
              />
            ) : (
              <RefreshCw size={19} />
            )}

            Refresh verification
          </button>
        </header>

        {loading && (
          <section className="flex min-h-[420px] items-center justify-center rounded-[30px] border border-white/10 bg-white/[0.045] shadow-2xl backdrop-blur-xl">
            <div className="text-center">
              <Loader2 className="mx-auto mb-5 h-12 w-12 animate-spin text-red-400" />

              <h2 className="text-2xl font-black">
                Verifying secure session
              </h2>

              <p className="mt-3 text-base text-zinc-400">
                Checking Firebase identity, tenant and
                module entitlements.
              </p>
            </div>
          </section>
        )}

        {!loading && error && (
          <section className="rounded-[30px] border border-red-500/30 bg-red-950/30 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-red-500/15 p-4 text-red-300">
                <AlertTriangle size={30} />
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-300">
                  Verification failed
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  The platform session could not be loaded
                </h2>

                <p className="mt-3 text-base leading-7 text-red-100/80">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        {!loading && session && (
          <>
            <section className="mb-7 rounded-[30px] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-white/[0.045] to-white/[0.03] p-7 shadow-[0_28px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/15 p-4 text-emerald-300">
                    <CheckCircle2 size={34} />
                  </div>

                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.24em] text-emerald-300">
                      Identity verified
                    </p>

                    <h2 className="mt-1 text-3xl font-black">
                      Secure platform access is active
                    </h2>
                  </div>
                </div>

                <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-5 py-2 text-sm font-extrabold uppercase tracking-[0.16em] text-emerald-200">
                  Authenticated
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <article className="rounded-[28px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
                  <ShieldCheck size={28} />
                </div>

                <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Platform identity
                </p>

                <h3 className="mt-3 text-2xl font-black">
                  {session.platform_user?.display_name}
                </h3>

                <p className="mt-2 break-all text-base text-zinc-400">
                  {session.firebase_user?.email}
                </p>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                    Platform role
                  </p>

                  <p className="mt-2 text-lg font-extrabold text-red-300">
                    {formatLabel(
                      session.platform_user?.platform_role
                    )}
                  </p>
                </div>
              </article>

              <article className="rounded-[28px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-300">
                  <Building2 size={28} />
                </div>

                <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Default organization
                </p>

                <h3 className="mt-3 text-2xl font-black">
                  {organization?.name ||
                    "No organization"}
                </h3>

                <p className="mt-2 text-base text-zinc-400">
                  {organization?.slug}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Tenant mode
                    </p>

                    <p className="mt-2 font-extrabold text-white">
                      {formatLabel(
                        organization?.tenant_mode
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Status
                    </p>

                    <p className="mt-2 font-extrabold text-emerald-300">
                      {formatLabel(
                        organization?.status
                      )}
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-[28px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
                  <KeyRound size={28} />
                </div>

                <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Tenant membership
                </p>

                <h3 className="mt-3 text-2xl font-black">
                  {formatLabel(
                    defaultMembership?.role
                  )}
                </h3>

                <p className="mt-2 text-base text-zinc-400">
                  Organization-scoped access
                </p>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                    Membership status
                  </p>

                  <p className="mt-2 text-lg font-extrabold text-emerald-300">
                    {formatLabel(
                      defaultMembership?.status
                    )}
                  </p>
                </div>
              </article>
            </section>

            <section className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.055] p-7 shadow-[0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300">
                  <Layers3 size={28} />
                </div>

                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">
                    Module entitlements
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    {accessibleModules.length} modules accessible
                  </h2>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {accessibleModules.map((moduleKey) => (
                  <div
                    key={moduleKey}
                    className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-base font-extrabold text-zinc-100 shadow-inner"
                  >
                    {formatLabel(moduleKey)}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}