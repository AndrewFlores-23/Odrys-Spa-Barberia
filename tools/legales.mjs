// Genera las tres páginas legales del sitio:
//   privacidad.html · terminos.html · cookies.html
//
// Se ejecuta a mano cuando cambian los datos del negocio o el tratamiento
// de datos:
//   node tools/legales.mjs
//
// El encabezado, el pie y los créditos se copian de spa.html en vez de
// duplicarse acá: así, si mañana se agrega un enlace al menú, estas páginas
// lo heredan sin que haya que acordarse de tocarlas.
//
// IMPORTANTE: los valores en null salen en la página resaltados como
// pendientes, y el generador los lista al terminar. No son decorativos: sin
// saber quién responde y cómo contactarlo, la política de privacidad no
// identifica al responsable del tratamiento, que es lo que exige la Ley 8968.
//
// Los números de sección se calculan solos: los títulos van sin numerar.
//
// Esto es un borrador funcional, no un texto revisado por un abogado.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "..");

// --------------------------------------------------------------- Datos base
const DATOS = {
  marca: "Odry's Beauty Spa & Barber",
  sitio: "https://odrysbeautyspa.com",
  telefono: "+506 6218-0804",
  whatsapp: "50662180804",
  correoReservas: "reservas@odrysbeautyspa.com",
  horario: "todos los días de 9 a. m. a 7 p. m.",
  provincia: "Tamarindo, Santa Cruz, Guanacaste, Costa Rica",

  direccionExacta: "Centro Comercial Galerías del Mar",
  correoDatos: "beautyspaodrys@gmail.com",
  politicaCancelacion: "2 horas",

  // Medios de pago que recibe el local: efectivo, tarjeta, SINPE Móvil...
  // Es opcional: si queda en null, esa línea simplemente no se imprime. El
  // resto de la sección de pago sigue teniendo sentido, porque lo que dice es
  // que el sitio NO cobra en línea.
  //
  // Vale la pena llenarlo igual: alguien que llega sin efectivo a un servicio
  // de $180 es un problema evitable.
  metodosPago: null,
};

// ------------------------------------------------------ Quién es responsable
// La Ley 8968 define al responsable como "persona física o jurídica": no hace
// falta que exista una sociedad. En Costa Rica lo corriente en un negocio de
// este tamaño es operar como persona física con un nombre comercial, y eso
// cumple igual. Lo que la ley necesita es que se sepa quién responde y cómo
// contactarlo.
const RESPONSABLE = {
  // "fisica"  → la dueña opera a su nombre (no hay cédula jurídica)
  // "juridica" → el negocio está inscrito como sociedad
  tipo: "fisica",

  // Con tipo "fisica": nombre completo de la dueña, como aparece en su cédula.
  // Con tipo "juridica": razón social exacta del registro.
  nombre: "Audrey Vargas Gil",

  // Cédula de identidad o cédula jurídica, según el caso.
  identificacion: "8-0076-0015",

  // Publicar o no el número en la página.
  //
  // Va publicado. En Costa Rica el padrón electoral del TSE es público y ya
  // contiene nombre y cédula, así que el número no es un dato reservado, y en
  // la política identifica sin ambigüedad a quién responde por los datos.
  //
  // Si la dueña o su abogado prefieren no exponerlo, basta con poner false: el
  // texto se reacomoda solo y sigue cumpliendo, porque la ley se satisface con
  // nombre, domicilio y correo de contacto.
  publicarIdentificacion: true,
};

// Debe coincidir con VERSION_PRIVACIDAD en reservas.js: es lo que se guarda
// junto a cada cita como constancia de qué texto se aceptó. Si se cambia el
// contenido de esta política, hay que subir las dos.
const VERSION = "2026-08-18";
const ACTUALIZADO = "18 de agosto de 2026";

// Un dato que falta se ve, no se disimula: si se publicara con el hueco, al
// menos queda evidente en la página en vez de pasar por texto legal válido.
const dato = (valor, queFalta) =>
  valor ?? `<mark class="dato-pendiente">POR COMPLETAR: ${queFalta}</mark>`;

// --------------------------------------------------------- Contenido común
const esFisica = RESPONSABLE.tipo === "fisica";

