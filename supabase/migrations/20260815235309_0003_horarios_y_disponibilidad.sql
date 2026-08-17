-- 0003 — Horarios de trabajo, ausencias y cálculo de disponibilidad real.
--
-- Contexto: hasta 0002 la única defensa contra una cita inválida era la
-- restricción de solape sobre appointments. Eso impedía dos citas encimadas
-- para el mismo profesional, pero permitía reservar a las 3 a. m. de un
-- domingo. Esta migración introduce el horario de atención como dato y lo
-- hace obligatorio tanto al consultar disponibilidad como al reservar.

-- Costa Rica no aplica horario de verano, así que una zona fija es correcta.
-- Se centraliza en una función para no repetir el literal en cada consulta.
create or replace function public.zona_horaria_local()
returns text language sql immutable as $$ select 'America/Costa_Rica'::text $$;

-- Tipo de rango sobre `time` para poder exigir que los bloques de horario de
-- un mismo profesional en un mismo día no se solapen entre sí.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'timerange') then
    create type public.timerange as range (subtype = time);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Horario semanal de cada profesional
-- ---------------------------------------------------------------------------
create table if not exists public.employee_schedules (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  -- 0 = domingo … 6 = sábado, para calzar con extract(dow from date).
  weekday     smallint not null check (weekday between 0 and 6),
  starts_at   time not null,
  ends_at     time not null,
  created_at  timestamptz not null default now(),
  constraint employee_schedules_rango_valido check (ends_at > starts_at),
  constraint employee_schedules_sin_solape
    exclude using gist (
      employee_id with =,
      weekday with =,
      public.timerange(starts_at, ends_at) with &&
    )
);

comment on table public.employee_schedules is
  'Horario de atención por profesional y día de la semana. Hora local de Costa Rica.';

create index if not exists employee_schedules_employee_weekday_idx
  on public.employee_schedules (employee_id, weekday);

-- ---------------------------------------------------------------------------
-- Ausencias puntuales: vacaciones, permisos, bloqueos de agenda
-- ---------------------------------------------------------------------------
create table if not exists public.time_off (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text,
  created_at  timestamptz not null default now(),
  constraint time_off_rango_valido check (ends_at > starts_at),
  constraint time_off_sin_solape
    exclude using gist (employee_id with =, tstzrange(starts_at, ends_at) with &&)
);

comment on table public.time_off is
  'Bloqueos de agenda que anulan el horario regular (vacaciones, permisos).';

create index if not exists time_off_employee_rango_idx
  on public.time_off (employee_id, starts_at, ends_at);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.employee_schedules enable row level security;
alter table public.time_off           enable row level security;

-- El horario de atención es información pública: el sitio lo necesita para
-- dibujar el calendario aun sin sesión iniciada.
drop policy if exists "cualquiera consulta horarios" on public.employee_schedules;
create policy "cualquiera consulta horarios"
  on public.employee_schedules for select using (true);

drop policy if exists "solo admin administra horarios" on public.employee_schedules;
create policy "solo admin administra horarios"
  on public.employee_schedules for all
  using (public.is_admin()) with check (public.is_admin());

-- Las ausencias sí son privadas: revelan cuándo y por qué falta una persona.
drop policy if exists "admin administra ausencias" on public.time_off;
create policy "admin administra ausencias"
  on public.time_off for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "empleado ve sus propias ausencias" on public.time_off;
