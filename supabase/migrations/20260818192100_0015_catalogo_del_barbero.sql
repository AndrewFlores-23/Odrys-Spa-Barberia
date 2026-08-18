-- Catálogo del barbero: nombres, precios y duraciones reales.
--
-- Hasta ahora los siete servicios de barbería tenían price en null y los 30
-- minutos que trae la columna por defecto. La duración pesa más que el precio:
-- book_appointment suma los minutos de todos los servicios elegidos y recién
-- después redondea al bloque de 30, así que un "Corte y barba" declarado en 30
-- minutos hacía que se agendaran dos citas donde solo cabe una.
--
-- Se identifica por id y no por nombre porque los nombres cambian acá mismo.
-- Los tres de estilismo (Coloración, Corte femenino, Trenzas) quedan sin
-- precio a propósito: son de la estilista y todavía no están definidos.

update public.services set
  name_es = 'Corte regular', name_en = 'Regular haircut',
  price = 25, duration_minutes = 30, orden = 1
where id = '4f132911-3b18-4159-9766-c313a9e682b2';

update public.services set
  name_es = 'Corte y barba', name_en = 'Haircut and beard',
  price = 40, duration_minutes = 60, orden = 2
where id = 'ea1818aa-92bf-40e2-9ef2-6297d4834e77';

update public.services set
  name_es = 'Fade haircut', name_en = 'Fade haircut',
  price = 30, duration_minutes = 45, orden = 3
where id = '316f2616-0657-4ea6-bea5-9095b144c11d';

update public.services set
  name_es = 'Barba y contorno', name_en = 'Beard trim and line-up',
  price = 20, duration_minutes = 30, orden = 4
where id = '5f1f6dd4-4f16-4ab1-bf13-17428b695c74';

-- Dos servicios que no existían en el catálogo. El trigger
-- services_sincroniza_roles les asigna solo los roles de la zona 'barberia',
-- así que no hace falta tocar role_services a mano.
insert into public.services
  (category, name_es, name_en, description_es, description_en,
   price, currency, duration_minutes, grupo_es, grupo_en, orden_grupo, orden, active)
values
  ('barberia', 'Líneas', 'Line-up',
   'Definición de contornos y líneas para refrescar el corte entre visitas.',
   'Edge and line definition to refresh the cut between visits.',
   10, 'USD', 15, 'BARBERÍA', 'BARBERING', 1, 5, true),
  ('barberia', 'Cejas', 'Eyebrows',
   'Perfilado de cejas para hombre, rápido y de acabado natural.',
   'Eyebrow shaping for men, quick and with a natural finish.',
   6, 'USD', 10, 'BARBERÍA', 'BARBERING', 1, 6, true);
