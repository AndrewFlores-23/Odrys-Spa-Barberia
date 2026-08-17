-- 0005 — Expone al público únicamente lo indispensable de cada profesional.
--
-- profiles queda cerrada por RLS (cada empleado solo se ve a sí mismo), pero
-- la página de reservas necesita listar con quién se puede agendar. En vez de
-- abrir la tabla, se publica una vista sin teléfono, sin estado y sin fechas.
create or replace view public.employees_publicos as
select p.id, p.full_name, p.role
from public.profiles p
where p.active;

comment on view public.employees_publicos is
  'Profesionales activos visibles para el sitio público. Solo id, nombre y rol.';

-- La vista pertenece al propietario del esquema, así que evalúa sin RLS y sin
-- security_invoker: es la única puerta por la que un visitante ve al equipo.
alter view public.employees_publicos set (security_invoker = false);

grant select on public.employees_publicos to anon, authenticated;