create policy "empleado ve sus propias ausencias"
  on public.time_off for select using (employee_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Disponibilidad real
-- ---------------------------------------------------------------------------
-- Devuelve las horas de inicio libres de un profesional para una fecha dada,
-- ya descontadas sus citas confirmadas y sus ausencias.
--
-- SECURITY DEFINER a propósito: un visitante anónimo no puede (ni debe) leer
-- la tabla appointments, pero sí necesita saber qué horas quedan libres. La
-- función only devuelve marcas de tiempo, nunca datos del cliente que reservó.
create or replace function public.get_available_slots(
  p_employee_id      uuid,
  p_date             date,
  p_duration_minutes integer default 30,
  p_step_minutes     integer default 15
)
returns table (slot timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  with parametros as (
    select
      greatest(coalesce(p_duration_minutes, 30), 1)  as duracion,
      greatest(coalesce(p_step_minutes, 15), 5)      as paso,
      public.zona_horaria_local()                    as tz
  ),
  bloques as (
    select
      ((p_date + s.starts_at) at time zone pa.tz) as inicio,
      ((p_date + s.ends_at)   at time zone pa.tz) as fin
    from public.employee_schedules s
    join public.profiles p on p.id = s.employee_id and p.active
    cross join parametros pa
    where s.employee_id = p_employee_id
      and s.weekday = extract(dow from p_date)::smallint
  ),
  candidatos as (
    select serie.inicio_propuesto
    from bloques b
    cross join parametros pa
    cross join lateral generate_series(
      b.inicio,
      b.fin - make_interval(mins => pa.duracion),
      make_interval(mins => pa.paso)
    ) as serie(inicio_propuesto)
  )
  select c.inicio_propuesto
  from candidatos c
  cross join parametros pa
  where c.inicio_propuesto > now()
    and not exists (
      select 1 from public.appointments a
      where a.employee_id = p_employee_id
        and a.status = 'confirmada'
        and tstzrange(a.starts_at, a.ends_at)
            && tstzrange(c.inicio_propuesto,
                         c.inicio_propuesto + make_interval(mins => pa.duracion))
    )
    and not exists (
      select 1 from public.time_off t
      where t.employee_id = p_employee_id
        and tstzrange(t.starts_at, t.ends_at)
            && tstzrange(c.inicio_propuesto,
                         c.inicio_propuesto + make_interval(mins => pa.duracion))
    )
  order by 1;
$$;

comment on function public.get_available_slots is
  'Horas de inicio libres de un profesional en una fecha, descontando citas confirmadas y ausencias.';

-- ---------------------------------------------------------------------------
-- Reserva endurecida
-- ---------------------------------------------------------------------------
-- Se reemplaza book_appointment conservando su firma y su lógica de servicios,
-- y se le agregan las validaciones que faltaban. Todas las comprobaciones viven
-- del lado del servidor: el navegador no es una fuente de verdad confiable.
create or replace function public.book_appointment(
  p_employee_id  uuid,
  p_client_name  text,
  p_client_email text,
  p_client_phone text,
  p_starts_at    timestamptz,
  p_services     jsonb,
  p_notes        text default null,
  p_language     text default 'es'
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
  v_tz             text := public.zona_horaria_local();
begin
  -- --- Saneamiento de entrada -------------------------------------------
  v_name  := btrim(coalesce(p_client_name, ''));
  v_email := lower(btrim(coalesce(p_client_email, '')));

  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Ingresá un nombre válido.';
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

  -- --- Ventana temporal permitida ---------------------------------------
  if p_starts_at <= now() then
    raise exception 'La fecha y hora deben ser futuras.';
  end if;

  if p_starts_at > now() + interval '6 months' then
    raise exception 'Solo se pueden reservar citas dentro de los próximos 6 meses.';
  end if;

  -- --- Freno de abuso ----------------------------------------------------
  -- Sin esto, book_appointment es invocable por cualquier visitante anónimo y
  -- se podría llenar la agenda con reservas falsas.
  if (
    select count(*) from public.appointments
    where client_email = v_email
      and status = 'confirmada'
      and starts_at > now()
  ) >= 5 then
    raise exception 'Ya tenés varias citas pendientes. Escribinos por WhatsApp para coordinar más.';
  end if;

  if not exists (select 1 from public.profiles where id = p_employee_id and active) then
    raise exception 'Empleado inválido o inactivo.';
  end if;

  -- --- Servicios y duración total ---------------------------------------
  for v_item in select * from jsonb_array_elements(p_services) loop
    v_service_id := (v_item->>'service_id')::uuid;
    v_quantity   := greatest(1, least(coalesce((v_item->>'quantity')::integer, 1), 20));

    select duration_minutes, price into v_duration, v_price
      from public.services
      where id = v_service_id and active = true;

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

  -- --- La cita debe caber completa dentro de un bloque de horario --------
  -- La comparación de fechas evita que una cita larga cruce la medianoche y
  -- parezca válida contra el bloque del día siguiente.
  if not exists (
    select 1
    from public.employee_schedules s
    where s.employee_id = p_employee_id
      and s.weekday = extract(dow from (p_starts_at at time zone v_tz))::smallint
      and (p_starts_at at time zone v_tz)::time >= s.starts_at
      and (v_ends_at   at time zone v_tz)::time <= s.ends_at
      and (p_starts_at at time zone v_tz)::date = (v_ends_at at time zone v_tz)::date
  ) then
    raise exception 'El horario solicitado está fuera del horario de atención del profesional.';
  end if;

  -- --- Ausencias ---------------------------------------------------------
  if exists (
    select 1 from public.time_off t
    where t.employee_id = p_employee_id
      and tstzrange(t.starts_at, t.ends_at) && tstzrange(p_starts_at, v_ends_at)
  ) then
    raise exception 'El profesional no está disponible en ese horario.';
  end if;

  -- El solape con otras citas lo sigue impidiendo la restricción EXCLUDE de
  -- appointments, que es la garantía definitiva ante reservas simultáneas.
  insert into public.appointments
    (employee_id, client_name, client_email, client_phone, starts_at, ends_at, notes, language)
  values
    (p_employee_id, v_name, v_email, nullif(btrim(coalesce(p_client_phone, '')), ''),
     p_starts_at, v_ends_at, nullif(btrim(coalesce(p_notes, '')), ''), p_language)
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

-- ---------------------------------------------------------------------------
-- Alta masiva del horario estándar
-- ---------------------------------------------------------------------------
-- Todo el equipo atiende de lunes a domingo, 9:00–19:00. Se expone como
-- función para poder aplicarlo a cada profesional nuevo desde el panel.
create or replace function public.aplicar_horario_estandar(p_employee_id uuid)
returns void
language sql
security definer
set search_path to 'public'
as $$
  insert into public.employee_schedules (employee_id, weekday, starts_at, ends_at)
  select p_employee_id, dia, time '09:00', time '19:00'
  from generate_series(0, 6) as dia
  on conflict do nothing;
$$;

revoke execute on function public.aplicar_horario_estandar(uuid) from anon;