// La frase se arma según el tipo: una persona física no tiene razón social ni
// cédula jurídica, y forzar esas palabras haría que el texto describiera algo
// que no existe.
const identificacion = RESPONSABLE.publicarIdentificacion
  ? `, ${esFisica ? "cédula de identidad" : "cédula jurídica"} ${dato(RESPONSABLE.identificacion, esFisica ? "número de cédula de identidad" : "número de cédula jurídica")}`
  : "";

const responsable = `
  <p>El responsable del tratamiento de sus datos personales es
  ${dato(RESPONSABLE.nombre, esFisica ? "nombre completo de la propietaria" : "razón social del negocio")}${identificacion},
  quien opera comercialmente como <strong>${DATOS.marca}</strong>, con
  domicilio en ${dato(DATOS.direccionExacta, "dirección exacta del local")},
  ${DATOS.provincia}.</p>
  <p>Para cualquier consulta sobre sus datos puede escribir a
  <a href="mailto:${DATOS.correoDatos ?? DATOS.correoReservas}">${dato(DATOS.correoDatos, "correo de contacto para datos personales")}</a>
  o llamar al ${DATOS.telefono}.</p>`;

// --------------------------------------------------------------- Privacidad
const PRIVACIDAD = {
  archivo: "privacidad.html",
  titulo: "Política de Privacidad | Odry's Beauty Spa & Barber",
  h1: "Política de Privacidad",
  descripcion:
    "Cómo Odry's Beauty Spa & Barber recopila, usa y protege los datos "
    + "personales de sus clientes, conforme a la Ley 8968 de Costa Rica.",
  intro:
    "Esta política explica qué datos personales recopilamos cuando usted reserva "
    + "una cita o navega por este sitio, para qué los usamos y qué derechos tiene "
    + "sobre ellos. Está redactada conforme a la Ley N.º 8968 de Protección de la "
    + "Persona frente al Tratamiento de sus Datos Personales y su reglamento.",
  secciones: [
    ["Quién es responsable de sus datos", responsable],

    ["Qué datos recopilamos", `
      <p>Cuando usted solicita una cita desde este sitio, guardamos únicamente
      lo necesario para atenderla:</p>
      <ul>
        <li><strong>Nombre completo</strong> — para identificar la cita y saber a quién atender.</li>
        <li><strong>Correo electrónico</strong> — para enviarle la confirmación de la reserva.</li>
        <li><strong>Teléfono o WhatsApp</strong> — opcional, para coordinar cambios o el servicio a domicilio.</li>
        <li><strong>Detalles de la cita</strong> — servicios elegidos, fecha, hora, profesional y cantidad de personas.</li>
        <li><strong>Comentarios</strong> — lo que usted escriba en el campo de referencias, si decide llenarlo.</li>
        <li><strong>Idioma</strong> — para responderle en español o en inglés.</li>
      </ul>
      <p>No pedimos ni almacenamos datos de tarjetas, números de cédula ni
      información sensible. El pago se realiza en el local.</p>
      <p>Al navegar, nuestro proveedor de red registra datos técnicos como la
      dirección IP, el tipo de navegador y las páginas visitadas. Se usan para
      seguridad y estadísticas agregadas, no para identificarle.</p>`],

    ["Para qué usamos sus datos", `
      <ul>
        <li>Agendar, confirmar y preparar su cita.</li>
        <li>Enviarle por correo la confirmación con el detalle de la reserva.</li>
        <li>Coordinar con usted por WhatsApp si hace falta ajustar algo.</li>
        <li>Llevar el control interno de la agenda del equipo.</li>
      </ul>
      <p><strong>No vendemos, alquilamos ni cedemos sus datos a terceros con
      fines comerciales.</strong> Tampoco le enviamos publicidad salvo que usted
      lo solicite expresamente.</p>`],

    ["Con qué base legal los tratamos", `
      <p>Tratamos sus datos con base en el <strong>consentimiento informado y
      expreso</strong> que usted otorga al marcar la casilla de aceptación antes
      de enviar su solicitud de reserva, conforme al artículo 5 de la Ley 8968.</p>
      <p>Junto con la cita guardamos <strong>la fecha y hora en que usted aceptó
      y la versión de este texto que estaba vigente</strong>. Es el respaldo de
      que el consentimiento existió y de a qué redacción corresponde. No
      registramos su dirección IP.</p>
      <p>Puede retirar ese consentimiento en cualquier momento escribiéndonos.
      Retirarlo no afecta la validez del tratamiento anterior, pero puede
      impedirnos mantener una cita ya agendada.</p>`],

    ["Cuánto tiempo los conservamos", `
      <p>Conservamos los datos de una cita mientras sean necesarios para prestar
      el servicio y para cumplir obligaciones contables y tributarias. Cumplido
      ese plazo, se eliminan o se anonimizan.</p>
      <p>Si usted pide la supresión de sus datos antes, la atendemos salvo que
      exista una obligación legal de conservarlos.</p>`],

    ["Quién más puede acceder a ellos", `
      <p>Para que el sistema funcione nos apoyamos en proveedores que actúan como
      encargados del tratamiento. Solo acceden a lo indispensable y están
      obligados a proteger la información:</p>
      <ul>
        <li><strong>Supabase</strong> — base de datos donde se guardan las citas. Servidores en Estados Unidos.</li>
        <li><strong>Resend</strong> — envío del correo de confirmación. Servidores en Estados Unidos.</li>
        <li><strong>Cloudflare</strong> — publicación del sitio y protección contra ataques. Red global.</li>
        <li><strong>WhatsApp (Meta)</strong> — solo si usted decide escribirnos por ese medio; en ese caso aplica también la política de WhatsApp.</li>
      </ul>
      <p>Dentro del negocio, cada persona del equipo ve únicamente las citas que
      le corresponden. La administración tiene acceso completo a la agenda.</p>`],

    ["Transferencia internacional de datos", `
      <p>Como se indica arriba, sus datos se almacenan en servidores ubicados
      <strong>fuera de Costa Rica</strong>, principalmente en Estados Unidos.</p>
      <p>Conforme al artículo 14 de la Ley 8968, al aceptar esta política usted
      consiente esa transferencia. Si prefiere no autorizarla, puede reservar
      llamándonos al ${DATOS.telefono} o escribiéndonos por WhatsApp, sin usar
      el formulario del sitio.</p>`],

    ["Sus derechos", `
      <p>La ley le reconoce el derecho a la autodeterminación informativa. En
      concreto, usted puede:</p>
      <ul>
        <li><strong>Acceder</strong> — saber qué datos suyos tenemos.</li>
        <li><strong>Rectificar</strong> — corregir los que estén equivocados o incompletos.</li>
        <li><strong>Suprimir</strong> — pedir que los borremos.</li>
        <li><strong>Revocar</strong> — retirar el consentimiento que dio.</li>
      </ul>
      <p>Para ejercerlos, escriba a
      <a href="mailto:${DATOS.correoDatos ?? DATOS.correoReservas}">${dato(DATOS.correoDatos, "correo de contacto para datos personales")}</a>
      indicando su nombre y el correo con el que reservó. Respondemos dentro de
      los plazos que fija la ley.</p>
      <p>Si considera que no atendimos bien su solicitud, puede acudir a la
      <strong>Agencia de Protección de Datos de los Habitantes (PRODHAB)</strong>.</p>`],

    ["Menores de edad", `
      <p>El formulario de reserva está pensado para personas mayores de edad. Si
      la cita es para una persona menor, debe reservarla su madre, padre o
      encargado legal, y acompañarla durante el servicio.</p>`],

    ["Cómo protegemos la información", `
      <p>El sitio funciona sobre conexión cifrada (HTTPS). Las contraseñas del
      personal se guardan cifradas y nunca en texto plano. El acceso a la agenda
      exige iniciar sesión, tiene límite de intentos y cada persona ve solo lo
      que le corresponde según su rol.</p>
      <p>Ningún sistema es infalible. Si ocurriera un incidente que afecte sus
      datos, se lo comunicaríamos y lo reportaríamos según corresponda.</p>`],

    ["Uso de imágenes", `
      <p>Las fotografías y videos del sitio muestran trabajos hechos en el local.
      Se publican con autorización de las personas que aparecen en ellos. Si
      usted aparece en alguna imagen y desea que la retiremos, escríbanos y lo
      hacemos.</p>`],

    ["Cambios a esta política", `
      <p>Podemos actualizar esta política si cambia la forma en que tratamos los
      datos. La versión vigente siempre estará publicada en esta página, con su
      fecha de última actualización.</p>`],
  ],
};

