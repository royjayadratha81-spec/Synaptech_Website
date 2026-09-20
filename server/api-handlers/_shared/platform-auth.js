import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth as getFirebaseAdminAuth } from "firebase-admin/auth";
import { createClient } from "@supabase/supabase-js";

import {
  ALL_PLATFORM_MODULES,
  PLATFORM_ROLES,
  canAccessPlatformModule,
} from "../../../shared/platform-access.js";

let firebaseAdminApp = null;

function getFirebaseAdminApp() {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  const existingApps = getApps();

  if (existingApps.length > 0) {
    firebaseAdminApp = existingApps[0];
    return firebaseAdminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Platform Firebase Admin environment variables are not configured."
    );
  }

  firebaseAdminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });

  return firebaseAdminApp;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Platform Supabase environment variables are not configured."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getBearerToken(req) {
  const authorization = req.headers?.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

function createPlatformError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function unique(values) {
  return [...new Set(values)];
}

export async function authenticatePlatformRequest(req) {
  const token = getBearerToken(req);

  if (!token) {
    throw createPlatformError(
      "Platform authentication required.",
      401
    );
  }

  let firebaseUser;

  try {
    firebaseUser = await getFirebaseAdminAuth(
      getFirebaseAdminApp()
    ).verifyIdToken(token);
  } catch (error) {
    console.error(
      "Platform Firebase token verification failed:",
      error
    );

    throw createPlatformError(
      "Invalid or expired authentication token.",
      401
    );
  }

  const supabase = getSupabaseAdmin();

  const {
    data: platformUser,
    error: platformUserError,
  } = await supabase
    .from("platform_users")
    .select(
      `
      firebase_uid,
      email,
      display_name,
      platform_role,
      status
      `
    )
    .eq("firebase_uid", firebaseUser.uid)
    .maybeSingle();

  if (platformUserError) {
    console.error(
      "Platform user lookup failed:",
      platformUserError
    );

    throw createPlatformError(
      "Unable to verify platform user.",
      500
    );
  }

  if (!platformUser) {
    throw createPlatformError(
      "You are not registered as a Synaptech platform user.",
      403
    );
  }

  if (platformUser.status !== "active") {
    throw createPlatformError(
      "Your platform account is inactive.",
      403
    );
  }

  const {
    data: membershipRows,
    error: membershipError,
  } = await supabase
    .from("platform_memberships")
    .select(
      `
      id,
      organization_id,
      role,
      status,
      is_default,
      permissions
      `
    )
    .eq("firebase_uid", firebaseUser.uid)
    .eq("status", "active");

  if (membershipError) {
    console.error(
      "Platform membership lookup failed:",
      membershipError
    );

    throw createPlatformError(
      "Unable to load platform memberships.",
      500
    );
  }

  const memberships = membershipRows || [];

  const organizationIds = unique(
    memberships.map(
      (membership) => membership.organization_id
    )
  );

  let organizations = [];
  let entitlements = [];

  if (organizationIds.length > 0) {
    const {
      data: organizationRows,
      error: organizationError,
    } = await supabase
      .from("platform_organizations")
      .select(
        `
        id,
        name,
        slug,
        tenant_mode,
        status,
        firestore_tenant_key,
        crm_organization_id,
        branding
        `
      )
      .in("id", organizationIds);

    if (organizationError) {
      console.error(
        "Platform organization lookup failed:",
        organizationError
      );

      throw createPlatformError(
        "Unable to load platform organizations.",
        500
      );
    }

    organizations = organizationRows || [];

    const {
      data: entitlementRows,
      error: entitlementError,
    } = await supabase
      .from("platform_entitlements")
      .select(
        `
        organization_id,
        module_key,
        configuration
        `
      )
      .in("organization_id", organizationIds)
      .eq("is_enabled", true);

    if (entitlementError) {
      console.error(
        "Platform entitlement lookup failed:",
        entitlementError
      );

      throw createPlatformError(
        "Unable to load platform entitlements.",
        500
      );
    }

    entitlements = entitlementRows || [];
  }

  const organizationById = new Map(
    organizations.map((organization) => [
      organization.id,
      organization,
    ])
  );

  const sessionMemberships = memberships
    .map((membership) => {
      const organization = organizationById.get(
        membership.organization_id
      );

      if (!organization) {
        return null;
      }

      const enabledModules = entitlements
        .filter(
          (entitlement) =>
            entitlement.organization_id ===
            organization.id
        )
        .map(
          (entitlement) => entitlement.module_key
        );

      const accessibleModules =
        platformUser.platform_role ===
        PLATFORM_ROLES.PLATFORM_SUPER_ADMIN
          ? [...ALL_PLATFORM_MODULES]
          : enabledModules.filter((moduleKey) =>
              canAccessPlatformModule({
                role: membership.role,
                moduleKey,
                enabledModules,
              })
            );

      return {
        id: membership.id,
        role: membership.role,
        status: membership.status,
        is_default: membership.is_default,
        permissions: membership.permissions || {},
        enabled_modules: enabledModules,
        accessible_modules: accessibleModules,
        organization,
      };
    })
    .filter(Boolean);

  const defaultMembership =
    sessionMemberships.find(
      (membership) => membership.is_default
    ) ||
    sessionMemberships[0] ||
    null;

  return {
    firebase_user: {
      uid: firebaseUser.uid,
      email:
        firebaseUser.email ||
        platformUser.email,
      email_verified:
        Boolean(firebaseUser.email_verified),
    },

    platform_user: platformUser,

    memberships: sessionMemberships,

    default_organization_id:
      defaultMembership?.organization?.id || null,

    default_organization_slug:
      defaultMembership?.organization?.slug || null,

    supabase,
  };
}

export function toPublicPlatformSession(
  authenticatedSession
) {
  const {
    supabase: _supabase,
    ...publicSession
  } = authenticatedSession;

  return publicSession;
}

export function sendPlatformError(res, error) {
  const statusCode =
    Number(error?.statusCode) || 500;

  if (statusCode >= 500) {
    console.error(
      "Platform API error:",
      error
    );
  }

  return res.status(statusCode).json({
    error:
      statusCode >= 500
        ? "Platform service error."
        : error?.message ||
          "Platform request failed.",
  });
}