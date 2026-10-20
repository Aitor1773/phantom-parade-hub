// Memorias para el reparto de memorias en los equipos (/data/team-memories.json).
import type { APIRoute } from 'astro';
import { MEMORIES } from '@/data/memories';
import type { TeamMemory } from '@/lib/team-recs';

export const GET: APIRoute = () => {
  const mems: TeamMemory[] = MEMORIES.map((m) => ({ id: m.id, name: m.name, rarity: m.rarity, img: m.icon, tags: m.tags, orientation: m.orientation }));
  return new Response(JSON.stringify(mems), { headers: { 'Content-Type': 'application/json' } });
};
