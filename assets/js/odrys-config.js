// Configuración pública del sitio de Odry's.
//
// La clave "publishable" está pensada para vivir en el navegador: por sí sola
// no da acceso a nada. Lo que protege los datos son las políticas RLS de la
// base. La clave de servicio (service_role) NUNCA debe aparecer aquí ni en
// ningún archivo del sitio: esa solo vive en el servidor de Supabase.
window.ODRYS_CONFIG = {
  supabaseUrl: "https://jwfxqkoetxkoubuczvyj.supabase.co",
  supabaseKey: "sb_publishable_Bv7vQNmM5DnWHT0LAOmd-Q_gzuXvqjM",
  whatsapp: "50662180804",
  zonaHoraria: "America/Costa_Rica",
  // Cada cuántos minutos se ofrece un cupo de inicio.
  pasoMinutos: 15,
};
