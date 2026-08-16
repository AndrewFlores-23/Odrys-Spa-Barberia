# Odry's Beauty Spa & Barber

Sitio web y sistema de reservas de Odry's, en Tamarindo, Guanacaste.

## Qué es esto

Dos piezas que trabajan juntas:

1. **Sitio público** — HTML, CSS y JavaScript sin compilación. Se abre tal cual,
   sin `npm install`. Es lo que ve la clienta.
2. **Sistema de reservas** — base de datos PostgreSQL en Supabase, con cuentas
   por rol, horarios reales y agenda. El sitio la consulta desde el navegador.

## Estructura

```
index.html            Portada (odrys-mockup.html es una copia idéntica)
barberia.html         Barbería y estilismo — 7 servicios
spa.html              Spa — 29 servicios
odrys-mockup.css      Todo el diseño
idioma.js             Cambio de idioma ES/EN
reservas.js           Carrito, disponibilidad y reserva contra Supabase
novedades.js          Pestañas de novedades en la portada
experiencias.js       Galería comparativa del spa
assets/               Imágenes, video y configuración pública
  js/odrys-config.js  URL y clave pública de Supabase
supabase/migrations/  Historial del esquema de la base
tools/dev-server.mjs  Servidor local para previsualizar
docs/                 Documentación heredada del andamiaje de Codex
```

Las carpetas `app/`, `worker/`, `db/`, `drizzle/` y los archivos `next.config.ts`,
`vite.config.ts` y `package.json` pertenecen a un andamiaje de Next.js sobre
Cloudflare que quedó sin usar cuando el proyecto pasó a Supabase. Se conservan
por si hicieran falta; el sitio no depende de ellos.

## Ver el sitio en local

```bash
node tools/dev-server.mjs
```

Queda en `http://localhost:4321`. No requiere dependencias.

## Base de datos

| Tabla                  | Para qué                                             |
| ---------------------- | ---------------------------------------------------- |
| `profiles`             | Cuentas del personal y su rol                         |
| `services`             | Catálogo con precio, duración e idioma                |
| `employee_services`    | Qué servicio puede dar cada profesional               |
| `employee_schedules`   | Horario semanal de atención                           |
| `time_off`             | Vacaciones y bloqueos de agenda                       |
| `appointments`         | Citas reservadas                                      |
| `appointment_services` | Detalle de cada cita, con el precio congelado         |

Roles: `administrador`, `barbero`, `estilista`, `masajista`.

### Cómo se protege

- **RLS activo en todas las tablas.** Cada profesional solo ve sus propias
  citas; el administrador ve todo. La regla se aplica en la base, no en el
  navegador, así que no se puede saltar desde la consola.
- **Sin doble reserva.** Una restricción `EXCLUDE` sobre el rango de horario
  impide físicamente dos citas encimadas para la misma persona.
- **Reserva por una sola puerta.** El público no puede insertar en
  `appointments`: solo puede llamar a `book_appointment()`, que valida horario,
  ausencias, servicios y límites antes de escribir.
- **Sin escalada de privilegios.** Un trigger impide que alguien se cambie el
  rol o se reactive a sí mismo.

La clave `service_role` de Supabase **nunca** debe entrar en este repositorio.
La única clave publicada es la `publishable`, que sin RLS no sirve de nada.

## Publicación

Cada push a `main` dispara `.github/workflows/deploy.yml`, que publica el sitio
en GitHub Pages.

## Migraciones

Los archivos de `supabase/migrations/` son el historial del esquema. Se aplican
en orden y quedan registrados en la base.
