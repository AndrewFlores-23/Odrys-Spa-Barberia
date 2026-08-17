// Genera las imágenes de vista previa que se ven al compartir el enlace.
//
//   npm install sharp --no-save && node tools/og-image.mjs
//
// Por qué no se usa una foto suelta:
//
//   1. Las redes recortan a 1200x630. Una foto vertical queda decapitada.
//   2. WhatsApp no renderiza WebP de forma fiable en las vistas previas, y es
//      justo por donde más se va a compartir este sitio. Salen en JPEG.
//   3. Una foto sin marca no dice de quién es el enlace. Con el logo encima,
//      se reconoce el negocio antes de abrirlo.
//
// La composición es: dos fotos a media pantalla (spa y barbería, que son las
// dos mitades del negocio), un velo oscuro para que el texto se lea, y la
// marca centrada.
import sharp from "sharp";
import { join, resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "..");
const imagenes = join(raiz, "assets", "images");

const ANCHO = 1200;
const ALTO = 630;

const VINO = "#471a33";
const ORO = "#c7a15a";

// El texto va como SVG porque sharp lo rasteriza junto al resto. Se usan
// familias genéricas: una tipografía de Google no está instalada en el sistema
// que genera la imagen.
function capaDeTexto({ titulo, subtitulo }) {
  return Buffer.from(`
<svg width="${ANCHO}" height="${ALTO}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="velo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${VINO}" stop-opacity="0.82"/>
      <stop offset="55%"  stop-color="${VINO}" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#2b0f1e" stop-opacity="0.96"/>
    </linearGradient>
  </defs>

  <rect width="${ANCHO}" height="${ALTO}" fill="url(#velo)"/>

  <text x="${ANCHO / 2}" y="392" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="60" fill="#ffffff"
        letter-spacing="3">${titulo}</text>

  <line x1="${ANCHO / 2 - 90}" y1="424" x2="${ANCHO / 2 + 90}" y2="424"
        stroke="${ORO}" stroke-width="2"/>

  <text x="${ANCHO / 2}" y="470" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="23" fill="${ORO}"
        letter-spacing="6" font-weight="bold">${subtitulo}</text>

  <text x="${ANCHO / 2}" y="524" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#e6d7dd"
        letter-spacing="5">TAMARINDO &#183; GUANACASTE &#183; COSTA RICA</text>
</svg>`);
}

// Recorta una foto a media imagen, centrando lo interesante.
async function mitad(archivo) {
  return sharp(join(imagenes, archivo))
    .resize(ANCHO / 2, ALTO, { fit: "cover", position: "attention" })
    .toBuffer();
}

async function generar({ salida, izquierda, derecha, titulo, subtitulo }) {
  const [izq, der] = await Promise.all([mitad(izquierda), mitad(derecha)]);

  const fondo = await sharp({
    create: { width: ANCHO, height: ALTO, channels: 3, background: VINO },
  })
    .composite([
      { input: izq, left: 0, top: 0 },
      { input: der, left: ANCHO / 2, top: 0 },
    ])
    .png()
    .toBuffer();

  const logo = await sharp(join(imagenes, "odrys-logo.png"))
    .resize(190, 190, { fit: "inside" })
    .toBuffer();

  await sharp(fondo)
    .composite([
      { input: capaDeTexto({ titulo, subtitulo }), left: 0, top: 0 },
      { input: logo, left: Math.round((ANCHO - 190) / 2), top: 108 },
    ])
    // JPEG y no WebP: WhatsApp no muestra WebP de forma fiable en las vistas
    // previas, y es el canal principal de este negocio.
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(join(imagenes, salida));

  console.log(`  ${salida}`);
}

console.log(`Generando vistas previas de ${ANCHO}x${ALTO}`);

await generar({
  salida: "og-inicio.jpg",
  izquierda: "massage-poolside-edited.webp",
  derecha: "barber-fade-espejo-edited.webp",
  titulo: "ODRY'S",
  subtitulo: "BEAUTY SPA &amp; BARBER",
});

await generar({
  salida: "og-barberia.jpg",
  izquierda: "barber-fade-espejo-edited.webp",
  derecha: "barber-clipper-nuca-edited.webp",
  titulo: "ODRY'S",
  subtitulo: "BARBER&#205;A &amp; ESTILISMO",
});

await generar({
  salida: "og-spa.jpg",
  izquierda: "massage-poolside-edited.webp",
  derecha: "nails-white-gold-edited.webp",
  titulo: "ODRY'S",
  subtitulo: "BEAUTY SPA",
});

console.log("Listo.");
