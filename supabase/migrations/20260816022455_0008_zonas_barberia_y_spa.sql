-- 0008 — Cada rol pertenece a una zona del negocio.
--
-- El sitio tiene dos páginas independientes: barbería y spa. Hasta ahora la
-- separación ocurría de rebote, porque un barbero no tiene servicios de spa
-- asignados. Pero un administrador (que puede ofrecer cualquier servicio)
-- aparecería en las dos páginas. La zona lo vuelve explícito.

create table if not exists public.role_zones (
  role text not null check (role in ('administrador','barbero','estilista','masajista')),
  zone text not null check (zone in ('barberia','spa')),
  primary key (role, zone)
);

comment on table public.role_zones is
  'A qué página del sitio pertenece cada rol. La estilista trabaja en barbería.';

alter table public.role_zones enable row level security;

drop policy if exists "cualquiera consulta las zonas" on public.role_zones;
create policy "cualquiera consulta las zonas"
  on public.role_zones for select using (true);

drop policy if exists "solo admin edita las zonas" on public.role_zones;
create policy "solo admin edita las zonas"
  on public.role_zones for all
  using (public.is_admin()) with check (public.is_admin());

insert into public.role_zones (role, zone) values
  ('barbero',       'barberia'),
  ('estilista',     'barberia'),   -- estilismo femenino vive en la barbería
  ('masajista',     'spa'),
  ('administrador', 'barberia'),   -- la dueña puede figurar en cualquiera de
  ('administrador', 'spa')         -- las dos, si se le asignan servicios
on conflict do nothing;

-- La vista pública ahora dice a qué zonas pertenece cada profesional, para que
-- cada página muestre solo a los suyos. Se mantiene la condición de tener al
-- menos un servicio asignado: así una cuenta puramente administrativa, sin
-- servicios, nunca aparece como opción para la clienta.
create or replace view public.employees_publicos as
select
  p.id,
  p.full_name,
  p.role,
  (select array_agg(rz.zone order by rz.zone)
     from public.role_zones rz where rz.role = p.role) as zones
from public.profiles p
where p.active
  and p.email_confirmed_at is not null
  and exists (select 1 from public.employee_services es where es.employee_id = p.id);

alter view public.employees_publicos set (security_invoker = false);
grant select on public.employees_publicos to anon, authenticated;
