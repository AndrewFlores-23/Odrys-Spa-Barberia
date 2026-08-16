// Inserta la franja de créditos de AW-RiseCR al final de cada página.
//
//   node tools/creditos.mjs
//
// Idempotente: quita el bloque anterior antes de escribir el nuevo.
import { readFile, writeFile, access } from "node:fs/promises";
import { join, resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "..");

const EMPRESA = "AW-RiseCR";
const WHATSAPP = "50685847369";
const MENSAJE = "Vi su trabajo y me gustaría más información para hacer una web con ustedes!";

// URLs limpias: se les quitaron los parámetros de rastreo que agrega el botón
// de compartir (igsh, utm_source, mibextid). Llevan al mismo lugar.
const INSTAGRAM = "https://www.instagram.com/aw_risecr";
const FACEBOOK = "https://www.facebook.com/share/1CZYECAw3w/";
// El logo tiene fondo transparente, así que va directo sobre el fondo oscuro
// de la franja: el neón se ve como corresponde, sin recuadro detrás.
const LOGO = "assets/images/aw-risecr-logo.webp";

const PAGINAS = ["index.html", "odrys-mockup.html", "barberia.html", "spa.html"];

const MARCA_INICIO = "<!-- creditos:inicio -->";
const MARCA_FIN = "<!-- creditos:fin -->";

const ICONOS = {
  instagram:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.25 2.2.41.6.22 1 .49 1.4.9.4.4.68.8.9 1.4.16.4.35 1 .41 2.2.06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.06 1.2-.25 1.8-.41 2.2a3.8 3.8 0 0 1-.9 1.4c-.4.4-.8.68-1.4.9-.4.16-1 .35-2.2.41-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.06-1.8-.25-2.2-.41a3.8 3.8 0 0 1-1.4-.9 3.8 3.8 0 0 1-.9-1.4c-.16-.4-.35-1-.41-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.06-1.2.25-1.8.41-2.2.22-.6.49-1 .9-1.4.4-.4.8-.68 1.4-.9.4-.16 1-.35 2.2-.41C8.4 2.2 8.8 2.2 12 2.2Zm0 1.9c-3.1 0-3.5 0-4.7.07-1.1.05-1.7.23-2.1.39-.5.2-.9.44-1.3.83-.4.4-.63.8-.83 1.3-.16.4-.34 1-.39 2.1-.06 1.2-.07 1.6-.07 4.7s0 3.5.07 4.7c.05 1.1.23 1.7.39 2.1.2.5.44.9.83 1.3.4.4.8.63 1.3.83.4.16 1 .34 2.1.39 1.2.06 1.6.07 4.7.07s3.5 0 4.7-.07c1.1-.05 1.7-.23 2.1-.39.5-.2.9-.44 1.3-.83.4-.4.63-.8.83-1.3.16-.4.34-1 .39-2.1.06-1.2.07-1.6.07-4.7s0-3.5-.07-4.7c-.05-1.1-.23-1.7-.39-2.1a3.5 3.5 0 0 0-.83-1.3 3.5 3.5 0 0 0-1.3-.83c-.4-.16-1-.34-2.1-.39-1.2-.06-1.6-.07-4.7-.07Zm0 3.2a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4Zm0 1.9a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm5.9-2.1a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0Z"/></svg>',
  facebook:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z"/></svg>',
  whatsapp:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5 0-.2 0-.4 0-.5 0-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.5.3-.7.3-1.4.2-1.5 0-.2-.3-.2-.6-.3ZM12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 1.9a8.1 8.1 0 0 1 6.6 12.8l-.2.3.6 2.3-2.3-.6-.3.2A8.1 8.1 0 1 1 12 3.9Z"/></svg>',
};

async function existe(ruta) {
  try { await access(ruta); return true; } catch { return false; }
}

function bloque(hayLogo) {
  const enlaceWhatsapp = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MENSAJE)}`;
  const logo = hayLogo
    ? `<img class="creditos-logo" src="${LOGO}" alt="${EMPRESA}" loading="lazy" width="46" height="46">`
    : "";

  return `${MARCA_INICIO}
<section class="creditos" aria-label="Créditos de desarrollo">
  <div class="creditos-marca">
    ${logo}
    <div>
      <small data-es="DESARROLLADO POR" data-en="DEVELOPED BY">DESARROLLADO POR</small>
      <strong>AW<em>-</em>RiseCR</strong>
      <span data-es="Páginas web y sistemas para negocios" data-en="Websites and systems for businesses">Páginas web y sistemas para negocios</span>
    </div>
  </div>
  <div class="creditos-redes">
    <a class="creditos-instagram" href="${INSTAGRAM}" target="_blank" rel="noopener" aria-label="Instagram de ${EMPRESA}">${ICONOS.instagram}INSTAGRAM</a>
    <a class="creditos-facebook" href="${FACEBOOK}" target="_blank" rel="noopener" aria-label="Facebook de ${EMPRESA}">${ICONOS.facebook}FACEBOOK</a>
    <!-- El data-es/data-en va en el span, nunca en el enlace: idioma.js
         reemplaza todo el contenido del elemento traducible y borraría el ícono. -->
    <a class="creditos-whatsapp" href="${enlaceWhatsapp}" target="_blank" rel="noopener" aria-label="Escribir a ${EMPRESA} por WhatsApp">${ICONOS.whatsapp}<span data-es="QUIERO UNA WEB" data-en="I WANT A WEBSITE">QUIERO UNA WEB</span></a>
  </div>
</section>
${MARCA_FIN}`;
}

const hayLogo = await existe(join(raiz, LOGO));
if (!hayLogo) {
  console.log(`  Aviso: falta ${LOGO}. Se escriben los créditos sin imagen para no dejar`);
  console.log("  un ícono roto. Guardá el logo ahí y volvé a correr este script.");
}

for (const archivo of PAGINAS) {
  const ruta = join(raiz, archivo);
  let html = await readFile(ruta, "utf8");

  html = html.replace(new RegExp(`\\s*${MARCA_INICIO}[\\s\\S]*?${MARCA_FIN}`, "g"), "");
  // Va después del pie de página, como última franja del documento.
  html = html.replace("</footer>", `</footer>\n${bloque(hayLogo)}`);

  await writeFile(ruta, html, "utf8");
  console.log(`  ${archivo}: créditos ${hayLogo ? "con logo" : "sin logo"}`);
}
console.log("Listo.");
