import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createClient } from "@supabase/supabase-js";

const clean = (value) => String(value ?? "").trim();
const integer = (value) => Math.max(0, Math.round(Number(value) || 0));

function firebaseDb() {
  if (!getApps().length) {
    const projectId = clean(process.env.FIREBASE_PROJECT_ID);
    const clientEmail = clean(process.env.FIREBASE_CLIENT_EMAIL);
    const privateKey = clean(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Firebase Admin environment variables are not configured.");
    }
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  return getFirestore();
}

function supabaseAdmin() {
  const url = clean(process.env.SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error("Supabase server environment variables are not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function collectionQuery(db, collectionName, mode, tenantField, tenantId) {
  const ref = db.collection(collectionName);
  if (mode === "white_label") return ref;
  if (mode !== "shared_saas") throw new Error("LMS_METERING_MODE must be white_label or shared_saas.");
  if (!tenantField || !tenantId) {
    throw new Error("Shared SaaS metering requires LMS_TENANT_FIELD and LMS_TENANT_ID.");
  }
  return ref.where(tenantField, "==", tenantId);
}

function isActiveStudent(data) {
  if (data.approved !== true) return false;
  const status = clean(data.status || "Registered").toLowerCase();
  return !["completed", "alumni", "inactive", "rejected", "cancelled", "canceled"].includes(status);
}

function isActiveStaff(data) {
  return data.active !== false && data.disabled !== true && clean(data.status).toLowerCase() !== "inactive";
}

function startOfUsageDay(usageDate) {
  return new Date(`${usageDate}T00:00:00+05:30`).toISOString();
}

function endOfUsageDay(usageDate) {
  return new Date(`${usageDate}T23:59:59.999+05:30`).toISOString();
}

async function countSupabaseDay(supabase, table, dateColumn, usageDate, organizationId) {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte(dateColumn, startOfUsageDay(usageDate))
    .lte(dateColumn, endOfUsageDay(usageDate));
  if (organizationId) query = query.eq("organization_id", organizationId);
  const result = await query;
  if (result.error) throw result.error;
  return integer(result.count);
}

export async function collectRealLmsUsage({ usageDate }) {
  const mode = clean(process.env.LMS_METERING_MODE).toLowerCase();
  const tenantField = clean(process.env.LMS_TENANT_FIELD);
  const tenantId = clean(process.env.LMS_TENANT_ID);
  const crmOrganizationId = clean(process.env.LMS_CRM_ORGANIZATION_ID);
  const db = firebaseDb();
  const supabase = supabaseAdmin();

  const [studentsSnapshot, facultiesSnapshot, adminsSnapshot] = await Promise.all([
    collectionQuery(db, "students", mode, tenantField, tenantId).get(),
    collectionQuery(db, "faculties", mode, tenantField, tenantId).get(),
    collectionQuery(db, "admins", mode, tenantField, tenantId).get(),
  ]);

  const activeStudents = studentsSnapshot.docs.filter((item) => isActiveStudent(item.data())).length;
  const activeFaculties = facultiesSnapshot.docs.filter((item) => isActiveStaff(item.data())).length;
  const activeAdmins = adminsSnapshot.docs.filter((item) => isActiveStaff(item.data())).length;

  const [leadsCreated, aiQualificationRuns] = await Promise.all([
    countSupabaseDay(supabase, "crm_leads", "created_at", usageDate, crmOrganizationId),
    countSupabaseDay(supabase, "crm_ai_qualifications", "created_at", usageDate, crmOrganizationId),
  ]);

  return {
    active_students: integer(activeStudents),
    active_staff_users: integer(activeFaculties + activeAdmins),
    leads_created: leadsCreated,
    whatsapp_messages: 0,
    whatsapp_conversations: 0,
    ai_call_minutes: 0,
    ai_qualification_runs: aiQualificationRuns,
    storage_used_gb: 0,
    api_requests: 0,
  };
}

export function meteringConfiguration() {
  const endpoint = clean(process.env.CRM_METERING_ENDPOINT_URL);
  const tenantKey = clean(process.env.CRM_METERING_TENANT_KEY);
  const apiKey = clean(process.env.CRM_METERING_API_KEY);
  if (!endpoint || !tenantKey || !apiKey) {
    throw new Error("CRM metering endpoint, tenant key, or API key is not configured.");
  }
  return { endpoint, tenantKey, apiKey };
}
