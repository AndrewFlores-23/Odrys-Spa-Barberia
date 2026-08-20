-- "Corte y barba" sube de $40 a $45, por indicación de la dueña.
--
-- Se identifica por id y no por nombre para no depender de la redacción.
--
-- Nota para el futuro: un cambio de precio no necesita migración. La dueña lo
-- puede hacer sola desde el panel, en Servicios, y queda aplicado al instante.
-- Esta va solo para que el repositorio no quede describiendo un precio que ya
-- no existe. Si cada ajuste de precio se hiciera acá, el historial se llenaría
-- de migraciones triviales.

update public.services
   set price = 45
 where id = 'ea1818aa-92bf-40e2-9ef2-6297d4834e77';
