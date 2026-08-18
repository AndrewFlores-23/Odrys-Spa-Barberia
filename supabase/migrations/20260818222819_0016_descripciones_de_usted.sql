-- Las descripciones del catálogo pasan de "vos" a "usted".
--
-- La dueña considera que el voseo suena confianzudo para atender clientes, y
-- en Costa Rica "usted" es el trato corriente incluso en confianza. El resto
-- del sitio ya se cambió; estas cuatro descripciones viven en la base, así que
-- si no se tocan acá el catálogo seguiría tuteando aunque el HTML no lo haga.
--
-- Solo se toca el español: el inglés no distingue entre tú y usted.

update public.services
   set description_es = 'Consulta, corte personalizado y acabado según su tipo de cabello y estilo.'
 where description_es = 'Consulta, corte personalizado y acabado según tu tipo de cabello y estilo.';

update public.services
   set description_es = 'Degradado de precisión y detalles adaptados al acabado que busca.'
 where description_es = 'Degradado de precisión y detalles adaptados al acabado que buscás.';

update public.services
   set description_es = 'Corte personalizado según el largo, textura y forma que desea mantener.'
 where description_es = 'Corte personalizado según el largo, textura y forma que deseás mantener.';

update public.services
   set description_es = 'Color adaptado a su base, largo y resultado deseado. Requiere valoración previa.'
 where description_es = 'Color adaptado a tu base, largo y resultado deseado. Requiere valoración previa.';
