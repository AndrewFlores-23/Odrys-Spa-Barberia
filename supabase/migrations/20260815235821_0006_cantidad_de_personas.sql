-- 0006 — Guarda la cantidad de personas de la reserva.
-- El formulario siempre lo preguntó, pero no existía columna donde guardarlo:
-- el dato se perdía. Importa sobre todo en spa y en servicio a domicilio.
alter table public.appointments
  add column if not exists party_size integer not null default 1
    check (party_size between 1 and 20);

comment on column public.appointments.party_size is
  'Cantidad de personas que asistirán a la cita.';

-- Se reemplaza la firma para aceptar el nuevo dato. Se elimina la anterior
-- para no dejar dos versiones conviviendo.
drop function if exists public.book_appointment(uuid,text,text,text,timestamptz,jsonb,text,text);

create or replace function public.book_appointment(
  p_employee_id  uuid,
  p_client_name  text,
  p_client_email text,
  p_client_phone text,
  p_starts_at    timestamptz,
  p_services     jsonb,
  p_notes        text default null,
  p_language     text default 'es',
  p_party_size   integer default 1
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
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
  v_tz             text := public.zona_horaria_local();
begin
  v_name  := btrim(coalesce(p_client_name, ''));
  v_email := lower(btrim(coalesce(p_client_email, '')));
  v_party := greatest(1, least(coalesce(p_party_size, 1), 20));

  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Ingresá un nombre válido.';
  end if;

  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ingresá un correo electrónico válido.';
  end if;

  if length(coalesce(p_notes, '')) > 1000 then
    raise exception 'Los comentarios son demasiado largos.';
  end if;

  if p_services is null or jsonb_array_length(p_services) = 0 then
    raise exception 'Debés incluir al menos un servicio.';
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
    raise exception 'Ya tenés varias citas pendientes. Escribinos por WhatsApp para coordinar más.';
  end if;

  if not exists (select 1 from public.profiles where id = p_employee_id and active) then
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

  v_ends_at := p_starts_at + make_interval(mins => v_total_minutes);

  if not exists (
    select 1 from public.employee_schedules s
    where s.employee_id = p_employee_id
      and s.weekday = extract(dow from (p_starts_at at time zone v_tz))::smallint
      and (p_starts_at at time zone v_tz)::time >= s.starts_at
      and (v_ends_at   at time zone v_tz)::time <= s.ends_at
      and (p_starts_at at time zone v_tz)::date = (v_ends_at at time zone v_tz)::date
  ) then
    raise exception 'El horario solicitado está fuera del horario de atención del profesional.';
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
     notes, language, party_size)
  values
    (p_employee_id, v_name, v_email, nullif(btrim(coalesce(p_client_phone, '')), ''),
     p_starts_at, v_ends_at, nullif(btrim(coalesce(p_notes, '')), ''), p_language, v_party)
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
$$;