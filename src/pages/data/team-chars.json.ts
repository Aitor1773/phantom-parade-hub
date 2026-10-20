// Personajes con sus rangos de la tier list, para el creador de equipos y los equipos por contenido.
// Un solo archivo estático (/data/team-chars.json) que comparten todas las páginas.
import type { APIRoute } from 'astro';
import { CHARACTERS, thumb } from '@/data/characters';
import { TIER_LISTS, type TierListKey } from '@/data/gacha';
import type { DupeRule, Rank, TeamChar } from '@/lib/team-recs';

const entry = (list: TierListKey, id: string) => TIER_LISTS[list]?.entries[id];
const rankIn = (list: TierListKey, id: string) => (entry(list, id)?.rank ?? null) as Rank | null;
/** Nota de la tier list "S con 3 dupes; con menos dupes baja a A" → regla */
const ruleIn = (list: TierListKey, id: string): DupeRule | undefined => {
  const m = entry(list, id)?.note?.match(/con (\d) dupes?;.*baja a ([SABCD])/i);
  return m ? { min: Number(m[1]), below: m[2].toUpperCase() as Rank } : undefined;
};

export const GET: APIRoute = () => {
  const chars: TeamChar[] = CHARACTERS.map((c) => {
    const rules: TeamChar['rules'] = {};
    const r = { dmg: ruleIn('damage', c.id), sup: ruleIn('support', c.id), el: ruleIn(c.element as TierListKey, c.id) };
    for (const [k, v] of Object.entries(r)) if (v) rules[k as keyof typeof rules] = v;
    return {
      id: c.id,
      name: c.name,
      epithet: c.epithet,
      element: c.element,
      img: c.icon ?? thumb(c.art, 320),
      dmg: rankIn('damage', c.id),
      sup: rankIn('support', c.id),
      el: rankIn(c.element as TierListKey, c.id),
      focus: c.focus,
      hasSP: !!c.kits.sp,
      mems: c.memories.map((m) => m.id).filter((x): x is string => !!x),
      rules,
    };
  });
  return new Response(JSON.stringify(chars), { headers: { 'Content-Type': 'application/json' } });
};
