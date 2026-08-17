// Correo de confirmación de una cita.
//
// Se llama desde el sitio público justo después de que book_appointment()
// registra la cita. La clienta final no tiene cuenta, así que la función es
// pública, y la protección contra abuso es triple:
//   1) el appointment_id es un UUID prácticamente imposible de adivinar,
//   2) solo se puede usar una vez por cita (columna confirmation_sent),
//   3) solo funciona si la cita se creó hace menos de 15 minutos.
//
// Requiere la variable RESEND_API_KEY configurada en el proyecto de Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
// El dominio tiene que estar verificado en Resend o el envío se rechaza.
const FROM_EMAIL = Deno.env.get("CONFIRMATION_FROM_EMAIL")
  || "Odry's Beauty Spa & Barber <reservas@odrysbeautyspa.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const copy = {
  es: {
    subject: (business: string) => `Tu cita en ${business} está confirmada`,
    greeting: (name: string) => `Hola ${name},`,
    intro: "Tu cita quedó confirmada. Estos son los detalles:",
    withLabel: "Con",
    whenLabel: "Fecha y hora",
    servicesLabel: "Servicios",
    totalLabel: "Total estimado",
    footer: "Si necesitás cambiar o cancelar tu cita, respondé este correo o escribinos por WhatsApp.",
  },
  en: {
    subject: (business: string) => `Your appointment at ${business} is confirmed`,
    greeting: (name: string) => `Hi ${name},`,
    intro: "Your appointment is confirmed. Here are the details:",
    withLabel: "With",
    whenLabel: "Date and time",
    servicesLabel: "Services",
    totalLabel: "Estimated total",
    footer: "If you need to change or cancel your appointment, reply to this email or message us on WhatsApp.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { appointment_id } = await req.json().catch(() => ({}));
    if (!appointment_id) {
      return jsonResponse({ error: "Falta appointment_id." }, 400);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: appointment, error: apptError } = await supabaseAdmin
      .from("appointments")
      .select(
        `id, client_name, client_email, starts_at, language, status, confirmation_sent, created_at,
         profiles:employee_id ( full_name ),
         appointment_services (
           quantity, price_at_booking,
           services ( name_es, name_en )
         )`,
      )
      .eq("id", appointment_id)
      .single();

    if (apptError || !appointment) {
      return jsonResponse({ error: "Cita no encontrada." }, 404);
    }

    if (appointment.confirmation_sent) {
      return jsonResponse({ error: "El correo de esta cita ya fue enviado." }, 409);
    }

    const createdAt = new Date(appointment.created_at).getTime();
    if (Date.now() - createdAt > 15 * 60 * 1000) {
      return jsonResponse({ error: "Esta solicitud de confirmación expiró." }, 410);
    }

    if (appointment.status !== "confirmada") {
      return jsonResponse({ error: "La cita no está confirmada." }, 400);
    }

    const lang: "es" | "en" = appointment.language === "en" ? "en" : "es";
    const t = copy[lang];
    const businessName = "Odry's Beauty Spa & Barber";

    const when = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-CR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Costa_Rica",
    }).format(new Date(appointment.starts_at));

    const services = (appointment.appointment_services || [])
      .map((item: any) => {
        // El nombre en inglés es opcional: si no se cargó, se muestra el español
        // en vez de dejar el renglón vacío.
        const name = lang === "en"
          ? (item.services?.name_en || item.services?.name_es)
          : item.services?.name_es;
        return `<li>${item.quantity} × ${name}</li>`;
      })
      .join("");

    const total = (appointment.appointment_services || []).reduce(
      (sum: number, item: any) => sum + (item.price_at_booking || 0) * item.quantity,
      0,
    );

    const employeeName = appointment.profiles?.full_name || "";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color:#1a1a1a;">
        <h2>${businessName}</h2>
        <p>${t.greeting(appointment.client_name)}</p>
        <p>${t.intro}</p>
        <p><strong>${t.withLabel}:</strong> ${employeeName}</p>
        <p><strong>${t.whenLabel}:</strong> ${when}</p>
        <p><strong>${t.servicesLabel}:</strong></p>
        <ul>${services}</ul>
        ${total > 0 ? `<p><strong>${t.totalLabel}:</strong> $${total.toFixed(2)}</p>` : ""}
        <p style="margin-top:24px; font-size:14px; color:#555;">${t.footer}</p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [appointment.client_email],
        subject: t.subject(businessName),
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error("Resend error:", errText);
      return jsonResponse({ error: "No se pudo enviar el correo." }, 502);
    }

    await supabaseAdmin
      .from("appointments")
      .update({ confirmation_sent: true })
      .eq("id", appointment_id);

    return jsonResponse({ success: true });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Error interno del servidor." }, 500);
  }
});
