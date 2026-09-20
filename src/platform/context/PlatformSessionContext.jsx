import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../../firebase/firebaseConfig";
import { getPlatformSession } from "../services/platformSessionApi";

const PlatformSessionContext = createContext(null);

export function PlatformSessionProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshSession = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const loadedSession = await getPlatformSession();

      setSession(loadedSession);
      return loadedSession;
    } catch (requestError) {
      setSession(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Platform session could not be loaded."
      );

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (cancelled) return;

        setFirebaseUser(user || null);

        if (!user) {
          setSession(null);
          setError("");
          setLoading(false);
          return;
        }

        setLoading(true);
        setError("");

        try {
          const loadedSession = await getPlatformSession();

          if (!cancelled) {
            setSession(loadedSession);
          }
        } catch (requestError) {
          if (!cancelled) {
            setSession(null);
            setError(
              requestError instanceof Error
                ? requestError.message
                : "Platform session could not be loaded."
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      },
      (authError) => {
        if (cancelled) return;

        setFirebaseUser(null);
        setSession(null);
        setLoading(false);
        setError(
          authError instanceof Error
            ? authError.message
            : "Firebase authentication could not be restored."
        );
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const memberships = session?.memberships || [];

  const defaultMembership =
    memberships.find(
      (membership) =>
        membership.organization?.id ===
        session?.default_organization_id
    ) ||
    memberships.find((membership) => membership.is_default) ||
    memberships[0] ||
    null;

  const value = useMemo(
    () => ({
      firebaseUser,
      session,
      loading,
      error,
      memberships,
      defaultMembership,

      platformUser: session?.platform_user || null,

      organization:
        defaultMembership?.organization || null,

      platformRole:
        session?.platform_user?.platform_role || null,

      tenantRole:
        defaultMembership?.role || null,

      isPlatformSuperAdmin:
        session?.platform_user?.platform_role ===
        "platform_super_admin",

      canAccessModule: (moduleKey) =>
        Boolean(
          defaultMembership?.accessible_modules?.includes(
            moduleKey
          )
        ),

      refreshSession,
    }),
    [
      firebaseUser,
      session,
      loading,
      error,
      memberships,
      defaultMembership,
      refreshSession,
    ]
  );

  return (
    <PlatformSessionContext.Provider value={value}>
      {children}
    </PlatformSessionContext.Provider>
  );
}

export function usePlatformSession() {
  const context = useContext(PlatformSessionContext);

  if (!context) {
    throw new Error(
      "usePlatformSession must be used inside PlatformSessionProvider."
    );
  }

  return context;
}