-- 0010 — Quitarle trabajo en inglés a quien administra, y mostrar colones.
--
-- Quien va a usar el panel habla español. Exigirle el nombre en inglés de cada
-- servicio garantizaba una de dos cosas: campos vacíos o traducciones malas.
-- Ahora el inglés es opcional y, si falta, el sitio muestra el español.

alter table public.services alter column name_en drop not null;

comment on column public.services.name_en is
  'Opcional. Si está vacío, el sitio en inglés muestra name_es.';

-- ---------------------------------------------------------------------------
-- Tipo de cambio del negocio
-- ---------------------------------------------------------------------------
-- Se guarda un solo valor, editable desde el panel. A propósito NO se consulta
-- una tasa automática: los comercios en Costa Rica cobran con su propio tipo de
-- cambio redondeado (520, 525), no con el del Banco Central al decimal. Un
-- número que la administración controla refleja mejor lo que se cobra en caja,
-- y además no depende de que un servicio externo esté disponible.
create table if not exists public.ajustes (
  id               boolean primary key default true check (id),
  tipo_cambio      numeric(10,2) not null default 520 check (tipo_cambio > 0),
  actualizado_en   timestamptz not null default now(),
  actualizado_por  uuid references public.profiles(id) on delete set null
);

comment on table public.ajustes is
  'Configuración general del negocio. Una sola fila, forzada por la llave primaria booleana.';
comment on column public.ajustes.tipo_cambio is
  'Colones por dólar que usa el negocio. Referencial: el monto final se cobra en caja.';

insert into public.ajustes (id) values (true) on conflict (id) do nothing;

alter table public.ajustes enable row level security;

-- El sitio público necesita leerlo para mostrar precios en colones.
drop policy if exists "cualquiera consulta los ajustes" on public.ajustes;
create policy "cualquiera consulta los ajustes"
  on public.ajustes for select using (true);

drop policy if exists "solo admin edita los ajustes" on public.ajustes;
create policy "solo admin edita los ajustes"
  on public.ajustes for update
  using (public.is_admin()) with check (public.is_admin());

-- Deja constancia de quién y cuándo tocó el tipo de cambio.
create or replace function public.marcar_ajuste_actualizado()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  new.actualizado_en := now();
  new.actualizado_por := auth.uid();
  return new;
end;
$$;

drop trigger if exists ajustes_marca_actualizacion on public.ajustes;
create trigger ajustes_marca_actualizacion
  before update on public.ajustes
  for each row execute function public.marcar_ajuste_actualizado();
