// robots.txt: todo indexable salvo los datos internos, con el mapa del sitio.
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemap = site ? new URL('/sitemap-index.xml', site).href : '/sitemap-index.xml';
  return new Response(`User-agent: *\nAllow: /\nDisallow: /data/\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
