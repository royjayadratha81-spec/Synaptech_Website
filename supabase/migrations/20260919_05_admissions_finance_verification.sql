begin;

create or replace function public.admissions_verify_finance(
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
  v_existing_event_id uuid;
  v_clearance_type text := lower(btrim(coalesce(p_clearance_type, '')));
  v_currency text := upper(btrim(coalesce(p_currency, 'INR')));
  v_payment_method text := nullif(lower(btrim(coalesce(p_payment_method, ''))), '');
  v_payment_reference text := nullif(btrim(coalesce(p_payment_reference, '')), '');
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
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
      message = 'The verifying platform user is required.';
  end if;

  if v_clearance_type not in (
    'payment_received',
    'installment_approved',
    'scholarship_approved',
    'fee_waived'
  ) then
    raise exception using
      errcode = '22023',
      message = 'Invalid Finance clearance type.';
  end if;

  if coalesce(p_amount_received, 0) < 0 then
    raise exception using
      errcode = '22023',
      message = 'Amount received cannot be negative.';
  end if;

  if v_clearance_type = 'payment_received'
     and coalesce(p_amount_received, 0) <= 0 then
    raise exception using
      errcode = '22023',
      message = 'A positive amount is required for payment received.';
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception using
      errcode = '22023',
      message = 'Currency must be a three-letter code such as INR.';
  end if;

  if v_payment_method is not null
     and v_payment_method not in (
       'cash',
       'upi',
       'bank_transfer',
       'card',
       'cheque',
       'payment_gateway',
       'other'
     ) then
    raise exception using
      errcode = '22023',
      message = 'Invalid payment method.';
  end if;

  if v_idempotency_key is not null then
    select event.id
      into v_existing_event_id
    from public.admissions_application_events as event
    where event.organization_id = p_organization_id
      and event.application_id = p_application_id
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

  if v_application.status = 'finance_verified'
     and v_idempotency_key is not null then
    select event.id
      into v_existing_event_id
    from public.admissions_application_events as event
    where event.organization_id = p_organization_id
      and event.application_id = p_application_id
      and event.idempotency_key = v_idempotency_key
    limit 1;

    if v_existing_event_id is not null then
      return v_application;
    end if;
  end if;

  if v_application.status <> 'finance_pending' then
    raise exception using
      errcode = 'P0001',
      message = format(
        'Finance verification requires finance_pending status; current status is %s.',
        v_application.status
      );
  end if;

  update public.admissions_applications
  set
    status = 'finance_verified',
    finance_verified_at = now(),
    actor_platform_user_id = p_actor_platform_user_id,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'finance_verification',
      jsonb_strip_nulls(
        jsonb_build_object(
          'clearance_type', v_clearance_type,
          'amount_received', coalesce(p_amount_received, 0),
          'currency', v_currency,
          'payment_method', v_payment_method,
          'payment_reference', v_payment_reference,
          'payment_date', coalesce(p_payment_date, current_date),
          'note', v_note,
          'verified_by', p_actor_platform_user_id,
          'verified_at', now()
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
    'finance_verified',
    'finance_pending',
    'finance_verified',
    'platform_user',
    p_actor_platform_user_id,
    v_note,
    jsonb_strip_nulls(
      jsonb_build_object(
        'clearance_type', v_clearance_type,
        'amount_received', coalesce(p_amount_received, 0),
        'currency', v_currency,
        'payment_method', v_payment_method,
        'payment_reference', v_payment_reference,
        'payment_date', coalesce(p_payment_date, current_date),
        'application_version', v_application.version
      )
    ),
    v_idempotency_key
  );

  return v_application;
end;
$$;

revoke all on function public.admissions_verify_finance(
  uuid,
  uuid,
  text,
  text,
  numeric,
  text,
  text,
  text,
  date,
  text,
  text
) from public;

revoke all on function public.admissions_verify_finance(
  uuid,
  uuid,
  text,
  text,
  numeric,
  text,
  text,
  text,
  date,
  text,
  text
) from anon;

revoke all on function public.admissions_verify_finance(
  uuid,
  uuid,
  text,
  text,
  numeric,
  text,
  text,
  text,
  date,
  text,
  text
) from authenticated;

grant execute on function public.admissions_verify_finance(
  uuid,
  uuid,
  text,
  text,
  numeric,
  text,
  text,
  text,
  date,
  text,
  text
) to service_role;

comment on function public.admissions_verify_finance(
  uuid,
  uuid,
  text,
  text,
  numeric,
  text,
  text,
  text,
  date,
  text,
  text
) is
  'Atomically clears the Admissions Finance gate and appends an immutable audit event. Server service-role use only.';

commit;
