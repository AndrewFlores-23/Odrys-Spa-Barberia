// Arma la carpeta _site con el sitio publicable.
//
//   node tools/build-site.mjs
//
// Existe por una razón concreta: en la raíz del repositorio conviven el sitio
// real (HTML plano) y un andamiaje de Next.js que quedó sin usar. Cualquier
// herramienta que detecte package.json asume que hay que compilar ese
// andamiaje y publica el mockup viejo en lugar del sitio. Este script dice
// explícitamente qué se publica, y tanto Cloudflare Pages como GitHub Actions
// lo usan, así que no pueden divergir.
import { cp, mkdir, rm, writeFile, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve, dirname, sep } from "node:path";

const raiz = resolve(import.meta.dirname, "..");
const salida = join(raiz, "_site");

const ARCHIVOS = [
  "index.html",
  "odrys-mockup.html",
  "barberia.html",
  "spa.html",
  // Páginas legales, generadas por tools/legales.mjs.
  "privacidad.html",
  "terminos.html",
  "cookies.html",
  "odrys-mockup.css",
  "idioma.js",
  "novedades.js",
  "experiencias.js",
  "reservas.js",
  "robots.txt",
  "sitemap.xml",
  // Cabeceras de seguridad que aplica Cloudflare al servir el sitio.
  "_headers",
];

const CARPETAS = ["assets", "admin"];

async function existe(ruta) {
  try { await access(ruta); return true; } catch { return false; }
}

await rm(salida, { recursive: true, force: true });
await mkdir(salida, { recursive: true });

for (const archivo of ARCHIVOS) {
  const origen = join(raiz, archivo);
  if (!(await existe(origen))) {
    console.warn(`  falta ${archivo}, se omite`);
    continue;
  }
  const destino = join(salida, archivo);
  await mkdir(dirname(destino), { recursive: true });
  await cp(origen, destino);
}

// No todo lo que vive en assets/ tiene que publicarse. Sin este filtro el
// sitio subía 79 MB, de los cuales unos 69 MB no los usa nadie:
//
//   · assets/originals/ son los archivos tal como llegaron, antes de
//     comprimir. Se guardan en el repositorio para poder rehacer una
//     conversión, pero publicarlos significa que cualquiera puede bajarse el
//     video original de 19 MB en vez del de 0,7 MB.
//
//   · Los .png de assets/images son la versión previa a convertir a .webp,
//     que es la que el sitio realmente pide. Cada uno pesa varios MB y ninguno
//     se referencia, salvo el logo, que no tiene versión .webp.
//
// Los archivos NO se borran del repositorio: solo dejan de copiarse a _site.
function sePublica(origen) {
  const ruta = origen.split(sep).join("/");
  if (ruta.includes("/assets/originals")) return false;
  // Un .png con hermano .webp es la versión vieja: se queda fuera.
  if (ruta.endsWith(".png") && existsSync(origen.replace(/\.png$/, ".webp"))) return false;
  return true;
}

for (const carpeta of CARPETAS) {
  const origen = join(raiz, carpeta);
  if (!(await existe(origen))) continue;
  await cp(origen, join(salida, carpeta), { recursive: true, filter: sePublica });
}

// --------------------------------------------------- Anticaché automático
//
// Las hojas de estilo y los scripts se enlazan con ?v=algo para que, al
// cambiarlos, el navegador se baje la versión nueva en lugar de servir la que
// tiene guardada.
//
// Ese número se venía escribiendo a mano, y eso falló: odrys-mockup.css se
// modificó cinco veces mientras su ?v= seguía en 20260816-8. Quien ya había
// visitado el sitio siguió viendo el diseño viejo —entre otras cosas, el hero
// de barbería sin el video— porque para su navegador la URL no había
// cambiado. El propio sitio se veía bien en un navegador sin caché, que es
// justo lo que hace difícil notar el problema.
//
// Ahora el número se calcula del contenido del archivo. Si el archivo cambia,
// la URL cambia sola; si no cambia, se mantiene y el navegador sigue
// reutilizando lo que ya tiene. Es imposible olvidarse.
async function huella(rutaRelativa) {
  const completa = join(salida, rutaRelativa);
  if (!existsSync(completa)) return null;
  const { createHash } = await import("node:crypto");
  return createHash("md5").update(await readFile(completa)).digest("hex").slice(0, 10);
}

const HTML = [...ARCHIVOS.filter((a) => a.endsWith(".html")), "admin/index.html"];
let sellados = 0;

for (const archivo of HTML) {
  const ruta = join(salida, archivo);
  if (!existsSync(ruta)) continue;
  let html = await readFile(ruta, "utf8");
  const carpeta = archivo.includes("/") ? archivo.split("/")[0] + "/" : "";
  let tocado = false;

  // Se reemplaza el ?v= de cualquier .css o .js propio que la página enlace.
  const pendientes = [...html.matchAll(/(?:href|src)="([\w./-]+\.(?:css|js))\?v=[^"]*"/g)];
  for (const [, recurso] of pendientes) {
    // El recurso es relativo a la página: admin/index.html pide "admin.css".
    const h = await huella(carpeta + recurso);
    if (!h) continue;
    html = html.split(`${recurso}?v=`).map((parte, i) =>
      i === 0 ? parte : parte.replace(/^[^"]*/, h)).join(`${recurso}?v=`);
    tocado = true;
  }
  if (tocado) { await writeFile(ruta, html, "utf8"); sellados += 1; }
}

// Evita que GitHub Pages procese el sitio con Jekyll y descarte carpetas que
// empiezan con guion bajo. Cloudflare lo ignora sin problema.
await writeFile(join(salida, ".nojekyll"), "");

console.log(`Sitio armado en _site (${ARCHIVOS.length} archivos y ${CARPETAS.length} carpetas).`);
console.log(`Anticaché aplicado a ${sellados} páginas.`);
