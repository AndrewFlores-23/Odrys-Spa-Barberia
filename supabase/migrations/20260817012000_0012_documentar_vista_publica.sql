-- 0012 — Deja constancia de por qué employees_publicos salta RLS.
--
-- El asesor de Supabase marca toda vista SECURITY DEFINER como crítica por
-- patrón, sin mirar qué devuelve. Acá es deliberado y expone menos que la
-- alternativa: profiles está cerrada por RLS, y RLS filtra filas pero no
-- columnas, así que abrirla al público habría dejado ver también el teléfono.
-- Esta vista devuelve solo nombre, rol y zona de quien ya figura como
-- reservable en el sitio.
comment on view public.employees_publicos is
  'Profesionales reservables para el sitio público: id, nombre, rol y zona. '
  'Salta RLS a propósito (security_invoker = false) porque profiles está cerrada '
  'y RLS no permite restringir columnas: abrirla expondría el teléfono. '
  'Solo muestra perfiles activos, con correo confirmado y con servicios asignados.';
