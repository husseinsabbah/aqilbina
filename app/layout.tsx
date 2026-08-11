"use client";

import { SessionProvider } from "next-auth/react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <title>Aqil Bina - Plateforme de rénovation</title>
        <meta name="description" content="Gérez vos projets de construction et rénovation avec l'IA." />
      </head>
      <body>
        <SessionProvider>
          <main>{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}