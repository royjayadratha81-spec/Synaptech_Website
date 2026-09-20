/**
 * Synaptech platform access contract.
 *
 * This file contains definitions only.
 * It does not read or write data and does not change any existing route.
 *
 * Both frontend and server code will use this same contract so that
 * roles, tenant modes and module names cannot drift apart.
 */

export const PLATFORM_ROLES = Object.freeze({
  PLATFORM_SUPER_ADMIN: "platform_super_admin",
  TENANT_ADMIN: "tenant_admin",
  ADMISSIONS_COUNSELLOR: "admissions_counsellor",
  SALES_MANAGER: "sales_manager",
  SALES_EXECUTIVE: "sales_executive",
  FINANCE_ADMIN: "finance_admin",
  FACULTY: "faculty",
  MIS_VIEWER: "mis_viewer",
  STUDENT: "student",
});

export const TENANT_MODES = Object.freeze({
  LMS_ONLY: "lms_only",
  CRM_ONLY: "crm_only",
  CRM_LMS: "crm_lms",
  FULL_SUITE: "full_suite",
  EDUCATION_SOLUTIONS: "education_solutions",
});

export const PLATFORM_MODULES = Object.freeze({
  ADMINISTRATION: "administration",
  CRM: "crm",
  ADMISSIONS: "admissions",
  FINANCE: "finance",
  LMS: "lms",
  FACULTY: "faculty",
  ANALYTICS_MIS: "analytics_mis",
  NOTIFICATIONS: "notifications",
});

export const ALL_PLATFORM_MODULES = Object.freeze(
  Object.values(PLATFORM_MODULES)
);

/**
 * Default module bundles.
 *
 * These are defaults only. A tenant's stored entitlements will remain
 * the final authority, allowing individual modules to be enabled or
 * disabled without changing application code.
 */
export const TENANT_MODE_DEFAULT_MODULES = Object.freeze({
  [TENANT_MODES.LMS_ONLY]: Object.freeze([
    PLATFORM_MODULES.ADMINISTRATION,
    PLATFORM_MODULES.ADMISSIONS,
    PLATFORM_MODULES.FINANCE,
    PLATFORM_MODULES.LMS,
    PLATFORM_MODULES.FACULTY,
    PLATFORM_MODULES.ANALYTICS_MIS,
    PLATFORM_MODULES.NOTIFICATIONS,
  ]),

  [TENANT_MODES.CRM_ONLY]: Object.freeze([
    PLATFORM_MODULES.ADMINISTRATION,
    PLATFORM_MODULES.CRM,
    PLATFORM_MODULES.ANALYTICS_MIS,
    PLATFORM_MODULES.NOTIFICATIONS,
  ]),

  [TENANT_MODES.CRM_LMS]: ALL_PLATFORM_MODULES,

  [TENANT_MODES.FULL_SUITE]: ALL_PLATFORM_MODULES,

  [TENANT_MODES.EDUCATION_SOLUTIONS]: Object.freeze([
    PLATFORM_MODULES.ADMINISTRATION,
    PLATFORM_MODULES.CRM,
    PLATFORM_MODULES.ANALYTICS_MIS,
    PLATFORM_MODULES.NOTIFICATIONS,
  ]),
});

/**
 * Modules each staff role is permitted to use.
 *
 * Actual access requires both:
 * 1. the user's role to permit the module; and
 * 2. the tenant to have that module enabled.
 *
 * Platform Super Admin is evaluated separately and remains
 * platform-wide.
 */
export const ROLE_ALLOWED_MODULES = Object.freeze({
  [PLATFORM_ROLES.PLATFORM_SUPER_ADMIN]: ALL_PLATFORM_MODULES,

  [PLATFORM_ROLES.TENANT_ADMIN]: ALL_PLATFORM_MODULES,

  [PLATFORM_ROLES.ADMISSIONS_COUNSELLOR]: Object.freeze([
    PLATFORM_MODULES.CRM,
    PLATFORM_MODULES.ADMISSIONS,
    PLATFORM_MODULES.NOTIFICATIONS,
  ]),

  [PLATFORM_ROLES.SALES_MANAGER]: Object.freeze([
    PLATFORM_MODULES.CRM,
    PLATFORM_MODULES.ANALYTICS_MIS,
    PLATFORM_MODULES.NOTIFICATIONS,
  ]),

  [PLATFORM_ROLES.SALES_EXECUTIVE]: Object.freeze([
    PLATFORM_MODULES.CRM,
    PLATFORM_MODULES.NOTIFICATIONS,
  ]),

  [PLATFORM_ROLES.FINANCE_ADMIN]: Object.freeze([
    PLATFORM_MODULES.ADMISSIONS,
    PLATFORM_MODULES.FINANCE,
    PLATFORM_MODULES.ANALYTICS_MIS,
    PLATFORM_MODULES.NOTIFICATIONS,
  ]),

  [PLATFORM_ROLES.FACULTY]: Object.freeze([
    PLATFORM_MODULES.LMS,
    PLATFORM_MODULES.FACULTY,
    PLATFORM_MODULES.NOTIFICATIONS,
  ]),

  [PLATFORM_ROLES.MIS_VIEWER]: Object.freeze([
    PLATFORM_MODULES.ANALYTICS_MIS,
  ]),

  [PLATFORM_ROLES.STUDENT]: Object.freeze([
    PLATFORM_MODULES.LMS,
    PLATFORM_MODULES.NOTIFICATIONS,
  ]),
});

export function isKnownPlatformRole(role) {
  return Object.values(PLATFORM_ROLES).includes(role);
}

export function isKnownTenantMode(mode) {
  return Object.values(TENANT_MODES).includes(mode);
}

export function isKnownPlatformModule(moduleKey) {
  return ALL_PLATFORM_MODULES.includes(moduleKey);
}

export function getDefaultModulesForTenantMode(mode) {
  const modules = TENANT_MODE_DEFAULT_MODULES[mode];

  return modules ? [...modules] : [];
}

export function getAllowedModulesForRole(role) {
  const modules = ROLE_ALLOWED_MODULES[role];

  return modules ? [...modules] : [];
}

/**
 * Final module-access decision.
 *
 * Platform Super Admin:
 * - can access every recognised platform module;
 * - is not restricted by a tenant's subscription.
 *
 * Every other role:
 * - must permit the module; and
 * - the tenant entitlement must enable it.
 */
export function canAccessPlatformModule({
  role,
  moduleKey,
  enabledModules = [],
}) {
  if (
    !isKnownPlatformRole(role) ||
    !isKnownPlatformModule(moduleKey)
  ) {
    return false;
  }

  if (role === PLATFORM_ROLES.PLATFORM_SUPER_ADMIN) {
    return true;
  }

  const roleModules = getAllowedModulesForRole(role);

  return (
    roleModules.includes(moduleKey) &&
    enabledModules.includes(moduleKey)
  );
}