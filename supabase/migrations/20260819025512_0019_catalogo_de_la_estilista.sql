-- Catálogo completo de la estilista.
--
-- Reemplaza los tres servicios genéricos que había (Corte femenino, Coloración
-- y Trenzas) por el catálogo real, en cuatro secciones. Se verificó antes de
-- borrar que ninguno estuviera usado en una cita: la llave foránea de
-- appointment_services está en NO ACTION justamente para que el borrado falle
-- si hubiera historial de por medio.
--
-- Sobre los precios "desde": toda la sección de color va marcada así porque el
-- monto final depende del largo, la cantidad, el color anterior y el resultado.
-- Anunciar una cifra cerrada y cobrar otra es lo que sanciona la Ley 7472.
--
-- Sobre las duraciones: son estimaciones de salón, revisables desde el panel.
-- Pesan más que el precio, porque book_appointment suma los minutos y recién
-- después redondea al bloque de 30: un balayage declarado en 30 minutos haría
-- que se agendaran siete clientas donde caben dos.

delete from public.services
 where category = 'barberia'
   and name_es in ('Corte femenino', 'Coloración', 'Trenzas');

insert into public.services
  (category, name_es, name_en, description_es, description_en,
   price, precio_desde, currency, duration_minutes, grupo_es, grupo_en, orden_grupo, orden, active)
