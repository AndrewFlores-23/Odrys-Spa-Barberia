(function () {
  const translations = {
    "INICIO": "HOME",
    "BARBERÍA": "BARBER SHOP",
    "CONOCER MÁS": "LEARN MORE",
    "RESERVAR": "BOOK",
    "SERVICIOS": "SERVICES",
    "ENCONTRANOS TAMBIÉN EN": "FIND US ALSO ON",
    "LOCALIZACIÓN ↗︎": "LOCATION ↗︎",
    "Un destino.": "One destination.",
    "Dos maneras de": "Two ways to",
    "cuidarte.": "care for yourself.",
    "Odry's reúne un spa sereno y una barbería con carácter en un mismo lugar. Elegí la experiencia que necesitás hoy.": "Odry's brings together a serene spa and a character-filled barber shop in one place. Choose the experience you need today.",
    "DESCUBRIR LOS ESPACIOS ↓︎": "DISCOVER BOTH SPACES ↓︎",
    "FOTOGRAFÍA DEL LOCAL": "PHOTO OF THE LOCATION",
    "FACHADA / ENTRADA COMPARTIDA": "FACADE / SHARED ENTRANCE",
    "TODO LO QUE NECESITÁS PARA SENTIRTE BIEN,": "EVERYTHING YOU NEED TO FEEL YOUR BEST,",
    "en un solo lugar.": "all in one place.",
    "NUESTROS ESPACIOS": "OUR SPACES",
    "Mismo lugar.": "Same place.",
    "Distinta energía.": "Different energy.",
    "IMAGEN BARBERÍA": "BARBER SHOP IMAGE",
    "CORTES / AMBIENTE": "HAIRCUTS / ATMOSPHERE",
    "01 · BARBERÍA": "01 · BARBER SHOP",
    "Precisión,": "Precision,",
    "estilo y actitud.": "style and attitude.",
    "Cortes, barba y rituales de grooming con atención al detalle, buena conversación y cero complicaciones.": "Haircuts, beard care and grooming rituals with attention to detail, good conversation and no fuss.",
    "Corte clásico": "Classic haircut",
    "Barba & perfilado": "Beard trim & shaping",
    "Combo completo": "Full combo",
    "ENTRAR A BARBERÍA": "ENTER BARBER SHOP",
    "IMAGEN SPA": "SPA IMAGE",
    "RITUALES / BIENESTAR": "RITUALS / WELLNESS",
    "Calma para": "Calm for",
    "cuerpo y mente.": "body and mind.",
    "Tratamientos pensados para bajar el ritmo, restaurar tu energía y regalarte una pausa en Tamarindo.": "Treatments designed to slow down, restore your energy and give you a moment to pause in Tamarindo.",
    "Masajes relajantes": "Relaxing massages",
    "Faciales": "Facials",
    "Manicure & pedicure": "Manicure & pedicure",
    "ENTRAR AL SPA": "ENTER THE SPA",
    "EXPERIENCIAS": "EXPERIENCES",
    "INDEPENDIENTES": "INDEPENDENT",
    "UBICACIÓN": "LOCATION",
    "EN TAMARINDO": "IN TAMARINDO",
    "“Podés venir por un corte, regalarte un masaje o convertir la visita en un día completo de cuidado.”": "“Come in for a haircut, treat yourself to a massage, or turn your visit into a full day of self-care.”",
    "LO NUEVO EN ODRY'S": "WHAT'S NEW AT ODRY'S",
    "Novedades de": "News from",
    "los dos lados.": "both sides.",
    "QUIERO VER": "I WANT TO SEE",
    "IMAGEN DE NOVEDAD": "NEWS IMAGE",
    "DESTACADO · AGOSTO 2026": "FEATURED · AUGUST 2026",
    "Nuevo ritual de barba con toalla caliente.": "New hot-towel beard ritual.",
    "Sumamos una experiencia completa de perfilado, hidratación y acabado para que cada detalle cuente.": "We added a complete shaping, hydration and finishing experience where every detail matters.",
    "CONOCER EL SERVICIO ↗︎": "EXPLORE THE SERVICE ↗︎",
    "05 AGO · PROMOCIÓN": "AUG 05 · PROMOTION",
    "Combo padre e hijo durante todo el mes.": "Father-and-son combo all month long.",
    "Dos cortes, un mismo plan. Consultá horarios y condiciones.": "Two haircuts, one shared plan. Ask about times and conditions.",
    "VER MÁS ↗︎": "LEARN MORE ↗︎",
    "01 AGO · HORARIOS": "AUG 01 · HOURS",
    "Ahora abrimos los domingos.": "We are now open on Sundays.",
    "Más espacios para acomodar tu próximo corte de fin de semana.": "More availability for your next weekend haircut.",
    "VER HORARIOS ↗︎": "VIEW HOURS ↗︎",
    "Llegó nuestro ritual de lavanda tropical.": "Our tropical lavender ritual has arrived.",
    "Una experiencia de relajación con aroma suave, masaje corporal e hidratación profunda.": "A relaxing experience with a gentle aroma, body massage and deep hydration.",
    "CONOCER EL RITUAL ↗︎": "EXPLORE THE RITUAL ↗︎",
    "08 AGO · BIENESTAR": "AUG 08 · WELLNESS",
    "Certificados de regalo disponibles.": "Gift certificates now available.",
    "Regalá una pausa con certificados digitales o impresos.": "Give someone a moment to pause with digital or printed certificates.",
    "VER OPCIONES ↗︎": "VIEW OPTIONS ↗︎",
    "02 AGO · NOVEDAD": "AUG 02 · NEW",
    "Nueva línea de cuidado facial.": "New facial care line.",
    "Productos pensados para hidratar la piel después del sol.": "Products designed to hydrate skin after sun exposure.",
    "CONOCER MÁS ↗︎": "LEARN MORE ↗︎",
    "VISITANOS": "VISIT US",
    "Nos vemos": "See you",
    "en Tamarindo.": "in Tamarindo.",
    "DIRECCIÓN": "ADDRESS",
    "Centro Comercial [Nombre]": "[Name] Shopping Center",
    "HORARIO GENERAL": "GENERAL HOURS",
    "Lun — Sáb · 9:00 — 19:00": "Mon — Sat · 9:00 — 19:00",
    "Dom · 10:00 — 16:00": "Sun · 10:00 — 16:00",
    "VER EN GOOGLE MAPS ↗︎": "VIEW ON GOOGLE MAPS ↗︎",
    "MAPA / UBICACIÓN": "MAP / LOCATION",
    "PURA VIDA, BIEN CUIDADA.": "PURA VIDA, BEAUTIFULLY CARED FOR.",
    "ODRY'S SPA · TAMARINDO": "ODRY'S SPA · TAMARINDO",
    "Volvé": "Come back",
    "a vos.": "to yourself.",
    "Un espacio sereno para hacer una pausa, recuperar energía y cuidar de tu cuerpo con intención.": "A serene space to pause, restore your energy and care for your body with intention.",
    "EXPLORAR TRATAMIENTOS ↓︎": "EXPLORE TREATMENTS ↓︎",
    "FOTOGRAFÍA PRINCIPAL DEL SPA": "MAIN SPA PHOTO",
    "AMBIENTE / CABINA / RITUAL": "ATMOSPHERE / TREATMENT ROOM / RITUAL",
    "RESPIRÁ": "BREATHE",
    "PROFUNDO": "DEEPLY",
    "NUESTRA FILOSOFÍA": "OUR PHILOSOPHY",
    "Tu bienestar": "Your well-being",
    "no es un lujo.": "is not a luxury.",
    "Cada tratamiento empieza escuchando lo que necesitás. Combinamos un ambiente tranquilo, productos seleccionados y atención personalizada para que el tiempo se sienta realmente tuyo.": "Every treatment begins by listening to what you need. We combine a peaceful atmosphere, carefully selected products and personalized care so the time truly feels like your own.",
    "NUESTRO TRABAJO": "OUR WORK",
    "Cuidado que se nota.": "Care you can see.",
    "Una muestra breve de tratamientos y resultados realizados por nuestro equipo. Estos espacios están preparados para incorporar fotografías reales del Spa.": "A brief look at treatments and results by our team. These spaces are ready for real Spa photography.",
    "FOTOGRAFÍA 01": "PHOTO 01",
    "FOTOGRAFÍA 02": "PHOTO 02",
    "FOTOGRAFÍA 03": "PHOTO 03",
    "MASAJE / RITUAL": "MASSAGE / RITUAL",
    "FACIAL / CUIDADO": "FACIAL / CARE",
    "MANOS / ACABADO": "HANDS / FINISH",
    "RITUAL CORPORAL": "BODY RITUAL",
    "RELAJACIÓN": "RELAXATION",
    "FACIAL TROPICAL": "TROPICAL FACIAL",
    "ANTES / DESPUÉS": "BEFORE / AFTER",
    "DETALLE FINAL": "FINAL DETAIL",
    "TRATAMIENTOS": "TREATMENTS",
    "Elegí tu momento.": "Choose your moment.",
    "Todos los botones abren WhatsApp con el servicio ya escrito. Solo falta confirmar el horario.": "Choose your treatments, add them to your request and send all the details through WhatsApp.",
    "Masaje relajante": "Relaxing massage",
    "Movimientos suaves para liberar tensión, descansar el cuerpo y bajar el ritmo.": "Gentle movements to release tension, rest the body and slow down.",
    "Masaje descontracturante": "Deep-tissue massage",
    "Trabajo focalizado para aliviar zonas cargadas y recuperar movilidad.": "Focused work to relieve tight areas and restore mobility.",
    "Facial tropical": "Tropical facial",
    "Limpieza e hidratación profunda pensadas para el clima de Guanacaste.": "Deep cleansing and hydration designed for Guanacaste's climate.",
    "Cuidado completo de manos y pies, hidratación y acabado a elección.": "Complete hand and foot care, hydration and your choice of finish.",
    "DESDE ₡00.000": "FROM ₡00,000",
    "RESERVAR POR WHATSAPP ↗︎": "BOOK VIA WHATSAPP ↗︎",
    "ARMA TU RESERVA": "BUILD YOUR BOOKING REQUEST",
    "Tu momento,": "Your moment,",
    "a tu manera.": "your way.",
    "Agregá uno o varios tratamientos desde el catálogo, ajustá las cantidades y completá tus datos. El total se calcula automáticamente.": "Add one or more treatments from the catalog, adjust quantities and enter your details. The total is calculated automatically.",
    "* Campos requeridos · Los demás están marcados como opcionales.": "* Required fields · All others are marked as optional.",
    "NOMBRE COMPLETO *": "FULL NAME *",
    "PERSONAS QUE ASISTIRÁN *": "NUMBER OF GUESTS *",
    "FECHA PREFERIDA *": "PREFERRED DATE *",
    "FRANJA HORARIA *": "PREFERRED TIME WINDOW *",
    "Seleccioná una opción": "Select an option",
    "Mañana · 9:00–12:00": "Morning · 9:00–12:00",
    "Mediodía · 12:00–15:00": "Midday · 12:00–15:00",
    "Tarde · 15:00–19:00": "Afternoon · 15:00–19:00",
    "Soy flexible": "I am flexible",
    "SEGUNDA FECHA": "SECOND DATE",
    "SEGUNDA FRANJA": "SECOND TIME WINDOW",
    "OPCIONAL": "OPTIONAL",
    "Sin segunda opción": "No second option",
    "COMODIDAD Y DISTRIBUCIÓN": "COMFORT AND SERVICE DETAILS",
    "Servicios seleccionados": "Selected services",
    "0 servicios": "0 services",
    "TOTAL ESTIMADO": "ESTIMATED TOTAL",
    "DURACIÓN REFERENCIAL": "ESTIMATED DURATION",
    "Esta es una solicitud de cita. El equipo confirmará fecha, hora y monto final por WhatsApp.": "This is a booking request. The team will confirm the date, time and final amount via WhatsApp.",
    "ENVIAR SOLICITUD POR WHATSAPP ↗︎": "SEND REQUEST VIA WHATSAPP ↗︎",
    "LO QUE DICEN": "WHAT GUESTS SAY",
    "Salieron más ligeras.": "They left feeling lighter.",
    "★★★★★ · 4.9 EN GOOGLE": "★★★★★ · 4.9 ON GOOGLE",
    "“El masaje fue exactamente lo que necesitaba después de varios días de viaje. El ambiente se siente tranquilo desde que entrás.”": "“The massage was exactly what I needed after several days of traveling. The atmosphere feels peaceful from the moment you walk in.”",
    "“Una atención súper cálida y detallista. Mi piel quedó hidratada y me explicaron cómo cuidarla durante las vacaciones.”": "“Such warm, thoughtful service. My skin felt hydrated, and they explained how to care for it during my vacation.”",
    "“Reservé por WhatsApp y fue facilísimo. El lugar es hermoso, limpio y muy relajante.”": "“I booked through WhatsApp and it was incredibly easy. The place is beautiful, clean and very relaxing.”",
    "MASAJE RELAJANTE": "RELAXING MASSAGE",
    "ANTES DE VENIR": "BEFORE YOU VISIT",
    "Tu visita,": "Your visit,",
    "sin complicaciones.": "made simple.",
    "¿CÓMO RESERVO?": "HOW DO I BOOK?",
    "Elegí un tratamiento y escribinos por WhatsApp. Te confirmamos disponibilidad y hora.": "Choose a treatment and message us on WhatsApp. We will confirm availability and time.",
    "¿QUÉ DEBO LLEVAR?": "WHAT SHOULD I BRING?",
    "Solo vení con ropa cómoda. Nosotros preparamos todo para tu tratamiento.": "Just wear comfortable clothing. We will prepare everything for your treatment.",
    "¿PUEDO REGALAR UNA SESIÓN?": "CAN I GIFT A SESSION?",
    "Sí. Consultanos por certificados de regalo digitales o impresos.": "Yes. Ask us about digital or printed gift certificates.",
    "TU MOMENTO TE ESPERA": "YOUR MOMENT IS WAITING",
    "Regalate una pausa.": "Give yourself a moment to pause.",
    "HABLAR CON EL SPA POR WHATSAPP ↗︎": "MESSAGE THE SPA ON WHATSAPP ↗︎",
    "ODRY'S BARBER SHOP · TAMARINDO": "ODRY'S BARBER SHOP · TAMARINDO",
    "Cortes con": "Haircuts with",
    "carácter.": "character.",
    "Técnica, detalle y buena conversación. Entrás como sos; salís en tu mejor versión.": "Technique, detail and good conversation. Come as you are; leave looking your best.",
    "VER SERVICIOS ↓︎": "VIEW SERVICES ↓︎",
    "FOTOGRAFÍA PRINCIPAL DE BARBERÍA": "MAIN BARBER SHOP PHOTO",
    "CORTE / SILLA / AMBIENTE": "HAIRCUT / CHAIR / ATMOSPHERE",
    "PRECISIÓN": "PRECISION",
    "ESTILO": "STYLE",
    "ACTITUD": "ATTITUDE",
    "NUESTRA MANERA": "OUR APPROACH",
    "Los detalles": "The details",
    "hacen el corte.": "make the cut.",
    "Nos tomamos el tiempo para entender tu estilo, trabajar cada línea y recomendarte un acabado que funcione también cuando salís de la silla.": "We take the time to understand your style, shape every line and recommend a finish that works even after you leave the chair.",
    "TRABAJO REAL": "REAL WORK",
    "Desde nuestra silla.": "From our chair.",
    "Un vistazo a cortes, perfiles y acabados realizados por nuestro equipo. Estas imágenes serán reemplazadas por fotografías reales del local.": "A look at haircuts, shaping and finishes by our team. These placeholders are ready for real photos from the shop.",
    "FADE / TEXTURA": "FADE / TEXTURE",
    "BARBA / PERFILADO": "BEARD / SHAPING",
    "CORTE / ACABADO": "HAIRCUT / FINISH",
    "FADE CLÁSICO": "CLASSIC FADE",
    "BARBA DEFINIDA": "SHAPED BEARD",
    "TOALLA CALIENTE": "HOT TOWEL",
    "ESTILO PERSONALIZADO": "PERSONALIZED STYLE",
    "LA CARTA": "SERVICE MENU",
    "Elegí tu servicio.": "Choose your service.",
    "Reservá por WhatsApp con un mensaje listo para cada servicio. Rápido, directo y sin formularios.": "Add your services, enter your details and send one clear booking request through WhatsApp.",
    "Consulta, corte personalizado, lavado y acabado con producto.": "Consultation, personalized haircut, wash and product finish.",
    "Fade & diseño": "Fade & design",
    "Degradado de precisión y detalles personalizados para un acabado definido.": "Precision fade and personalized details for a sharp finish.",
    "Toalla caliente, contorno preciso, hidratación y producto final.": "Hot towel, precise shaping, hydration and finishing product.",
    "Corte, barba y el tiempo necesario para dejar cada detalle impecable.": "Haircut, beard care and the time needed to make every detail flawless.",
    "Elegí el look.": "Choose the look.",
    "Nosotros ponemos la técnica.": "We bring the technique.",
    "Agregá servicios desde la carta, elegí las cantidades y completá los datos de la visita. Vas a ver el total antes de enviarnos el mensaje.": "Add services from the menu, choose the quantities and enter the visit details. You will see the total before sending your message.",
    "ESTILO Y DISTRIBUCIÓN": "STYLE AND SERVICE DETAILS",
    "DESDE LA SILLA": "FROM THE CHAIR",
    "La gente vuelve.": "People come back.",
    "“Excelente corte y muy buen ambiente. Entendieron exactamente lo que quería y el resultado quedó perfecto.”": "“Excellent haircut and a great atmosphere. They understood exactly what I wanted, and the result was perfect.”",
    "“La atención al detalle en la barba fue increíble. Se nota la experiencia y el cuidado en cada paso.”": "“The attention to detail on my beard was incredible. You can see the experience and care in every step.”",
    "“Reservé por WhatsApp estando de vacaciones. Me respondieron rápido y salí con un corte buenísimo.”": "“I booked through WhatsApp while on vacation. They replied quickly, and I left with a great haircut.”",
    "CORTE CLÁSICO": "CLASSIC HAIRCUT",
    "BARBA & PERFILADO": "BEARD TRIM & SHAPING",
    "COMBO COMPLETO": "FULL COMBO",
    "Todo claro,": "Everything is clear,",
    "desde el inicio.": "from the start.",
    "¿TRABAJAN CON CITA?": "DO I NEED AN APPOINTMENT?",
    "Recomendamos reservar para asegurar tu espacio, aunque podés consultar disponibilidad del día.": "We recommend booking to secure your spot, although you can ask about same-day availability.",
    "¿PUEDO MOSTRAR UNA REFERENCIA?": "CAN I SHOW A REFERENCE PHOTO?",
    "Claro. Traé una foto y conversamos sobre cómo adaptarla a tu cabello y estilo.": "Of course. Bring a photo, and we will discuss how to adapt it to your hair and style.",
    "¿ATIENDEN NIÑOS?": "DO YOU SERVE CHILDREN?",
    "Sí. Consultanos por edades, disponibilidad y duración aproximada.": "Yes. Ask us about ages, availability and approximate duration.",
    "TU PRÓXIMO CORTE": "YOUR NEXT HAIRCUT",
    "Sentate. Nosotros": "Take a seat. We will",
    "hacemos el resto.": "handle the rest.",
    "HABLAR CON BARBERÍA POR WHATSAPP ↗︎": "MESSAGE THE BARBER SHOP ON WHATSAPP ↗︎",
    "LUN — SÁB · 9:00 — 19:00": "MON — SAT · 9:00 — 19:00",
    "DOM · 10:00 — 16:00": "SUN · 10:00 — 16:00"
  };

  const attributeTranslations = {
    "Abrir menú": "Open menu",
    "Filtrar novedades por negocio": "Filter news by business",
    "Nombre y apellidos": "Full name",
    "Ej.: Ana desea facial, María masaje. También podés indicarnos algo que debamos considerar para tu comodidad.": "Example: Ana would like a facial and Maria a massage. You can also tell us anything we should consider for your comfort.",
    "Ej.: Carlos desea corte clásico, Diego barba. Podrás enviarnos una foto de referencia al abrir WhatsApp.": "Example: Carlos would like a classic haircut and Diego a beard trim. You can send us a reference photo after opening WhatsApp."
  };

  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return /\S/.test(node.nodeValue) && !["SCRIPT", "STYLE"].includes(node.parentElement.tagName)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  });
  while (walker.nextNode()) textNodes.push({ node: walker.currentNode, es: walker.currentNode.nodeValue });

  const attributes = [];
  document.querySelectorAll("[placeholder],[aria-label]").forEach((element) => {
    ["placeholder", "aria-label"].forEach((name) => {
      if (element.hasAttribute(name)) attributes.push({ element, name, es: element.getAttribute(name) });
    });
  });

  const localizedElements = [...document.querySelectorAll("[data-es][data-en]")];
  const localizedPlaceholders = [...document.querySelectorAll("[data-placeholder-es][data-placeholder-en]")];

  const originalTitle = document.title;
  const englishTitles = {
    "Odry's | Spa & Barbería en Tamarindo": "Odry's | Spa & Barber Shop in Tamarindo",
    "Odry's | Beauty Spa & Barber en Tamarindo": "Odry's | Beauty Spa & Barber in Tamarindo",
    "Odry's Spa | Tamarindo": "Odry's Spa | Tamarindo",
    "Odry's Barber Shop | Tamarindo": "Odry's Barber Shop | Tamarindo",
    "Odry's Barbería & Estilismo | Tamarindo": "Odry's Barbering & Hair Styling | Tamarindo",
    "Odry's Beauty Spa | Tamarindo": "Odry's Beauty Spa | Tamarindo"
  };

  const header = document.querySelector(".site-header");
  const cta = header && header.querySelector(".header-cta");
  const actions = document.createElement("div");
  actions.className = "header-actions";
  if (header && cta) {
    header.insertBefore(actions, cta);
    actions.appendChild(cta);
  }

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "language-toggle";
  toggle.setAttribute("aria-label", "Cambiar idioma a inglés");
  toggle.setAttribute("aria-pressed", "false");
  toggle.innerHTML = '<span>ES</span><span>EN</span><i aria-hidden="true"></i>';
  actions.appendChild(toggle);

  const whatsappLinks = [...document.querySelectorAll('a[href*="wa.me/"]')].map((link) => ({ link, es: link.href }));

  function preferredLanguage() {
    try { return localStorage.getItem("odrys-language") === "en" ? "en" : "es"; }
    catch (_) { return "es"; }
  }

  function translateText(source, language) {
    if (language === "es") return source;
    const key = source.trim();
    return translations[key] ? source.replace(key, translations[key]) : source;
  }

  function applyLanguage(language, announce) {
    const english = language === "en";
    document.documentElement.lang = language;
    document.title = english ? (englishTitles[originalTitle] || originalTitle) : originalTitle;
    textNodes.forEach(({ node, es }) => { node.nodeValue = translateText(es, language); });
    attributes.forEach(({ element, name, es }) => {
      element.setAttribute(name, english && attributeTranslations[es] ? attributeTranslations[es] : es);
    });
    localizedElements.forEach((element) => {
      element.textContent = english ? element.dataset.en : element.dataset.es;
    });
    localizedPlaceholders.forEach((element) => {
      element.setAttribute("placeholder", english ? element.dataset.placeholderEn : element.dataset.placeholderEs);
    });
    toggle.classList.toggle("is-english", english);
    toggle.setAttribute("aria-pressed", String(english));
    toggle.setAttribute("aria-label", english ? "Switch language to Spanish" : "Cambiar idioma a inglés");

    whatsappLinks.forEach(({ link, es }) => {
      if (!english) { link.href = es; return; }
      const business = document.body.classList.contains("spa-page")
        ? "Odry's Beauty Spa"
        : document.body.classList.contains("barber-page")
          ? "Odry's Barbering & Hair Styling"
          : "Odry's Beauty Spa & Barber";
      const message = `Hello, I would like information about booking at ${business}.`;
      link.href = `https://wa.me/50662180804?text=${encodeURIComponent(message)}`;
    });

    try { localStorage.setItem("odrys-language", language); } catch (_) {}
    if (announce) window.dispatchEvent(new CustomEvent("odrys:languagechange", { detail: { language } }));
  }

  toggle.addEventListener("click", () => applyLanguage(document.documentElement.lang === "en" ? "es" : "en", true));
  applyLanguage(preferredLanguage(), false);
})();
