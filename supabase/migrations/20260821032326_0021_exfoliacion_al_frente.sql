-- La exfoliación de café pasa al primer lugar del catálogo de spa.
--
-- Es el servicio que distingue al local: según la dueña, es la única que lo
-- ofrece en la zona. Estaba en el cuarto y último grupo, sola, después de 28
-- servicios: había que pasar por diez masajes y trece depilaciones para
-- llegar a ella.
--
-- El orden queda:
--   1  TRATAMIENTO CORPORAL   (la exfoliación)
--   2  MANOS Y PIES
--   3  MASAJES
--   4  DEPILACIÓN
--
-- Si más adelante conviene devolverla, es cambiar estos números. El panel no
-- expone el orden de los grupos todavía, así que por ahora se hace acá.

update public.services set orden_grupo = 1 where category = 'spa' and grupo_es = 'TRATAMIENTO CORPORAL';
update public.services set orden_grupo = 2 where category = 'spa' and grupo_es = 'MANOS Y PIES';
update public.services set orden_grupo = 3 where category = 'spa' and grupo_es = 'MASAJES';
update public.services set orden_grupo = 4 where category = 'spa' and grupo_es = 'DEPILACIÓN';
