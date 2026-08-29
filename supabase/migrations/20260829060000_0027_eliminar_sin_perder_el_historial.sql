-- 0027 — Eliminar a alguien deja de costar el historial de citas.
--
-- Hasta ahora appointments.employee_id era `not null` y sin regla de borrado,
-- así que quitar a una persona con citas era imposible: la Edge Function se
-- rendía y la desactivaba. Eso deja su nombre y su correo en la base para
-- siempre, sin manera de atender una solicitud de borrado de datos (Ley 8968).
--
-- Las citas no son del profesional: son del negocio y de la clienta. Así que
-- la cita se queda con el nombre de quien atendió, copiado al crearse, y la
-- referencia al perfil pasa a poder quedar en nulo.

alter table public.appointments
  add column if not exists employee_nombre text;

comment on column public.appointments.employee_nombre is
  'Nombre del profesional en el momento de la cita. Sobrevive al borrado de la cuenta: sin esta copia el historial quedaría sin dueño.';

-- Las citas que ya existen toman el nombre actual del perfil.
update public.appointments a
   set employee_nombre = p.full_name
  from public.profiles p
 where p.id = a.employee_id
   and a.employee_nombre is null;

-- Cualquier resto sin perfil queda igualmente identificable.
update public.appointments
   set employee_nombre = 'Profesional no registrado'
 where employee_nombre is null;

alter table public.appointments
  alter column employee_nombre set not null;

-- La copia se hace sola al crear o reasignar la cita, para que ningún camino
-- de inserción tenga que acordarse de hacerla.
create or replace function public.copiar_nombre_del_profesional()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- En un INSERT no existe OLD, así que se distingue la operación antes de
  -- comparar. Al reasignar la cita, el nombre se vuelve a copiar.
  if tg_op = 'INSERT' or new.employee_id is distinct from old.employee_id then
    if new.employee_id is not null then
      select full_name into new.employee_nombre
        from public.profiles where id = new.employee_id;
    end if;
  end if;

  -- Cuando el borrado de la cuenta deja employee_id en nulo, esta rama no se
  -- toca: el nombre guardado se queda como está, que es justo el objetivo.
  if new.employee_nombre is null or btrim(new.employee_nombre) = '' then
    new.employee_nombre := 'Profesional no registrado';
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_copia_nombre on public.appointments;
create trigger appointments_copia_nombre
  before insert or update on public.appointments
  for each row execute function public.copiar_nombre_del_profesional();

revoke execute on function public.copiar_nombre_del_profesional() from public;

-- Ahora sí: la cita puede quedarse sin perfil asociado.
alter table public.appointments
  alter column employee_id drop not null;

alter table public.appointments
  drop constraint appointments_employee_id_fkey;

-- El nombre de la restricción se conserva a propósito: el panel lo usa para el
-- embed de PostgREST (profiles!appointments_employee_id_fkey). Renombrarla
-- rompería la agenda en silencio.
alter table public.appointments
  add constraint appointments_employee_id_fkey
  foreign key (employee_id) references public.profiles(id) on delete set null;

-- Nota sobre el índice de exclusión que impide traslapes: compara employee_id
-- con «=», y en nulo esa comparación nunca da verdadero. Las citas de una
-- cuenta eliminada dejan de bloquear horarios, que es lo correcto: esa persona
-- ya no atiende.
