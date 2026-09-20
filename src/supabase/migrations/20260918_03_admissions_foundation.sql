begin;

create extension if not exists pgcrypto;

-- =========================================================
-- 1. PRE-ADMISSION CANDIDATE
-- A candidate is not an LMS student.
-- =========================================================

create table if not exists public.admissions_candidates (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.platform_organizations(id)
    on delete restrict,

  candidate_number text not null default (
    'CAN-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),

  full_name text not null,

  email text,
  email_normalized text,

  phone text,
  phone_normalized text,

  city text,

  guardian_name text,
  guardian_email text,
  guardian_phone text,

  preferred_contact_channel text
    check (
      preferred_contact_channel is null
      or preferred_contact_channel in (
        'phone',
        'whatsapp',
        'email',
        'in_person'
      )
    ),

  -- May contain website, Meta, Google, LinkedIn, Justdial,
  -- IndiaMART, CRM, walk-in, referral, legacy import, etc.
  source_channel text not null default 'other',
  source_detail text,

  -- Generated later by the server only when identity evidence
  -- is strong enough to prevent incorrect duplicate merging.
  identity_key text,

  status text not null default 'active'
    check (
      status in (
        'active',
        'merged',
        'archived'
      )
    ),

  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),

  created_by_platform_user_id text
    references public.platform_users(firebase_uid)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admissions_candidates_org_number_uq
    unique (organization_id, candidate_number),

  constraint admissions_candidates_id_org_uq
    unique (id, organization_id)
);


-- =========================================================
-- 2. ADMISSION APPLICATION
-- One candidate can have more than one application.
-- CRM references remain external references intentionally.
-- =========================================================

create table if not exists public.admissions_applications (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.platform_organizations(id)
    on delete restrict,

  candidate_id uuid not null,

  application_number text not null default (
    'APP-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),

  intake_route text not null
    check (
      intake_route in (
        'crm_won',
        'website_enrol',
        'walk_in',
        'lms_only',
        'referral',
        'partner',
        'legacy_migration',
        'other'
      )
    ),

  lead_source text,

  -- Kept as text to avoid changing or coupling existing CRM tables.
  crm_lead_id text,
  crm_opportunity_id text,
  external_submission_id text,

  programme_code text,
  programme_name text,

  delivery_mode text not null default 'undecided'
    check (
      delivery_mode in (
        'online',
        'offline',
        'hybrid',
        'undecided'
      )
    ),

  academic_session text,
  batch_preference text,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'submitted',
        'under_review',
        'documents_pending',
        'finance_pending',
        'finance_verified',
        'admitted',
        'waitlisted',
        'rejected',
        'withdrawn',
        'cancelled'
      )
    ),

  decision_status text not null default 'pending'
    check (
      decision_status in (
        'pending',
        'approved',
        'waitlisted',
        'rejected',
        'withdrawn'
      )
    ),

  decision_notes text,

  -- Finance remains the admission gate.
  finance_verification_required boolean not null default true,

  -- Populated only after Finance approval and successful LMS provisioning.
  lms_student_reference text,

  submitted_at timestamptz,
  reviewed_at timestamptz,
  finance_verified_at timestamptz,
  admitted_at timestamptz,
  lms_student_created_at timestamptz,

  actor_platform_user_id text
    references public.platform_users(firebase_uid)
    on delete set null,

  created_by_platform_user_id text
    references public.platform_users(firebase_uid)
    on delete set null,

  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),

  version integer not null default 1
    check (version > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admissions_applications_candidate_org_fk
    foreign key (candidate_id, organization_id)
    references public.admissions_candidates(id, organization_id)
    on delete restrict,

  constraint admissions_applications_org_number_uq
    unique (organization_id, application_number),

  constraint admissions_applications_id_org_uq
    unique (id, organization_id)
);


-- =========================================================
-- 3. IMMUTABLE APPLICATION AUDIT TRAIL
-- Records lifecycle changes without touching existing systems.
-- =========================================================

create table if not exists public.admissions_application_events (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.platform_organizations(id)
    on delete restrict,

  application_id uuid not null,

  event_type text not null,

  from_status text,
  to_status text,

  actor_type text not null default 'system'
    check (
      actor_type in (
        'system',
        'platform_user',
        'candidate',
        'integration',
        'migration'
      )
    ),

  actor_platform_user_id text
    references public.platform_users(firebase_uid)
    on delete set null,

  note text,

  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),

  -- Used later to prevent duplicate CRM/webhook event processing.
  idempotency_key text,

  created_at timestamptz not null default now(),

  constraint admissions_application_events_application_org_fk
    foreign key (application_id, organization_id)
    references public.admissions_applications(id, organization_id)
    on delete cascade
);


-- =========================================================
-- INDEXES
-- =========================================================

create unique index if not exists
  admissions_candidates_org_identity_uq
on public.admissions_candidates (
  organization_id,
  identity_key
)
where identity_key is not null
  and btrim(identity_key) <> '';


create index if not exists
  admissions_candidates_org_status_created_idx
on public.admissions_candidates (
  organization_id,
  status,
  created_at desc
);


create index if not exists
  admissions_candidates_org_email_idx
on public.admissions_candidates (
  organization_id,
  email_normalized
)
where email_normalized is not null;


create index if not exists
  admissions_candidates_org_phone_idx
on public.admissions_candidates (
  organization_id,
  phone_normalized
)
where phone_normalized is not null;


create index if not exists
  admissions_applications_org_status_created_idx
on public.admissions_applications (
  organization_id,
  status,
  created_at desc
);


create index if not exists
  admissions_applications_candidate_idx
on public.admissions_applications (
  candidate_id,
  created_at desc
);


create index if not exists
  admissions_applications_crm_lead_idx
on public.admissions_applications (
  organization_id,
  crm_lead_id
)
where crm_lead_id is not null;


create index if not exists
  admissions_applications_crm_opportunity_idx
on public.admissions_applications (
  organization_id,
  crm_opportunity_id
)
where crm_opportunity_id is not null;


create index if not exists
  admissions_application_events_application_created_idx
on public.admissions_application_events (
  application_id,
  created_at desc
);


create unique index if not exists
  admissions_application_events_idempotency_uq
on public.admissions_application_events (
  organization_id,
  idempotency_key
)
where idempotency_key is not null
  and btrim(idempotency_key) <> '';


-- Browser clients receive no direct access.
-- Future Admissions APIs will use the authenticated server layer.
alter table public.admissions_candidates enable row level security;
alter table public.admissions_applications enable row level security;
alter table public.admissions_application_events enable row level security;

comment on table public.admissions_candidates is
  'Pre-admission candidate identities. Candidates are not LMS students.';

comment on table public.admissions_applications is
  'Tenant-scoped admission applications awaiting review, Finance verification and controlled LMS provisioning.';

comment on table public.admissions_application_events is
  'Append-only audit events for the admission lifecycle.';

commit;
