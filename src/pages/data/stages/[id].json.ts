// Fichas de las fases de un contenido (/data/stages/<id>.json), para el creador de equipos:
// solo se descargan las del contenido que elige el jugador.
import type { APIRoute } from 'astro';
import { CONTENT, stagesOf } from '@/data/content';

export function getStaticPaths() {
  return CONTENT.filter((c) => Object.keys(stagesOf(c.id)).length).map((c) => ({ params: { id: c.id } }));
}

export const GET: APIRoute = ({ params }) =>
  new Response(JSON.stringify(stagesOf(params.id!)), { headers: { 'Content-Type': 'application/json' } });