values
  -- ------------------------------------------------------- Corte y peinado
  ('barberia', 'Corte de puntas + blower y lavado', 'Trim + blowout and wash',
   'Emparejado de puntas con lavado y secado con brushing.',
   'Ends trimmed, with a wash and blow-dry finish.',
   35, false, 'USD', 60, 'CORTE Y PEINADO', 'CUT & STYLING', 2, 1, true),

  ('barberia', 'Corte + lavado + tratamiento', 'Haircut + wash + treatment',
   'Corte completo con lavado y tratamiento capilar incluido.',
   'Full haircut with wash and a hair treatment included.',
   60, false, 'USD', 90, 'CORTE Y PEINADO', 'CUT & STYLING', 2, 2, true),

  ('barberia', 'Blower + lavado · Corto', 'Blowout + wash · Short',
   'Lavado y secado con brushing para cabello corto.',
   'Wash and blow-dry for short hair.',
   30, false, 'USD', 45, 'CORTE Y PEINADO', 'CUT & STYLING', 2, 3, true),

  ('barberia', 'Blower + lavado · Medio', 'Blowout + wash · Medium',
   'Lavado y secado con brushing para cabello de largo medio.',
   'Wash and blow-dry for medium-length hair.',
   40, false, 'USD', 60, 'CORTE Y PEINADO', 'CUT & STYLING', 2, 4, true),

  ('barberia', 'Blower + lavado · Largo', 'Blowout + wash · Long',
   'Lavado y secado con brushing para cabello largo.',
   'Wash and blow-dry for long hair.',
   50, false, 'USD', 60, 'CORTE Y PEINADO', 'CUT & STYLING', 2, 5, true),

  ('barberia', 'Blower + lavado · XL', 'Blowout + wash · XL',
   'Lavado y secado con brushing para cabello extra largo o muy abundante.',
   'Wash and blow-dry for extra-long or very thick hair.',
   60, false, 'USD', 75, 'CORTE Y PEINADO', 'CUT & STYLING', 2, 6, true),

  ('barberia', 'Blower + lavado · XXL', 'Blowout + wash · XXL',
   'Lavado y secado con brushing para el largo y volumen máximos.',
   'Wash and blow-dry for maximum length and volume.',
   75, false, 'USD', 90, 'CORTE Y PEINADO', 'CUT & STYLING', 2, 7, true),

  ('barberia', 'Lavado + blower + peinado especial', 'Wash + blowout + special styling',
   'Lavado, secado y un peinado trabajado para una ocasión.',
   'Wash, blow-dry and a styled finish for a special occasion.',
   50, false, 'USD', 75, 'CORTE Y PEINADO', 'CUT & STYLING', 2, 8, true),

  ('barberia', 'Peinado para evento + lavado', 'Event styling + wash',
   'Peinado de evento con lavado previo: recogidos, ondas o el estilo que prefiera.',
   'Event hairstyle with a prior wash: updos, waves or the style you prefer.',
   65, false, 'USD', 90, 'CORTE Y PEINADO', 'CUT & STYLING', 2, 9, true),

  -- ------------------------------------------------------------------ Color
  ('barberia', 'Retoque de raíz', 'Root touch-up',
   'Cobertura del crecimiento en la raíz. El precio final depende del largo, la cantidad de producto, el color anterior y el resultado deseado.',
   'Covers regrowth at the roots. The final price depends on length, amount of product, previous color and the desired result.',
   85, true, 'USD', 90, 'COLOR', 'COLOR', 3, 1, true),

  ('barberia', 'Color completo', 'Full color',
   'Coloración de todo el cabello. El precio final depende del largo, la cantidad de producto, el color anterior y el resultado deseado.',
   'Color applied to the full head. The final price depends on length, amount of product, previous color and the desired result.',
   100, true, 'USD', 150, 'COLOR', 'COLOR', 3, 2, true),

  ('barberia', 'Highlights completos', 'Full highlights',
   'Mechas en toda la cabeza. El precio final depende del largo, la cantidad, el color anterior y el resultado deseado.',
   'Highlights throughout. The final price depends on length, amount, previous color and the desired result.',
   160, true, 'USD', 180, 'COLOR', 'COLOR', 3, 3, true),

  ('barberia', 'Highlights parciales', 'Partial highlights',
   'Mechas en la parte superior y el contorno. El precio final depende del largo, la cantidad, el color anterior y el resultado deseado.',
   'Highlights on the top section and around the face. The final price depends on length, amount, previous color and the desired result.',
   120, true, 'USD', 120, 'COLOR', 'COLOR', 3, 4, true),

  ('barberia', 'Balayage', 'Balayage',
   'Degradado natural pintado a mano. El precio final depende del largo, la cantidad, el color anterior y el resultado deseado.',
   'Hand-painted natural gradient. The final price depends on length, amount, previous color and the desired result.',
   180, true, 'USD', 210, 'COLOR', 'COLOR', 3, 5, true),

  ('barberia', 'Babylights', 'Babylights',
   'Mechas muy finas para un efecto sutil. El precio final depende del largo, la cantidad, el color anterior y el resultado deseado.',
   'Very fine highlights for a subtle effect. The final price depends on length, amount, previous color and the desired result.',
   140, true, 'USD', 180, 'COLOR', 'COLOR', 3, 6, true),

  -- ------------------------------------------------------------ Tratamiento
  ('barberia', 'Hidratación profunda', 'Deep hydration',
   'Hidratación para devolver suavidad y manejabilidad al cabello.',
   'Hydration that restores softness and manageability.',
   55, false, 'USD', 45, 'TRATAMIENTO', 'TREATMENTS', 4, 1, true),

  ('barberia', 'Hidratación intensiva', 'Intensive hydration',
   'Hidratación de mayor concentración para cabello reseco.',
   'Higher-concentration hydration for dry hair.',
   70, false, 'USD', 60, 'TRATAMIENTO', 'TREATMENTS', 4, 2, true),

  ('barberia', 'Hidratación reparadora', 'Repairing hydration',
   'Tratamiento reconstructivo para cabello dañado por color o calor.',
   'Reconstructive treatment for hair damaged by color or heat.',
   80, false, 'USD', 75, 'TRATAMIENTO', 'TREATMENTS', 4, 3, true),

  ('barberia', 'Tratamiento de cuero cabelludo', 'Scalp treatment',
   'Limpieza y cuidado del cuero cabelludo con masaje incluido.',
   'Scalp cleansing and care, massage included.',
   60, false, 'USD', 45, 'TRATAMIENTO', 'TREATMENTS', 4, 4, true),

  ('barberia', 'Botox capilar', 'Hair botox',
   'Tratamiento de relleno capilar que aporta cuerpo y brillo.',
   'Filling treatment that adds body and shine.',
   80, false, 'USD', 90, 'TRATAMIENTO', 'TREATMENTS', 4, 5, true),

  ('barberia', 'Velo de brillo', 'Shine gloss',
   'Velo de brillo que sella la fibra y aviva el color.',
   'A gloss veil that seals the hair fibre and revives color.',
   50, false, 'USD', 45, 'TRATAMIENTO', 'TREATMENTS', 4, 6, true),

  -- --------------------------------------------------------------- Alisados
  ('barberia', 'Keratina', 'Keratin treatment',
   'Alisado con keratina para reducir el frizz y facilitar el peinado.',
   'Keratin smoothing that reduces frizz and makes styling easier.',
   150, false, 'USD', 180, 'ALISADOS', 'SMOOTHING', 5, 1, true),

  ('barberia', 'Nanoplastia', 'Nanoplasty',
   'Alisado progresivo sin formol, con acabado más natural.',
   'Formaldehyde-free progressive smoothing with a more natural finish.',
   180, false, 'USD', 210, 'ALISADOS', 'SMOOTHING', 5, 2, true),

  ('barberia', 'Botox alisador', 'Smoothing botox',
   'Alisado con efecto botox: menos volumen y más manejabilidad.',
   'Botox-effect smoothing: less volume and more manageability.',
   130, false, 'USD', 150, 'ALISADOS', 'SMOOTHING', 5, 3, true);
