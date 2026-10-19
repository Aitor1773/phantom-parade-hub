// Reglas del gacha y tier list para las recomendaciones.
// Datos del gacha: JJK Phantom Parade Wiki, "Beginner's Guide" (pendiente de confirmar en Global).
import tiers from '../../data/normalized/tiers.json';

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

type TierFile = {
  fetchedAt: string;
  sources: { id: string; name: string; url: string; status: string; note?: string; updated?: string | null; count?: number }[];
  ranks: Record<string, Record<string, string>>;
  scores: Record<string, { score: number; sources: number }>;
};
const T = tiers as unknown as TierFile;

export const TIER_SOURCES = T.sources;
export const TIER_FETCHED = T.fetchedAt;

/** Rango principal (de la primera fuente utilizable) y puntuación 0–100 de un personaje. */
export function tierOf(id: string): { rank: string | null; score: number | null } {
  const r = T.ranks[id];
  const main = T.sources.find((s) => s.status === 'ok' && r?.[s.id]);
  return { rank: main ? r[main.id] : null, score: T.scores[id]?.score ?? null };
}
