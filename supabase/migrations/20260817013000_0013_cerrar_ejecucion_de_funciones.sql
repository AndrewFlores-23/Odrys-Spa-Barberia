-- 0013 — Cierra la ejecución pública de las funciones internas.
--
-- Postgres crea toda función con permiso de ejecución para PUBLIC. En la 0003
-- se escribió `revoke ... from anon`, que no sirve de nada: anon hereda el
-- permiso de PUBLIC, así que seguía pudiendo llamarlas por la API REST.
--
-- El caso concreto que esto arregla: aplicar_horario_estandar() insertaba una
-- jornada completa de 9 a 19 los siete días para el empleado que se le pasara.
-- Un visitante anónimo podía devolverle el horario a alguien que lo hubiera
-- recortado, o reponerle el domingo que se había quitado.

-- ---------------------------------------------------------------------------
-- Funciones de disparador: nunca deben llamarse directamente
-- ---------------------------------------------------------------------------
revoke execute on function public.prevent_role_self_escalation()     from public;
revoke execute on function public.crear_perfil_para_usuario_nuevo()  from public;
revoke execute on function public.sincronizar_confirmacion_correo()  from public;
revoke execute on function public.sincronizar_roles_de_servicio()    from public;
revoke execute on function public.limpiar_servicios_al_cambiar_rol() from public;
revoke execute on function public.validar_servicio_por_rol()         from public;
revoke execute on function public.marcar_ajuste_actualizado()        from public;

-- ---------------------------------------------------------------------------
-- Auxiliares que solo tienen sentido dentro de otras funciones
-- ---------------------------------------------------------------------------
-- get_available_slots y book_appointment son SECURITY DEFINER: se ejecutan con
-- los permisos del dueño, así que siguen pudiendo usarlas aunque el público no.
revoke execute on function public.minutos_en_bloques(integer) from public;
revoke execute on function public.zona_horaria_local()        from public;

-- ---------------------------------------------------------------------------
-- El fallo concreto
-- ---------------------------------------------------------------------------
revoke execute on function public.aplicar_horario_estandar(uuid) from public;

-- ---------------------------------------------------------------------------
-- Esta sí la usa el panel, pero solo con sesión iniciada
-- ---------------------------------------------------------------------------
revoke execute on function public.marcar_contrasena_actualizada() from public;
grant  execute on function public.marcar_contrasena_actualizada() to authenticated;

-- ---------------------------------------------------------------------------
-- Lo que queda abierto a propósito
-- ---------------------------------------------------------------------------
-- book_appointment y get_available_slots: son la puerta pública de reservas.
-- is_admin y current_role_is: las evalúan las políticas RLS en el contexto de
--   quien consulta, así que revocarles la ejecución rompería las consultas del
--   propio sitio.

-- Fija el search_path que faltaba, para que la función no dependa del que
-- traiga la sesión que la llame.
create or replace function public.zona_horaria_local()
returns text
language sql
immutable
security definer
set search_path to 'public'
as $$ select 'America/Costa_Rica'::text $$;

revoke execute on function public.zona_horaria_local() from public;