// ---------------------------------------------------------------- Términos
const TERMINOS = {
  archivo: "terminos.html",
  titulo: "Términos y Condiciones de Reserva | Odry's Beauty Spa & Barber",
  h1: "Términos y Condiciones",
  descripcion:
    "Condiciones de uso del sitio y del sistema de reservas de Odry's Beauty "
    + "Spa & Barber en Tamarindo, Guanacaste.",
  intro:
    "Estas condiciones regulan el uso de este sitio y del sistema de reservas. "
    + "Al solicitar una cita, usted acepta lo que se describe a continuación.",
  secciones: [
    ["Quiénes somos", responsable],

    ["Qué significa reservar", `
      <p>Al enviar el formulario, su cita queda registrada en nuestra agenda y
      recibe un correo de confirmación con el detalle. <strong>La reserva no
      implica ningún cobro en línea</strong>: el pago se realiza en el local o al
      momento del servicio a domicilio.</p>
      <p>Nos reservamos el derecho de contactarle para reprogramar si surge un
      imprevisto con el profesional asignado. En ese caso se lo avisamos cuanto
      antes por correo o WhatsApp.</p>`],

    ["Precios", `
      <p>Los precios del catálogo están expresados en <strong>dólares
      estadounidenses (USD)</strong>. El sitio permite verlos en colones usando
      un tipo de cambio de referencia: <strong>ese monto es orientativo</strong> y
      el cobro final se calcula al tipo de cambio del día.</p>
      <p>Algunos servicios aparecen como <strong>“desde” un monto</strong>. Son
      aquellos, sobre todo de color, en los que el precio final depende del largo
      del cabello, la cantidad de producto, el color anterior y el resultado que
      se busque. En esos casos el monto exacto se acuerda con usted en el local
      <strong>antes de comenzar</strong>, nunca después.</p>
      <p>Otros se muestran como “precio por confirmar” cuando no es posible
      anticipar una cifra. Igual que en el caso anterior, se define de previo.</p>
      <p>El total que aparece al reservar es una <strong>estimación</strong> con
      los precios vigentes al momento de la reserva.</p>`],

    ["Sobre el pago", `
      <p><strong>Este sitio no cobra nada en línea.</strong> No pedimos datos de
      tarjeta, no se requiere depósito ni adelanto para reservar, y la reserva no
      genera ningún cargo.</p>
      <p>El pago se realiza <strong>en el local al terminar el servicio</strong>,
      o al momento de la atención si es a domicilio.</p>
      ${DATOS.metodosPago ? `<p>Medios de pago aceptados: ${DATOS.metodosPago}.</p>` : ""}
      <p>Como nunca solicitamos pagos por adelantado, si recibe un mensaje o
      correo pidiéndole una transferencia a nombre de ${DATOS.marca},
      <strong>desconfíe</strong> y escríbanos al ${DATOS.telefono} antes de
      enviar dinero.</p>`],

    ["Duración de las citas", `
      <p>Cada servicio tiene una duración estimada. La agenda trabaja en bloques,
      de modo que el tiempo reservado puede ser algo mayor que la suma de los
      servicios elegidos.</p>
      <p>La duración real puede variar según el tipo de cabello, el estado de la
      piel o las uñas y el resultado que se busque.</p>`],

    ["Cancelaciones y cambios", `
      <p>Si no puede asistir, le agradecemos avisarnos con al menos
      ${dato(DATOS.politicaCancelacion, "cuántas horas de anticipación se piden para cancelar")}
      de anticipación, por WhatsApp al ${DATOS.telefono}. Eso nos permite ofrecer
      el espacio a otra persona.</p>
      <p>Las cancelaciones repetidas sin aviso pueden llevarnos a solicitar
      confirmación previa para futuras reservas.</p>`],

    ["Llegadas tarde", `
      <p>Si llega tarde, haremos lo posible por atenderle, pero es posible que el
      servicio deba acortarse para no afectar a la siguiente cita. Si el atraso
      es considerable, podríamos tener que reprogramar.</p>`],

    ["Servicio a domicilio", `
      <p>Atendemos en residencias, villas y alojamientos de Tamarindo y
      alrededores. La ubicación exacta y las condiciones se coordinan por
      WhatsApp después de la reserva.</p>
      <p>El servicio a domicilio requiere un espacio adecuado y seguro para
      trabajar. Si al llegar no es posible prestarlo en condiciones apropiadas,
      podríamos tener que reprogramarlo.</p>`],

    ["Salud y condiciones previas", `
      <p>Los masajes y tratamientos corporales no son un tratamiento médico ni
      sustituyen una consulta profesional.</p>
      <p>Es importante que nos informe antes de la cita si está embarazada, tiene
      lesiones, alergias, problemas de circulación, afecciones de la piel o
      cualquier condición médica relevante. Puede indicarlo en el campo de
      referencias del formulario o decírselo al profesional al llegar.</p>
      <p>Nos reservamos el derecho de no realizar un servicio si consideramos que
      puede afectar su salud.</p>`],

    ["Menores de edad", `
      <p>Los menores deben venir acompañados por su madre, padre o encargado
      legal, quien autoriza el servicio y permanece durante su realización.</p>`],

    ["Uso del sitio", `
      <p>Este sitio y su sistema de reservas son para uso personal y de buena fe.
      No está permitido usarlos para enviar solicitudes falsas, automatizadas o
      masivas, ni para intentar acceder a información de otras personas.</p>
      <p>Los textos, fotografías, videos y el logotipo son propiedad del negocio
      y no pueden reproducirse sin autorización.</p>`],

    ["Disponibilidad del servicio", `
      <p>Procuramos que el sitio esté siempre disponible, pero puede haber
      interrupciones por mantenimiento o por fallas de los proveedores. Si el
      formulario no funciona, siempre puede reservar por WhatsApp al
      ${DATOS.telefono}, ${DATOS.horario}.</p>`],

    ["Legislación aplicable", `
      <p>Estas condiciones se rigen por la legislación de la República de Costa
      Rica, incluida la Ley N.º 7472 de Promoción de la Competencia y Defensa
      Efectiva del Consumidor y la Ley N.º 8968 de Protección de Datos
      Personales.</p>`],
  ],
};

