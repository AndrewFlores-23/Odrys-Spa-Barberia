import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Odry's | Spa & Barber Shop en Tamarindo",
  description: "Dos experiencias de cuidado personal en un mismo lugar, en Tamarindo, Guanacaste.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
