// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { LOCALES, DEFAULT_LOCALE } from './src/i18n/locales.mjs';

export default defineConfig({
  // Dominio público (para el sitemap y las URL canónicas). En la publicación diaria
  // se toma de la variable SITE_URL del repositorio (ver docs/PUBLICAR.md).
  site: process.env.SITE_URL || 'https://phantom-parade-hub.pages.dev',
  integrations: [react(), sitemap()],
  i18n: {
    locales: LOCALES,
    defaultLocale: DEFAULT_LOCALE,
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  vite: {
    plugins: [tailwindcss()],
    // Versión de cada compilación: se añade a /data/*.json para que el navegador no use datos
    // de una publicación anterior guardados en caché
    define: { __DATA_V__: JSON.stringify(Date.now().toString(36)) },
    // Precompila siempre el runtime de React: evita el error "_jsxDEV is not a function"
    // en desarrollo cuando se añade un componente nuevo con el servidor arrancado
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
  },
});
