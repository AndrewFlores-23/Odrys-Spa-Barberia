-- 0026 — El panel vuelve a poder activar, desactivar y eliminar cuentas.
--
-- Síntoma: en «Usuarios», DESACTIVAR no surtía efecto (la petición moría en un
-- 500) y ELIMINAR respondía «se desactivó en lugar de borrarse» mientras la
-- persona seguía apareciendo activa en la lista.
--
-- Causa: prevent_role_self_escalation (0001, retocado en 0014) se dispara en
-- CADA update de public.profiles. La Edge Function admin-manage-users escribe
-- con la clave service_role, y bajo esa clave auth.uid() es NULL, así que
-- is_admin() devuelve falso y el disparador cortaba cualquier cambio de
-- `active` o de `role`. La clave de servicio salta las políticas RLS, pero no
-- los disparadores: por eso el fallo aparecía solo en las acciones del panel.
--
-- Arreglo: reconocer a service_role como «el sistema», igual que 0014 ya hizo
-- con la confirmación de correo. No abre ninguna puerta nueva: esa clave vive
-- únicamente en el servidor y la propia Edge Function verifica en cada
-- petición que quien llama sea administrador con el correo confirmado. El
-- disparador sigue protegiendo lo que importa: las sesiones del navegador,
-- que viajan como anon o authenticated.

-- Lee el rol del JWT con el que PostgREST abrió la transacción. Sirve dentro
-- de una función SECURITY DEFINER, donde current_user ya es el dueño y no
-- delata quién llamó de verdad.
create or replace function public.es_rol_de_servicio()
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  ) = 'service_role';
$$;

comment on function public.es_rol_de_servicio() is
  'true solo cuando la petición llega con la clave service_role, que nunca sale del servidor.';

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- La activación automática al confirmar el correo no es una escalada.
  if coalesce(current_setting('odrys.confirmando_correo', true), '') = 'si' then
    return new;
  end if;

  -- Tampoco lo es lo que hace la Edge Function de administración, que ya
  -- comprobó por su cuenta que quien pidió el cambio es administrador.
  if public.es_rol_de_servicio() then
    return new;
  end if;

  if not public.is_admin() then
    if new.role is distinct from old.role or new.active is distinct from old.active then
      raise exception 'No tenés permiso para cambiar tu propio rol o estado activo.';
    end if;

    -- Cierra el atajo: sin esto, alguien podría marcarse el correo como
    -- confirmado editando su propia fila y saltarse la verificación.
    if new.email_confirmed_at is distinct from old.email_confirmed_at then
      raise exception 'No tenés permiso para cambiar el estado de confirmación de tu correo.';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.es_rol_de_servicio()             from public;
revoke execute on function public.prevent_role_self_escalation()   from public;
