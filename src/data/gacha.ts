// Reglas del gacha y tier list PROPIA (7 listas) para la web y las recomendaciones.
// Datos del gacha: JJK Phantom Parade Wiki, "Beginner's Guide" (pendiente de confirmar en Global).
import tierList from '../../data/manual/tier-list.json';

export const GACHA = {
  cubesPerPull: 300,
  cubesPer10: 3000,
  /** Puntos de gacha (1 por tirada) para conseguir el destacado garantizado */
  pity: 250,
  ssrCharRate: 0.025,
  /** Cada 20 puntos se pueden cambiar por 10 tarjetas para banners futuros (máx. 100 por banner) */
  pointCards: { per: 20, gives: 10, maxPerBanner: 100 },
  source: { label: "JJK Phantom Parade Wiki · Beginner's Guide", url: "https://jjk-phantom-parade.fandom.com/wiki/Beginner%27s_Guide" },
} as const;

export type TierRank = 'S' | 'A' | 'B' | 'C' | 'D';
export type TierListKey = 'blue' | 'red' | 'green' | 'yellow' | 'damage' | 'support' | 'sp';
export interface TierListEntry { rank: TierRank; draftRank: TierRank; score: number; manual?: boolean; note?: string }
export interface TierChange { date: string; list: TierListKey; id: string; from: TierRank | null; to: TierRank; by: 'manual' | 'draft' }

const TL = tierList as unknown as {
  updatedAt: string;
  criteria: Record<string, unknown>;
  lists: Record<TierListKey, { reviewed: string; entries: Record<string, TierListEntry> }>;
  characters: Record<string, { score: number; group: 'attacker' | 'support' | 'debuffer' | 'sustain'; metrics: Record<string, number> }>;
  changelog: TierChange[];
};

/** Orden de las pestañas: elementos y después funciones (como en la propuesta aprobada). */
export const TIER_LIST_KEYS: TierListKey[] = ['blue', 'red', 'green', 'yellow', 'damage', 'support', 'sp'];
export const TIER_RANKS: TierRank[] = ['S', 'A', 'B', 'C', 'D'];
export const TIER_LISTS = TL.lists;
export const TIER_CHANGELOG = [...TL.changelog].reverse(); // lo más reciente primero
export const TIER_UPDATED = TL.updatedAt;
export const TIER_CRITERIA = TL.criteria as {
  roleWeights: Record<string, { dmg: number; buff: number; debuff: number; sustain: number }>;
  thresholds: [TierRank, number][];
  aoeFactor: number;
  rarityFactor: Record<string, number>;
};
export const tierCharacter = (id: string) => TL.characters[id] ?? null;

/** Rango del personaje en la lista de su elemento (la referencia general) y su puntuación. */
export function tierOf(id: string, element?: string): { rank: string | null; score: number | null } {
  const list = (element && TL.lists[element as TierListKey]) || TIER_LIST_KEYS.slice(0, 4).map((k) => TL.lists[k]).find((l) => l.entries[id]);
  return { rank: list?.entries[id]?.rank ?? null, score: TL.characters[id]?.score ?? null };
}
