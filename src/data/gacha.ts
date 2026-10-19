// Reglas del gacha y tier list PROPIA para las recomendaciones.
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

export type TierRank = 'SS' | 'S' | 'A' | 'B' | 'C';
export interface TierEntry {
  rank: TierRank;
  draftRank: TierRank;
  score: number;
  group: 'attacker' | 'support' | 'debuffer' | 'sustain';
  metrics: { ultDmg: number; maxBuff: number; maxDebuff: number; sustain: number };
  manual?: boolean;
  note?: string;
}

const TL = tierList as unknown as { updatedAt: string; criteria: Record<string, unknown>; entries: Record<string, TierEntry> };

export const TIER_RANKS: TierRank[] = ['SS', 'S', 'A', 'B', 'C'];
export const TIER_UPDATED = TL.updatedAt;
export const TIER_CRITERIA = TL.criteria as {
  roleWeights: Record<string, { dmg: number; buff: number; debuff: number; sustain: number }>;
  thresholds: [TierRank, number][];
  aoeFactor: number;
  autoFactor: number;
  selfBuffFactor: number;
  rarityFactor: Record<string, number>;
};

export const tierEntry = (id: string): TierEntry | null => TL.entries[id] ?? null;

/** Rango y puntuación de un personaje en la tier list propia. */
export function tierOf(id: string): { rank: string | null; score: number | null } {
  const e = TL.entries[id];
  return { rank: e?.rank ?? null, score: e?.score ?? null };
}
