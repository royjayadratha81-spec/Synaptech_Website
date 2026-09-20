-- ============================================================
-- SYNAPTECH PRIMARY TENANT AND SUPER ADMIN
--
-- This migration:
-- 1. Reuses the existing Firebase/CRM identity.
-- 2. Creates the Synaptech platform tenant.
-- 3. Makes the existing user Platform Super Admin.
-- 4. Adds tenant-admin membership.
-- 5. Enables all Synaptech modules.
--
-- It does not modify any existing CRM, lead, LMS, Finance,
-- Aira, scoring or Education Solutions data.
-- ============================================================

begin;


-- ------------------------------------------------------------
-- 1. Reuse the existing Firebase-authenticated CRM user
-- ------------------------------------------------------------

insert into public.platform_users (
  firebase_uid,
  email,
  display_name,
  platform_role,
  status,
  metadata
)
select
  cu.firebase_uid,
  lower(cu.email),
  coalesce(
    nullif(trim(cu.full_name), ''),
    'Synaptech Super Admin'
  ),
  'platform_super_admin',
  'active',
  jsonb_build_object(
    'source', 'existing_crm_user',
    'crm_user_id', cu.id,
    'original_crm_role', cu.role
  )
from public.crm_users cu
where lower(cu.email) = lower('admission@synaptecheducation.in')
  and cu.status = 'active'
  and cu.firebase_uid is not null
limit 1
on conflict (firebase_uid)
do update set
  email = excluded.email,
  display_name = excluded.display_name,
  platform_role = 'platform_super_admin',
  status = 'active',
  metadata =
    public.platform_users.metadata ||
    excluded.metadata;


-- Stop safely if the expected existing identity was not found.

do $$
begin
  if not exists (
    select 1
    from public.platform_users
    where lower(email) =
      lower('admission@synaptecheducation.in')
      and platform_role = 'platform_super_admin'
  ) then
    raise exception
      'Existing active Firebase/CRM user was not found. No platform identity was created.';
  end if;
end;
$$;


-- ------------------------------------------------------------
-- 2. Register Synaptech Education as the primary SaaS tenant
-- ------------------------------------------------------------

insert into public.platform_organizations (
  name,
  slug,
  tenant_mode,
  status,
  firestore_tenant_key,
  crm_organization_id,
  branding,
  settings
)
select
  co.name,
  co.slug,
  'full_suite',
  'active',
  'synaptech-education',
  co.id,

  jsonb_build_object(
    'brand_name', 'Synaptech Education',
    'theme', 'ultra_premium_dark',
    'primary_color', '#E31E2F',
    'accent_color', '#FF5364',
    'background_color', '#070709',
    'surface_color', '#111116'
  ),

  jsonb_build_object(
    'primary_tenant', true,
    'crm_enabled', true,
    'admissions_enabled', true,
    'manual_admissions_enabled', true,
    'finance_approval_required', true,
    'lms_enabled', true,
    'faculty_portal_enabled', true,
    'analytics_enabled', true,
    'notifications_enabled', true
  )

from public.crm_organizations co
join public.crm_users cu
  on cu.organization_id = co.id

where lower(cu.email) =
      lower('admission@synaptecheducation.in')
  and cu.status = 'active'
  and co.status = 'active'

limit 1

on conflict (slug)
do update set
  name = excluded.name,
  tenant_mode = 'full_suite',
  status = 'active',
  firestore_tenant_key =
    excluded.firestore_tenant_key,
  crm_organization_id =
    excluded.crm_organization_id,
  branding =
    public.platform_organizations.branding ||
    excluded.branding,
  settings =
    public.platform_organizations.settings ||
    excluded.settings;


-- ------------------------------------------------------------
-- 3. Add the Super Admin as Synaptech tenant administrator
-- ------------------------------------------------------------

insert into public.platform_memberships (
  organization_id,
  firebase_uid,
  role,
  status,
  is_default,
  permissions,
  created_by
)
select
  po.id,
  pu.firebase_uid,
  'tenant_admin',
  'active',
  true,
  jsonb_build_object(
    'access_scope', 'all_enabled_modules'
  ),
  pu.firebase_uid

from public.platform_users pu

join public.platform_organizations po
  on po.slug = 'synaptech-education'

where lower(pu.email) =
      lower('admission@synaptecheducation.in')
  and pu.platform_role = 'platform_super_admin'

on conflict (organization_id, firebase_uid)
do update set
  role = 'tenant_admin',
  status = 'active',
  is_default = true,
  permissions =
    public.platform_memberships.permissions ||
    excluded.permissions;


-- ------------------------------------------------------------
-- 4. Enable every module for the Synaptech primary tenant
-- ------------------------------------------------------------

insert into public.platform_entitlements (
  organization_id,
  module_key,
  is_enabled,
  configuration,
  enabled_at
)
select
  po.id,
  module_list.module_key,
  true,
  jsonb_build_object(
    'source', 'synaptech_primary_tenant'
  ),
  now()

from public.platform_organizations po

cross join unnest(
  array[
    'administration',
    'crm',
    'admissions',
    'finance',
    'lms',
    'faculty',
    'analytics_mis',
    'notifications'
  ]::text[]
) as module_list(module_key)

where po.slug = 'synaptech-education'

on conflict (organization_id, module_key)
do update set
  is_enabled = true,
  disabled_at = null,
  enabled_at = coalesce(
    public.platform_entitlements.enabled_at,
    excluded.enabled_at
  ),
  configuration =
    public.platform_entitlements.configuration ||
    excluded.configuration;


commit;