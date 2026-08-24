-- Ajuste de precios pedido por la dueña.
--
--   Masaje Bali para dos   $150 → $160
--   Aromaterapia            $75 → $40
--
-- Se identifican por id y no por nombre para no depender de la redacción.
--
-- Nota: un cambio de precio no necesita migración. La dueña lo puede hacer
-- sola desde el panel, en Servicios. Esta va solo para que el repositorio no
-- quede describiendo precios que ya no existen.

update public.services set price = 160 where id = '848f0589-342e-49d0-881c-08c58132afa1'; -- Masaje Bali para dos
update public.services set price = 40  where id = 'bb143e1b-ebb3-4032-a315-646e64ddf08f'; -- Aromaterapia
