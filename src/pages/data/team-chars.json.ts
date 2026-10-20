// Personajes con sus rangos de la tier list, para el creador de equipos y los equipos por contenido.
// Un solo archivo estático (/data/team-chars.json) que comparten todas las páginas.
import type { APIRoute } from 'astro';
import { CHARACTERS, thumb } from '@/data/characters';
import { TIER_LISTS, type TierListKey } from '@/data/gacha';
import type { TeamChar } from '@/lib/team-recs';

const rankIn = (list: TierListKey, id: string) => TIER_LISTS[list]?.entries[id]?.rank ?? null;

export const GET: APIRoute = () => {
  const chars: TeamChar[] = CHARACTERS.map((c) => ({
    id: c.id,
    name: c.name,
    epithet: c.epithet,
    element: c.element,
    img: c.icon ?? thumb(c.art, 320),
    dmg: rankIn('damage', c.id),
    sup: rankIn('support', c.id),
    el: rankIn(c.element as TierListKey, c.id),
  }));
  return new Response(JSON.stringify(chars), { headers: { 'Content-Type': 'application/json' } });
};
