// Servidor estático mínimo para previsualizar el sitio de Odry's en local.
// Uso: node tools/dev-server.mjs [puerto]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const port = Number(process.argv[2] ?? 4321);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = createServer(async (request, response) => {
  const requested = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  // normalize + prefijo obliga a que todo quede dentro de la carpeta del proyecto.
  const candidate = normalize(join(root, requested === "/" ? "/index.html" : requested));
  if (!candidate.startsWith(root)) {
    response.writeHead(403).end("Prohibido");
    return;
  }

  try {
    const info = await stat(candidate);
    const file = info.isDirectory() ? join(candidate, "index.html") : candidate;
    const body = await readFile(file);
    response.writeHead(200, {
      "content-type": types[extname(file).toLowerCase()] ?? "application/octet-stream",
      // El sitio se edita constantemente: nunca cachear durante el desarrollo.
      "cache-control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    response.end("<h1>404</h1><p>No se encontró el archivo solicitado.</p>");
  }
});

server.listen(port, () => console.log(`Odry's en vista previa: http://localhost:${port}`));
