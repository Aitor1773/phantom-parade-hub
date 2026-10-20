// Motor de recomendación de equipos (sin DOM). Se basa en la tier list propia:
// rango en Daño para los atacantes, en Apoyo para los de apoyo y en la lista de su elemento
// para desempatar, más las debilidades y resistencias del contenido elegido.
// Equipo del juego (wiki): 4 titulares, 1 suplente y 1 de apoyo (de otro jugador).

export type Rank = 'S' | 'A' | 'B' | 'C' | 'D';
export type ElementKey = 'red' | 'blue' | 'green' | 'yellow';
export type Affinity = 'weak' | 'resist';

export interface TeamChar {
  id: string;
  name: string;
  epithet: string | null;
  element: string;
  img: string | null;
  /** Rangos en las listas de función y de elemento (null = no está en esa lista) */
  dmg: Rank | null;
  sup: Rank | null;
  el: Rank | null;
}

export interface TeamSlot { c: TeamChar; as: 'dmg' | 'sup'; score: number }
export interface Team { main: (TeamSlot | null)[]; sub: TeamSlot | null; helper: TeamSlot | null }
export interface RecOptions {
  affinity?: Partial<Record<ElementKey, Affinity>>;
  /** Personajes disponibles para titulares y suplente (tu cuenta). Sin él, todos. */
  owned?: Set<string>;
  /** Titulares atacantes (el resto, apoyo). El juego aconseja al menos 2 de apoyo. */
  dealers?: 1 | 2;
}

const RP: Record<Rank, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
// Peso de la debilidad/resistencia: pesa más en quien hace el daño
const BONUS = { dmg: { weak: 1.5, resist: -2 }, sup: { weak: 0.75, resist: -1 } } as const;

export function slotScore(c: TeamChar, as: 'dmg' | 'sup', affinity: RecOptions['affinity'] = {}): number | null {
  const r = as === 'dmg' ? c.dmg : c.sup;
  if (!r) return null;
  const a = affinity[c.element as ElementKey];
  return RP[r] + (a ? BONUS[as][a] : 0) + (c.el ? RP[c.el] * 0.1 : 0);
}

/** Mejor rol de un personaje para el suplente (el que más puntúa). */
function bestSlot(c: TeamChar, affinity: RecOptions['affinity']): TeamSlot | null {
  const d = slotScore(c, 'dmg', affinity), s = slotScore(c, 'sup', affinity);
  if (d == null && s == null) return null;
  return (d ?? -99) >= (s ?? -99) ? { c, as: 'dmg', score: d! } : { c, as: 'sup', score: s! };
}

/**
 * Recomienda un equipo. No repite personaje base (mismo nombre, otra versión): el juego no deja
 * llevar dos veces al mismo personaje. El apoyo sale de otro jugador, así que se elige entre todos.
 */
export function recommendTeam(all: TeamChar[], opts: RecOptions = {}): Team {
  const { affinity = {}, owned, dealers = 2 } = opts;
  const pool = owned ? all.filter((c) => owned.has(c.id)) : all;
  const used = new Set<string>();
  const ranked = (list: TeamChar[], as: 'dmg' | 'sup') =>
    list.map((c) => ({ c, as, score: slotScore(c, as, affinity) }))
      .filter((x): x is TeamSlot => x.score != null)
      .sort((a, b) => b.score - a.score);
  const take = (list: TeamSlot[], n: number) => {
    const out: TeamSlot[] = [];
    for (const x of list) {
      if (out.length >= n) break;
      if (used.has(x.c.name)) continue;
      used.add(x.c.name);
      out.push(x);
    }
    return out;
  };

  const dmg = take(ranked(pool, 'dmg'), dealers);
  const sup = take(ranked(pool, 'sup'), 4 - dealers);
  const main: (TeamSlot | null)[] = [...dmg, ...sup];
  while (main.length < 4) main.push(null);

  const subCands = pool.map((c) => bestSlot(c, affinity)).filter((x): x is TeamSlot => !!x).sort((a, b) => b.score - a.score);
  const [sub = null] = take(subCands, 1);
  // Apoyo de otro jugador: el mejor atacante de todo el juego que no esté ya en el equipo
  const [helper = null] = take(ranked(all, 'dmg'), 1);
  return { main, sub, helper };
}

/** Puntuación media de los titulares (para comparar equipos). */
export const teamScore = (t: Team) => {
  const xs = t.main.filter((x): x is TeamSlot => !!x);
  return xs.length ? xs.reduce((a, x) => a + x.score, 0) / xs.length : 0;
};
