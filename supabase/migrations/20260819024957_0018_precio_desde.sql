-- Precios "desde".
--
-- Varios servicios de estilismo no tienen precio cerrado: el color depende del
-- largo, del color anterior y del resultado que se busque. Hasta ahora la
-- columna price solo permitía un número exacto o null, así que un servicio de
-- "desde $85" se habría anunciado como "$85".
--
-- No es un detalle de presentación. La Ley 7472 de defensa del consumidor
-- obliga a informar el precio de forma veraz: mostrar un monto fijo y cobrar
-- más es exactamente lo que sanciona. Con "desde" el anuncio es correcto y el
-- ajuste hacia arriba queda avisado.

alter table public.services
  add column if not exists precio_desde boolean not null default false;

comment on column public.services.precio_desde is
  'Si es verdadero, el precio se muestra como "desde $X" porque el monto final depende del largo, el color previo u otros factores.';