// ----------------------------------------------------------------- Cookies
const COOKIES = {
  archivo: "cookies.html",
  titulo: "Cookies y Almacenamiento Local | Odry's Beauty Spa & Barber",
  h1: "Cookies y almacenamiento local",
  descripcion:
    "Qué guarda el sitio de Odry's Beauty Spa & Barber en su navegador y cómo "
    + "eliminarlo.",
  intro:
    "Este sitio guarda muy poca información en su navegador, y solo para que "
    + "funcione correctamente. No usamos cookies de publicidad ni de seguimiento "
    + "entre sitios.",
  secciones: [
    ["Qué guardamos y para qué", `
      <p>Usamos <em>almacenamiento local</em>, que es parecido a una cookie pero
      no viaja a ningún servidor: se queda en su dispositivo.</p>
      <table class="tabla-legal">
        <thead><tr><th>Qué se guarda</th><th>Para qué sirve</th><th>Cuánto dura</th></tr></thead>
        <tbody>
          <tr><td><code>odrys-language</code></td><td>Recordar si eligió español o inglés.</td><td>Hasta que borre los datos del navegador.</td></tr>
          <tr><td><code>odrys-moneda</code></td><td>Recordar si prefiere ver los precios en dólares o en colones.</td><td>Hasta que borre los datos del navegador.</td></tr>
        </tbody>
      </table>
      <p>Nada de esto le identifica ni permite seguirle por otros sitios. Son
      preferencias de visualización, por eso no mostramos un banner pidiendo
      permiso: sin ellas el sitio no podría recordar su idioma.</p>`],

    ["En el panel del personal", `
      <p>La sección administrativa, que solo usa el equipo del negocio, guarda
      además la sesión iniciada, el correo si la persona marca “recordar mi
      correo”, y un contador de intentos fallidos de acceso, que sirve para
      bloquear temporalmente tras varios errores.</p>
      <p>Nunca se guarda la contraseña en el navegador.</p>`],

    ["Servicios de terceros", `
      <ul>
        <li><strong>Cloudflare</strong> publica el sitio y lo protege de ataques.
        Registra datos técnicos como la dirección IP y realiza analítica agregada
        <strong>sin usar cookies</strong>.</li>
        <li><strong>Google Fonts</strong> entrega la tipografía del sitio. Al
        cargarla, su navegador se conecta a servidores de Google, que reciben su
        dirección IP.</li>
        <li><strong>Supabase</strong> atiende las consultas del catálogo y las
        reservas.</li>
      </ul>`],

    ["Cómo borrar esta información", `
      <p>Puede eliminarla en cualquier momento desde su navegador, en la sección
      de privacidad o datos de sitios web. También se borra si navega en modo
      incógnito y cierra la ventana.</p>
      <p>Al borrarla, el sitio volverá a mostrarse en español y con precios en
      dólares hasta que elija otra vez.</p>`],

    ["Más información", `
      <p>Para saber cómo tratamos los datos que usted nos envía al reservar,
      consulte nuestra <a href="privacidad.html">Política de Privacidad</a>.</p>`],
  ],
};

