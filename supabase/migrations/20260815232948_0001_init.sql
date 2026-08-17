-- ============================================================
-- Odry's Beauty Spa & Barber — Esquema inicial (Supabase / Postgres)
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists btree_gist;


-- ------------------------------------------------------------
-- 1. PERFILES (empleados y administradora)
-- ------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null check (role in ('administrador','barbero','estilista','masajista')),
  phone       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is 'Cuentas del personal. Se crean/eliminan solo mediante la Edge Function de administración, nunca desde el navegador.';

create or replace function public.current_role_is(target_role text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = target_role and active
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_role_is('administrador');
$$;

alter table public.profiles enable row level security;

create policy "admin ve y edita todos los perfiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "empleado ve su propio perfil"
  on public.profiles for select
  using (id = auth.uid());

create policy "empleado puede actualizar su propia fila"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role or new.active is distinct from old.active then
      raise exception 'No tenés permiso para cambiar tu propio rol o estado activo.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();


-- ------------------------------------------------------------
-- 2. SERVICIOS
-- ------------------------------------------------------------
create table public.services (
  id                uuid primary key default gen_random_uuid(),
  category          text not null check (category in ('barberia','spa')),
  name_es           text not null,
  name_en           text not null,
  description_es    text,
  description_en    text,
  price             numeric(10,2),
  currency          text not null default 'USD',
  duration_minutes  integer not null default 30 check (duration_minutes > 0),
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

alter table public.services enable row level security;

create policy "cualquiera ve servicios activos, admin ve todos"
  on public.services for select
  using (active = true or public.is_admin());

create policy "solo admin crea servicios"
  on public.services for insert with check (public.is_admin());
create policy "solo admin edita servicios"
  on public.services for update using (public.is_admin()) with check (public.is_admin());
create policy "solo admin elimina servicios"
  on public.services for delete using (public.is_admin());


-- ------------------------------------------------------------
-- 3. QUÉ SERVICIOS OFRECE CADA EMPLEADO
-- ------------------------------------------------------------
create table public.employee_services (
  employee_id  uuid not null references public.profiles(id) on delete cascade,
  service_id   uuid not null references public.services(id) on delete cascade,
  primary key (employee_id, service_id)
);

alter table public.employee_services enable row level security;

create policy "cualquiera puede consultar asignaciones"
  on public.employee_services for select using (true);

create policy "solo admin asigna servicios a empleados"
  on public.employee_services for insert with check (public.is_admin());
create policy "solo admin quita asignaciones"
  on public.employee_services for delete using (public.is_admin());


-- ------------------------------------------------------------
-- 4. CITAS
-- ------------------------------------------------------------
create table public.appointments (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.profiles(id),
  client_name     text not null,
  client_email    text not null check (client_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  client_phone    text,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null check (ends_at > starts_at),
  status          text not null default 'confirmada'
                    check (status in ('confirmada','cancelada','completada','no_show')),
  language        text not null default 'es' check (language in ('es','en')),
  notes           text,
  created_at      timestamptz not null default now(),

  exclude using gist (
    employee_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmada')
);

create index idx_appointments_employee_date on public.appointments (employee_id, starts_at);

alter table public.appointments enable row level security;

create policy "admin ve y administra todas las citas"
  on public.appointments for all
  using (public.is_admin()) with check (public.is_admin());

create policy "empleado ve solo sus propias citas"
  on public.appointments for select
  using (employee_id = auth.uid());

create policy "empleado actualiza solo sus propias citas"
  on public.appointments for update
  using (employee_id = auth.uid())
  with check (employee_id = auth.uid());


-- ------------------------------------------------------------
-- 5. SERVICIOS DENTRO DE CADA CITA
-- ------------------------------------------------------------
create table public.appointment_services (
  appointment_id    uuid not null references public.appointments(id) on delete cascade,
  service_id        uuid not null references public.services(id),
  quantity          integer not null default 1 check (quantity > 0),
  price_at_booking  numeric(10,2),
  primary key (appointment_id, service_id)
);

alter table public.appointment_services enable row level security;

create policy "ver servicios de citas visibles para mi rol"
  on public.appointment_services for select
  using (
    exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and (public.is_admin() or a.employee_id = auth.uid())
    )
  );


-- ------------------------------------------------------------
-- 6. RESERVA PÚBLICA
-- ------------------------------------------------------------
create or replace function public.book_appointment(
  p_employee_id  uuid,
  p_client_name  text,
  p_client_email text,
  p_client_phone text,
  p_starts_at    timestamptz,
  p_services     jsonb,
  p_notes        text default null,
  p_language     text default 'es'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_minutes integer := 0;
  v_ends_at       timestamptz;
  v_appointment_id uuid;
  v_item          jsonb;
  v_service_id    uuid;
  v_quantity      integer;
  v_duration      integer;
  v_price         numeric(10,2);
begin
  if p_services is null or jsonb_array_length(p_services) = 0 then
    raise exception 'Debés incluir al menos un servicio.';
  end if;

  if not exists (select 1 from public.profiles where id = p_employee_id and active) then
    raise exception 'Empleado inválido o inactivo.';
  end if;

  for v_item in select * from jsonb_array_elements(p_services) loop
    v_service_id := (v_item->>'service_id')::uuid;
    v_quantity   := greatest(1, coalesce((v_item->>'quantity')::integer, 1));

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
      raise exception 'Ese empleado no ofrece uno de los servicios seleccionados.';
    end if;

    v_total_minutes := v_total_minutes + (v_duration * v_quantity);
  end loop;

  v_ends_at := p_starts_at + make_interval(mins => v_total_minutes);

  insert into public.appointments
    (employee_id, client_name, client_email, client_phone, starts_at, ends_at, notes, language)
  values
    (p_employee_id, p_client_name, p_client_email, p_client_phone, p_starts_at, v_ends_at, p_notes, p_language)
  returning id into v_appointment_id;

  for v_item in select * from jsonb_array_elements(p_services) loop
    v_service_id := (v_item->>'service_id')::uuid;
    v_quantity   := greatest(1, coalesce((v_item->>'quantity')::integer, 1));
    select price into v_price from public.services where id = v_service_id;
    insert into public.appointment_services (appointment_id, service_id, quantity, price_at_booking)
    values (v_appointment_id, v_service_id, v_quantity, v_price);
  end loop;

  return v_appointment_id;
end;
$$;

grant execute on function public.book_appointment(uuid, text, text, text, timestamptz, jsonb, text, text)
  to anon, authenticated;

-- ------------------------------------------------------------
-- 7. Bandera anti-reenvío del correo de confirmación
-- ------------------------------------------------------------
alter table public.appointments
  add column confirmation_sent boolean not null default false;
