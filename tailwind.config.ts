import type { Config } from "tailwindcss";

/**
 * NOTA — Tailwind CSS v4:
 * Los tokens de diseño (colores, fuentes, etc.) se definen en globals.css
 * dentro del bloque @theme {}. Este archivo de configuración ya no es
 * el lugar central para esos valores en v4.
 * Se conserva únicamente para compatibilidad con plugins y content paths.
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;