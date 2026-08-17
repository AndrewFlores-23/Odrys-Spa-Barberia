-- 0011 — Catálogo servido desde la base y agenda por bloques horarios.
--
-- Dos problemas que se resuelven juntos:
--
-- 1. El catálogo de la web estaba escrito a mano en el HTML. El panel podía
--    crear un servicio, pero la clienta nunca lo veía. Para dibujarlo desde la
--    base hace falta conservar la agrupación que ya existía (Manos y pies,
--    Masajes, Depilación…), que hasta ahora solo vivía en el marcado.
--
-- 2. Las horas se ofrecían cada 15 minutos y cada cita duraba exactamente lo
--    que sumaban sus servicios. Eso fragmenta la agenda: una cita de 40 min a
--    las 9:15 deja 9:00–9:15 inservible y empuja todo a horas quebradas. Con
--    bloques, cada cita ocupa un número entero de bloques y la agenda queda
--    pareja.

-- ---------------------------------------------------------------------------
-- Agrupación del catálogo
-- ---------------------------------------------------------------------------
alter table public.services add column if not exists grupo_es    text;
alter table public.services add column if not exists grupo_en    text;
alter table public.services add column if not exists orden_grupo smallint not null default 1;
alter table public.services add column if not exists orden       smallint not null default 1;

comment on column public.services.grupo_es is
  'Sección del catálogo donde aparece el servicio en la web.';
comment on column public.services.orden_grupo is
  'Posición de la sección dentro de la página.';
comment on column public.services.orden is
  'Posición del servicio dentro de su sección.';

-- Se reconstruye la agrupación que tenía el HTML. Los grupos de barbería se
-- renombran sin el nombre de la persona: el catálogo no debe romperse cuando
-- alguien deja el equipo.
update public.services set grupo_es = 'DEPILACIÓN', grupo_en = 'WAXING', orden_grupo = 3
 where category = 'spa' and (name_es like 'Depilación%' or name_es = 'Diseño de cejas');

update public.services set grupo_es = 'MASAJES', grupo_en = 'MASSAGE', orden_grupo = 2
 where category = 'spa' and (name_es like 'Masaje%' or name_es in ('Aromaterapia', 'Reflexología'));

update public.services set grupo_es = 'TRATAMIENTO CORPORAL', grupo_en = 'BODY TREATMENT', orden_grupo = 4
 where category = 'spa' and name_es like 'Exfoliación%';

update public.services set grupo_es = 'MANOS Y PIES', grupo_en = 'HANDS & FEET', orden_grupo = 1
 where category = 'spa' and grupo_es is null;

update public.services set grupo_es = 'ESTILISMO', grupo_en = 'HAIR STYLING', orden_grupo = 2
 where category = 'barberia' and name_es in ('Corte femenino', 'Coloración', 'Trenzas');

update public.services set grupo_es = 'BARBERÍA', grupo_en = 'BARBERING', orden_grupo = 1
 where category = 'barberia' and grupo_es is null;

-- Orden alfabético dentro de cada grupo como punto de partida.
with numerados as (
  select id, row_number() over (partition by category, grupo_es order by name_es) as n
  from public.services
)
update public.services s set orden = numerados.n
from numerados where numerados.id = s.id;

-- ---------------------------------------------------------------------------
-- Bloques horarios
-- ---------------------------------------------------------------------------
alter table public.ajustes
  add column if not exists duracion_bloque_minutos smallint not null default 30
    check (duracion_bloque_minutos between 10 and 120);

comment on column public.ajustes.duracion_bloque_minutos is
  'Tamaño del bloque de agenda. Las citas empiezan en múltiplos de este valor y se redondean hacia arriba para ocupar bloques enteros.';

-- Redondea una duración al siguiente múltiplo del bloque. Una cita de 40 min
-- con bloques de 30 ocupa 60: así la siguiente empieza en una hora limpia.
create or replace function public.minutos_en_bloques(p_minutos integer)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select greatest(1, ceil(p_minutos::numeric / b.duracion_bloque_minutos))::integer * b.duracion_bloque_minutos
  from public.ajustes b where b.id;
$$;

-- ---------------------------------------------------------------------------
-- Disponibilidad alineada a bloques
-- ---------------------------------------------------------------------------
create or replace function public.get_available_slots(
  p_employee_id      uuid,
  p_date             date,
  p_duration_minutes integer default 30,
  p_step_minutes     integer default null   -- se ignora: manda el bloque configurado
)
returns table (slot timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  with parametros as (
    select
      public.minutos_en_bloques(greatest(coalesce(p_duration_minutes, 30), 1)) as duracion,
      (select duracion_bloque_minutos from public.ajustes where id)            as bloque,
      public.zona_horaria_local()                                              as tz
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
      make_interval(mins => pa.bloque)
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
            && tstzrange(c.inicio_propuesto, c.inicio_propuesto + make_interval(mins => pa.duracion))
    )
    and not exists (
      select 1 from public.time_off t
      where t.employee_id = p_employee_id
        and tstzrange(t.starts_at, t.ends_at)
            && tstzrange(c.inicio_propuesto, c.inicio_propuesto + make_interval(mins => pa.duracion))
    )
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- Reserva por bloques
-- ---------------------------------------------------------------------------
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
  v_bloque         integer;
  v_tz             text := public.zona_horaria_local();
begin
  v_name  := btrim(coalesce(p_client_name, ''));
  v_email := lower(btrim(coalesce(p_client_email, '')));
  v_party := greatest(1, least(coalesce(p_party_size, 1), 20));

  select duracion_bloque_minutos into v_bloque from public.ajustes where id;

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

  -- La cita ocupa bloques enteros. Así la agenda no queda fragmentada y el
  -- siguiente cupo arranca en una hora limpia.
  v_ends_at := p_starts_at + make_interval(mins => public.minutos_en_bloques(v_total_minutes));

  -- La hora de inicio tiene que caer sobre un bloque, contado desde la
  -- apertura del profesional. Sin esto alguien podría llamar a la función con
  -- una hora arbitraria y romper la alineación de toda la agenda.
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

-- ---------------------------------------------------------------------------
-- Cada profesional administra su propio horario
-- ---------------------------------------------------------------------------
-- Hace falta para que pueda partir su jornada y dejar fijo el almuerzo sin
-- depender de la administración. El horario sigue siendo público de leer: es
-- el horario de atención del negocio.
drop policy if exists "empleado administra su propio horario" on public.employee_schedules;
create policy "empleado administra su propio horario"
  on public.employee_schedules for all
  using (employee_id = auth.uid())
  with check (employee_id = auth.uid());

-- Lo mismo con sus ausencias puntuales.
drop policy if exists "empleado administra sus propias ausencias" on public.time_off;
create policy "empleado administra sus propias ausencias"
  on public.time_off for all
  using (employee_id = auth.uid())
  with check (employee_id = auth.uid());
