begin;

-- Phase 2 remains additive. These indexes support tenant-scoped manual intake
-- and do not modify any existing Admissions, Finance, CRM or LMS row.
create index if not exists admissions_candidates_org_email_idx
  on public.admissions_candidates (organization_id, email_normalized)
  where email_normalized is not null;

create index if not exists admissions_applications_manual_queue_idx
  on public.admissions_applications (organization_id, created_at desc)
  where intake_route = 'manual';

comment on index public.admissions_candidates_org_email_idx is
  'Supports tenant-scoped candidate reuse during controlled manual Admissions intake.';

comment on index public.admissions_applications_manual_queue_idx is
  'Supports the manual-intake Admissions queue without altering CRM Won records.';

create or replace function public.admissions_create_manual_intake(
  p_organization_id uuid,
  p_actor_platform_user_id text,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_city text default null,
  p_guardian_name text default null,
  p_guardian_email text default null,
  p_guardian_phone text default null,
  p_programme_code text default null,
  p_programme_name text default null,
  p_delivery_mode text default null,
  p_academic_session text default null,
  p_batch_preference text default null,
  p_agreed_fee numeric default null,
  p_currency text default 'INR',
  p_payment_terms text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_candidate public.admissions_candidates%rowtype;
  v_application public.admissions_applications%rowtype;
  v_now timestamptz := now();
  v_email text := lower(nullif(btrim(coalesce(p_email, '')), ''));
begin
  if p_organization_id is null
     or nullif(btrim(coalesce(p_actor_platform_user_id, '')), '') is null
     or nullif(btrim(coalesce(p_full_name, '')), '') is null
     or v_email is null
     or nullif(btrim(coalesce(p_programme_name, '')), '') is null then
    raise exception using errcode = '22023',
      message = 'Organization, operator, name, email and programme are required.';
  end if;

  select candidate.* into v_candidate
  from public.admissions_candidates candidate
  where candidate.organization_id = p_organization_id
    and candidate.email_normalized = v_email
  order by candidate.updated_at desc
  limit 1;

  if not found then
    insert into public.admissions_candidates (
      organization_id, full_name, email, email_normalized, phone,
      phone_normalized, city, guardian_name, guardian_email, guardian_phone,
      preferred_contact_channel, source_channel, source_detail, identity_key,
      status, metadata, created_at, updated_at
    ) values (
      p_organization_id, btrim(p_full_name), v_email, v_email,
      nullif(btrim(coalesce(p_phone, '')), ''),
      nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), ''),
      nullif(btrim(coalesce(p_city, '')), ''),
      nullif(btrim(coalesce(p_guardian_name, '')), ''),
      lower(nullif(btrim(coalesce(p_guardian_email, '')), '')),
      nullif(btrim(coalesce(p_guardian_phone, '')), ''),
      case when nullif(btrim(coalesce(p_phone, '')), '') is null then 'email' else 'phone' end,
      'manual_admin', 'Admin manual registration',
      'manual:' || gen_random_uuid()::text, 'active',
      jsonb_build_object('origin', 'manual_admin_intake', 'created_by', p_actor_platform_user_id),
      v_now, v_now
    ) returning * into v_candidate;
  end if;

  insert into public.admissions_applications (
    organization_id, candidate_id, intake_route, lead_source,
    programme_code, programme_name, delivery_mode, academic_session,
    batch_preference, status, decision_status, decision_notes,
    finance_verification_required, submitted_at, reviewed_at,
    actor_platform_user_id, metadata, version, created_at, updated_at
  ) values (
    p_organization_id, v_candidate.id, 'manual', 'manual_admin',
    nullif(btrim(coalesce(p_programme_code, '')), ''), btrim(p_programme_name),
    nullif(btrim(coalesce(p_delivery_mode, '')), ''),
    nullif(btrim(coalesce(p_academic_session, '')), ''),
    nullif(btrim(coalesce(p_batch_preference, '')), ''),
    'finance_pending', 'pending', nullif(btrim(coalesce(p_note, '')), ''),
    true, v_now, null, p_actor_platform_user_id,
    jsonb_strip_nulls(jsonb_build_object(
      'origin', 'manual_admin_intake', 'agreed_fee', p_agreed_fee,
      'final_value', p_agreed_fee, 'currency', upper(coalesce(p_currency, 'INR')),
      'payment_terms', nullif(btrim(coalesce(p_payment_terms, '')), ''),
      'submitted_by', p_actor_platform_user_id
    )),
    1, v_now, v_now
  ) returning * into v_application;

  insert into public.admissions_application_events (
    organization_id, application_id, event_type, from_status, to_status,
    actor_type, actor_platform_user_id, note, payload, idempotency_key
  ) values (
    p_organization_id, v_application.id, 'manual_intake_created', null,
    'finance_pending', 'platform_user', p_actor_platform_user_id,
    nullif(btrim(coalesce(p_note, '')), ''),
    jsonb_strip_nulls(jsonb_build_object(
      'programme_code', v_application.programme_code,
      'programme_name', v_application.programme_name,
      'intake_route', 'manual'
    )),
    'manual-intake:' || v_application.id::text
  );

  return jsonb_build_object(
    'candidate', to_jsonb(v_candidate),
    'application', to_jsonb(v_application)
  );
end;
$$;

revoke all on function public.admissions_create_manual_intake(
  uuid, text, text, text, text, text, text, text, text, text, text,
  text, text, text, numeric, text, text, text
) from public, anon, authenticated;

grant execute on function public.admissions_create_manual_intake(
  uuid, text, text, text, text, text, text, text, text, text, text,
  text, text, text, numeric, text, text, text
) to service_role;

comment on function public.admissions_create_manual_intake(
  uuid, text, text, text, text, text, text, text, text, text, text,
  text, text, text, numeric, text, text, text
) is 'Atomically creates a tenant-scoped manual Admissions intake and immutable creation event. Service-role use only.';

commit;
