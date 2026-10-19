// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { LOCALES, DEFAULT_LOCALE } from './src/i18n/locales.mjs';

export default defineConfig({
  // TODO: cambiar por el dominio definitivo
  site: 'https://example.com',
  integrations: [react(), sitemap()],
  i18n: {
    locales: LOCALES,
    defaultLocale: DEFAULT_LOCALE,
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  vite: {
    plugins: [tailwindcss()],
    // Precompila siempre el runtime de React: evita el error "_jsxDEV is not a function"
    // en desarrollo cuando se añade un componente nuevo con el servidor arrancado
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
  },
});
