begin;

-- Additive workflow markers. Existing application/status values and rows are
-- deliberately left unchanged so historical Finance-first records remain valid.
alter table public.admissions_applications
  add column if not exists admissions_approved_for_finance_at timestamptz,
  add column if not exists admissions_approved_for_finance_by text,
  add column if not exists admissions_approval_note text,
  add column if not exists firebase_uid_reserved text;

create index if not exists admissions_applications_finance_queue_idx
  on public.admissions_applications (
    organization_id,
    admissions_approved_for_finance_at,
    created_at desc
  )
  where admissions_approved_for_finance_at is not null;

create or replace function public.admissions_approve_for_finance(
  p_organization_id uuid,
  p_application_id uuid,
  p_actor_platform_user_id text,
  p_decision_note text default null,
  p_idempotency_key text default null
)
returns public.admissions_applications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_application public.admissions_applications%rowtype;
  v_existing_event_id uuid;
  v_decision_note text := nullif(btrim(coalesce(p_decision_note, '')), '');
  v_idempotency_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
begin
  if p_organization_id is null or p_application_id is null then
    raise exception using
      errcode = '22023',
      message = 'Organization and application are required.';
  end if;

  if nullif(btrim(coalesce(p_actor_platform_user_id, '')), '') is null then
    raise exception using
      errcode = '22023',
      message = 'The approving platform user is required.';
  end if;

  select application.*
    into v_application
  from public.admissions_applications as application
  where application.id = p_application_id
    and application.organization_id = p_organization_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Admission application not found.';
  end if;

  if v_application.admissions_approved_for_finance_at is not null then
    return v_application;
  end if;

  if v_application.status <> 'finance_pending' then
    raise exception using
      errcode = 'P0001',
      message = format(
        'Admissions approval requires finance_pending status; current status is %s.',
        v_application.status
      );
  end if;

  if v_application.decision_status <> 'pending' then
    raise exception using
      errcode = 'P0001',
      message = format(
        'Admissions review must be pending; current decision is %s.',
        v_application.decision_status
      );
  end if;

  if v_idempotency_key is not null then
    select event.id
      into v_existing_event_id
    from public.admissions_application_events as event
    where event.organization_id = p_organization_id
      and event.application_id = p_application_id
      and event.event_type = 'admissions_approved_for_finance'
      and event.idempotency_key = v_idempotency_key
    limit 1;

    if v_existing_event_id is not null then
      return v_application;
    end if;
  end if;

  update public.admissions_applications
  set
    admissions_approved_for_finance_at = now(),
    admissions_approved_for_finance_by = p_actor_platform_user_id,
    admissions_approval_note = v_decision_note,
    actor_platform_user_id = p_actor_platform_user_id,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'admissions_review',
      jsonb_strip_nulls(
        jsonb_build_object(
          'outcome', 'approved_for_finance',
          'note', v_decision_note,
          'approved_by', p_actor_platform_user_id,
          'approved_at', now()
        )
      )
    ),
    version = version + 1,
    updated_at = now()
  where id = p_application_id
    and organization_id = p_organization_id
  returning * into v_application;

  insert into public.admissions_application_events (
    organization_id,
    application_id,
    event_type,
    from_status,
    to_status,
    actor_type,
    actor_platform_user_id,
    note,
    payload,
    idempotency_key
  )
  values (
    p_organization_id,
    p_application_id,
    'admissions_approved_for_finance',
    'finance_pending',
    'finance_pending',
    'platform_user',
    p_actor_platform_user_id,
    v_decision_note,
    jsonb_strip_nulls(
      jsonb_build_object(
        'programme_code', v_application.programme_code,
        'programme_name', v_application.programme_name,
        'intake_route', v_application.intake_route,
        'application_version', v_application.version
      )
    ),
    v_idempotency_key
  );

  return v_application;
end;
$$;

-- This wrapper keeps the already-installed verification and final-approval
-- functions intact, while making the new sequence atomic:
-- Admissions approval -> Finance clearance -> admitted/awaiting LMS access.
create or replace function public.admissions_clear_finance_and_finalize(
  p_organization_id uuid,
  p_application_id uuid,
  p_actor_platform_user_id text,
  p_clearance_type text,
  p_amount_received numeric default 0,
  p_currency text default 'INR',
  p_payment_method text default null,
  p_payment_reference text default null,
  p_payment_date date default current_date,
  p_note text default null,
  p_idempotency_key text default null
)
returns public.admissions_applications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_application public.admissions_applications%rowtype;
  v_finance_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_finalization_key text;
begin
  select application.*
    into v_application
  from public.admissions_applications as application
  where application.id = p_application_id
    and application.organization_id = p_organization_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Admission application not found.';
  end if;

  if v_application.admissions_approved_for_finance_at is null then
    raise exception using
      errcode = 'P0001',
      message = 'Admissions approval is required before Finance clearance.';
  end if;

  if v_application.status = 'admitted'
     and v_application.decision_status = 'approved' then
    return v_application;
  end if;

  v_application := public.admissions_verify_finance(
    p_organization_id,
    p_application_id,
    p_actor_platform_user_id,
    p_clearance_type,
    p_amount_received,
    p_currency,
    p_payment_method,
    p_payment_reference,
    p_payment_date,
    p_note,
    v_finance_key
  );

  v_finalization_key := coalesce(
    v_finance_key || ':admission-finalized',
    'admissions-finalized:' || p_organization_id::text || ':' || p_application_id::text
  );

  v_application := public.admissions_approve_application(
    p_organization_id,
    p_application_id,
    p_actor_platform_user_id,
    coalesce(
      nullif(btrim(coalesce(p_note, '')), ''),
      'Admission automatically finalized after Finance clearance.'
    ),
    v_finalization_key
  );

  return v_application;
end;
$$;

revoke all on function public.admissions_approve_for_finance(
  uuid, uuid, text, text, text
) from public, anon, authenticated;

grant execute on function public.admissions_approve_for_finance(
  uuid, uuid, text, text, text
) to service_role;

revoke all on function public.admissions_clear_finance_and_finalize(
  uuid, uuid, text, text, numeric, text, text, text, date, text, text
) from public, anon, authenticated;

grant execute on function public.admissions_clear_finance_and_finalize(
  uuid, uuid, text, text, numeric, text, text, text, date, text, text
) to service_role;

comment on function public.admissions_approve_for_finance(
  uuid, uuid, text, text, text
) is
  'Records Admissions approval before Finance and appends an immutable event. Service-role use only.';

comment on function public.admissions_clear_finance_and_finalize(
  uuid, uuid, text, text, numeric, text, text, text, date, text, text
) is
  'Atomically records Finance clearance and finalizes a pre-approved admission. LMS activation remains separate. Service-role use only.';

commit;
