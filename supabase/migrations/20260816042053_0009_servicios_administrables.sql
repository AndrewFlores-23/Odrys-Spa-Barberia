-- 0009 — Que un servicio nuevo nazca utilizable.
--
-- role_services es el techo de lo que cada rol puede hacer. Un servicio creado
-- desde el panel no aparecía en esa tabla, así que no se le podía asignar a
-- nadie y nunca llegaba a ser reservable. El fallo era silencioso: el servicio
-- se veía en la web pero ningún profesional lo cubría.
--
-- Ahora la zona del servicio (su categoría) determina automáticamente qué roles
-- pueden realizarlo, usando el mismo mapa role_zones que separa las páginas.

create or replace function public.sincronizar_roles_de_servicio()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- En un UPDATE que no toca la categoría no hay nada que rehacer.
  if tg_op = 'UPDATE' and new.category is not distinct from old.category then
    return new;
  end if;

  -- Retira los roles que ya no corresponden a la zona del servicio.
  delete from public.role_services rs
   where rs.service_id = new.id
     and not exists (
       select 1 from public.role_zones rz
       where rz.role = rs.role and rz.zone = new.category
     );

  -- Habilita todos los roles de esa zona.
  insert into public.role_services (role, service_id)
  select rz.role, new.id
    from public.role_zones rz
   where rz.zone = new.category
  on conflict do nothing;

  -- Si el servicio cambió de zona, hay profesionales que ya no pueden darlo.
  -- Sin esta limpieza quedarían ofreciéndolo en la web pese a que su rol ya
  -- no lo permite, y book_appointment los rechazaría al reservar.
  delete from public.employee_services es
   where es.service_id = new.id
     and not exists (
       select 1
         from public.profiles p
         join public.role_services rs
           on rs.role = p.role and rs.service_id = es.service_id
        where p.id = es.employee_id
     );

  return new;
end;
$$;

drop trigger if exists services_sincroniza_roles on public.services;
create trigger services_sincroniza_roles
  after insert or update of category on public.services
  for each row execute function public.sincronizar_roles_de_servicio();

-- Repara los servicios que ya existieran sin mapeo completo.
insert into public.role_services (role, service_id)
select rz.role, s.id
  from public.services s
  join public.role_zones rz on rz.zone = s.category
on conflict do nothing;
