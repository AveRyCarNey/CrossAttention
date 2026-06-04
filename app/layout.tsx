import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrossAttention | AI Support Dashboard",
  description:
    "Sistema de tickets de soporte impulsado por IA — Vista priorizada para agentes en tiempo real.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-cross-bg text-cross-text antialiased">
        {children}
      </body>
    </html>
  );
}