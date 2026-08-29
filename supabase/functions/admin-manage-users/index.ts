// Gestión de cuentas del personal de Odry's.
//
// Vive en el servidor por una razón concreta: crear y borrar cuentas exige la
// clave `service_role`, que salta todas las políticas RLS. Esa clave no puede
// existir en el navegador, así que el panel llama a esta función y esta función
// verifica, en cada petición, que quien llama sea de verdad administrador.
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_SUPABASE = Deno.env.get("SUPABASE_URL")!;
const CLAVE_ANONIMA = Deno.env.get("SUPABASE_ANON_KEY")!;
const CLAVE_SERVICIO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// A dónde vuelve la persona tras confirmar el correo desde su teléfono.
// Esta URL debe estar además en la lista de redirecciones permitidas de
// Supabase (Authentication → URL Configuration) o el enlace del correo falla.
const DESTINO_INVITACION = Deno.env.get("ODRYS_URL_PANEL")
  ?? "https://odrysbeautyspa.com/admin/";

const ROLES_VALIDOS = ["administrador", "barbero", "estilista", "masajista"];

// Antes se respondía con "*", que deja a cualquier sitio invocar esta función
// desde el navegador de una administradora con sesión abierta. Ahora se
// devuelve el origen solo si está en la lista. Se incluye el dominio de
// workers.dev porque el panel sigue accesible ahí mientras se propaga el DNS.
const ORIGENES_PERMITIDOS = (
  Deno.env.get("ODRYS_ORIGENES_PERMITIDOS") ??
  "https://odrysbeautyspa.com,https://www.odrysbeautyspa.com,https://odrys-spa-barberia.beautyspaodrys.workers.dev,http://localhost:4321"
).split(",").map((o) => o.trim()).filter(Boolean);

