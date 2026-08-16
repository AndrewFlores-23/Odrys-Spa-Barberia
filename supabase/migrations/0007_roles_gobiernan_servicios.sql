-- 0007 — El rol define qué servicios puede dar cada persona, y ninguna cuenta
-- funciona hasta que su dueño confirme el correo.
--
-- Antes, employee_services era una asignación libre: nada impedía marcarle un
-- "Corte clásico" a una masajista y que el sitio se lo ofreciera a la clienta.
-- Ahora el rol actúa como techo: solo se puede asignar lo que el rol permite.

-- ---------------------------------------------------------------------------
-- Qué puede hacer cada rol
-- ---------------------------------------------------------------------------
create table if not exists public.role_services (
  role       text not null check (role in ('administrador','barbero','estilista','masajista')),
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (role, service_id)
);

comment on table public.role_services is
  'Techo de servicios por rol. employee_services no puede salirse de esta tabla.';

alter table public.role_services enable row level security;

drop policy if exists "cualquiera consulta el mapa de roles" on public.role_services;
create policy "cualquiera consulta el mapa de roles"
  on public.role_services for select using (true);

drop policy if exists "solo admin edita el mapa de roles" on public.role_services;
create policy "solo admin edita el mapa de roles"
  on public.role_services for all
  using (public.is_admin()) with check (public.is_admin());

-- Barbería masculina
insert into public.role_services (role, service_id)
select 'barbero', id from public.services
where category = 'barberia'
  and name_es in ('Corte clásico','Fade y diseño','Barba y perfilado','Combo de corte y barba')
on conflict do nothing;

-- Estilismo femenino
insert into public.role_services (role, service_id)
select 'estilista', id from public.services
where category = 'barberia' and name_es in ('Corte femenino','Coloración','Trenzas')
on conflict do nothing;

-- Spa completo: masajes, uñas, depilación y corporales
insert into public.role_services (role, service_id)
select 'masajista', id from public.services where category = 'spa'
on conflict do nothing;

-- La administradora es también la dueña: puede figurar en cualquier servicio.
insert into public.role_services (role, service_id)
select 'administrador', id from public.services
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- El rol se impone sobre la asignación individual
-- ---------------------------------------------------------------------------
create or replace function public.validar_servicio_por_rol()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_rol text;
begin
  select role into v_rol from public.profiles where id = new.employee_id;
  if v_rol is null then
    raise exception 'No existe el perfil indicado.';
  end if;
  if not exists (
    select 1 from public.role_services
    where role = v_rol and service_id = new.service_id
  ) then
    raise exception 'El rol "%" no puede realizar ese servicio.', v_rol;
  end if;
  return new;
end;
$$;

drop trigger if exists employee_services_valida_rol on public.employee_services;
create trigger employee_services_valida_rol
  before insert or update on public.employee_services
  for each row execute function public.validar_servicio_por_rol();

-- Si la administradora cambia el rol de alguien, sus servicios incompatibles
-- se retiran solos. Sin esto, un ex-barbero convertido en masajista seguiría
-- apareciendo como opción para cortar el pelo.
create or replace function public.limpiar_servicios_al_cambiar_rol()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.role is distinct from old.role then
    delete from public.employee_services es
    where es.employee_id = new.id
      and not exists (
        select 1 from public.role_services rs
        where rs.role = new.role and rs.service_id = es.service_id
      );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_limpia_servicios on public.profiles;
create trigger profiles_limpia_servicios
  after update on public.profiles
  for each row execute function public.limpiar_servicios_al_cambiar_rol();

-- ---------------------------------------------------------------------------
-- Ninguna cuenta sirve hasta confirmar el correo
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists email_confirmed_at timestamptz;
alter table public.profiles alter column active set default false;

comment on column public.profiles.email_confirmed_at is
  'Copia de auth.users.email_confirmed_at, para poder filtrar sin abrir el esquema auth.';

-- Toda cuenta nueva de Supabase Auth obtiene su perfil automáticamente, con el
-- rol que la administradora indicó al invitarla.
create or replace function public.crear_perfil_para_usuario_nuevo()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, full_name, role, active, must_change_password, email_confirmed_at)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'masajista'),
    new.email_confirmed_at is not null,
    false,
    new.email_confirmed_at
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists auth_users_crea_perfil on auth.users;
create trigger auth_users_crea_perfil
  after insert on auth.users
  for each row execute function public.crear_perfil_para_usuario_nuevo();

-- Al confirmar el correo, la cuenta se habilita sola. Una cuenta desactivada a
-- mano por la administradora no se reactiva por este camino.
create or replace function public.sincronizar_confirmacion_correo()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.profiles
     set email_confirmed_at = new.email_confirmed_at,
         active = case
                    when new.email_confirmed_at is not null and old.email_confirmed_at is null then true
                    else active
                  end
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists auth_users_confirma_correo on auth.users;
create trigger auth_users_confirma_correo
  after update of email_confirmed_at on auth.users
  for each row execute function public.sincronizar_confirmacion_correo();

-- ---------------------------------------------------------------------------
-- Los permisos también exigen correo confirmado
-- ---------------------------------------------------------------------------
create or replace function public.current_role_is(target_role text)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = target_role
      and active
      and email_confirmed_at is not null
  );
$$;

-- Un profesional solo es reservable si confirmó su correo, está activo y
-- tiene al menos un servicio asignado.
create or replace view public.employees_publicos as
select p.id, p.full_name, p.role
from public.profiles p
where p.active
  and p.email_confirmed_at is not null
  and exists (select 1 from public.employee_services es where es.employee_id = p.id);

alter view public.employees_publicos set (security_invoker = false);
grant select on public.employees_publicos to anon, authenticated;
