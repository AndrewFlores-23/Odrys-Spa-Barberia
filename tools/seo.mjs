// Inyecta el bloque de SEO en las páginas del sitio.
//
// Se ejecuta a mano cuando cambia algo del negocio (dominio, teléfono, zonas):
//   node tools/seo.mjs
//
// Es idempotente: borra el bloque anterior antes de escribir el nuevo, así que
// se puede correr las veces que haga falta sin duplicar etiquetas.
//
// IMPORTANTE: SITIO debe apuntar al dominio definitivo. Si las URL canónicas
// señalan a un dominio que ya no se usa, Google indexa el equivocado.
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "..");

const SITIO = "https://odrysbeautyspa.com";
const NEGOCIO = "Odry's Beauty Spa & Barber";
const TELEFONO = "+50662180804";
const LOGO = `${SITIO}/assets/images/odrys-logo.png`;

// Solo se declara lo que es cierto. Sin dirección exacta ni coordenadas: un
// dato inventado en los datos estructurados es peor que su ausencia, porque
// Google lo contrasta con Google Business Profile.
const DIRECCION = {
  "@type": "PostalAddress",
  addressLocality: "Tamarindo",
  addressRegion: "Guanacaste",
  addressCountry: "CR",
};

const HORARIO = [{
  "@type": "OpeningHoursSpecification",
  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  opens: "09:00",
  closes: "19:00",
}];

// Zona de influencia real: Tamarindo y las playas vecinas de Santa Cruz.
const ZONAS = [
  "Tamarindo", "Playa Langosta", "Playa Grande", "Villarreal", "Huacas",
  "Brasilito", "Playa Flamingo", "Playa Conchal", "Santa Cruz", "Guanacaste",
].map((nombre) => ({ "@type": "Place", name: nombre }));

const paginas = [
  {
    archivo: "index.html",
    ruta: "/",
    titulo: "Spa y Barbería en Tamarindo, Guanacaste | Odry's Beauty Spa & Barber",
    descripcion:
      "Spa y barbería en Tamarindo, Guanacaste. Masajes, manicure, pedicure, depilación, "
      + "cortes de cabello y barba. Atención en el local o a domicilio en su villa. "
      + "Abierto todos los días de 9 a. m. a 7 p. m.",
    imagen: `${SITIO}/assets/images/og-inicio.jpg`,
    imagenAlt: "Odry's Beauty Spa & Barber en Tamarindo: spa y barbería en un mismo lugar",
    tipo: "HealthAndBeautyBusiness",
  },
  {
    archivo: "odrys-mockup.html",
    // Copia idéntica de la portada: se canoniza a la raíz para que las dos no
    // compitan entre sí en los resultados de búsqueda.
    ruta: "/",
    titulo: "Spa y Barbería en Tamarindo, Guanacaste | Odry's Beauty Spa & Barber",
    descripcion:
      "Spa y barbería en Tamarindo, Guanacaste. Masajes, manicure, pedicure, depilación, "
      + "cortes de cabello y barba. Atención en el local o a domicilio en su villa.",
    imagen: `${SITIO}/assets/images/og-inicio.jpg`,
    imagenAlt: "Odry's Beauty Spa & Barber en Tamarindo: spa y barbería en un mismo lugar",
    tipo: null,
    sinSitemap: true,
  },
  {
    archivo: "barberia.html",
    ruta: "/barberia.html",
    titulo: "Barbería en Tamarindo | Cortes, Fade, Barba y Estilismo | Odry's",
    descripcion:
      "Barbería en Tamarindo, Guanacaste: cortes clásicos, fade, perfilado de barba, "
      + "coloración y alisados. Reserve su cita en línea y elija con qué profesional atenderse.",
    imagen: `${SITIO}/assets/images/og-barberia.jpg`,
    imagenAlt: "Barbería y estilismo de Odry's en Tamarindo, Guanacaste",
    tipo: "HairSalon",
    // Debe reflejar el catálogo real de la base: Google contrasta estos datos
    // con la ficha del negocio y con lo que se ve en la página.
    servicios: [
      // Barbería
      "Corte regular", "Corte y barba", "Fade haircut", "Barba y contorno",
      "Líneas", "Cejas",
      // Corte y peinado
      "Corte de puntas", "Blower y lavado", "Peinado para evento",
      // Color
      "Retoque de raíz", "Color completo", "Highlights", "Balayage", "Babylights",
      // Tratamiento
      "Hidratación capilar", "Tratamiento de cuero cabelludo", "Botox capilar",
      // Alisados
      "Keratina", "Nanoplastia",
    ],
  },
  {
    archivo: "spa.html",
    ruta: "/spa.html",
    titulo: "Spa en Tamarindo | Masajes, Manicure y Pedicure a Domicilio | Odry's",
    descripcion:
      "Spa en Tamarindo, Guanacaste: masaje sueco, tejido profundo, piedras calientes, "
      + "manicure y pedicure en gel, depilación y exfoliación. Servicio en el local o "
      + "a domicilio en villas y residencias.",
    imagen: `${SITIO}/assets/images/og-spa.jpg`,
    imagenAlt: "Spa de Odry's en Tamarindo: masajes, manicure y pedicure",
    tipo: "DaySpa",
    servicios: [
      "Masaje sueco relajante", "Masaje de tejido profundo", "Masaje con piedras calientes",
      "Masaje tailandés", "Reflexología", "Manicure en gel", "Pedicure en gel",
      "Depilación con cera", "Exfoliación corporal",
    ],
  },
];