function cabecerasPara(peticion: Request) {
  const origen = peticion.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGENES_PERMITIDOS.includes(origen) ? origen : ORIGENES_PERMITIDOS[0],
    // Sin Vary, una caché intermedia podría servirle a un origen la respuesta
    // que se generó para otro.
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

Deno.serve(async (peticion) => {
  const cabeceras = cabecerasPara(peticion);
  const responder = (estado: number, cuerpo: unknown) =>
    new Response(JSON.stringify(cuerpo), { status: estado, headers: cabeceras });

  if (peticion.method === "OPTIONS") return new Response("ok", { headers: cabeceras });
  if (peticion.method !== "POST") return responder(405, { error: "Método no permitido." });

  const autorizacion = peticion.headers.get("Authorization");
  if (!autorizacion) return responder(401, { error: "Falta la sesión." });

  // Se resuelve la identidad con la clave anónima y el token de quien llama:
  // así el propio Supabase valida la firma del JWT.
  const comoVisitante = createClient(URL_SUPABASE, CLAVE_ANONIMA, {
    global: { headers: { Authorization: autorizacion } },
  });
  const { data: { user: quienLlama } } = await comoVisitante.auth.getUser();
  if (!quienLlama) return responder(401, { error: "Sesión inválida o expirada." });

  const comoServicio = createClient(URL_SUPABASE, CLAVE_SERVICIO);

  // El rol se lee de la base, nunca del token: un JWT podría traer datos viejos.
  const { data: perfil } = await comoServicio
    .from("profiles")
    .select("role, active, email_confirmed_at")
    .eq("id", quienLlama.id)
    .single();

  if (!perfil || perfil.role !== "administrador" || !perfil.active || !perfil.email_confirmed_at) {
    return responder(403, { error: "Solo un administrador con el correo confirmado puede hacer esto." });
  }

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await peticion.json();
  } catch {
    return responder(400, { error: "Petición mal formada." });
  }

  const accion = String(cuerpo.accion ?? "");

  try {
    switch (accion) {
      // ---------------------------------------------------------------------
      case "listar": {
        const { data: perfiles, error } = await comoServicio
          .from("profiles")
          .select("id, full_name, role, phone, active, email_confirmed_at, created_at")
          .order("full_name");
        if (error) throw error;

        // El correo vive en el esquema auth, así que se cruza aparte.
        const { data: cuentas } = await comoServicio.auth.admin.listUsers({ perPage: 200 });
        const correos = new Map(cuentas.users.map((u) => [u.id, u.email]));

        const { data: asignaciones } = await comoServicio
          .from("employee_services").select("employee_id, service_id");
        const porEmpleado = new Map<string, string[]>();
        (asignaciones ?? []).forEach(({ employee_id, service_id }) => {
          if (!porEmpleado.has(employee_id)) porEmpleado.set(employee_id, []);
          porEmpleado.get(employee_id)!.push(service_id);
        });

        return responder(200, {
          usuarios: perfiles.map((p) => ({
            ...p,
            email: correos.get(p.id) ?? null,
            servicios: porEmpleado.get(p.id) ?? [],
          })),
        });
      }

      // ---------------------------------------------------------------------
      case "invitar": {
        const email = String(cuerpo.email ?? "").trim().toLowerCase();
        const nombre = String(cuerpo.full_name ?? "").trim();
        const rol = String(cuerpo.role ?? "");

        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          return responder(400, { error: "El correo no tiene un formato válido." });
        }
        if (nombre.length < 2 || nombre.length > 120) {
          return responder(400, { error: "Ingresá un nombre válido." });
        }
        if (!ROLES_VALIDOS.includes(rol)) {
          return responder(400, { error: "Rol no reconocido." });
        }

        // inviteUserByEmail crea la cuenta SIN contraseña y sin confirmar, y
        // manda el correo. La persona elige su clave al abrir el enlace, así
        // que ninguna contraseña pasa por acá ni por el panel.
        const { data, error } = await comoServicio.auth.admin.inviteUserByEmail(email, {
          data: { full_name: nombre, role: rol },
          redirectTo: DESTINO_INVITACION,
        });

        if (error) {
          const yaExiste = /already been registered|already exists/i.test(error.message);
          return responder(yaExiste ? 409 : 400, {
            error: yaExiste ? "Ya existe una cuenta con ese correo." : error.message,
          });
        }
        return responder(200, { ok: true, id: data.user?.id, email });
      }

      // ---------------------------------------------------------------------
      case "reenviar_invitacion": {
        const email = String(cuerpo.email ?? "").trim().toLowerCase();
        const { error } = await comoServicio.auth.admin.inviteUserByEmail(email, {
          redirectTo: DESTINO_INVITACION,
        });
        if (error) return responder(400, { error: error.message });
        return responder(200, { ok: true });
      }

      // ---------------------------------------------------------------------
      case "cambiar_rol": {
        const id = String(cuerpo.id ?? "");
        const rol = String(cuerpo.role ?? "");
        if (!ROLES_VALIDOS.includes(rol)) return responder(400, { error: "Rol no reconocido." });
        if (id === quienLlama.id) {
          return responder(400, { error: "No podés cambiarte el rol a vos mismo." });
        }
        // El trigger de la base retira solo los servicios que el nuevo rol no permite.
        const { error } = await comoServicio.from("profiles").update({ role: rol }).eq("id", id);
        if (error) return responder(400, { error: error.message });
        return responder(200, { ok: true, role: rol });
      }

      // ---------------------------------------------------------------------
      case "cambiar_estado": {
        const id = String(cuerpo.id ?? "");
        const activo = Boolean(cuerpo.active);
        if (id === quienLlama.id) {
          return responder(400, { error: "No podés desactivarte a vos mismo." });
        }
        const { error } = await comoServicio.from("profiles").update({ active: activo }).eq("id", id);
        // Se devuelve el motivo real: el 500 genérico que había acá tapaba
        // que un disparador de la base estaba rechazando el cambio.
        if (error) return responder(400, { error: error.message });
        return responder(200, { ok: true, active: activo });
      }

      // ---------------------------------------------------------------------
      case "asignar_servicios": {
        const id = String(cuerpo.id ?? "");
        const servicios = Array.isArray(cuerpo.servicios) ? cuerpo.servicios.map(String) : [];

        await comoServicio.from("employee_services").delete().eq("employee_id", id);
        if (servicios.length) {
          const { error } = await comoServicio.from("employee_services").insert(
            servicios.map((service_id) => ({ employee_id: id, service_id })),
          );
          // El trigger validar_servicio_por_rol rechaza lo que el rol no permita.
          if (error) return responder(400, { error: error.message });
        }
        return responder(200, { ok: true });
      }

      // ---------------------------------------------------------------------
      case "eliminar": {
        const id = String(cuerpo.id ?? "");
        if (id === quienLlama.id) {
          return responder(400, { error: "No podés eliminar tu propia cuenta." });
        }

        // Las citas conservan el historial: appointments.employee_id no borra
        // en cascada, así que si la persona tiene alguna se desactiva en vez de
        // borrarse. Antes este camino ignoraba el error del UPDATE y respondía
        // "se desactivó" aunque la fila hubiera quedado activa.
        const { count, error: errorConteo } = await comoServicio
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("employee_id", id);
        if (errorConteo) return responder(400, { error: errorConteo.message });

        const citas = count ?? 0;
        if (citas > 0) {
          const { error } = await comoServicio
            .from("profiles").update({ active: false }).eq("id", id);
          if (error) return responder(400, { error: error.message });

          // Desactivar no toca la agenda: las citas futuras siguen ahí y hay
          // que reasignarlas o cancelarlas a mano.
          const { count: futuras } = await comoServicio
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("employee_id", id)
            .eq("status", "confirmada")
            .gte("starts_at", new Date().toISOString());

          const pendientes = futuras ?? 0;
          return responder(200, {
            ok: true,
            desactivado: true,
            citas,
            pendientes,
            mensaje:
              `Tiene ${citas} cita(s) en el historial, así que la cuenta se desactivó en lugar de borrarse.`
              + (pendientes > 0
                ? ` Atención: ${pendientes} sigue(n) agendada(s) a futuro; reasignalas o cancelalas desde la agenda.`
                : ""),
          });
        }

        const { error } = await comoServicio.auth.admin.deleteUser(id);
        if (error) return responder(400, { error: error.message });
        return responder(200, { ok: true, eliminado: true, mensaje: "Cuenta eliminada." });
      }

      default:
        return responder(400, { error: "Acción no reconocida." });
    }
  } catch (problema) {
    console.error("[admin-manage-users]", problema);
    return responder(500, { error: "Error interno al procesar la solicitud." });
  }
});
