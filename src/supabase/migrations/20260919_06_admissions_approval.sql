begin;

create or replace function public.admissions_approve_application(
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
  v_decision_note text := nullif(
    btrim(coalesce(p_decision_note, '')),
    ''
  );
  v_idempotency_key text := nullif(
    btrim(coalesce(p_idempotency_key, '')),
    ''
  );
begin
  if p_organization_id is null or p_application_id is null then
    raise exception using
      errcode = '22023',
      message = 'Organization and application are required.';
  end if;

  if nullif(
    btrim(coalesce(p_actor_platform_user_id, '')),
    ''
  ) is null then
    raise exception using
      errcode = '22023',
      message = 'The approving platform user is required.';
  end if;

  if v_idempotency_key is not null then
    select event.id
      into v_existing_event_id
    from public.admissions_application_events as event
    where event.organization_id = p_organization_id
      and event.application_id = p_application_id
      and event.event_type = 'admission_approved'
      and event.idempotency_key = v_idempotency_key
    limit 1;

    if v_existing_event_id is not null then
      select application.*
        into v_application
      from public.admissions_applications as application
      where application.id = p_application_id
        and application.organization_id = p_organization_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message = 'Admission application not found.';
      end if;

      return v_application;
    end if;
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

  if v_application.status = 'admitted'
     and v_idempotency_key is not null then
    select event.id
      into v_existing_event_id
    from public.admissions_application_events as event
    where event.organization_id = p_organization_id
      and event.application_id = p_application_id
      and event.event_type = 'admission_approved'
      and event.idempotency_key = v_idempotency_key
    limit 1;

    if v_existing_event_id is not null then
      return v_application;
    end if;
  end if;

  if v_application.status <> 'finance_verified' then
    raise exception using
      errcode = 'P0001',
      message = format(
        'Admission approval requires finance_verified status; current status is %s.',
        v_application.status
      );
  end if;

  if v_application.finance_verified_at is null then
    raise exception using
      errcode = 'P0001',
      message = 'Admission approval requires a completed Finance verification.';
  end if;

  if v_application.decision_status <> 'pending' then
    raise exception using
      errcode = 'P0001',
      message = format(
        'Admission decision must be pending; current decision is %s.',
        v_application.decision_status
      );
  end if;

  if v_application.lms_student_reference is not null then
    raise exception using
      errcode = 'P0001',
      message = 'This application already has an LMS student reference.';
  end if;

  update public.admissions_applications
  set
    status = 'admitted',
    decision_status = 'approved',
    decision_notes = v_decision_note,
    reviewed_at = coalesce(reviewed_at, now()),
    admitted_at = now(),
    actor_platform_user_id = p_actor_platform_user_id,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'admission_approval',
      jsonb_strip_nulls(
        jsonb_build_object(
          'decision', 'approved',
          'note', v_decision_note,
          'approved_by', p_actor_platform_user_id,
          'approved_at', now(),
          'finance_verified_at', v_application.finance_verified_at
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
    'admission_approved',
    'finance_verified',
    'admitted',
    'platform_user',
    p_actor_platform_user_id,
    v_decision_note,
    jsonb_strip_nulls(
      jsonb_build_object(
        'decision', 'approved',
        'programme_code', v_application.programme_code,
        'programme_name', v_application.programme_name,
        'delivery_mode', v_application.delivery_mode,
        'academic_session', v_application.academic_session,
        'batch_preference', v_application.batch_preference,
        'finance_verified_at', v_application.finance_verified_at,
        'application_version', v_application.version
      )
    ),
    v_idempotency_key
  );

  return v_application;
end;
$$;

revoke all on function public.admissions_approve_application(
  uuid,
  uuid,
  text,
  text,
  text
) from public;

revoke all on function public.admissions_approve_application(
  uuid,
  uuid,
  text,
  text,
  text
) from anon;

revoke all on function public.admissions_approve_application(
  uuid,
  uuid,
  text,
  text,
  text
) from authenticated;

grant execute on function public.admissions_approve_application(
  uuid,
  uuid,
  text,
  text,
  text
) to service_role;

comment on function public.admissions_approve_application(
  uuid,
  uuid,
  text,
  text,
  text
) is
  'Atomically approves a Finance-verified admission and appends an immutable audit event. Does not create an LMS student. Server service-role use only.';

commit;
