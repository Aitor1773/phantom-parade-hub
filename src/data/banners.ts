// Banners y eventos por servidor.
//   Global: curado a mano (data/manual/global-banners.json) + fechas Global de la wiki.
//   JP:     cronología completa de la wiki (npm run data:banners).
import wiki from '../../data/normalized/wiki/banners.json';
import manual from '../../data/manual/global-banners.json';
import { getCharacter } from './characters';

export type BannerKind = 'gacha' | 'event' | 'campaign';
export interface Banner {
  id: string;
  name: string;
  kind: BannerKind;
  /** ISO con zona horaria. Si solo se conoce el día, se usa el horario del juego (UTC+9). */
  start: string;
  end: string | null;
  approx: boolean;
  characters: string[];
  epithetsGlobal?: Record<string, string>;
  limited?: boolean;
  notes?: string;
  source: { label: string; url: string; official: boolean };
}

const JST = '+09:00';
// Los cambios de banner del juego son a las 15:00 (UTC+9) y terminan a las 14:59
const dayStart = (d: string) => `${d}T15:00:00${JST}`;
const dayEnd = (d: string) => `${d}T14:59:00${JST}`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

type ManualBanner = Omit<Banner, 'approx' | 'source'> & { startApprox?: boolean; source: { label: string; url: string } };
type WikiBanner = { id: string; name: string; global: { start: string; end: string | null } | null; characters: string[]; _source: { url: string } };
type WikiDay = { date: string; items: { title: string; kind: BannerKind; end: string | null; characters: string[] }[] };

const W = wiki as unknown as { banners: WikiBanner[]; timelineJP: { url: string; updated: string; days: WikiDay[] } };

const byStart = (a: Banner, b: Banner) => b.start.localeCompare(a.start);

export const GLOBAL_BANNERS: Banner[] = [
  ...(manual.banners as unknown as ManualBanner[]).map((b) => ({
    ...b,
    approx: !!b.startApprox,
    source: { ...b.source, official: true },
  })),
  // Fechas Global que recoge la wiki (solo día: hora aproximada)
  ...W.banners
    .filter((b) => b.global?.start)
    .map((b) => ({
      id: `gl-wiki-${b.id}`,
      name: b.name,
      kind: 'gacha' as const,
      start: dayStart(b.global!.start),
      end: b.global!.end ? dayEnd(b.global!.end) : null,
      approx: true,
      characters: b.characters,
      source: { label: 'JJK Phantom Parade Wiki', url: b._source.url, official: false },
    })),
].sort(byStart);

export const JP_BANNERS: Banner[] = W.timelineJP.days
  .flatMap((d) =>
    d.items.map((it, i) => ({
      id: `jp-${d.date}-${i}-${slug(it.title).slice(0, 40)}`,
      name: it.title,
      kind: it.kind,
      start: dayStart(d.date),
      end: it.end ? dayEnd(it.end) : null,
      approx: true,
      characters: it.characters,
      source: { label: 'JJK Phantom Parade Wiki', url: W.timelineJP.url, official: false },
    })),
  )
  .sort(byStart);

export const JP_TIMELINE_META = { url: W.timelineJP.url, updated: W.timelineJP.updated };

/**
 * Retraso real JP → Global medido con los banners Global oficiales del último año
 * (fecha de salida en JP del personaje vs. inicio del banner en Global).
 * Es un dato observado, no una predicción por banner.
 */
export const GLOBAL_LAG = (() => {
  const yearAgo = Date.now() - 365 * 864e5;
  const days = GLOBAL_BANNERS.filter((b) => b.source.official && b.kind === 'gacha' && +new Date(b.start) > yearAgo)
    .flatMap((b) => b.characters.map((id) => ({ jp: getCharacter(id)?.releaseDateJP, gl: b.start })))
    .filter((x): x is { jp: string; gl: string } => !!x.jp)
    .map((x) => Math.round((+new Date(x.gl) - +new Date(`${x.jp}T15:00:00+09:00`)) / 864e5))
    .filter((d) => d > 0);
  return days.length ? { min: Math.min(...days), max: Math.max(...days), samples: days.length } : null;
})();

/** Banner Global verificado que ya incluye a algún personaje de este banner JP. */
export function globalConfirmed(b: Banner): Banner | null {
  if (!b.characters.length) return null;
  return GLOBAL_BANNERS.find((gb) => gb.characters.some((id) => b.characters.includes(id))) ?? null;
}

/**
 * Ventana ESTIMADA de llegada a Global: inicio en JP + retraso mín./máx. observado.
 * Solo para gachas aún sin confirmar en Global y cuya ventana no haya pasado hace
 * más de 30 días (más atrás ya no aporta nada y confundiría).
 */
export function globalEstimate(b: Banner, now = Date.now()) {
  if (!GLOBAL_LAG || b.kind !== 'gacha' || globalConfirmed(b)) return null;
  const start = +new Date(b.start);
  const from = start + GLOBAL_LAG.min * 864e5, to = start + GLOBAL_LAG.max * 864e5;
  if (to < now - 30 * 864e5) return null;
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
}
