-- Opciones dentro de un servicio.
--
-- La exfoliación se trabaja con seis materiales distintos. Podrían haber sido
-- seis servicios separados, pero la dueña quiere una sola tarjeta con el
-- material a elegir: así el catálogo no se fragmenta y la exfoliación mantiene
-- el peso visual que se le acaba de dar.
--
-- Se modela genérico y no a la medida de la exfoliación: cualquier servicio
-- puede declarar opciones y el sistema lo respeta. Si mañana un masaje se
-- ofrece con distintos aceites, ya está resuelto.
--
-- La opción se guarda en appointment_services y no en appointments porque
-- pertenece a la línea de servicio: una misma cita puede llevar dos servicios
-- con opciones distintas.

alter table public.services
  add column if not exists opciones_es text[],
  add column if not exists opciones_en text[];

comment on column public.services.opciones_es is
  'Materiales o variantes entre los que la persona debe elegir al reservar. Si está vacío, el servicio no pide elección.';
comment on column public.services.opciones_en is
  'Las mismas opciones en inglés, en el mismo orden que opciones_es.';

alter table public.appointment_services
  add column if not exists opcion text;

comment on column public.appointment_services.opcion is
  'Opción elegida para esta línea, tal como aparece en services.opciones_es. Es lo que la profesional tiene que preparar.';

-- ---------------------------------------------------------------------------
-- El catálogo: la exfoliación pasa a ser una sola con seis materiales
-- ---------------------------------------------------------------------------
update public.services set
  name_es = 'Exfoliación corporal',
  name_en = 'Body scrub',
  description_es = 'Retira células muertas, activa la circulación y deja la piel renovada. Se trabaja con seis materiales distintos, incluido café 100% costarricense; se elige al reservar.',
  description_en = 'Removes dead cells, boosts circulation and leaves the skin renewed. Available with six different materials, including 100% Costa Rican coffee; chosen when booking.',
  price = 60,
  duration_minutes = 50,
  opciones_es = array['Café 100% costarricense','Lava volcánica','Frutas','Sábila','Sal marina','Avena'],
  opciones_en = array['100% Costa Rican coffee','Volcanic lava','Fruit','Aloe vera','Sea salt','Oatmeal']
where category = 'spa' and grupo_es = 'TRATAMIENTO CORPORAL';

-- ---------------------------------------------------------------------------
-- book_appointment: acepta y valida la opción
-- ---------------------------------------------------------------------------
-- Se elimina y se recrea porque cambia la forma de p_services. Validar acá y
-- no solo en el navegador importa: el selector del formulario se puede saltar
-- llamando a la API, y una exfoliación sin material es una cita que la
-- profesional no puede preparar.
drop function if exists public.book_appointment(uuid, text, text, text, timestamptz, jsonb, text, text, integer, boolean, text);

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
  v_opcion         text;
  v_opciones       text[];
  v_nombre         text;
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
    v_opcion     := nullif(btrim(coalesce(v_item->>'opcion', '')), '');

    select duration_minutes, price, opciones_es, name_es
      into v_duration, v_price, v_opciones, v_nombre
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

    -- Si el servicio declara opciones, hay que elegir una y tiene que ser de
    -- la lista. Se compara contra el arreglo y no contra texto libre para que
    -- no entre cualquier cosa por la API.
    if v_opciones is not null and array_length(v_opciones, 1) > 0 then
      if v_opcion is null then
        raise exception 'Elija una opción para "%".', v_nombre;
      end if;
      if not (v_opcion = any(v_opciones)) then
        raise exception 'La opción elegida para "%" no es válida.', v_nombre;
      end if;
    else
      -- Un servicio sin opciones no guarda ninguna, aunque la manden.
      v_opcion := null;
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
    v_opcion     := nullif(btrim(coalesce(v_item->>'opcion', '')), '');

    select price, opciones_es into v_price, v_opciones
      from public.services where id = v_service_id;

    if v_opciones is null or array_length(v_opciones, 1) is null then
      v_opcion := null;
    end if;

    insert into public.appointment_services (appointment_id, service_id, quantity, price_at_booking, opcion)
    values (v_appointment_id, v_service_id, v_quantity, v_price, v_opcion);
  end loop;

  return v_appointment_id;
end;
$function$;
