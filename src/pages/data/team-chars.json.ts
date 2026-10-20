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

/**
 * Rasgos del kit vigente (el ajuste más reciente de cada habilidad, a nivel 10):
 * daño en área, provocar, curar, proteger (reducir el daño recibido) y limpiar debilitamientos.
 */
function traits(c: (typeof CHARACTERS)[number]): TeamChar['traits'] {
  const kits = [c.kits.adjustedV2, c.kits.adjusted, c.kits.base].filter(Boolean);
  const text = (['s1', 's2', 'ult', 'normal'] as const)
    .map((k) => kits.map((kit) => kit?.[k]).find((s) => s?.levels?.some(Boolean)))
    .map((s) => s?.levels?.[9] ?? [...(s?.levels ?? [])].reverse().find(Boolean) ?? '')
    .join('\n');
  const autos = (kits.find((k) => k?.autos?.length) ?? c.kits.base).autos.map((a) => a.effect).join('\n');
  const all = `${text}\n${autos}`;
  return {
    aoe: /Damage[^\n]*to all enemies|Damage equal to[^\n]*to all enemies/i.test(text),
    taunt: /Taunt (?:the selected|all) enem|Attracts[^\n]*attacks/i.test(all),
    // Solo cuenta curar a los aliados (no curarse a sí mismo)
    heal: /Recovers (?:all allies'|all allies|the selected ally's|allies')[^\n]*HP/i.test(all),
    guard: /Decreases (?:all allies'|the selected ally's)[^\n]*Damage Received/i.test(all),
    cleanse: /(?:Removes|Reduces the duration of)[^\n]*debuff/i.test(all),
  };
}

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
      traits: traits(c),
    };
  });
  return new Response(JSON.stringify(chars), { headers: { 'Content-Type': 'application/json' } });
};