// -------------------------------------------------------------- Ensamblado
const base = readFileSync(join(raiz, "spa.html"), "utf8");
const encabezado = base.match(/<header class="site-header">[\s\S]*?<\/header>/)[0]
  // En estas páginas no hay catálogo al que saltar: el botón lleva al spa.
  .replace('class="header-cta" href="#servicios"', 'class="header-cta" href="spa.html#servicios"')
  .replace(/ class="active"/g, "");
const pie = base.match(/<footer[\s\S]*?<\/footer>/)[0];
const creditos = base.match(/<!-- creditos:inicio -->[\s\S]*?<!-- creditos:fin -->/)?.[0] ?? "";

const escapar = (v) => String(v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function pagina(def, otras) {
  const navLegal = otras
    .map((o) => `<a href="${o.archivo}">${o.h1}</a>`)
    .join("");

  const cuerpo = def.secciones
    // El número se calcula acá y no se escribe en el título: así, insertar una
    // sección en medio no obliga a renumerar todas las de abajo a mano, que es
    // justo donde se cuelan los errores.
    .map(([titulo, html], i) => `<section class="legal-seccion"><h2>${i + 1}. ${titulo}</h2>${html}</section>`)
    .join("\n      ");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content">
  <title>${escapar(def.titulo)}</title>
  <meta name="description" content="${escapar(def.descripcion)}">
  <link rel="canonical" href="${DATOS.sitio}/${def.archivo}">
  <meta name="robots" content="index,follow">
  <link rel="icon" href="assets/images/odrys-logo.png">
  <link rel="stylesheet" href="odrys-mockup.css?v=20260818-1">
</head>
<body class="experience-page spa-page real-site pagina-legal">
  ${encabezado}

  <main class="legal-wrap">
    <p class="eyebrow">${escapar(DATOS.marca).toUpperCase()}</p>
    <h1>${def.h1}</h1>
    <p class="legal-fecha">Última actualización: ${ACTUALIZADO} · Versión ${VERSION}</p>
    <p class="legal-intro">${def.intro}</p>

    <nav class="legal-nav">${navLegal}</nav>

      ${cuerpo}

    <section class="legal-seccion legal-cierre">
      <p>¿Alguna duda sobre este documento? Escríbanos a
      <a href="mailto:${DATOS.correoDatos ?? DATOS.correoReservas}">${DATOS.correoDatos ?? DATOS.correoReservas}</a>
      o por <a href="https://wa.me/${DATOS.whatsapp}">WhatsApp</a>, ${DATOS.horario}.</p>
    </section>
  </main>

  ${pie}
  ${creditos}
  <script src="idioma.js?v=20260810-3"></script>
</body>
</html>
`;
}

const TODAS = [PRIVACIDAD, TERMINOS, COOKIES];
console.log("Generando páginas legales");
for (const def of TODAS) {
  const otras = TODAS.filter((o) => o !== def);
  writeFileSync(join(raiz, def.archivo), pagina(def, otras), "utf8");
  console.log(`  ${def.archivo}`);
}

const pendientes = [
  // metodosPago es opcional: si falta, esa línea no se imprime y ya.
  ...Object.entries(DATOS).filter(([k, v]) => v === null && k !== "metodosPago").map(([k]) => k),
  ...(RESPONSABLE.nombre === null ? [esFisica ? "RESPONSABLE.nombre (nombre de la propietaria)" : "RESPONSABLE.nombre (razón social)"] : []),
  ...(RESPONSABLE.publicarIdentificacion && RESPONSABLE.identificacion === null ? ["RESPONSABLE.identificacion"] : []),
];
if (pendientes.length) {
  console.log(`\n  FALTAN ${pendientes.length} DATOS DEL NEGOCIO, visibles en las páginas:`);
  for (const p of pendientes) console.log(`    · ${p}`);
  console.log("\n  Complételos en DATOS o RESPONSABLE, dentro de este archivo, y vuelva a ejecutarlo.");
}
