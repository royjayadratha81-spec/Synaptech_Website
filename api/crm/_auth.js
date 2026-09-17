// api/crm/_auth.js
// CRM-only authentication helper.
//
// IMPORTANT:
// This file belongs ONLY to the CRM.
// It does NOT modify or replace the existing AdminLogin,
// AdminProtectedRoute, LMS, website, or AI chatbot.
//
// Authentication flow:
//
// Existing Firebase Login
//        ↓
// Firebase ID Token
//        ↓
// CRM API
//        ↓
// Verify Firebase token
//        ↓
// Find matching crm_users.firebase_uid
//        ↓
// Verify CRM user is active
//        ↓
// Load CRM organization
//        ↓
// Allow CRM operation

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth as getFirebaseAdminAuth } from "firebase-admin/auth";
import { createClient } from "@supabase/supabase-js";

let firebaseAdminApp = null;

/**
 * Initialize Firebase Admin only when a CRM API request needs it.
 */
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
      "CRM Firebase Admin environment variables are not configured."
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

/**
 * Server-side Supabase client.
 *
 * IMPORTANT:
 * SUPABASE_SERVICE_ROLE_KEY must NEVER be exposed
 * to React/frontend code.
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "CRM Supabase environment variables are not configured."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Extract Firebase Bearer token from the request.
 */
function getBearerToken(req) {
  const header = req.headers?.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim() || null;
}

/**
 * Authenticate a CRM API request.
 *
 * Returns:
 *
 * {
 *   firebaseUser,
 *   crmUser,
 *   organization,
 *   supabase
 * }
 */
export async function authenticateCrmRequest(req) {
  const token = getBearerToken(req);

  if (!token) {
    const error = new Error("CRM authentication required.");
    error.statusCode = 401;
    throw error;
  }

  let firebaseUser;

  try {
    const adminAuth = getFirebaseAdminAuth(
      getFirebaseAdminApp()
    );

    firebaseUser = await adminAuth.verifyIdToken(token);
  } catch (error) {
    console.error(
      "CRM Firebase token verification failed:",
      error
    );

    const authError = new Error(
      "Invalid or expired authentication token."
    );

    authError.statusCode = 401;

    throw authError;
  }

  const supabase = getSupabaseAdmin();

  /**
   * Find the CRM user using the Firebase UID.
   *
   * This is the important bridge between
   * existing Firebase Authentication and CRM.
   */
  const {
    data: crmUser,
    error: crmUserError,
  } = await supabase
    .from("crm_users")
    .select(
      `
      id,
      organization_id,
      firebase_uid,
      full_name,
      email,
      role,
      status,
      metadata
      `
    )
    .eq("firebase_uid", firebaseUser.uid)
    .maybeSingle();

  if (crmUserError) {
    console.error(
      "CRM user lookup failed:",
      crmUserError
    );

    const error = new Error(
      "Unable to verify CRM user."
    );

    error.statusCode = 500;

    throw error;
  }

  if (!crmUser) {
    const error = new Error(
      "You are not registered as a CRM user."
    );

    error.statusCode = 403;

    throw error;
  }

  /**
   * CRM user must be active.
   */
  if (crmUser.status !== "active") {
    const error = new Error(
      "Your CRM account is inactive."
    );

    error.statusCode = 403;

    throw error;
  }

  /**
   * Load the CRM organization belonging
   * to this CRM user.
   */
  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("crm_organizations")
    .select(
      `
      id,
      name,
      slug,
      status,
      logo_url,
      primary_color,
      metadata
      `
    )
    .eq("id", crmUser.organization_id)
    .maybeSingle();

  if (organizationError) {
    console.error(
      "CRM organization lookup failed:",
      organizationError
    );

    const error = new Error(
      "Unable to verify CRM organization."
    );

    error.statusCode = 500;

    throw error;
  }

  if (!organization) {
    const error = new Error(
      "CRM organization not found."
    );

    error.statusCode = 403;

    throw error;
  }

  /**
   * Organization must also be active.
   */
  if (organization.status !== "active") {
    const error = new Error(
      "CRM organization is inactive."
    );

    error.statusCode = 403;

    throw error;
  }

  return {
    firebaseUser,
    crmUser,
    organization,
    supabase,
  };
}

/**
 * Standard CRM API error response.
 */
export function sendCrmError(res, error) {
  const statusCode =
    Number(error?.statusCode) || 500;

  if (statusCode >= 500) {
    console.error(
      "CRM API error:",
      error
    );
  }

  return res.status(statusCode).json({
    error:
      statusCode >= 500
        ? "CRM service error."
        : error?.message ||
          "CRM request failed.",
  });
}