(async () => {
  const form = document.querySelector("#reservation-form");
  if (!form) return;

  const config = window.ODRYS_CONFIG ?? {};
  const phone = config.whatsapp ?? "50662180804";
  const zonaDeLaPaginaTmp = document.body.classList.contains("spa-page") ? "spa" : "barberia";

  // -------------------------------------------------------------------------
  // Catálogo servido desde la base
  // -------------------------------------------------------------------------
  // El HTML trae el catálogo escrito a mano. Sirve como respaldo: si la base no
  // responde, la clienta igual ve los servicios y la página conserva su
  // contenido para los buscadores. Si la base sí responde, se reemplaza, y así
  // un servicio creado desde el panel aparece sin tocar el HTML.
  let clienteTemprano = null;
  async function obtenerClienteTemprano() {
    if (clienteTemprano) return clienteTemprano;
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    clienteTemprano = createClient(config.supabaseUrl, config.supabaseKey);
    return clienteTemprano;
  }

  const idiomaActual = () => (document.documentElement.lang === "en" ? "en" : "es");
  const textoSegunIdioma = (es, en) => (idiomaActual() === "en" ? (en || es) : es);

  const esc = (valor) => String(valor ?? "").replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[c]));

  // Moneda: se define antes que el catálogo porque las tarjetas ya salen
  // impresas en la moneda elegida. Los precios se guardan siempre en dólares;
  // los colones son una conversión con el tipo de cambio del negocio.
  let moneda = (() => {
    try { return localStorage.getItem("odrys-moneda") === "CRC" ? "CRC" : "USD"; }
    catch (_) { return "USD"; }
  })();
  let tipoCambio = 520;

  // Versión del texto de privacidad que la persona acepta al reservar. Se
  // guarda junto con la cita. Hay que subirla cada vez que cambie el contenido
  // de privacidad.html, o el registro diría que aceptó algo que ya no existe.
  const VERSION_PRIVACIDAD = "2026-08-18";

  const money = (amount, currency = "USD") => {
    if (moneda === "CRC" && currency === "USD") {
      return `₡${new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(Math.round(amount * tipoCambio))}`;
    }
    return new Intl.NumberFormat(idiomaActual() === "en" ? "en-US" : "es-CR", {
      style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount);
  };

  function dibujarCatalogo(servicios) {
    const seccion = document.querySelector("#servicios");
    if (!seccion || !servicios.length) return false;

    const grupos = new Map();
    servicios.forEach((s) => {
      const clave = `${s.orden_grupo}|${s.grupo_es ?? ""}`;
      if (!grupos.has(clave)) grupos.set(clave, { es: s.grupo_es, en: s.grupo_en, items: [] });
      grupos.get(clave).items.push(s);
    });

    let indice = 0;
    const html = [...grupos.entries()]
      .sort((a, b) => Number(a[0].split("|")[0]) - Number(b[0].split("|")[0]))
      .map(([, grupo]) => {
        const tarjetas = grupo.items.sort((a, b) => a.orden - b.orden).map((s) => {
          indice += 1;
          const precio = s.price === null || s.price === undefined ? null : Number(s.price);
          const nombreEn = s.name_en || s.name_es;
          const descEn = s.description_en || s.description_es;

          const meta = precio === null
            ? `<strong data-es="PRECIO POR CONFIRMAR" data-en="PRICE TO CONFIRM">${esc(textoSegunIdioma("PRECIO POR CONFIRMAR", "PRICE TO CONFIRM"))}</strong>`
            : `<span>${s.duration_minutes} MIN</span><strong>${s.precio_desde ? textoSegunIdioma("desde", "from") + " " : ""}${money(precio, s.currency || "USD")}</strong>`;

          const descripcion = s.description_es
            ? `<p data-es="${esc(s.description_es)}" data-en="${esc(descEn)}">${esc(textoSegunIdioma(s.description_es, descEn))}</p>`
            : "";

          return `<article class="catalog-card" data-service-es="${esc(s.name_es)}" data-service-en="${esc(nombreEn)}"`
            + (precio === null ? "" : ` data-price="${precio}" data-currency="${esc(s.currency || "USD")}"`)
            + (s.precio_desde ? ` data-price-from="1"` : "")
            + ` data-duration="${s.duration_minutes}">`
            + `<span class="service-index">${String(indice).padStart(2, "0")}</span>`
            + `<div><h3 data-es="${esc(s.name_es)}" data-en="${esc(nombreEn)}">${esc(textoSegunIdioma(s.name_es, nombreEn))}</h3>${descripcion}</div>`
            + `<div class="catalog-meta">${meta}</div>`
            + `<a href="#reserva">AGREGAR</a></article>`;
        }).join("");

        const tituloEn = grupo.en || grupo.es;
        return `<details class="service-group" open>`
          + `<summary><span data-es="${esc(grupo.es)}" data-en="${esc(tituloEn)}">${esc(textoSegunIdioma(grupo.es, tituloEn))}</span>`
          + `<b>${grupo.items.length} <span data-es="SERVICIOS" data-en="SERVICES">${esc(textoSegunIdioma("SERVICIOS", "SERVICES"))}</span></b></summary>`
          + `<div class="catalog-grid compact-catalog">${tarjetas}</div></details>`;
      }).join("");

    seccion.querySelectorAll("details.service-group").forEach((d) => d.remove());
    seccion.insertAdjacentHTML("beforeend", html);
    return true;
  }

  // idioma.js fotografía los elementos traducibles al cargar, así que no ve las
  // tarjetas creadas después. Se traducen acá.
  function retraducirCatalogo() {
    document.querySelectorAll("#servicios [data-es][data-en]").forEach((nodo) => {
      nodo.textContent = idiomaActual() === "en" ? nodo.dataset.en : nodo.dataset.es;
    });
  }

  let catalogoDinamico = false;
  try {
    const sb = await obtenerClienteTemprano();
    // El tipo de cambio se pide junto con el catálogo para que las tarjetas
    // salgan ya correctas si la persona venía viendo colones.
    const [serviciosRes, ajustesRes] = await Promise.all([
      sb.from("services")
        .select("id,category,name_es,name_en,description_es,description_en,price,precio_desde,currency,duration_minutes,grupo_es,grupo_en,orden_grupo,orden")
        .eq("active", true).eq("category", zonaDeLaPaginaTmp)
        .order("orden_grupo").order("orden"),
      sb.from("ajustes").select("tipo_cambio").eq("id", true).single(),
    ]);
    if (serviciosRes.error) throw serviciosRes.error;
    if (ajustesRes.data?.tipo_cambio) tipoCambio = Number(ajustesRes.data.tipo_cambio);
    catalogoDinamico = dibujarCatalogo(serviciosRes.data ?? []);
  } catch (problema) {
    console.warn("[Odry's] Catálogo desde la base no disponible; se usa el del HTML.", problema);
  }

  const cards = [...document.querySelectorAll(".catalog-card")];
  const itemsContainer = document.querySelector("#cart-items");
  const countElement = document.querySelector("#cart-count");
  const totalElement = document.querySelector("#cart-total");
  const durationElement = document.querySelector("#cart-duration");
  const errorElement = document.querySelector("#cart-error");
  const bookingSection = document.querySelector("#reserva");
  const servicesSection = document.querySelector("#servicios");
  const campoProfesional = document.querySelector("#campo-profesional");
  const campoHora = document.querySelector("#campo-hora");
  const campoFecha = document.querySelector("#campo-fecha");
  const cart = new Map();
  const language = () => document.documentElement.lang === "en" ? "en" : "es";
  // Cada página atiende a una zona del negocio: la barbería no debe ofrecer
  // masajistas ni el spa barberos, aunque alguien cubriera ambos catálogos.
  const zonaDeLaPagina = document.body.classList.contains("spa-page") ? "spa" : "barberia";
  const business = document.body.classList.contains("spa-page")
    ? { es: "Odry's Beauty Spa", en: "Odry's Beauty Spa" }
    : { es: "Odry's Barbería y Estilismo", en: "Odry's Barbering & Hair Styling" };

  const copy = {
    es: {
      add: "AGREGAR +", added: "AGREGADO ✓", empty: "Agregue servicios desde el catálogo para comenzar.",
      service: "servicio", services: "servicios", perService: "por servicio", quantity: "Cantidad de", minus: "Quitar uno", plus: "Agregar uno",
      confirmPrice: "Precio por confirmar", confirmDuration: "Duración por confirmar", plusConfirm: "+ por confirmar", toConfirm: "Por confirmar", desde: "desde",
      view: "VER RESERVA", viewRequest: "Ver reserva", error: "Agregue al menos un servicio antes de reservar.",
      request: "RESERVA CONFIRMADA", client: "Cliente", people: "Personas", selected: "Servicios",
      total: "Total estimado", duration: "Duración", withPro: "Profesional", dateTime: "Fecha y hora",
      comments: "Detalles", booked: "Cita confirmada. Te esperamos.",
      // Estados de los desplegables
      pickServices: "Primero agregue servicios", pickPro: "Elija un profesional",
      pickDate: "Elija profesional y fecha", loading: "Buscando horas libres…",
      noPro: "Ningún profesional cubre esa combinación", noSlots: "Sin horas libres ese día",
      chooseP: "Seleccione", chooseH: "Seleccione una hora",
      // Mensajes
      sending: "RESERVANDO…", submit: "CONFIRMAR RESERVA",
      offline: "No pudimos conectar con el sistema de reservas. Escribinos por WhatsApp.",
      needPro: "Elija un profesional.", needHora: "Elija una hora disponible.",
      okTitle: "¡Listo! Su cita quedó reservada.",
      okBody: "Le enviamos la confirmación por correo. Abrimos WhatsApp para que tenga el detalle a mano.",
      okAgain: "HACER OTRA RESERVA",
      splitPro: "Ese profesional no cubre todos los servicios elegidos. Reserve por separado o elija otro."
    },
    en: {
      add: "ADD +", added: "ADDED ✓", empty: "Add services from the menu to get started.",
      service: "service", services: "services", perService: "per service", quantity: "Quantity of", minus: "Remove one", plus: "Add one",
      confirmPrice: "Price to confirm", confirmDuration: "Duration to confirm", plusConfirm: "+ to confirm", toConfirm: "To confirm", desde: "from",
      view: "VIEW BOOKING", viewRequest: "View booking", error: "Add at least one service before booking.",
      request: "BOOKING CONFIRMED", client: "Guest", people: "Number of guests", selected: "Services",
      total: "Estimated total", duration: "Duration", withPro: "Professional", dateTime: "Date and time",
      comments: "Details", booked: "Appointment confirmed. See you soon.",
      pickServices: "Add services first", pickPro: "Choose a professional",
      pickDate: "Choose professional and date", loading: "Looking for open times…",
      noPro: "No professional covers that combination", noSlots: "No open times that day",
      chooseP: "Select", chooseH: "Select a time",
      sending: "BOOKING…", submit: "CONFIRM BOOKING",
      offline: "We could not reach the booking system. Please contact us on WhatsApp.",
      needPro: "Choose a professional.", needHora: "Choose an available time.",
      okTitle: "Done! Your appointment is booked.",
      okBody: "We sent you a confirmation by email. We are opening WhatsApp so you have the details handy.",
      okAgain: "MAKE ANOTHER BOOKING",
      splitPro: "That professional does not cover every selected service. Book separately or choose another."
    }
  };

  const services = cards.map((card, index) => {
    const rawPrice = card.dataset.price;
    const rawDuration = card.dataset.duration;
    return {
      index,
      card,
      // Se completa al cruzar con el catálogo de la base de datos.
      remoteId: null,
      name: {
        es: card.dataset.serviceEs || card.querySelector("h3")?.dataset.es || card.querySelector("h3")?.textContent.trim() || `Servicio ${index + 1}`,
        en: card.dataset.serviceEn || card.querySelector("h3")?.dataset.en || card.querySelector("h3")?.textContent.trim() || `Service ${index + 1}`
      },
      price: rawPrice !== undefined && rawPrice !== "" && Number.isFinite(Number(rawPrice)) ? Number(rawPrice) : null,
      currency: card.dataset.currency || "USD",
      // "desde": el monto es un piso, no el precio final.
      priceFrom: card.dataset.priceFrom === "1",
      duration: rawDuration !== undefined && rawDuration !== "" && Number.isFinite(Number(rawDuration)) ? Number(rawDuration) : null
    };
  });

  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);


  const formatDuration = (minutes) => {
    if (!minutes) return "0 min";
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (!hours) return `${rest} min`;
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  };

  const formatDateTime = (iso) => new Intl.DateTimeFormat(language() === "en" ? "en-US" : "es-CR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: config.zonaHoraria ?? "America/Costa_Rica"
  }).format(new Date(iso));

  const formatHour = (iso) => new Intl.DateTimeFormat(language() === "en" ? "en-US" : "es-CR", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: config.zonaHoraria ?? "America/Costa_Rica"
  }).format(new Date(iso));

  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];
  form.querySelectorAll('input[type="date"]').forEach((input) => { input.min = localToday; });

  const dock = document.createElement("button");
  dock.type = "button";
  dock.className = "mobile-cart-dock";
  dock.innerHTML = '<span><b id="mobile-cart-count"></b><small></small></span><strong id="mobile-cart-total"></strong>';
  document.body.appendChild(dock);
  const mobileCount = dock.querySelector("#mobile-cart-count");
  const mobileTotal = dock.querySelector("#mobile-cart-total");
  dock.addEventListener("click", () => bookingSection?.scrollIntoView({ behavior: "smooth", block: "start" }));

  // --- Conmutador de moneda, junto al de idioma en el encabezado -----------
  const conmutadorMoneda = document.createElement("button");
  conmutadorMoneda.type = "button";
  conmutadorMoneda.className = "currency-toggle";
  conmutadorMoneda.innerHTML = '<span>USD</span><span>₡</span><i aria-hidden="true"></i>';

  function reflejarMoneda() {
    const enColones = moneda === "CRC";
    conmutadorMoneda.classList.toggle("is-colones", enColones);
    conmutadorMoneda.setAttribute("aria-pressed", String(enColones));
    conmutadorMoneda.setAttribute("aria-label", enColones
      ? "Mostrar precios en dólares" : "Mostrar precios en colones");
  }

  function pintarPreciosDelCatalogo() {
    services.forEach((servicio) => {
      const etiqueta = servicio.card.querySelector(".catalog-meta strong");
      // Se vuelve a anteponer "desde": esta función reescribe el texto completo
      // al cambiar de moneda, y sin esto borraría la palabra que puso
      // dibujarCatalogo, dejando anunciado un precio cerrado que no lo es.
      if (etiqueta && servicio.price !== null) {
        const desde = servicio.priceFrom ? textoSegunIdioma("desde", "from") + " " : "";
        etiqueta.textContent = desde + money(servicio.price, servicio.currency);
      }
    });
  }

  conmutadorMoneda.addEventListener("click", () => {
    moneda = moneda === "USD" ? "CRC" : "USD";
    try { localStorage.setItem("odrys-moneda", moneda); } catch (_) { /* modo privado */ }
    reflejarMoneda();
    pintarPreciosDelCatalogo();
    renderCart();
  });

  // idioma.js crea .header-actions al arrancar; si aún no existe, se espera.
  (function colocarConmutador(intentos = 0) {
    const acciones = document.querySelector(".header-actions");
    if (acciones) { acciones.appendChild(conmutadorMoneda); reflejarMoneda(); return; }
    if (intentos < 20) setTimeout(() => colocarConmutador(intentos + 1), 100);
  })();

  const buttonFor = (service) => service.card.querySelector("a[href='#reserva'], .add-service");
  const setButtonLabel = (service, added = false) => {
    const button = buttonFor(service);
    if (!button) return;
    button.classList.add("add-service");
    button.textContent = copy[language()][added ? "added" : "add"];
    button.setAttribute("role", "button");
    button.setAttribute("aria-label", `${copy[language()].add} ${service.name[language()]}`);
  };

  services.forEach((service) => {
    const button = buttonFor(service);
    if (!button) return;
    setButtonLabel(service);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const item = cart.get(service.index);
      if (item) item.quantity += 1;
      else cart.set(service.index, { ...service, quantity: 1 });
      setButtonLabel(service, true);
      window.setTimeout(() => setButtonLabel(service), 850);
      errorElement.textContent = "";
      renderCart();
    });
  });

  const itemsEnCarrito = () => [...cart.values()].filter((item) => item.quantity > 0);

  const totalsFor = (items) => {
    const knownPriceItems = items.filter((item) => item.price !== null);
    const knownDurationItems = items.filter((item) => item.duration !== null);
    const price = knownPriceItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const duration = knownDurationItems.reduce((sum, item) => sum + item.duration * item.quantity, 0);
    return {
      price, duration,
      currency: knownPriceItems[0]?.currency || "USD",
      unknownPrice: items.some((item) => item.price === null),
      // Si un solo servicio es "desde", el total deja de ser exacto.
      priceFrom: items.some((item) => item.priceFrom),
      unknownDuration: items.some((item) => item.duration === null)
    };
  };

  const totalLabel = (totals) => {
    const labels = copy[language()];
    if (totals.unknownPrice && totals.price === 0) return labels.toConfirm;
    if (totals.unknownPrice) return `${money(totals.price, totals.currency)} ${labels.plusConfirm}`;
    if (totals.priceFrom) return `${labels.desde} ${money(totals.price, totals.currency)}`;
    return money(totals.price, totals.currency);
  };

  const durationLabel = (totals) => {
    const labels = copy[language()];
    if (totals.unknownDuration && totals.duration === 0) return labels.toConfirm;
    if (totals.unknownDuration) return `${formatDuration(totals.duration)} ${labels.plusConfirm}`;
    return formatDuration(totals.duration);
  };

  // -------------------------------------------------------------------------
  // Conexión con Supabase
  // -------------------------------------------------------------------------
  const catalogo = { listo: false, error: false, porNombre: new Map(), empleados: [], porEmpleado: new Map() };
  let cliente = null;

  // Se reutiliza el cliente que ya se creó para dibujar el catálogo: dos
  // instancias sobre el mismo almacenamiento se pisan entre sí.
  async function obtenerCliente() {
    if (cliente) return cliente;
    cliente = await obtenerClienteTemprano();
    return cliente;
  }

  // Cruza las tarjetas del HTML con el catálogo real de la base usando el
  // nombre en español como llave. Así los precios y duraciones siguen siendo
  // editables desde el panel sin tocar el HTML.
  async function cargarCatalogo() {
    try {
      const sb = await obtenerCliente();
      const [serviciosRes, empleadosRes, asignacionesRes] = await Promise.all([
        sb.from("services").select("id,name_es,price,duration_minutes,active").eq("active", true),
        sb.from("employees_publicos").select("id,full_name,role,zones"),
        sb.from("employee_services").select("employee_id,service_id")
      ]);

      if (serviciosRes.error || empleadosRes.error || asignacionesRes.error) throw new Error("consulta fallida");

      serviciosRes.data.forEach((s) => catalogo.porNombre.set(s.name_es, s));
      // La lista se arma en cada carga de página, así que un profesional nuevo
      // aparece solo en cuanto confirma su correo y se le asignan servicios.
      catalogo.empleados = (empleadosRes.data ?? [])
        .filter((empleado) => (empleado.zones ?? []).includes(zonaDeLaPagina));
      asignacionesRes.data.forEach(({ employee_id, service_id }) => {
        if (!catalogo.porEmpleado.has(employee_id)) catalogo.porEmpleado.set(employee_id, new Set());
        catalogo.porEmpleado.get(employee_id).add(service_id);
      });

      services.forEach((servicio) => {
        const remoto = catalogo.porNombre.get(servicio.name.es);
        if (!remoto) {
          console.warn("[Odry's] Servicio del sitio sin equivalente en la base:", servicio.name.es);
          return;
        }
        servicio.remoteId = remoto.id;
        // La base manda: si allí cambian el precio o la duración, se refleja.
        if (remoto.price !== null) servicio.price = Number(remoto.price);
        if (remoto.duration_minutes) servicio.duration = Number(remoto.duration_minutes);
      });

      catalogo.listo = true;
      // Con el tipo de cambio real ya cargado, se repintan las etiquetas del
      // catálogo por si la persona venía con los colones seleccionados.
      pintarPreciosDelCatalogo();
    } catch (problema) {
      console.error("[Odry's] No se pudo cargar el catálogo:", problema);
      catalogo.error = true;
    }
    renderCart();
  }

  const opcion = (valor, texto, deshabilitada = false) => {
    const o = document.createElement("option");
    o.value = valor;
    o.textContent = texto;
    if (deshabilitada) o.disabled = true;
    return o;
  };

  // Solo se ofrece a quien pueda hacer TODOS los servicios del carrito: así la
  // cita queda con una sola persona de principio a fin.
  function profesionalesElegibles(items) {
    const requeridos = items.map((i) => i.remoteId).filter(Boolean);
    if (!requeridos.length) return [];
    return catalogo.empleados.filter((empleado) => {
      const suyos = catalogo.porEmpleado.get(empleado.id);
      return suyos && requeridos.every((id) => suyos.has(id));
    });
  }

  function actualizarProfesionales() {
    if (!campoProfesional) return;
    const labels = copy[language()];
    const previo = campoProfesional.value;
    const items = itemsEnCarrito();
    campoProfesional.replaceChildren();

    if (catalogo.error) {
      campoProfesional.append(opcion("", labels.offline, true));
      return;
    }
    if (!items.length || !catalogo.listo) {
      campoProfesional.append(opcion("", labels.pickServices, true));
      actualizarHoras();
      return;
    }

    const elegibles = profesionalesElegibles(items);
    if (!elegibles.length) {
      campoProfesional.append(opcion("", labels.noPro, true));
      actualizarHoras();
      return;
    }

    campoProfesional.append(opcion("", labels.chooseP, true));
    elegibles.forEach((empleado) => {
      // "administrador" es un rol del sistema, no una especialidad: mostrarlo
      // a la clienta no aporta nada, así que en ese caso solo va el nombre.
      const etiqueta = empleado.role === "administrador"
        ? empleado.full_name
        : `${empleado.full_name} · ${empleado.role}`;
      campoProfesional.append(opcion(empleado.id, etiqueta));
    });
    if (elegibles.some((e) => e.id === previo)) campoProfesional.value = previo;
    actualizarHoras();
  }

  let peticionHoras = 0;
  async function actualizarHoras() {
    if (!campoHora) return;
    const labels = copy[language()];
    const empleado = campoProfesional?.value;
    const fecha = campoFecha?.value;
    const items = itemsEnCarrito();
    const totales = totalsFor(items);

    campoHora.replaceChildren();
    if (!empleado || !fecha || !items.length) {
      campoHora.append(opcion("", labels.pickDate, true));
      return;
    }

    campoHora.append(opcion("", labels.loading, true));
    const marca = ++peticionHoras;

    try {
      const sb = await obtenerCliente();
      const { data, error } = await sb.rpc("get_available_slots", {
        p_employee_id: empleado,
        p_date: fecha,
        p_duration_minutes: Math.max(totales.duration, 15),
        p_step_minutes: config.pasoMinutos ?? 15
      });
      // Descarta respuestas de consultas que ya quedaron obsoletas.
      if (marca !== peticionHoras) return;
      if (error) throw error;

      campoHora.replaceChildren();
      if (!data || !data.length) {
        campoHora.append(opcion("", labels.noSlots, true));
        return;
      }
      campoHora.append(opcion("", labels.chooseH, true));
      data.forEach((fila) => {
        const iso = typeof fila === "string" ? fila : fila.slot;
        campoHora.append(opcion(iso, formatHour(iso)));
      });
    } catch (problema) {
      if (marca !== peticionHoras) return;
      console.error("[Odry's] No se pudieron cargar las horas:", problema);
      campoHora.replaceChildren();
      campoHora.append(opcion("", labels.offline, true));
    }
  }

  campoProfesional?.addEventListener("change", actualizarHoras);
  campoFecha?.addEventListener("change", actualizarHoras);

  function renderCart() {
    const lang = language();
    const labels = copy[lang];
    const items = itemsEnCarrito();
    if (!items.length) {
      itemsContainer.innerHTML = `<p class="empty-cart">${labels.empty}</p>`;
    } else {
      itemsContainer.innerHTML = items.map((item) => {
        const name = escapeHtml(item.name[lang]);
        const desde = item.priceFrom ? labels.desde + " " : "";
        const unitPrice = item.price === null ? labels.confirmPrice : desde + money(item.price, item.currency);
        const unitDuration = item.duration === null ? labels.confirmDuration : `${item.duration} min ${labels.perService}`;
        const linePrice = item.price === null ? labels.toConfirm : desde + money(item.price * item.quantity, item.currency);
        return `<div class="cart-item"><div><strong>${name}</strong><small>${unitPrice} · ${unitDuration}</small></div><div class="quantity-control" aria-label="${labels.quantity} ${name}"><button type="button" data-action="minus" data-index="${item.index}" aria-label="${labels.minus}">−</button><span>${item.quantity}</span><button type="button" data-action="plus" data-index="${item.index}" aria-label="${labels.plus}">+</button></div><b>${linePrice}</b></div>`;
      }).join("");
    }

    const totals = totalsFor(items);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const countLabel = `${count} ${count === 1 ? labels.service : labels.services}`;
    const displayedTotal = totalLabel(totals);
    totalElement.textContent = items.length ? displayedTotal : (services.some((service) => service.price !== null) ? money(0) : labels.toConfirm);
    durationElement.textContent = items.length ? durationLabel(totals) : (services.some((service) => service.duration !== null) ? "0 min" : labels.toConfirm);
    countElement.textContent = countLabel;
    mobileCount.textContent = countLabel;
    mobileTotal.textContent = displayedTotal;
    dock.querySelector("small").textContent = labels.view;
    dock.setAttribute("aria-label", labels.viewRequest);
    dock.classList.toggle("has-items", count > 0);

    // El precio real está en dólares; en colones es una referencia al cambio
    // del día. Decirlo evita un reclamo en caja por unos cientos de colones.
    const aviso = totalElement.closest(".booking-total")?.querySelector("small");
    if (aviso) {
      let nota = aviso.parentElement.querySelector(".nota-moneda");
      if (moneda === "CRC") {
        if (!nota) {
          nota = document.createElement("small");
          nota.className = "nota-moneda";
          aviso.after(nota);
        }
        nota.textContent = lang === "en"
          ? `Colón amounts are a reference at ₡${tipoCambio} per dollar. Prices are set in US dollars.`
          : `El monto en colones es referencial, a ₡${tipoCambio} por dólar. Los precios están fijados en dólares.`;
      } else if (nota) {
        nota.remove();
      }
    }

    actualizarProfesionales();
  }

  itemsContainer.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const item = cart.get(Number(button.dataset.index));
    if (!item) return;
    item.quantity += button.dataset.action === "plus" ? 1 : -1;
    if (item.quantity <= 0) cart.delete(item.index);
    renderCart();
  });

  async function enviarCorreoDeConfirmacion(sb, idCita) {
    if (!idCita) return;
    try {
      const { error } = await sb.functions.invoke("send-confirmation-email", {
        body: { appointment_id: idCita },
      });
      if (error) console.warn("[Odry's] No se pudo enviar el correo de confirmación:", error);
    } catch (problema) {
      console.warn("[Odry's] Falló el envío del correo de confirmación:", problema);
    }
  }

  function mensajeWhatsapp(datos) {
    const lang = language();
    const labels = copy[lang];
    const lineas = datos.items.map((item) => {
      const precio = item.price === null ? labels.confirmPrice : money(item.price * item.quantity, item.currency);
      return `• ${item.quantity} × ${item.name[lang]} — ${precio}`;
    }).join("\n");

    return [
      `${labels.request} — ${business[lang].toUpperCase()}`, "",
      `${labels.client}: ${datos.nombre}`,
      `${labels.people}: ${datos.personas}`,
      `${labels.withPro}: ${datos.profesional}`,
      `${labels.dateTime}: ${formatDateTime(datos.inicio)}`, "",
      `${labels.selected}:`, lineas, "",
      `${labels.total}: ${totalLabel(datos.totales)}`,
      `${labels.duration}: ${durationLabel(datos.totales)}`,
      datos.comentarios ? `\n${labels.comments}: ${datos.comentarios}` : "", "",
      labels.booked
    ].filter((line, index, lines) => line !== "" || lines[index - 1] !== "").join("\n");
  }

  function mostrarExito(datos) {
    const labels = copy[language()];
    const panel = document.createElement("div");
    panel.className = "booking-success";
    panel.innerHTML = `<h3>${escapeHtml(labels.okTitle)}</h3>
      <p>${escapeHtml(labels.okBody)}</p>
      <p class="booking-success-detail"><strong>${escapeHtml(datos.profesional)}</strong><br>${escapeHtml(formatDateTime(datos.inicio))}</p>
      <button type="button" class="outline-button">${escapeHtml(labels.okAgain)}</button>`;
    form.replaceWith(panel);
    panel.querySelector("button").addEventListener("click", () => window.location.reload());
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const lang = language();
    const labels = copy[lang];
    const items = itemsEnCarrito();
    if (!items.length) {
      errorElement.textContent = labels.error;
      servicesSection?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const empleadoId = String(data.get("profesional") || "");
    const inicio = String(data.get("hora") || "");
    if (!empleadoId) { errorElement.textContent = labels.needPro; return; }
    if (!inicio) { errorElement.textContent = labels.needHora; return; }

    const sinMapear = items.filter((item) => !item.remoteId);
    if (sinMapear.length) { errorElement.textContent = labels.offline; return; }

    errorElement.textContent = "";
    const boton = form.querySelector('button[type="submit"]');
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = labels.sending;

    try {
      const sb = await obtenerCliente();
      const { data: idCita, error } = await sb.rpc("book_appointment", {
        p_employee_id: empleadoId,
        p_client_name: String(data.get("nombre_completo") || ""),
        p_client_email: String(data.get("correo") || ""),
        p_client_phone: String(data.get("telefono") || ""),
        p_starts_at: inicio,
        p_services: items.map((item) => ({ service_id: item.remoteId, quantity: item.quantity })),
        p_notes: String(data.get("comentarios") || ""),
        p_language: lang,
        p_party_size: Number(data.get("personas") || 1),
        // La casilla del formulario ya es obligatoria, pero se manda igual:
        // book_appointment la exige del lado de la base y guarda la fecha de
        // aceptación, que es la prueba del consentimiento que pide la Ley 8968.
        p_consentimiento: data.get("consentimiento") === "on",
        p_consentimiento_version: VERSION_PRIVACIDAD
      });

      if (error) {
        // La base devuelve mensajes ya redactados para la persona usuaria.
        errorElement.textContent = error.message || labels.offline;
        boton.disabled = false;
        boton.textContent = textoOriginal;
        // El cupo pudo haberse ocupado mientras llenaba el formulario.
        actualizarHoras();
        return;
      }

      // El correo de confirmación se manda en segundo plano y a propósito no
      // bloquea nada: la cita ya quedó guardada, así que un problema con el
      // proveedor de correo no debe hacerle creer a la clienta que falló.
      enviarCorreoDeConfirmacion(sb, idCita);

      const datos = {
        items,
        totales: totalsFor(items),
        nombre: String(data.get("nombre_completo") || ""),
        personas: String(data.get("personas") || "1"),
        profesional: campoProfesional.selectedOptions[0]?.textContent ?? "",
        inicio,
        comentarios: String(data.get("comentarios") || "").trim()
      };

      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensajeWhatsapp(datos))}`, "_blank", "noopener,noreferrer");
      mostrarExito(datos);
    } catch (problema) {
      console.error("[Odry's] Falló la reserva:", problema);
      errorElement.textContent = labels.offline;
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  });

  window.addEventListener("odrys:languagechange", () => {
    // Las tarjetas dibujadas por este archivo no las conoce idioma.js.
    if (catalogoDinamico) {
      retraducirCatalogo();
      pintarPreciosDelCatalogo();
    }
    services.forEach((service) => setButtonLabel(service));
    errorElement.textContent = "";
    renderCart();
  });

  renderCart();
  cargarCatalogo();
})();
