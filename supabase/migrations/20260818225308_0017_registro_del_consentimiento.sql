-- Registro del consentimiento de datos personales.
--
-- La casilla del formulario impide enviar sin aceptar, pero eso vive en el
-- navegador y no deja rastro: si mañana alguien reclama, no habría con qué
-- demostrar que dio su consentimiento. La Ley 8968 pide consentimiento
-- informado y expreso, y en la práctica eso significa poder probarlo.
--
-- Se guardan dos cosas y nada más:
--   · cuándo aceptó
--   · qué versión del texto aceptó, porque la política va a cambiar con el
--     tiempo y "aceptó la política" sin decir cuál no prueba gran cosa
--
-- A propósito NO se guarda la dirección IP. Es habitual hacerlo, pero es un
-- dato personal más que habría que custodiar y declarar en la propia política,
-- y para probar el consentimiento la fecha y la versión alcanzan.

alter table public.appointments
  add column if not exists consentimiento_aceptado_en timestamptz,
  add column if not exists consentimiento_version     text;

comment on column public.appointments.consentimiento_aceptado_en is
  'Momento en que la persona aceptó la política de privacidad al reservar. Prueba del consentimiento exigido por la Ley 8968.';
comment on column public.appointments.consentimiento_version is
  'Versión del texto de privacidad que se aceptó, para saber a qué redacción corresponde.';

-- La función se elimina y se vuelve a crear porque cambia su lista de
-- parámetros. Con create or replace se generaría una segunda función con el
-- mismo nombre, y PostgREST no sabría cuál llamar.
drop function if exists public.book_appointment(uuid, text, text, text, timestamptz, jsonb, text, text, integer);

create function public.book_appointment(
  p_employee_id      uuid,
  p_client_name      text,
  p_client_email     text,
  p_client_phone     text,
  p_starts_at        timestamptz,
  p_services         jsonb,
  p_notes            text    default null,
  p_language         text    default 'es',
  p_party_size       integer default 1,
  p_consentimiento   boolean default false,
  p_consentimiento_version text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_total_minutes  integer := 0;
  v_ends_at        timestamptz;
  v_appointment_id uuid;
  v_item           jsonb;
  v_service_id     uuid;
  v_quantity       integer;
  v_duration       integer;
  v_price          numeric(10,2);
  v_email          text;
  v_name           text;
  v_party          integer;
  v_bloque         integer;
  v_tz             text := public.zona_horaria_local();
begin
  v_name  := btrim(coalesce(p_client_name, ''));
  v_email := lower(btrim(coalesce(p_client_email, '')));
  v_party := greatest(1, least(coalesce(p_party_size, 1), 20));

  select duracion_bloque_minutos into v_bloque from public.ajustes where id;

  -- Se valida acá y no solo en el navegador: la casilla del formulario se
  -- puede saltar llamando a la API directamente, y sin consentimiento no hay
  -- base legal para guardar los datos.
  if p_consentimiento is not true then
    raise exception 'Debe aceptar la política de privacidad para reservar.';
  end if;

  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Ingrese un nombre válido.';
  end if;

  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ingrese un correo electrónico válido.';
  end if;

  if length(coalesce(p_notes, '')) > 1000 then
    raise exception 'Los comentarios son demasiado largos.';
  end if;

  if p_services is null or jsonb_array_length(p_services) = 0 then
    raise exception 'Debe incluir al menos un servicio.';
  end if;

  if jsonb_array_length(p_services) > 20 then
    raise exception 'Demasiados servicios en una sola reserva.';
  end if;

  if p_starts_at <= now() then
    raise exception 'La fecha y hora deben ser futuras.';
  end if;

  if p_starts_at > now() + interval '6 months' then
    raise exception 'Solo se pueden reservar citas dentro de los próximos 6 meses.';
  end if;

  if (
    select count(*) from public.appointments
    where client_email = v_email and status = 'confirmada' and starts_at > now()
  ) >= 5 then
    raise exception 'Ya tiene varias citas pendientes. Escríbanos por WhatsApp para coordinar más.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_employee_id and active and email_confirmed_at is not null
  ) then
    raise exception 'Empleado inválido o inactivo.';
  end if;

  for v_item in select * from jsonb_array_elements(p_services) loop
    v_service_id := (v_item->>'service_id')::uuid;
    v_quantity   := greatest(1, least(coalesce((v_item->>'quantity')::integer, 1), 20));

    select duration_minutes, price into v_duration, v_price
      from public.services where id = v_service_id and active = true;

    if v_duration is null then
      raise exception 'Servicio inválido o inactivo: %', v_service_id;
    end if;

    if not exists (
      select 1 from public.employee_services
      where employee_id = p_employee_id and service_id = v_service_id
    ) then
      raise exception 'Ese profesional no ofrece uno de los servicios seleccionados.';
    end if;

    v_total_minutes := v_total_minutes + (v_duration * v_quantity);
  end loop;

  v_ends_at := p_starts_at + make_interval(mins => public.minutos_en_bloques(v_total_minutes));

  if not exists (
    select 1
    from public.employee_schedules s
    where s.employee_id = p_employee_id
      and s.weekday = extract(dow from (p_starts_at at time zone v_tz))::smallint
      and (p_starts_at at time zone v_tz)::time >= s.starts_at
      and (v_ends_at   at time zone v_tz)::time <= s.ends_at
      and (p_starts_at at time zone v_tz)::date = (v_ends_at at time zone v_tz)::date
      and mod(
            extract(epoch from ((p_starts_at at time zone v_tz)::time - s.starts_at))::integer,
            v_bloque * 60
          ) = 0
  ) then
    raise exception 'El horario solicitado no coincide con un bloque disponible del profesional.';
  end if;

  if exists (
    select 1 from public.time_off t
    where t.employee_id = p_employee_id
      and tstzrange(t.starts_at, t.ends_at) && tstzrange(p_starts_at, v_ends_at)
  ) then
    raise exception 'El profesional no está disponible en ese horario.';
  end if;

  insert into public.appointments
    (employee_id, client_name, client_email, client_phone, starts_at, ends_at,
     notes, language, party_size,
     consentimiento_aceptado_en, consentimiento_version)
  values
    (p_employee_id, v_name, v_email, nullif(btrim(coalesce(p_client_phone, '')), ''),
     p_starts_at, v_ends_at, nullif(btrim(coalesce(p_notes, '')), ''), p_language, v_party,
     now(), nullif(btrim(coalesce(p_consentimiento_version, '')), ''))
  returning id into v_appointment_id;

  for v_item in select * from jsonb_array_elements(p_services) loop
    v_service_id := (v_item->>'service_id')::uuid;
    v_quantity   := greatest(1, least(coalesce((v_item->>'quantity')::integer, 1), 20));
    select price into v_price from public.services where id = v_service_id;
    insert into public.appointment_services (appointment_id, service_id, quantity, price_at_booking)
    values (v_appointment_id, v_service_id, v_quantity, v_price);
  end loop;

  return v_appointment_id;
end;
$function$;
