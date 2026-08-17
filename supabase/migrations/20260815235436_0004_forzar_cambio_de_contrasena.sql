-- 0004 — Obliga a cambiar la contraseña temporal en el primer ingreso.
-- Las cuentas se crean con una clave provisional; el panel debe bloquear
-- cualquier otra acción hasta que la persona defina la suya.
alter table public.profiles
  add column if not exists must_change_password boolean not null default true;

comment on column public.profiles.must_change_password is
  'true mientras la persona siga usando la contraseña provisional asignada al crear la cuenta.';

-- El trigger de anti-escalada ya impide que un empleado toque su rol o su
-- estado activo. Este permiso extra deja que sí pueda apagar su propia
-- bandera al establecer una contraseña nueva.
create or replace function public.marcar_contrasena_actualizada()
returns void
language sql
security definer
set search_path to 'public'
as $$
  update public.profiles
     set must_change_password = false
   where id = auth.uid();
$$;

revoke execute on function public.marcar_contrasena_actualizada() from anon;