const MARCA_INICIO = "<!-- seo:inicio -->";
const MARCA_FIN = "<!-- seo:fin -->";

const escapar = (valor) => String(valor)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function datosEstructurados(pagina) {
  const bloques = [];

  if (pagina.tipo) {
    const negocio = {
      "@context": "https://schema.org",
      "@type": pagina.tipo,
      "@id": `${SITIO}/#negocio`,
      name: NEGOCIO,
      url: `${SITIO}${pagina.ruta}`,
      image: pagina.imagen,
      logo: LOGO,
      telephone: TELEFONO,
      priceRange: "$$",
      currenciesAccepted: "USD, CRC",
      address: DIRECCION,
      areaServed: ZONAS,
      openingHoursSpecification: HORARIO,
      availableLanguage: ["es", "en"],
    };

    if (pagina.servicios) {
      negocio.hasOfferCatalog = {
        "@type": "OfferCatalog",
        name: pagina.tipo === "HairSalon" ? "Servicios de barbería y estilismo" : "Servicios de spa",
        itemListElement: pagina.servicios.map((nombre) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: nombre, areaServed: "Tamarindo, Guanacaste" },
        })),
      };
    }
    bloques.push(negocio);
  }

  if (pagina.ruta !== "/") {
    bloques.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITIO}/` },
        { "@type": "ListItem", position: 2, name: pagina.tipo === "HairSalon" ? "Barbería" : "Spa" },
      ],
    });
  }

  return bloques;
}

function bloqueSeo(pagina) {
  const url = `${SITIO}${pagina.ruta}`;
  const lineas = [
    MARCA_INICIO,
    `<link rel="canonical" href="${url}">`,
    '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">',
    '<meta name="geo.region" content="CR-G">',
    '<meta name="geo.placename" content="Tamarindo, Guanacaste, Costa Rica">',
    `<meta name="author" content="${escapar(NEGOCIO)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${escapar(NEGOCIO)}">`,
    '<meta property="og:locale" content="es_CR">',
    '<meta property="og:locale:alternate" content="en_US">',
    `<meta property="og:title" content="${escapar(pagina.titulo)}">`,
    `<meta property="og:description" content="${escapar(pagina.descripcion)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${pagina.imagen}">`,
    // Declarar tipo y medidas deja que WhatsApp y Facebook dibujen la vista
    // previa antes de terminar de descargar la imagen. Sin esto, muchas veces
    // el enlace se comparte sin miniatura la primera vez.
    '<meta property="og:image:type" content="image/jpeg">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${escapar(pagina.imagenAlt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapar(pagina.titulo)}">`,
    `<meta name="twitter:description" content="${escapar(pagina.descripcion)}">`,
    `<meta name="twitter:image" content="${pagina.imagen}">`,
    ...datosEstructurados(pagina).map(
      (dato) => `<script type="application/ld+json">${JSON.stringify(dato)}</script>`,
    ),
    MARCA_FIN,
  ];
  return lineas.join("\n  ");
}

async function procesar(pagina) {
  const ruta = join(raiz, pagina.archivo);
  let html = await readFile(ruta, "utf8");

  // Se retira el bloque anterior para no acumular etiquetas repetidas.
  html = html.replace(new RegExp(`\\s*${MARCA_INICIO}[\\s\\S]*?${MARCA_FIN}`, "g"), "");

  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapar(pagina.titulo)}</title>`,
  );
  html = html.replace(
    /<meta name="description" content="[\s\S]*?">/,
    `<meta name="description" content="${escapar(pagina.descripcion)}">`,
  );
  html = html.replace("</head>", `  ${bloqueSeo(pagina)}\n</head>`);

  await writeFile(ruta, html, "utf8");
  console.log(`  ${pagina.archivo}: título, descripción, canónica y datos estructurados`);
}

async function sitemap() {
  const hoy = new Date().toISOString().split("T")[0];
  const urls = paginas
    .filter((p) => !p.sinSitemap)
    .map((p) => `  <url>\n    <loc>${SITIO}${p.ruta}</loc>\n    <lastmod>${hoy}</lastmod>\n`
      + `    <changefreq>weekly</changefreq>\n    <priority>${p.ruta === "/" ? "1.0" : "0.9"}</priority>\n  </url>`)
    .join("\n");

  await writeFile(
    join(raiz, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    "utf8",
  );

  await writeFile(
    join(raiz, "robots.txt"),
    `User-agent: *\nAllow: /\n\n# El panel administrativo no debe indexarse.\nDisallow: /admin/\n\nSitemap: ${SITIO}/sitemap.xml\n`,
    "utf8",
  );
  console.log("  sitemap.xml y robots.txt");
}

console.log(`Aplicando SEO para ${SITIO}`);
for (const pagina of paginas) await procesar(pagina);
await sitemap();
console.log("Listo.");
