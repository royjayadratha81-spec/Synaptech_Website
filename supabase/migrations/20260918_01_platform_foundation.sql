-- ============================================================
-- SYNAPTECH SAAS PLATFORM FOUNDATION
-- Additive migration only.
-- Does not change existing CRM, LMS, Finance or lead tables.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. Platform users
-- Connects Firebase Authentication users to platform access.
-- ------------------------------------------------------------

create table if not exists public.platform_users (
  firebase_uid text primary key,
  email text not null,
  display_name text,
  platform_role text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint platform_users_role_check
    check (
      platform_role is null
      or platform_role in ('platform_super_admin')
    ),

  constraint platform_users_status_check
    check (
      status in ('active', 'invited', 'suspended', 'disabled')
    )
);

create unique index if not exists
  platform_users_email_lower_uidx
on public.platform_users (lower(email));


-- ------------------------------------------------------------
-- 2. Platform organisations / SaaS tenants
-- Each institute or business client receives one organisation.
-- ------------------------------------------------------------

create table if not exists public.platform_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,

  tenant_mode text not null default 'lms_only',

  status text not null default 'active',

  firestore_tenant_key text unique,

  crm_organization_id uuid,

  branding jsonb not null default '{}'::jsonb,

  settings jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint platform_organizations_mode_check
    check (
      tenant_mode in (
        'lms_only',
        'crm_only',
        'crm_lms',
        'full_suite',
        'education_solutions'
      )
    ),

  constraint platform_organizations_status_check
    check (
      status in (
        'active',
        'trial',
        'suspended',
        'cancelled',
        'archived'
      )
    )
);

create unique index if not exists
  platform_organizations_crm_org_uidx
on public.platform_organizations (crm_organization_id)
where crm_organization_id is not null;


-- ------------------------------------------------------------
-- 3. Organisation memberships
-- Controls which staff member belongs to which tenant.
-- ------------------------------------------------------------

create table if not exists public.platform_memberships (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.platform_organizations(id)
    on delete restrict,

  firebase_uid text not null
    references public.platform_users(firebase_uid)
    on delete restrict,

  role text not null,

  status text not null default 'active',

  is_default boolean not null default false,

  permissions jsonb not null default '{}'::jsonb,

  created_by text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint platform_memberships_role_check
    check (
      role in (
        'tenant_admin',
        'admissions_counsellor',
        'sales_manager',
        'sales_executive',
        'finance_admin',
        'faculty',
        'mis_viewer',
        'student'
      )
    ),

  constraint platform_memberships_status_check
    check (
      status in (
        'active',
        'invited',
        'suspended',
        'disabled'
      )
    ),

  constraint platform_memberships_org_user_unique
    unique (organization_id, firebase_uid)
);

create index if not exists
  platform_memberships_organization_idx
on public.platform_memberships (organization_id);

create index if not exists
  platform_memberships_firebase_uid_idx
on public.platform_memberships (firebase_uid);

create unique index if not exists
  platform_memberships_one_default_uidx
on public.platform_memberships (firebase_uid)
where is_default = true;


-- ------------------------------------------------------------
-- 4. Tenant module entitlements
-- Determines which product modules a tenant has purchased.
-- ------------------------------------------------------------

create table if not exists public.platform_entitlements (
  organization_id uuid not null
    references public.platform_organizations(id)
    on delete restrict,

  module_key text not null,

  is_enabled boolean not null default false,

  configuration jsonb not null default '{}'::jsonb,

  enabled_at timestamptz,

  disabled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (organization_id, module_key),

  constraint platform_entitlements_module_check
    check (
      module_key in (
        'administration',
        'crm',
        'admissions',
        'finance',
        'lms',
        'faculty',
        'analytics_mis',
        'notifications'
      )
    )
);

create index if not exists
  platform_entitlements_enabled_idx
on public.platform_entitlements (
  organization_id,
  is_enabled
);


-- ------------------------------------------------------------
-- 5. Safe updated_at trigger
-- ------------------------------------------------------------

create or replace function public.platform_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists
  platform_users_touch_updated_at
on public.platform_users;

create trigger platform_users_touch_updated_at
before update on public.platform_users
for each row
execute function public.platform_touch_updated_at();


drop trigger if exists
  platform_organizations_touch_updated_at
on public.platform_organizations;

create trigger platform_organizations_touch_updated_at
before update on public.platform_organizations
for each row
execute function public.platform_touch_updated_at();


drop trigger if exists
  platform_memberships_touch_updated_at
on public.platform_memberships;

create trigger platform_memberships_touch_updated_at
before update on public.platform_memberships
for each row
execute function public.platform_touch_updated_at();


drop trigger if exists
  platform_entitlements_touch_updated_at
on public.platform_entitlements;

create trigger platform_entitlements_touch_updated_at
before update on public.platform_entitlements
for each row
execute function public.platform_touch_updated_at();


-- ------------------------------------------------------------
-- 6. Security
-- These tables will initially be accessed only through secure
-- server APIs using the Supabase service-role credential.
-- ------------------------------------------------------------

alter table public.platform_users
  enable row level security;

alter table public.platform_organizations
  enable row level security;

alter table public.platform_memberships
  enable row level security;

alter table public.platform_entitlements
  enable row level security;

revoke all on table
  public.platform_users
from anon, authenticated;

revoke all on table
  public.platform_organizations
from anon, authenticated;

revoke all on table
  public.platform_memberships
from anon, authenticated;

revoke all on table
  public.platform_entitlements
from anon, authenticated;