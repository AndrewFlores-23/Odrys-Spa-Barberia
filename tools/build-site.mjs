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
import { join, resolve, dirname } from "node:path";

const raiz = resolve(import.meta.dirname, "..");
const salida = join(raiz, "_site");

const ARCHIVOS = [
  "index.html",
  "odrys-mockup.html",
  "barberia.html",
  "spa.html",
  "odrys-mockup.css",
  "idioma.js",
  "novedades.js",
  "experiencias.js",
  "reservas.js",
  "robots.txt",
  "sitemap.xml",
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

for (const carpeta of CARPETAS) {
  const origen = join(raiz, carpeta);
  if (!(await existe(origen))) continue;
  await cp(origen, join(salida, carpeta), { recursive: true });
}

// Evita que GitHub Pages procese el sitio con Jekyll y descarte carpetas que
// empiezan con guion bajo. Cloudflare lo ignora sin problema.
await writeFile(join(salida, ".nojekyll"), "");

console.log(`Sitio armado en _site (${ARCHIVOS.length} archivos y ${CARPETAS.length} carpetas).`);
