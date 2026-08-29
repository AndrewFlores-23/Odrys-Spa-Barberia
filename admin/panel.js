// Panel de administración de Odry's.
//
// Nota de seguridad: acá no se decide nada. Este archivo esconde botones y
// pinta listas, pero quien realmente autoriza es la base de datos (políticas
// RLS) y la función admin-manage-users. Alguien que abra la consola del
// navegador y muestre las pestañas ocultas no obtiene ningún permiso extra:
// las consultas seguirán devolviéndole solo lo suyo.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const config = window.ODRYS_CONFIG ?? {};
const ZONA = config.zonaHoraria ?? "America/Costa_Rica";

// El enlace de invitación llega como #access_token=…&type=invite. El cliente
// de Supabase consume ese hash al arrancar, así que hay que leerlo antes.
const hashInicial = new URLSearchParams(location.hash.replace(/^#/, ""));
const tipoEnlace = hashInicial.get("type");
const errorEnlace = hashInicial.get("error_description");

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const ROLES = {
  administrador: "Administrador",
  barbero: "Barbero",
  estilista: "Estilista",
  masajista: "Masajista",
};

const ESTADOS = {
  confirmada: { texto: "Confirmada", clase: "ok" },
  completada: { texto: "Completada", clase: "neutra" },
  cancelada: { texto: "Cancelada", clase: "alto" },
  no_show: { texto: "No se presentó", clase: "alto" },
};

let sesionPerfil = null;
let catalogoServicios = [];
let mapaRolServicios = new Map();
let tipoCambio = 520;

// ---------------------------------------------------------------- Utilidades
const escapar = (valor) => String(valor ?? "").replace(/[&<>'"]/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[c]));

const fechaHora = (iso) => new Intl.DateTimeFormat("es-CR", {
  weekday: "short", day: "numeric", month: "short",
  hour: "numeric", minute: "2-digit", timeZone: ZONA,
}).format(new Date(iso));

const soloHora = (iso) => new Intl.DateTimeFormat("es-CR", {
  hour: "2-digit", minute: "2-digit", timeZone: ZONA,
}).format(new Date(iso));

const dinero = (monto, moneda = "USD") => monto === null || monto === undefined
  ? "—"
  : new Intl.NumberFormat("es-CR", { style: "currency", currency: moneda, maximumFractionDigits: 0 }).format(monto);

// Los precios se guardan en dólares. Los colones son una conversión de
// referencia con el tipo de cambio del negocio: el monto final se cobra en caja.
const colones = (montoUsd) => montoUsd === null || montoUsd === undefined
  ? "—"
  : `₡${new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(Math.round(montoUsd * tipoCambio))}`;

const ambasMonedas = (montoUsd) => `${dinero(montoUsd)} · ${colones(montoUsd)}`;

// Fecha local en formato YYYY-MM-DD, sin que el desfase de zona la corra un día.
const fechaLocal = (desplazamientoDias = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + desplazamientoDias);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
};

function avisar(mensaje, tipo = "", milisegundos = 5000) {
  const nodo = document.createElement("div");
  nodo.className = `aviso ${tipo}`;
  nodo.textContent = mensaje;
  $("#avisos").append(nodo);
  // Un aviso largo —como el de "se desactivó y quedan citas"— no alcanza a
  // leerse en los cinco segundos que sirven para un "listo".
  setTimeout(() => nodo.remove(), milisegundos);
}

function mostrarPantalla(cual) {
  ["#pantalla-cargando", "#pantalla-login", "#pantalla-clave", "#panel"].forEach((sel) => {
    $(sel).hidden = sel !== cual;
  });
}

// Llama a la función de servidor que administra cuentas.
async function llamarAdmin(cuerpo) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("La sesión expiró. Volvé a entrar.");

  const respuesta = await fetch(`${config.supabaseUrl}/functions/v1/admin-manage-users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: config.supabaseKey,
    },
    body: JSON.stringify(cuerpo),
  });

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const problema = new Error(datos.error ?? "No se pudo completar la operación.");
    problema.estado = respuesta.status;
    throw problema;
  }
  return datos;
}

// ------------------------------------------------------------------ Arranque
async function arrancar() {
  if (errorEnlace) {
    mostrarPantalla("#pantalla-login");
    $("#error-login").textContent = decodeURIComponent(errorEnlace).replace(/\+/g, " ");
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    mostrarPantalla("#pantalla-login");
    return;
  }

  const { data: perfil, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, active, must_change_password, email_confirmed_at")
    .eq("id", session.user.id)
    .single();

  if (error || !perfil) {
    await supabase.auth.signOut();
    mostrarPantalla("#pantalla-login");
    $("#error-login").textContent = "Tu cuenta todavía no está habilitada. Contactá a la administración.";
    return;
  }

  sesionPerfil = perfil;

  // Quien llega por invitación o recuperación aún no tiene contraseña propia.
  if (tipoEnlace === "invite" || tipoEnlace === "recovery" || perfil.must_change_password) {
    if (tipoEnlace === "invite") {
      $("#titulo-clave").textContent = "Activá tu cuenta";
      $("#sub-clave").textContent = `Bienvenido/a, ${perfil.full_name}. Definí una contraseña para entrar.`;
    }
    mostrarPantalla("#pantalla-clave");
    return;
  }

  if (!perfil.active) {
    await supabase.auth.signOut();
    mostrarPantalla("#pantalla-login");
    $("#error-login").textContent = "Tu cuenta está desactivada.";
    return;
  }

  await abrirPanel();
}

// --------------------------------------------------------------------- Login
// Se recuerda únicamente el correo. La contraseña nunca se guarda: quedaría
// legible para cualquiera que abra el navegador de ese dispositivo, y en un
// salón la computadora suele ser compartida.
const CLAVE_CORREO_RECORDADO = "odrys-correo-recordado";

// ---------------------------------------------------------------- Intentos
// Freno a la fuerza bruta desde la propia pantalla.
//
// Honestidad sobre su alcance: esto vive en el navegador, así que solo detiene
// a quien pruebe contraseñas usando el formulario. Alguien que llame a la API
// de Supabase directamente se lo salta. La barrera de verdad es el límite por
// IP de Supabase (30 intentos cada 5 minutos). Esto suma una capa contra el
// caso realista —alguien probando claves en la computadora del salón— y le
// avisa a la persona que algo raro pasa.
const CLAVE_INTENTOS = "odrys-intentos-login";
const INTENTOS_MAXIMOS = 5;
const BLOQUEO_MINUTOS = 15;

function leerIntentos() {
  try { return JSON.parse(localStorage.getItem(CLAVE_INTENTOS) ?? "null") ?? { fallos: 0, hasta: 0 }; }
  catch (_) { return { fallos: 0, hasta: 0 }; }
}

function guardarIntentos(estado) {
  try { localStorage.setItem(CLAVE_INTENTOS, JSON.stringify(estado)); } catch (_) { /* modo privado */ }
}

function segundosDeEspera() {
  const { hasta } = leerIntentos();
  return hasta > Date.now() ? Math.ceil((hasta - Date.now()) / 1000) : 0;
}

// Espera creciente antes del bloqueo: 2, 4, 8… segundos. Vuelve costoso
// probar en cadena sin molestar a quien simplemente se equivocó una vez.
function esperaTrasFallo(fallos) {
  return fallos < 2 ? 0 : Math.min(2 ** (fallos - 1), 30) * 1000;
}

let temporizadorBloqueo = null;
function reflejarBloqueo() {
  const boton = $("#form-login").querySelector("button[type=submit]");
  const restante = segundosDeEspera();

  if (restante <= 0) {
    boton.disabled = false;
    boton.textContent = "ENTRAR";
    if (temporizadorBloqueo) { clearInterval(temporizadorBloqueo); temporizadorBloqueo = null; }
    return;
  }

  boton.disabled = true;
  const minutos = Math.floor(restante / 60);
  const segundos = String(restante % 60).padStart(2, "0");
  boton.textContent = `BLOQUEADO ${minutos}:${segundos}`;
  $("#error-login").textContent =
    `Demasiados intentos fallidos. Esperá ${minutos > 0 ? `${minutos} min` : `${segundos} s`} antes de volver a probar.`;

  if (!temporizadorBloqueo) temporizadorBloqueo = setInterval(reflejarBloqueo, 1000);
}

function registrarFallo() {
  const estado = leerIntentos();
  estado.fallos += 1;
  if (estado.fallos >= INTENTOS_MAXIMOS) {
    estado.hasta = Date.now() + BLOQUEO_MINUTOS * 60 * 1000;
    estado.fallos = 0;
  }
  guardarIntentos(estado);
  reflejarBloqueo();
}

function limpiarIntentos() {
  guardarIntentos({ fallos: 0, hasta: 0 });
  reflejarBloqueo();
}

(function precargarCorreo() {
  try {
    const guardado = localStorage.getItem(CLAVE_CORREO_RECORDADO);
    if (!guardado) return;
    $("#form-login").email.value = guardado;
    $("#recordar-correo").checked = true;
    // Con el correo ya puesto, el cursor va directo a la contraseña.
    $("#form-login").password.focus();
  } catch (_) { /* navegación privada */ }
})();

reflejarBloqueo();

$("#form-login").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (segundosDeEspera() > 0) return;

  const boton = evento.target.querySelector("button[type=submit]");
  const datos = new FormData(evento.target);
  const correo = String(datos.get("email")).trim().toLowerCase();
  $("#error-login").textContent = "";
  boton.disabled = true;
  boton.textContent = "ENTRANDO…";

  try {
    if ($("#recordar-correo").checked) localStorage.setItem(CLAVE_CORREO_RECORDADO, correo);
    else localStorage.removeItem(CLAVE_CORREO_RECORDADO);
  } catch (_) { /* navegación privada */ }

  // La espera va antes de consultar, no después: así no se puede medir el
  // tiempo de respuesta para deducir si el correo existe.
  const espera = esperaTrasFallo(leerIntentos().fallos);
  if (espera > 0) await new Promise((seguir) => setTimeout(seguir, espera));

  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: String(datos.get("password")),
  });

  boton.disabled = false;
  boton.textContent = "ENTRAR";

  if (error) {
    registrarFallo();
    // Supabase responde lo mismo ante correo inexistente y clave incorrecta,
    // lo cual es deseable: no revela qué correos están registrados.
    if (segundosDeEspera() === 0) {
      $("#error-login").textContent = /email not confirmed/i.test(error.message)
        ? "Tenés que confirmar tu correo antes de entrar. Revisá tu bandeja."
        : "Correo o contraseña incorrectos.";
    }
    return;
  }

  limpiarIntentos();
  await arrancar();
});

// ------------------------------------------------- Olvidé mi contraseña
const dialogoRecuperar = $("#dialogo-recuperar");
$("#btn-olvide").addEventListener("click", () => {
  $("#form-recuperar").reset();
  $("#error-recuperar").textContent = "";
  $("#form-recuperar").querySelector("input").value = $("#form-login").email.value;
  dialogoRecuperar.showModal();
});

$("#form-recuperar").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const boton = evento.target.querySelector("button[type=submit]");
  const correo = String(new FormData(evento.target).get("email")).trim().toLowerCase();
  $("#error-recuperar").textContent = "";
  boton.disabled = true;
  boton.textContent = "ENVIANDO…";

  const { error } = await supabase.auth.resetPasswordForEmail(correo, {
    // Al volver, el enlace trae type=recovery y arrancar() muestra la
    // pantalla para definir la contraseña nueva.
    redirectTo: `${location.origin}${location.pathname}`,
  });

  boton.disabled = false;
  boton.textContent = "ENVIAR ENLACE";

  if (error) {
    $("#error-recuperar").textContent = error.message;
    return;
  }

  dialogoRecuperar.close();
  // Se responde igual exista o no la cuenta: decir "ese correo no existe"
  // revelaría qué direcciones están registradas.
  avisar("Si ese correo tiene una cuenta, le enviamos el enlace. Revisá tu bandeja y el spam.", "exito");
});

$("#btn-salir").addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.hash = "";
  location.reload();
});

// ------------------------------------------------------- Definir contraseña
const formClave = $("#form-clave");
const reglasClave = (clave, repetida) => ({
  largo: clave.length >= 10,
  mayus: /[A-ZÁÉÍÓÚÑ]/.test(clave),
  numero: /\d/.test(clave),
  iguales: clave.length > 0 && clave === repetida,
});

formClave.addEventListener("input", () => {
  const datos = new FormData(formClave);
  const estado = reglasClave(String(datos.get("password")), String(datos.get("password2")));
  $$("#requisitos-clave li").forEach((li) => {
    li.classList.toggle("cumple", estado[li.dataset.regla]);
  });
});

formClave.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const boton = evento.target.querySelector("button[type=submit]");
  const datos = new FormData(evento.target);
  const clave = String(datos.get("password"));
  const estado = reglasClave(clave, String(datos.get("password2")));
  $("#error-clave").textContent = "";

  if (!Object.values(estado).every(Boolean)) {
    $("#error-clave").textContent = "La contraseña no cumple todos los requisitos.";
    return;
  }

  boton.disabled = true;
  boton.textContent = "GUARDANDO…";

  const { error } = await supabase.auth.updateUser({ password: clave });
  if (error) {
    $("#error-clave").textContent = error.message;
    boton.disabled = false;
    boton.textContent = "GUARDAR CONTRASEÑA";
    return;
  }

  await supabase.rpc("marcar_contrasena_actualizada");
  history.replaceState(null, "", location.pathname);
  avisar("Contraseña guardada.", "exito");

  const { data: perfil } = await supabase
    .from("profiles").select("id, full_name, role, active, must_change_password, email_confirmed_at")
    .eq("id", (await supabase.auth.getUser()).data.user.id).single();
  sesionPerfil = perfil;
  await abrirPanel();
});

// --------------------------------------------------------------------- Panel
async function abrirPanel() {
  const esAdmin = sesionPerfil.role === "administrador";

  $("#usuario-nombre").textContent = sesionPerfil.full_name;
  $("#usuario-rol").textContent = ROLES[sesionPerfil.role] ?? sesionPerfil.role;
  $$("#pestanas [data-solo-admin]").forEach((b) => { b.hidden = !esAdmin; });
  $("#filtro-profesional-envoltura").hidden = !esAdmin;
  $("#btn-ausencia").hidden = !esAdmin;

  mostrarPantalla("#panel");

  $("#agenda-desde").value = fechaLocal(0);
  $("#agenda-hasta").value = fechaLocal(30);

  await Promise.all([recargarCatalogo(), cargarTipoCambio()]);

  if (esAdmin) await cargarProfesionalesEnFiltros();
  await cargarAgenda();
}

$("#pestanas").addEventListener("click", (evento) => {
  const boton = evento.target.closest("button[data-vista]");
  if (!boton) return;
  $$("#pestanas button").forEach((b) => b.classList.toggle("activa", b === boton));
  $$(".vista").forEach((v) => { v.hidden = v.id !== `vista-${boton.dataset.vista}`; });

  if (boton.dataset.vista === "usuarios") cargarUsuarios();
  if (boton.dataset.vista === "servicios") pintarServicios();
  if (boton.dataset.vista === "horarios") cargarHorarios();
  if (boton.dataset.vista === "ausencias") cargarAusencias();
  if (boton.dataset.vista === "cuenta") pintarCuenta();
});

async function cargarProfesionalesEnFiltros() {
  const { data } = await supabase.from("profiles").select("id, full_name, role").order("full_name");
  const opciones = (data ?? []).map((p) => `<option value="${p.id}">${escapar(p.full_name)}</option>`).join("");
  $("#agenda-profesional").innerHTML = `<option value="">Todos</option>${opciones}`;
  $("#ausencia-profesional").innerHTML = opciones;
}

// -------------------------------------------------------------------- Agenda
["#agenda-desde", "#agenda-hasta", "#agenda-profesional", "#agenda-estado"].forEach((sel) => {
  $(sel).addEventListener("change", cargarAgenda);
});

async function cargarAgenda() {
  const desde = $("#agenda-desde").value;
  const hasta = $("#agenda-hasta").value;
  const profesional = $("#agenda-profesional").value;
  const estado = $("#agenda-estado").value;

  let consulta = supabase
    .from("appointments")
    .select(`id, client_name, client_email, client_phone, starts_at, ends_at, status,
             party_size, notes, language,
             employee_nombre,
             employee:profiles!appointments_employee_id_fkey(full_name, role),
             appointment_services(quantity, price_at_booking, opcion, services(name_es))`)
    .order("starts_at");

  if (desde) consulta = consulta.gte("starts_at", `${desde}T00:00:00`);
  if (hasta) consulta = consulta.lte("starts_at", `${hasta}T23:59:59`);
  if (profesional) consulta = consulta.eq("employee_id", profesional);
  if (estado) consulta = consulta.eq("status", estado);

  const { data, error } = await consulta;
  const contenedor = $("#agenda-lista");

  if (error) {
    contenedor.innerHTML = `<div class="vacio"><strong>No se pudo cargar la agenda</strong>${escapar(error.message)}</div>`;
    return;
  }

  const citas = data ?? [];
  const total = citas
    .filter((c) => c.status === "confirmada" || c.status === "completada")
    .reduce((suma, c) => suma + c.appointment_services.reduce(
      (s, as) => s + Number(as.price_at_booking ?? 0) * as.quantity, 0), 0);

  $("#agenda-resumen").textContent = citas.length
    ? `${citas.length} cita(s) en el rango · ${dinero(total)} entre confirmadas y completadas`
    : "";

  if (!citas.length) {
    contenedor.innerHTML = `<div class="vacio"><strong>No hay citas en este rango</strong>Cambiá las fechas o esperá la primera reserva.</div>`;
    return;
  }

  contenedor.innerHTML = citas.map((cita) => {
    const estadoInfo = ESTADOS[cita.status] ?? { texto: cita.status, clase: "neutra" };
    const lineas = cita.appointment_services;
    const monto = lineas.reduce((s, as) => s + Number(as.price_at_booking ?? 0) * as.quantity, 0);
    const hayPendientes = lineas.some((as) => as.price_at_booking === null);
    const minutos = Math.round((new Date(cita.ends_at) - new Date(cita.starts_at)) / 60000);

    const filasDesglose = lineas.map((as) => {
      const unitario = as.price_at_booking === null ? null : Number(as.price_at_booking);
      const subtotal = unitario === null ? null : unitario * as.quantity;
      return `<tr>
        <td>${escapar(as.services?.name_es ?? "—")}${as.opcion ? `<br><span class="opcion-cita">${escapar(as.opcion)}</span>` : ""}</td>
        <td class="num">${as.quantity}</td>
        <td class="num">${unitario === null ? "Por confirmar" : dinero(unitario)}</td>
        <td class="num">${subtotal === null ? "—" : dinero(subtotal)}<br><span class="colones">${subtotal === null ? "" : colones(subtotal)}</span></td>
      </tr>`;
    }).join("");

    return `<article class="fila" data-cita="${cita.id}">
      <div class="fila-principal">
        <h3>${escapar(cita.client_name)}</h3>
        <p>${escapar(cita.client_email)}${cita.client_phone ? ` · ${escapar(cita.client_phone)}` : ""}</p>
      </div>
      <div class="fila-datos">
        <div><span>CUÁNDO</span><b>${fechaHora(cita.starts_at)} – ${soloHora(cita.ends_at)}</b></div>
        <div><span>CON</span><b>${cita.employee
          ? escapar(cita.employee.full_name)
          : `${escapar(cita.employee_nombre ?? "—")} <small>(cuenta eliminada)</small>`}</b></div>
        <div><span>PERSONAS</span><b>${cita.party_size}</b></div>
        <div><span>TOTAL DEL SERVICIO</span><b>${dinero(monto)}${hayPendientes ? " +" : ""}<br><span class="colones">${colones(monto)}</span></b></div>
      </div>
      <div class="fila-acciones">
        <span class="insignia ${estadoInfo.clase}">${estadoInfo.texto}</span>
        <select data-accion="estado">
          ${Object.entries(ESTADOS).map(([valor, info]) =>
            `<option value="${valor}"${valor === cita.status ? " selected" : ""}>${info.texto}</option>`).join("")}
        </select>
      </div>
      <details class="desglose">
        <summary>Ver desglose · ${lineas.length} servicio(s) · ${minutos} min</summary>
        <table>
          <thead>
            <tr><th>SERVICIO</th><th class="num">CANT.</th><th class="num">UNITARIO</th><th class="num">SUBTOTAL</th></tr>
          </thead>
          <tbody>${filasDesglose}</tbody>
          <tfoot>
            <tr>
              <td colspan="3">TOTAL${hayPendientes ? " (hay servicios por confirmar)" : ""}</td>
              <td class="num">${dinero(monto)}<br><span class="colones">${colones(monto)}</span></td>
            </tr>
          </tfoot>
        </table>
        ${cita.notes ? `<p class="colones" style="margin-top:10px">Nota de la clienta: “${escapar(cita.notes)}”</p>` : ""}
      </details>
    </article>`;
  }).join("");
}

$("#agenda-lista").addEventListener("change", async (evento) => {
  const select = evento.target.closest('select[data-accion="estado"]');
  if (!select) return;
  const id = select.closest("[data-cita]").dataset.cita;

  const { error } = await supabase.from("appointments").update({ status: select.value }).eq("id", id);
  if (error) {
    avisar("No se pudo actualizar el estado.", "fallo");
    cargarAgenda();
    return;
  }
  avisar("Estado actualizado.", "exito");
  cargarAgenda();
});

// ------------------------------------------------------------------ Usuarios
async function cargarUsuarios() {
  const contenedor = $("#usuarios-lista");
  contenedor.innerHTML = `<div class="vacio">Cargando…</div>`;

  let usuarios;
  try {
    ({ usuarios } = await llamarAdmin({ accion: "listar" }));
  } catch (problema) {
    contenedor.innerHTML = `<div class="vacio"><strong>No se pudo cargar</strong>${escapar(problema.message)}</div>`;
    return;
  }

  const filaUsuario = (u) => {
    const confirmado = Boolean(u.email_confirmed_at);
    const insignia = !confirmado
      ? '<span class="insignia espera">Sin confirmar</span>'
      : u.active
        ? '<span class="insignia ok">Activo</span>'
        : '<span class="insignia alto">Desactivado</span>';
    const esYo = u.id === sesionPerfil.id;

    const inactiva = confirmado && !u.active;

    return `<article class="fila${inactiva ? " inactiva" : ""}" data-usuario="${u.id}" data-email="${escapar(u.email ?? "")}" data-rol="${u.role}">
      <div class="fila-principal">
        <h3>${escapar(u.full_name)}${esYo ? " <small>(vos)</small>" : ""}</h3>
        <p>${escapar(u.email ?? "sin correo")}${inactiva ? " · <b>cuenta desactivada, no puede entrar al panel</b>" : ""}</p>
      </div>
      <div class="fila-datos">
        <div><span>ROL</span><b>${ROLES[u.role] ?? u.role}</b></div>
        <div><span>SERVICIOS</span><b>${u.servicios.length}</b></div>
      </div>
      <div class="fila-acciones">
        ${insignia}
        ${esYo ? "" : `
          <select data-accion="rol">
            ${Object.entries(ROLES).map(([valor, texto]) =>
              `<option value="${valor}"${valor === u.role ? " selected" : ""}>${texto}</option>`).join("")}
          </select>
          <button type="button" data-accion="servicios">SERVICIOS</button>
          ${confirmado
            ? `<button type="button" data-accion="estado">${u.active ? "DESACTIVAR" : "ACTIVAR"}</button>`
            : `<button type="button" data-accion="reenviar">REENVIAR CORREO</button>`}
          <button type="button" data-accion="eliminar" class="peligro">ELIMINAR</button>
        `}
      </div>
    </article>`;
  };

  // Las cuentas desactivadas bajan al final, bajo su propio encabezado: dejan
  // de estorbar entre el personal que sí está trabajando.
  const estaInactiva = (u) => Boolean(u.email_confirmed_at) && !u.active;
  const activas = usuarios.filter((u) => !estaInactiva(u));
  const inactivas = usuarios.filter(estaInactiva);

  contenedor.innerHTML =
    activas.map(filaUsuario).join("")
    + (inactivas.length
      ? `<h3 class="separador-lista">Desactivadas (${inactivas.length})</h3>`
        + inactivas.map(filaUsuario).join("")
      : "");
}

$("#usuarios-lista").addEventListener("click", async (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;
  const fila = boton.closest("[data-usuario]");
  const id = fila.dataset.usuario;
  const email = fila.dataset.email;
  const nombre = fila.querySelector("h3").textContent.trim();

  if (boton.dataset.accion === "servicios") {
    abrirDialogoServicios(id, nombre, fila.dataset.rol);
    return;
  }

  if (boton.dataset.accion === "reenviar") {
    try {
      await llamarAdmin({ accion: "reenviar_invitacion", email });
      avisar(`Se reenvió el correo de confirmación a ${email}.`, "exito");
    } catch (problema) { avisar(problema.message, "fallo"); }
    return;
  }

  if (boton.dataset.accion === "estado") {
    const activar = boton.textContent.trim() === "ACTIVAR";
    try {
      await llamarAdmin({ accion: "cambiar_estado", id, active: activar });
      avisar(
        activar
          ? `${nombre} vuelve a tener acceso al panel.`
          : `${nombre} quedó desactivada: ya no puede entrar al panel ni recibir reservas nuevas.`,
        "exito",
      );
      cargarUsuarios();
    } catch (problema) { avisar(problema.message, "fallo"); }
    return;
  }

  if (boton.dataset.accion === "eliminar") {
    if (!confirm(
      `¿Eliminar la cuenta de ${nombre}?`
      + "\n\nSe borra la persona: su nombre, su correo, sus horarios y sus servicios."
      + " No se puede deshacer."
      + "\n\nLas citas del historial se conservan a su nombre."
      + "\n\nSi solo querés quitarle el acceso, cancelá y usá DESACTIVAR.",
    )) return;
    try {
      const resultado = await llamarAdmin({ accion: "eliminar", id });
      avisar(resultado.mensaje ?? "Cuenta eliminada.", "exito", 9000);
      cargarUsuarios();
    } catch (problema) {
      // 409 no es un fallo: es "primero resolvé las citas que faltan".
      const enEspera = problema.estado === 409;
      avisar(problema.message, enEspera ? "alerta" : "fallo", enEspera ? 12000 : 5000);
    }
  }
});

$("#usuarios-lista").addEventListener("change", async (evento) => {
  const select = evento.target.closest('select[data-accion="rol"]');
  if (!select) return;
  const id = select.closest("[data-usuario]").dataset.usuario;
  try {
    await llamarAdmin({ accion: "cambiar_rol", id, role: select.value });
    avisar("Rol actualizado. Los servicios que el nuevo rol no permite se retiraron.", "exito");
    cargarUsuarios();
  } catch (problema) {
    avisar(problema.message, "fallo");
    cargarUsuarios();
  }
});

// -------------------------------------------------------- Invitar a alguien
const dialogoInvitar = $("#dialogo-invitar");
$("#btn-invitar").addEventListener("click", () => {
  $("#form-invitar").reset();
  $("#error-invitar").textContent = "";
  dialogoInvitar.showModal();
});

$("#form-invitar").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const datos = new FormData(evento.target);
  const boton = evento.target.querySelector("button[type=submit]");
  $("#error-invitar").textContent = "";
  boton.disabled = true;
  boton.textContent = "ENVIANDO…";

  try {
    await llamarAdmin({
      accion: "invitar",
      full_name: String(datos.get("full_name")),
      email: String(datos.get("email")),
      role: String(datos.get("role")),
    });
    dialogoInvitar.close();
    avisar(`Invitación enviada a ${datos.get("email")}. La cuenta queda bloqueada hasta que confirme.`, "exito");
    cargarUsuarios();
  } catch (problema) {
    $("#error-invitar").textContent = problema.message;
  } finally {
    boton.disabled = false;
    boton.textContent = "ENVIAR INVITACIÓN";
  }
});

// ------------------------------------------------- Servicios de una persona
const dialogoServicios = $("#dialogo-servicios");
let empleadoEnEdicion = null;

async function abrirDialogoServicios(id, nombre, rol) {
  empleadoEnEdicion = id;
  $("#titulo-servicios-empleado").textContent = `Servicios de ${nombre}`;
  $("#error-servicios-empleado").textContent = "";

  const permitidos = mapaRolServicios.get(rol) ?? new Set();
  $("#nota-servicios-empleado").textContent =
    `Como ${ROLES[rol] ?? rol}, solo puede ofrecer estos ${permitidos.size} servicios. `
    + "Marcá los que realmente realiza: son los que la clienta podrá reservarle.";

  const { usuarios } = await llamarAdmin({ accion: "listar" });
  const actuales = new Set(usuarios.find((u) => u.id === id)?.servicios ?? []);

  const porCategoria = { barberia: [], spa: [] };
  catalogoServicios
    .filter((s) => permitidos.has(s.id))
    .forEach((s) => porCategoria[s.category].push(s));

  $("#lista-servicios-empleado").innerHTML = Object.entries(porCategoria)
    .filter(([, lista]) => lista.length)
    .map(([categoria, lista]) => `
      <p class="grupo">${categoria === "spa" ? "SPA" : "BARBERÍA"}</p>
      ${lista.map((s) => `<label>
        <input type="checkbox" value="${s.id}"${actuales.has(s.id) ? " checked" : ""}>
        <span>${escapar(s.name_es)} · ${s.duration_minutes} min</span>
      </label>`).join("")}
    `).join("");

  dialogoServicios.showModal();
}

$("#form-servicios-empleado").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const marcados = [...$("#lista-servicios-empleado").querySelectorAll("input:checked")].map((i) => i.value);
  try {
    await llamarAdmin({ accion: "asignar_servicios", id: empleadoEnEdicion, servicios: marcados });
    dialogoServicios.close();
    avisar("Servicios actualizados.", "exito");
    cargarUsuarios();
  } catch (problema) {
    $("#error-servicios-empleado").textContent = problema.message;
  }
});

// ----------------------------------------------------------------- Servicios
$("#servicios-categoria").addEventListener("change", pintarServicios);

function pintarServicios() {
  const filtro = $("#servicios-categoria").value;
  const lista = catalogoServicios.filter((s) => !filtro || s.category === filtro);

  if (!lista.length) {
    $("#servicios-lista").innerHTML = `<div class="vacio"><strong>Sin servicios en esta área</strong>Creá el primero con “+ NUEVO SERVICIO”.</div>`;
    return;
  }

  $("#servicios-lista").innerHTML = lista.map((s) => `
    <article class="fila" data-servicio="${s.id}">
      <div class="fila-principal">
        <h3>${escapar(s.name_es)}</h3>
        <p>
          <span class="servicio-area">${s.category === "spa" ? "Spa" : "Barbería"}</span>
          ${s.active ? "" : ' <span class="insignia neutra">Oculto en la web</span>'}
        </p>
      </div>
      <div class="fila-acciones">
        <label class="filtro"><span>PRECIO (USD)</span>
          <input type="number" min="0" step="1" data-campo="price" value="${s.price ?? ""}" placeholder="—"></label>
        <label class="casilla-desde"><input type="checkbox" data-campo="precio_desde"${s.precio_desde ? " checked" : ""}>
          <span>Precio "desde"</span></label>
        <label class="filtro"><span>DURACIÓN (MIN)</span>
          <input type="number" min="5" step="5" data-campo="duration_minutes" value="${s.duration_minutes}"></label>
        <button type="button" data-accion="guardar">GUARDAR</button>
        <button type="button" data-accion="editar">EDITAR</button>
        <button type="button" data-accion="activo">${s.active ? "OCULTAR" : "MOSTRAR"}</button>
        <button type="button" data-accion="eliminar" class="peligro">ELIMINAR</button>
      </div>
    </article>`).join("");
}

// Vuelve a leer el catálogo y el mapa de roles desde la base. Hace falta tras
// crear o borrar un servicio, porque el trigger de la base ajusta role_services
// por su cuenta y el panel debe reflejar ese resultado, no adivinarlo.
async function recargarCatalogo() {
  const [{ data: servicios }, { data: rolServicios }] = await Promise.all([
    supabase.from("services").select("id, category, name_es, name_en, description_es, description_en, price, precio_desde, currency, duration_minutes, active").order("category").order("name_es"),
    supabase.from("role_services").select("role, service_id"),
  ]);
  catalogoServicios = servicios ?? [];
  mapaRolServicios = new Map();
  (rolServicios ?? []).forEach(({ role, service_id }) => {
    if (!mapaRolServicios.has(role)) mapaRolServicios.set(role, new Set());
    mapaRolServicios.get(role).add(service_id);
  });
}

// ----------------------------------------------------------- Tipo de cambio
async function cargarTipoCambio() {
  const { data } = await supabase
    .from("ajustes").select("tipo_cambio, actualizado_en").eq("id", true).single();
  if (!data) return;
  tipoCambio = Number(data.tipo_cambio);
  $("#form-tipo-cambio").tipo_cambio.value = tipoCambio;
  $("#tipo-cambio-info").textContent =
    `Se usa para mostrar los precios en colones en la web y en la agenda. `
    + `Última actualización: ${fechaHora(data.actualizado_en)}.`;
}

$("#form-tipo-cambio").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const valor = Number(new FormData(evento.target).get("tipo_cambio"));
  if (!Number.isFinite(valor) || valor <= 0) return avisar("Ingresá un tipo de cambio válido.", "fallo");

  const { error } = await supabase.from("ajustes").update({ tipo_cambio: valor }).eq("id", true);
  if (error) return avisar("No se pudo guardar el tipo de cambio.", "fallo");

  tipoCambio = valor;
  await cargarTipoCambio();
  pintarServicios();
  avisar(`Tipo de cambio actualizado a ₡${valor} por dólar.`, "exito");
});

// ------------------------------------------------ Crear y editar servicios
const dialogoServicio = $("#dialogo-servicio");
const formServicio = $("#form-servicio");
let servicioEnEdicion = null;

$("#btn-nuevo-servicio").addEventListener("click", () => {
  servicioEnEdicion = null;
  formServicio.reset();
  formServicio.active.checked = true;
  formServicio.duration_minutes.value = 30;
  $("#titulo-servicio").textContent = "Nuevo servicio";
  $("#nota-servicio").textContent =
    "El área determina en qué página del sitio aparece y qué roles pueden realizarlo.";
  $("#error-servicio").textContent = "";
  dialogoServicio.showModal();
});

function abrirEdicionServicio(servicio) {
  servicioEnEdicion = servicio;
  formServicio.reset();
  formServicio.category.value = servicio.category;
  formServicio.name_es.value = servicio.name_es ?? "";
  formServicio.name_en.value = servicio.name_en ?? "";
  formServicio.description_es.value = servicio.description_es ?? "";
  formServicio.description_en.value = servicio.description_en ?? "";
  formServicio.price.value = servicio.price ?? "";
  formServicio.duration_minutes.value = servicio.duration_minutes;
  formServicio.active.checked = servicio.active;
  $("#titulo-servicio").textContent = "Editar servicio";
  $("#nota-servicio").textContent =
    "Si cambiás el área, los profesionales cuyo rol ya no cubra el servicio dejarán de ofrecerlo automáticamente.";
  $("#error-servicio").textContent = "";
  dialogoServicio.showModal();
}

formServicio.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const datos = new FormData(formServicio);
  const error = $("#error-servicio");
  const boton = formServicio.querySelector("button[type=submit]");
  error.textContent = "";

  const precioTexto = String(datos.get("price") ?? "").trim();
  const duracion = Number(datos.get("duration_minutes"));
  const nombreEs = String(datos.get("name_es")).trim();

  if (nombreEs.length < 2) {
    error.textContent = "El nombre del servicio es obligatorio.";
    return;
  }
  if (!Number.isFinite(duracion) || duracion < 5) {
    error.textContent = "La duración debe ser de al menos 5 minutos.";
    return;
  }

  const registro = {
    category: String(datos.get("category")),
    name_es: nombreEs,
    // El inglés queda en null si no se escribió. El sitio muestra el español
    // en su lugar, que es mejor que una traducción inventada.
    name_en: String(datos.get("name_en") || "").trim() || null,
    description_es: String(datos.get("description_es") || "").trim() || null,
    description_en: String(datos.get("description_en") || "").trim() || null,
    price: precioTexto === "" ? null : Number(precioTexto),
    duration_minutes: duracion,
    active: formServicio.active.checked,
  };

  boton.disabled = true;
  boton.textContent = "GUARDANDO…";

  const { error: fallo } = servicioEnEdicion
    ? await supabase.from("services").update(registro).eq("id", servicioEnEdicion.id)
    : await supabase.from("services").insert(registro);

  boton.disabled = false;
  boton.textContent = "GUARDAR";

  if (fallo) {
    error.textContent = fallo.message;
    return;
  }

  dialogoServicio.close();
  await recargarCatalogo();
  pintarServicios();
  avisar(servicioEnEdicion ? "Servicio actualizado." : `"${nombreEs}" creado y ya disponible para asignar.`, "exito");
});

$("#servicios-lista").addEventListener("click", async (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;
  const fila = boton.closest("[data-servicio]");
  const id = fila.dataset.servicio;
  const servicio = catalogoServicios.find((s) => s.id === id);

  if (boton.dataset.accion === "editar") {
    abrirEdicionServicio(servicio);
    return;
  }

  if (boton.dataset.accion === "activo") {
    const { error } = await supabase.from("services").update({ active: !servicio.active }).eq("id", id);
    if (error) return avisar("No se pudo cambiar la visibilidad.", "fallo");
    servicio.active = !servicio.active;
    avisar(servicio.active ? "Servicio visible en la web." : "Servicio oculto en la web.", "exito");
    pintarServicios();
    return;
  }

  if (boton.dataset.accion === "eliminar") {
    if (!confirm(`¿Eliminar "${servicio.name_es}"? Si ya se usó en alguna cita no se podrá borrar, para no romper el historial.`)) return;

    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      // La llave foránea de appointment_services protege el historial: si el
      // servicio aparece en una cita, la base rechaza el borrado.
      const enUso = error.code === "23503" || /foreign key|viola/i.test(error.message);
      avisar(
        enUso
          ? "Ese servicio ya aparece en citas registradas, así que no se puede borrar. Usá OCULTAR para retirarlo de la web sin perder el historial."
          : "No se pudo eliminar el servicio.",
        "fallo",
      );
      return;
    }

    await recargarCatalogo();
    pintarServicios();
    avisar("Servicio eliminado.", "exito");
    return;
  }

  const precioTexto = fila.querySelector('[data-campo="price"]').value.trim();
  const duracion = Number(fila.querySelector('[data-campo="duration_minutes"]').value);

  if (!Number.isFinite(duracion) || duracion < 5) {
    return avisar("La duración debe ser de al menos 5 minutos.", "fallo");
  }

  const cambios = {
    price: precioTexto === "" ? null : Number(precioTexto),
    duration_minutes: duracion,
    precio_desde: fila.querySelector('[data-campo="precio_desde"]').checked,
  };

  const { error } = await supabase.from("services").update(cambios).eq("id", id);
  if (error) return avisar("No se pudo guardar.", "fallo");

  Object.assign(servicio, cambios);
  avisar(`"${servicio.name_es}" actualizado.`, "exito");
});

// ----------------------------------------------------------------- Mi cuenta
async function pintarCuenta() {
  const { data: { user } } = await supabase.auth.getUser();
  $("#cuenta-correo").textContent = user?.email ?? "—";
  $("#cuenta-rol").textContent = ROLES[sesionPerfil.role] ?? sesionPerfil.role;
}

const formCambiarClave = $("#form-cambiar-clave");

formCambiarClave.addEventListener("input", () => {
  const datos = new FormData(formCambiarClave);
  const estado = reglasClave(String(datos.get("nueva")), String(datos.get("nueva2")));
  $$("#requisitos-cambio li").forEach((li) => {
    li.classList.toggle("cumple", estado[li.dataset.regla]);
  });
});

formCambiarClave.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const boton = evento.target.querySelector("button[type=submit]");
  const datos = new FormData(evento.target);
  const actual = String(datos.get("actual"));
  const nueva = String(datos.get("nueva"));
  const error = $("#error-cambiar-clave");
  error.textContent = "";

  if (!Object.values(reglasClave(nueva, String(datos.get("nueva2")))).every(Boolean)) {
    error.textContent = "La contraseña nueva no cumple todos los requisitos.";
    return;
  }
  if (nueva === actual) {
    error.textContent = "La contraseña nueva tiene que ser distinta de la actual.";
    return;
  }

  boton.disabled = true;
  boton.textContent = "GUARDANDO…";

  const { data: { user } } = await supabase.auth.getUser();

  // Se revalida la contraseña actual antes de cambiarla. Sin esto, cualquiera
  // que encuentre una sesión abierta podría apoderarse de la cuenta.
  const { error: errorClaveActual } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: actual,
  });

  if (errorClaveActual) {
    error.textContent = "La contraseña actual no es correcta.";
    boton.disabled = false;
    boton.textContent = "GUARDAR CONTRASEÑA NUEVA";
    return;
  }

  const { error: errorCambio } = await supabase.auth.updateUser({ password: nueva });
  boton.disabled = false;
  boton.textContent = "GUARDAR CONTRASEÑA NUEVA";

  if (errorCambio) {
    error.textContent = errorCambio.message;
    return;
  }

  await supabase.rpc("marcar_contrasena_actualizada");
  formCambiarClave.reset();
  $$("#requisitos-cambio li").forEach((li) => li.classList.remove("cumple"));
  avisar("Contraseña actualizada.", "exito");
});

// ------------------------------------------------------------------ Horarios
// La base guarda bloques sueltos (employee_schedules). La pantalla piensa en
// "jornada + almuerzo", que es como lo piensa una persona, y traduce: un día con
// almuerzo son dos filas; un día corrido, una sola.
const DIAS = [
  { n: 0, nombre: "Domingo" }, { n: 1, nombre: "Lunes" }, { n: 2, nombre: "Martes" },
  { n: 3, nombre: "Miércoles" }, { n: 4, nombre: "Jueves" }, { n: 5, nombre: "Viernes" },
  { n: 6, nombre: "Sábado" },
];

const hhmm = (hora) => (hora ?? "").slice(0, 5);

function personaDelHorario() {
  const selector = $("#horario-persona");
  return (sesionPerfil.role === "administrador" && selector.value) ? selector.value : sesionPerfil.id;
}

async function cargarHorarios() {
  const esAdmin = sesionPerfil.role === "administrador";
  $("#filtro-horario-persona").hidden = !esAdmin;

  if (esAdmin && !$("#horario-persona").options.length) {
    const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
    $("#horario-persona").innerHTML = (data ?? [])
      .map((p) => `<option value="${p.id}">${escapar(p.full_name)}</option>`).join("");
    $("#horario-persona").value = sesionPerfil.id;
  }

  const { data: bloques } = await supabase
    .from("employee_schedules")
    .select("weekday, starts_at, ends_at")
    .eq("employee_id", personaDelHorario())
    .order("weekday").order("starts_at");

  const porDia = new Map();
  (bloques ?? []).forEach((b) => {
    if (!porDia.has(b.weekday)) porDia.set(b.weekday, []);
    porDia.get(b.weekday).push(b);
  });

  $("#tabla-horarios").innerHTML = DIAS.map((dia) => {
    const partes = porDia.get(dia.n) ?? [];
    const atiende = partes.length > 0;
    const inicio = atiende ? hhmm(partes[0].starts_at) : "09:00";
    const fin = atiende ? hhmm(partes[partes.length - 1].ends_at) : "19:00";
    // Dos bloques significan que hay un hueco en medio: ese hueco es el almuerzo.
    const hayAlmuerzo = partes.length > 1;
    const almuerzoDesde = hayAlmuerzo ? hhmm(partes[0].ends_at) : "12:00";
    const almuerzoHasta = hayAlmuerzo ? hhmm(partes[1].starts_at) : "13:00";

    return `<div class="dia-horario${atiende ? "" : " cerrado"}" data-dia="${dia.n}">
      <label class="nombre-dia">
        <input type="checkbox" data-campo="atiende"${atiende ? " checked" : ""}>
        <span>${dia.nombre}</span>
      </label>
      <label><span>ENTRA</span><input type="time" data-campo="inicio" value="${inicio}" step="900"></label>
      <label><span>SALE</span><input type="time" data-campo="fin" value="${fin}" step="900"></label>
      <label class="almuerzo"><span>ALMUERZO DESDE</span>
        <input type="time" data-campo="almuerzo_desde" value="${hayAlmuerzo ? almuerzoDesde : ""}" step="900"></label>
      <label><span>ALMUERZO HASTA</span>
        <input type="time" data-campo="almuerzo_hasta" value="${hayAlmuerzo ? almuerzoHasta : ""}" step="900"></label>
    </div>`;
  }).join("");
}

$("#horario-persona").addEventListener("change", cargarHorarios);

$("#tabla-horarios").addEventListener("change", (evento) => {
  const casilla = evento.target.closest('input[data-campo="atiende"]');
  if (!casilla) return;
  casilla.closest(".dia-horario").classList.toggle("cerrado", !casilla.checked);
});

$("#form-horarios").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const error = $("#error-horarios");
  const boton = evento.target.querySelector("button[type=submit]");
  error.textContent = "";

  const filas = [];
  for (const dia of $$("#tabla-horarios .dia-horario")) {
    const n = Number(dia.dataset.dia);
    const valor = (campo) => dia.querySelector(`[data-campo="${campo}"]`).value;
    if (!dia.querySelector('[data-campo="atiende"]').checked) continue;

    const inicio = valor("inicio");
    const fin = valor("fin");
    const aDesde = valor("almuerzo_desde");
    const aHasta = valor("almuerzo_hasta");

    if (!inicio || !fin || fin <= inicio) {
      error.textContent = `Revisá el horario del ${DIAS[n].nombre}: la salida debe ser posterior a la entrada.`;
      return;
    }

    if (aDesde || aHasta) {
      if (!aDesde || !aHasta || aHasta <= aDesde) {
        error.textContent = `Revisá el almuerzo del ${DIAS[n].nombre}: falta una hora o el fin es anterior al inicio.`;
        return;
      }
      if (aDesde <= inicio || aHasta >= fin) {
        error.textContent = `El almuerzo del ${DIAS[n].nombre} tiene que quedar dentro de la jornada.`;
        return;
      }
      filas.push({ weekday: n, starts_at: inicio, ends_at: aDesde });
      filas.push({ weekday: n, starts_at: aHasta, ends_at: fin });
    } else {
      filas.push({ weekday: n, starts_at: inicio, ends_at: fin });
    }
  }

  boton.disabled = true;
  boton.textContent = "GUARDANDO…";
  const persona = personaDelHorario();

  // Se reemplaza el horario completo: es más simple y predecible que calcular
  // qué bloque cambió, y evita chocar con la restricción de solapamiento.
  const { error: fallaBorrado } = await supabase
    .from("employee_schedules").delete().eq("employee_id", persona);

  if (!fallaBorrado && filas.length) {
    const { error: fallaAlta } = await supabase
      .from("employee_schedules")
      .insert(filas.map((f) => ({ ...f, employee_id: persona })));
    if (fallaAlta) error.textContent = fallaAlta.message;
  } else if (fallaBorrado) {
    error.textContent = fallaBorrado.message;
  }

  boton.disabled = false;
  boton.textContent = "GUARDAR HORARIO";
  if (!error.textContent) {
    avisar(filas.length ? "Horario guardado." : "Se quitaron todos los días de atención.", "exito");
    cargarHorarios();
  }
});

// ----------------------------------------------------------------- Ausencias
async function cargarAusencias() {
  const { data, error } = await supabase
    .from("time_off")
    .select("id, starts_at, ends_at, reason, employee:profiles!time_off_employee_id_fkey(full_name)")
    .order("starts_at", { ascending: false });

  const contenedor = $("#ausencias-lista");
  if (error) {
    contenedor.innerHTML = `<div class="vacio"><strong>No se pudo cargar</strong>${escapar(error.message)}</div>`;
    return;
  }
  if (!data.length) {
    contenedor.innerHTML = `<div class="vacio"><strong>Sin bloqueos registrados</strong>Todo el equipo aparece disponible en su horario normal.</div>`;
    return;
  }

  const esAdmin = sesionPerfil.role === "administrador";
  contenedor.innerHTML = data.map((a) => `
    <article class="fila" data-ausencia="${a.id}">
      <div class="fila-principal">
        <h3>${escapar(a.employee?.full_name ?? "—")}</h3>
        <p>${escapar(a.reason ?? "Sin motivo indicado")}</p>
      </div>
      <div class="fila-datos">
        <div><span>DESDE</span><b>${fechaHora(a.starts_at)}</b></div>
        <div><span>HASTA</span><b>${fechaHora(a.ends_at)}</b></div>
      </div>
      ${esAdmin ? `<div class="fila-acciones"><button type="button" class="peligro" data-accion="borrar">QUITAR</button></div>` : ""}
    </article>`).join("");
}

$("#ausencias-lista").addEventListener("click", async (evento) => {
  const boton = evento.target.closest('button[data-accion="borrar"]');
  if (!boton) return;
  const id = boton.closest("[data-ausencia]").dataset.ausencia;
  if (!confirm("¿Quitar este bloqueo? Esas horas volverán a estar disponibles.")) return;

  const { error } = await supabase.from("time_off").delete().eq("id", id);
  if (error) return avisar("No se pudo quitar.", "fallo");
  avisar("Bloqueo eliminado.", "exito");
  cargarAusencias();
});

const dialogoAusencia = $("#dialogo-ausencia");
$("#btn-ausencia").addEventListener("click", () => {
  $("#form-ausencia").reset();
  $("#error-ausencia").textContent = "";
  dialogoAusencia.showModal();
});

$("#form-ausencia").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const datos = new FormData(evento.target);
  $("#error-ausencia").textContent = "";

  const inicio = new Date(String(datos.get("starts_at")));
  const fin = new Date(String(datos.get("ends_at")));
  if (!(fin > inicio)) {
    $("#error-ausencia").textContent = "La fecha de fin debe ser posterior a la de inicio.";
    return;
  }

  const { error } = await supabase.from("time_off").insert({
    employee_id: String(datos.get("employee_id")),
    starts_at: inicio.toISOString(),
    ends_at: fin.toISOString(),
    reason: String(datos.get("reason") || "").trim() || null,
  });

  if (error) {
    // La restricción EXCLUDE de la base rechaza bloqueos encimados.
    $("#error-ausencia").textContent = /exclu/i.test(error.message)
      ? "Ya existe un bloqueo que se cruza con ese horario."
      : error.message;
    return;
  }

  dialogoAusencia.close();
  avisar("Horario bloqueado.", "exito");
  cargarAusencias();
});

// Botones de cierre de todos los diálogos.
$$("[data-cerrar]").forEach((boton) => {
  boton.addEventListener("click", () => boton.closest("dialog").close());
});

arrancar();
