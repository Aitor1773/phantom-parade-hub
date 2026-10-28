// Historial de banners destacados de cada personaje (reediciones), en JP y en Global.
//   JP:     cronología de la wiki (JP_BANNERS).
//   Global: lista curada a mano + fechas Global de la wiki (GLOBAL_BANNERS).
import { GLOBAL_BANNERS, JP_BANNERS, type Banner } from './banners';
import { CHARACTERS } from './characters';

export interface Appearance { name: string; start: string; end: string | null }
export interface CharHistory { jp: Appearance[]; global: Appearance[] }

const DAY = 864e5;

/**
 * Apariciones en gachas de un servidor, de la más reciente a la más antigua. Un mismo banner
 * puede venir dos veces (lista manual + wiki, o repetido en la cronología): se cuenta una vez
 * si empieza con menos de 5 días de diferencia.
 */
function collect(list: Banner[]) {
  const out = new Map<string, Appearance[]>();
  for (const b of list) {
    if (b.kind !== 'gacha') continue;
    for (const id of b.characters) {
      const arr = out.get(id) ?? [];
      if (!arr.some((a) => Math.abs(+new Date(a.start) - +new Date(b.start)) < 5 * DAY)) {
        arr.push({ name: b.name, start: b.start, end: b.end });
      }
      out.set(id, arr);
    }
  }
  for (const arr of out.values()) arr.sort((a, b) => b.start.localeCompare(a.start));
  return out;
}

const JP = collect(JP_BANNERS);
const GL = collect(GLOBAL_BANNERS);

export const historyOf = (id: string): CharHistory => ({ jp: JP.get(id) ?? [], global: GL.get(id) ?? [] });

/** Personajes con al menos un banner destacado (en cualquier servidor) */
export const HISTORY = CHARACTERS.map((c) => ({ c, h: historyOf(c.id) })).filter(({ h }) => h.jp.length || h.global.length);
