-- 0014 — Arregla el error 500 al confirmar el correo de una invitación.
--
-- Al abrir el enlace del correo, Supabase marca email_confirmed_at en
-- auth.users. Eso dispara sincronizar_confirmacion_correo (0007), que activa
-- el perfil poniendo active = true. Y ese UPDATE dispara a su vez
-- prevent_role_self_escalation (0001), que ve cambiar `active` en una sesión
-- que no es de administrador y lanza:
--
--   ERROR: No tenés permiso para cambiar tu propio rol o estado activo.
--
-- Resultado: "500: Error confirming user" y la persona invitada nunca podía
-- activar su cuenta. La protección anti-escalada estaba bloqueando la
-- activación legítima.
--
-- La solución es una marca local a la transacción que el disparador de
-- sincronización enciende antes de escribir. No se puede falsificar desde
-- fuera: PostgREST no deja ejecutar SET, y set_config con is_local = true
-- desaparece al terminar la transacción.

create or replace function public.sincronizar_confirmacion_correo()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Avisa al disparador anti-escalada de que este cambio lo hace el sistema.
  perform set_config('odrys.confirmando_correo', 'si', true);

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

revoke execute on function public.sincronizar_confirmacion_correo() from public;
revoke execute on function public.prevent_role_self_escalation()    from public;
