const whatsappNumber = "50600000000";

const spaServices = [
  {
    name: "Masaje relajante",
    duration: "60 min",
    price: "Desde ₡00.000",
    description: "Un ritual suave para liberar tensión y bajar el ritmo.",
  },
  {
    name: "Facial tropical",
    duration: "50 min",
    price: "Desde ₡00.000",
    description: "Limpieza e hidratación pensadas para el clima de Guanacaste.",
  },
  {
    name: "Manicure & pedicure",
    duration: "75 min",
    price: "Desde ₡00.000",
    description: "Cuidado completo de manos y pies con acabado a elección.",
  },
];

const barberServices = [
  {
    name: "Corte clásico",
    duration: "40 min",
    price: "Desde ₡00.000",
    description: "Corte personalizado, lavado y acabado profesional.",
  },
  {
    name: "Barba & perfilado",
    duration: "30 min",
    price: "Desde ₡00.000",
    description: "Toalla caliente, contorno preciso y producto final.",
  },
  {
    name: "Combo completo",
    duration: "70 min",
    price: "Desde ₡00.000",
    description: "Corte, barba y el tiempo necesario para salir impecable.",
  },
];

function bookingLink(service: string, area: string) {
  const message = `Hola, me gustaría reservar ${service} en el área de ${area}. ¿Qué horarios tienen disponibles?`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Odry's, volver al inicio">
          <span className="brand-mark">O</span>
          <span>ODRY&apos;S</span>
        </a>
        <nav aria-label="Navegación principal">
          <a href="#spa">SPA</a>
          <a href="#barberia">BARBERÍA</a>
          <a href="#visitanos">VISÍTANOS</a>
        </nav>
        <a className="header-cta" href="#servicios">RESERVAR</a>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">TAMARINDO · GUANACASTE</p>
          <h1>Dos formas de<br />sentirte increíble.</h1>
          <p className="hero-lead">
            Un mismo destino. Dos experiencias completamente distintas para cuidar de vos.
          </p>
          <div className="hero-actions">
            <a className="button button-spa" href="#spa">ENTRAR AL SPA <span>↘</span></a>
            <a className="button button-barber" href="#barberia">IR A BARBERÍA <span>↘</span></a>
          </div>
        </div>
        <div className="hero-visual" aria-label="Espacio reservado para fotografía principal">
          <div className="image-placeholder light-placeholder">
            <span>FOTOGRAFÍA PRINCIPAL</span>
            <small>SPA + BARBERÍA</small>
          </div>
          <span className="location-pill">TAMARINDO, CR</span>
        </div>
      </section>

      <section className="manifesto" aria-label="Nuestra propuesta">
        <p>UN LUGAR. DOS RITUALES.</p>
        <span>Elegí cómo querés sentirte hoy.</span>
      </section>

      <section className="spa-section" id="spa">
        <div className="section-intro">
          <div>
            <p className="eyebrow spa-eyebrow">ODRY&apos;S SPA</p>
            <h2>Inhalá calma.<br /><em>Exhalá todo lo demás.</em></h2>
          </div>
          <p>
            Una pausa del sol, el mar y el movimiento. Tratamientos diseñados para restaurar
            cuerpo y mente en un ambiente tranquilo y natural.
          </p>
        </div>

        <div className="spa-feature">
          <div className="image-placeholder spa-placeholder">
            <span>IMAGEN DEL SPA</span>
            <small>AMBIENTE / TRATAMIENTO</small>
          </div>
          <div className="spa-quote">
            <span className="botanical">✣</span>
            <p>Tu momento<br />empieza aquí.</p>
            <a href="#servicios-spa">DESCUBRIR SERVICIOS ↓</a>
          </div>
        </div>

        <div className="services" id="servicios-spa">
          <div className="services-heading">
            <p className="eyebrow spa-eyebrow">SERVICIOS DESTACADOS</p>
            <span>01 — 03</span>
          </div>
          {spaServices.map((service, index) => (
            <article className="service-row spa-service" key={service.name}>
              <span className="service-number">0{index + 1}</span>
              <div>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
              </div>
              <div className="service-meta">
                <span>{service.duration}</span>
                <strong>{service.price}</strong>
              </div>
              <a
                className="book-circle spa-book"
                href={bookingLink(service.name, "spa")}
                target="_blank"
                rel="noreferrer"
                aria-label={`Reservar ${service.name} por WhatsApp`}
              >
                RESERVAR <span>↗</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="barber-section" id="barberia">
        <div className="barber-marquee" aria-hidden="true">
          <span>PRECISIÓN</span><i>◆</i><span>ESTILO</span><i>◆</i><span>ACTITUD</span>
        </div>
        <div className="section-intro barber-intro">
          <div>
            <p className="eyebrow barber-eyebrow">ODRY&apos;S BARBER SHOP</p>
            <h2>Buen corte.<br /><em>Mejor actitud.</em></h2>
          </div>
          <p>
            Técnica, detalle y conversación. Un espacio directo y sin complicaciones para
            renovar tu estilo y salir listo para lo que sigue.
          </p>
        </div>

        <div className="barber-feature">
          <div className="barber-statement">
            <span>DESDE TAMARINDO</span>
            <p>CORTES<br />CON<br /><b>CARÁCTER.</b></p>
          </div>
          <div className="image-placeholder barber-placeholder">
            <span>IMAGEN DE BARBERÍA</span>
            <small>CORTE / AMBIENTE</small>
          </div>
        </div>

        <div className="services barber-services" id="servicios">
          <div className="services-heading">
            <p className="eyebrow barber-eyebrow">SERVICIOS DESTACADOS</p>
            <span>01 — 03</span>
          </div>
          {barberServices.map((service, index) => (
            <article className="service-row barber-service" key={service.name}>
              <span className="service-number">0{index + 1}</span>
              <div>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
              </div>
              <div className="service-meta">
                <span>{service.duration}</span>
                <strong>{service.price}</strong>
              </div>
              <a
                className="book-circle barber-book"
                href={bookingLink(service.name, "barbería")}
                target="_blank"
                rel="noreferrer"
                aria-label={`Reservar ${service.name} por WhatsApp`}
              >
                RESERVAR <span>↗</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="visit-section" id="visitanos">
        <div className="visit-copy">
          <p className="eyebrow">ENCONTRANOS</p>
          <h2>Tu próxima pausa<br />está en Tamarindo.</h2>
          <div className="visit-details">
            <div><span>DIRECCIÓN</span><p>Centro Comercial [Nombre]<br />Tamarindo, Guanacaste</p></div>
            <div><span>HORARIO</span><p>Lun — Sáb · 9:00 — 19:00<br />Dom · 10:00 — 16:00</p></div>
          </div>
          <a className="outline-button" href="https://maps.google.com" target="_blank" rel="noreferrer">
            VER EN GOOGLE MAPS ↗
          </a>
        </div>
        <div className="map-placeholder">
          <span>MAPA / UBICACIÓN</span>
          <div className="map-pin">O</div>
        </div>
      </section>

      <footer>
        <div className="footer-brand">
          <span className="brand-mark">O</span>
          <p>ODRY&apos;S</p>
          <small>SPA & BARBER SHOP</small>
        </div>
        <div className="footer-links">
          <a href="#spa">SPA</a>
          <a href="#barberia">BARBERÍA</a>
          <a href="#visitanos">UBICACIÓN</a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer">INSTAGRAM ↗</a>
        </div>
        <p className="footer-note">TAMARINDO · COSTA RICA<br />PURA VIDA, BIEN CUIDADA.</p>
      </footer>
    </main>
  );
}
