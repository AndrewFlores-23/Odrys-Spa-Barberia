-- Duraciones corregidas tras la revisión de la dueña.
--
-- Las que se habían cargado eran estimaciones; estas son las reales del local.
-- Importan más que los precios: book_appointment suma los minutos de los
-- servicios elegidos y recién después redondea al bloque de 30, así que una
-- duración corta de menos hace que se agenden dos clientas donde cabe una.
--
--   Masaje con bambú        40 → 60   ocupaba 60, sigue ocupando 60
--   Masaje Bali para dos    40 → 60   ocupaba 60, sigue ocupando 60
--   Aromaterapia            35 → 30   ocupaba 60, ahora ocupa 30  ← libera media hora
--   Manicure en gel         30 → 50   ocupaba 30, ahora ocupa 60
--   Pedicure en gel         30 → 60   ocupaba 30, ahora ocupa 60
--
-- El masaje tailandés ya estaba en 60, así que no se toca.
--
-- Se identifican por id y no por nombre para no depender de la redacción.

update public.services set duration_minutes = 60 where id = '95974c37-eafd-4e82-b888-74a2c1a6d3ff'; -- Masaje con bambú
update public.services set duration_minutes = 60 where id = '848f0589-342e-49d0-881c-08c58132afa1'; -- Masaje Bali para dos
update public.services set duration_minutes = 30 where id = 'bb143e1b-ebb3-4032-a315-646e64ddf08f'; -- Aromaterapia
update public.services set duration_minutes = 50 where id = 'fcdb38f9-1c47-4978-8796-315c3d22c010'; -- Manicure en gel
update public.services set duration_minutes = 60 where id = 'a56cdaaa-0028-4945-a3aa-4d41f7e98cff'; -- Pedicure en gel
