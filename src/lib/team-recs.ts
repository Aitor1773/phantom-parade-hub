// Motor de recomendación de equipos (sin DOM). Se basa en la tier list propia:
// rango en Daño para los atacantes, en Apoyo para los de apoyo y en la lista de su elemento
// para desempatar, más las debilidades y resistencias del contenido elegido.
// Con tu cuenta, además: nivel, dupes, habilidades, SP y las memorias que tienes.
// Equipo del juego (wiki): 4 titulares, 1 suplente y 1 de apoyo (de otro jugador).

import type { StageNeeds } from './stage';

export type Rank = 'S' | 'A' | 'B' | 'C' | 'D';
export type ElementKey = 'red' | 'blue' | 'green' | 'yellow';
export type Affinity = 'weak' | 'resist';
export type Role = 'dmg' | 'sup';
/** "S con 3 dupes; con menos baja a A" (nota de la tier list) */
export interface DupeRule { min: number; below: Rank }

export interface TeamChar {
  id: string;
  name: string;
  epithet: string | null;
  element: string;
  img: string | null;
  /** Versiones HD de la ilustración (srcset) */
  srcset?: string;
  /** Rangos en las listas de función y de elemento (null = no está en esa lista) */
  dmg: Rank | null;
  sup: Rank | null;
  el: Rank | null;
  focus: string | null;
  hasSP: boolean;
  /** Memorias recomendadas (ids), en el orden de la wiki */
  mems: string[];
  rules: Partial<Record<Role | 'el', DupeRule>>;
  /** Rasgos del kit: daño en área, provocar, curar, proteger, limpiar debilitamientos */
  traits?: { aoe: boolean; taunt: boolean; heal: boolean; guard: boolean; cleanse: boolean };
}

export interface TeamMemory { id: string; name: string; rarity: 'SSR' | 'SR' | 'R'; img: string | null; tags: string[]; orientation: string }

/** Lo que guarda Mi cuenta de cada personaje y memoria */
export interface OwnedChar { level?: number; dupes?: number; skills?: Partial<Record<'normal' | 's1' | 's2' | 'ult', number>>; sp?: boolean }
export interface OwnedMem { copies?: number; level?: number }
export interface Account { chars: Record<string, OwnedChar>; mems: Record<string, OwnedMem> }

export interface TeamSlot { c: TeamChar; as: Role; score: number; rank: Rank; mem?: TeamMemory | null }
export interface Team { main: (TeamSlot | null)[]; sub: TeamSlot | null; helper: TeamSlot | null }
export interface RecOptions {
  affinity?: Partial<Record<ElementKey, Affinity>>;
  /** Tu cuenta: solo sus personajes para titulares y suplente, con su inversión */
  account?: Account | null;
  /** Titulares atacantes (el resto, apoyo). El juego aconseja al menos 2 de apoyo. */
  dealers?: 1 | 2;
  memories?: TeamMemory[];
  /** Lo que exige la fase (reglas, reducción por tipo de daño, número de enemigos…) */
  needs?: StageNeeds | null;
}

export const RP: Record<Rank, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
const RANKS: Rank[] = ['D', 'C', 'B', 'A', 'S'];
// Peso de la debilidad/resistencia: pesa más en quien hace el daño
const BONUS = { dmg: { weak: 1.5, resist: -2 }, sup: { weak: 0.75, resist: -1 } } as const;

const maxLevelOf = (acc?: Account | null) => Math.max(0, ...Object.values(acc?.chars ?? {}).map((o) => o.level ?? 0));

/** Rango efectivo: aplica reglas de dupes ("con menos dupes baja a A") si conocemos tu cuenta. */
export function effectiveRank(c: TeamChar, as: Role, own?: OwnedChar | null): Rank | null {
  const r = as === 'dmg' ? c.dmg : c.sup;
  const rule = c.rules[as];
  if (!r || !own || !rule) return r;
  return (own.dupes ?? 0) >= rule.min ? r : rule.below;
}

/** Bonificación por inversión (nivel, dupes, habilidades, SP). Sin datos, neutra. */
export function investment(c: TeamChar, own: OwnedChar | null | undefined, maxLevel: number) {
  if (!own) return 0;
  let b = (own.dupes ?? 0) * 0.1;
  if (own.level && maxLevel) b += (own.level / maxLevel - 1) * 1.5;
  const lv = (['s1', 's2', 'ult'] as const).map((k) => own.skills?.[k]).filter((x): x is number => !!x);
  if (lv.length) b += (lv.reduce((a, x) => a + x, 0) / lv.length - 6) * 0.05;
  if (c.hasSP && own.sp) b += 0.4;
  return b;
}

/** Si las reglas de la fase permiten usar al personaje. */
export const allowed = (c: TeamChar, needs?: StageNeeds | null) =>
  !needs || ((!needs.only || needs.only.includes(c.element as ElementKey)) && !needs.banned?.includes(c.element as ElementKey));

/** Reducción que sufre el daño del personaje en esta fase (0–1), según su tipo de daño. */
export function damageCut(c: TeamChar, needs?: StageNeeds | null) {
  if (!needs) return 0;
  const { taijutsu: t, jujutsu: j, mixed: m } = needs.cut;
  const f = (c.focus ?? '').toLowerCase();
  const cut = f === 'taijutsu' ? t : f === 'jujutsu' ? j : m || (t + j) / 2;
  return Math.min(100, cut) / 100;
}

/** Ajuste por lo que pide la fase: tipo de daño, área, provocación, debilitamientos. */
export function needsBonus(c: TeamChar, as: Role, needs?: StageNeeds | null) {
  if (!needs) return 0;
  const tr = c.traits;
  let b = -damageCut(c, needs) * (as === 'dmg' ? 4 : 1);
  // Probado en esta fase (equipo de victoria o recomendado por la guía)
  if (needs.picks?.includes(c.id)) b += 0.6;
  if (tr?.aoe && as === 'dmg' && (needs.enemies >= 3 || needs.taunt)) b += 0.8;
  if (as === 'sup') {
    if (needs.debuffs && tr?.cleanse) b += 0.5;
    if (needs.aoeDamage && (tr?.heal || tr?.guard)) b += 0.4;
  }
  return b;
}

export function slotScore(c: TeamChar, as: Role, affinity: RecOptions['affinity'] = {}, own?: OwnedChar | null, maxLevel = 0, needs?: StageNeeds | null): number | null {
  const r = effectiveRank(c, as, own);
  if (!r || !allowed(c, needs)) return null;
  const a = affinity[c.element as ElementKey];
  return RP[r] + (a ? BONUS[as][a] : 0) + (c.el ? RP[c.el] * 0.1 : 0) + investment(c, own, maxLevel) + needsBonus(c, as, needs);
}

// ── Memorias ────────────────────────────────────────────────────
const WANTS: Record<Role, string[]> = {
  dmg: ['damage', 'crit', 'break'],
  sup: ['gauge', 'ce', 'heal', 'defense', 'debuff', 'taunt', 'revive'],
};
const RARITY_PTS = { SSR: 3, SR: 1.5, R: 0.5 } as const;

export function memoryScore(m: TeamMemory, c: TeamChar, as: Role, own?: OwnedMem | null) {
  let s = RARITY_PTS[m.rarity] ?? 0;
  const rec = c.mems.indexOf(m.id);
  if (rec >= 0) s += 4 - rec * 0.5;
  s += m.tags.filter((t) => WANTS[as].includes(t)).length * 0.6;
  const focus = (c.focus ?? '').toLowerCase();
  if (as === 'dmg') {
    if (focus === 'mixed' ? m.tags.includes('taijutsu') || m.tags.includes('jujutsu') : m.tags.includes(focus)) s += 0.6;
    if (m.orientation === focus || (focus === 'mixed' && m.orientation === 'mixed')) s += 0.5;
  } else if (m.orientation === 'hp' || m.orientation === 'balanced') s += 0.3;
  if (own?.level) s += Math.min(own.level, 80) / 160;
  return s;
}

/** Reparte memorias entre los huecos: las tuyas (según copias) o, sin cuenta, la mejor de cada uno. */
export function assignMemories(slots: (TeamSlot | null)[], memories: TeamMemory[], account?: Account | null) {
  // Copias disponibles: las tuyas o, sin cuenta, una de cada (para no repetir la misma en todos)
  const left = new Map<string, number>();
  if (account) for (const [id, o] of Object.entries(account.mems)) left.set(id, o.copies ?? 1);
  else for (const m of memories) left.set(m.id, 1);
  const pool = memories.filter((m) => left.has(m.id));
  // Primero los atacantes, que son los que más aprovechan la memoria
  const order = slots.map((s, i) => ({ s, i })).filter((x): x is { s: TeamSlot; i: number } => !!x.s)
    .sort((a, b) => (a.s.as === b.s.as ? 0 : a.s.as === 'dmg' ? -1 : 1));
  for (const { s } of order) {
    let best: TeamMemory | null = null, bestScore = -Infinity;
    for (const m of pool) {
      if (!(left.get(m.id)! > 0)) continue;
      const sc = memoryScore(m, s.c, s.as, account?.mems[m.id]);
      if (sc > bestScore) [best, bestScore] = [m, sc];
    }
    s.mem = best;
    if (best) left.set(best.id, left.get(best.id)! - 1);
  }
}

// ── Equipo ──────────────────────────────────────────────────────
/**
 * Recomienda un equipo. No repite personaje base (mismo nombre, otra versión): el juego no deja
 * llevar dos veces al mismo personaje. El apoyo sale de otro jugador, así que se elige entre todos.
 */
export function recommendTeam(all: TeamChar[], opts: RecOptions = {}): Team {
  const { affinity = {}, account, dealers = 2, memories, needs } = opts;
  const maxLevel = maxLevelOf(account);
  const pool = account ? all.filter((c) => account.chars[c.id]) : all;
  const used = new Set<string>();
  const slot = (c: TeamChar, as: Role, withAccount: boolean): TeamSlot | null => {
    const own = withAccount ? account?.chars[c.id] : null;
    const score = slotScore(c, as, affinity, own, maxLevel, needs);
    const rank = effectiveRank(c, as, own);
    return score == null || !rank ? null : { c, as, score, rank };
  };
  const ranked = (list: TeamChar[], as: Role, withAccount = !!account) =>
    list.map((c) => slot(c, as, withAccount)).filter((x): x is TeamSlot => !!x).sort((a, b) => b.score - a.score);
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

  const subCands = pool.flatMap((c) => [slot(c, 'dmg', !!account), slot(c, 'sup', !!account)])
    .filter((x): x is TeamSlot => !!x).sort((a, b) => b.score - a.score);
  const [sub = null] = take(subCands, 1);
  // Apoyo de otro jugador: el mejor atacante de todo el juego que no esté ya en el equipo
  const [helper = null] = take(ranked(all, 'dmg', false), 1);
  if (memories) assignMemories([...main, sub], memories, account);
  return { main, sub, helper };
}

/** Inversión máxima de un personaje (5 dupes, habilidades a 10, SP si lo tiene). */
export const idealInvestment = (c: TeamChar) => investment(c, { dupes: 5, skills: { s1: 10, s2: 10, ult: 10 }, sp: true }, 0);

/** % de preparación: tu equipo frente al mejor posible con inversión máxima. */
export function readiness(mine: Team, best: Team) {
  const xs = best.main.filter((x): x is TeamSlot => !!x);
  const ideal = xs.length ? xs.reduce((a, x) => a + x.score + idealInvestment(x.c), 0) / 4 : 0;
  const have = mine.main.reduce((a, x) => a + (x?.score ?? 0), 0) / 4; // los huecos vacíos cuentan como 0
  return ideal > 0 ? Math.max(0, Math.min(100, Math.round((have / ideal) * 100))) : 0;
}

/** Puntuación media de los titulares (para comparar equipos). */
export const teamScore = (t: Team) => {
  const xs = t.main.filter((x): x is TeamSlot => !!x);
  return xs.length ? xs.reduce((a, x) => a + x.score, 0) / xs.length : 0;
};
export const rankFromPoints = (p: number): Rank => RANKS[Math.min(4, Math.max(0, Math.round(p) - 1))];

// ── Qué te falta ────────────────────────────────────────────────
export type Advice =
  | { kind: 'level'; c: TeamChar; now: number; target: number }
  | { kind: 'skills'; c: TeamChar; low: string }
  | { kind: 'sp'; c: TeamChar }
  | { kind: 'dupes'; c: TeamChar; min: number; rank: Rank; now: number }
  | { kind: 'memory'; c: TeamChar; mem: TeamMemory }
  | { kind: 'missing'; c: TeamChar; rank: Rank; as: Role };

/** Mejoras para tu equipo y personajes del mejor equipo general que no tienes. */
export function teamAdvice(mine: Team, best: Team, account: Account, memories: TeamMemory[]): Advice[] {
  const out: Advice[] = [];
  const maxLevel = maxLevelOf(account);
  const memById = new Map(memories.map((m) => [m.id, m]));
  for (const s of [...mine.main, mine.sub]) {
    if (!s) continue;
    const own = account.chars[s.c.id] ?? {};
    const rule = s.c.rules[s.as];
    if (rule && (own.dupes ?? 0) < rule.min) out.push({ kind: 'dupes', c: s.c, min: rule.min, rank: (s.as === 'dmg' ? s.c.dmg : s.c.sup)!, now: own.dupes ?? 0 });
    if (own.level && maxLevel && own.level < maxLevel) out.push({ kind: 'level', c: s.c, now: own.level, target: maxLevel });
    const low = (['ult', 's1', 's2'] as const).filter((k) => own.skills?.[k] && own.skills[k]! < 10).map((k) => `${k.toUpperCase()} ${own.skills![k]}`);
    if (low.length) out.push({ kind: 'skills', c: s.c, low: low.join(' · ') });
    if (s.c.hasSP && !own.sp) out.push({ kind: 'sp', c: s.c });
    // Memoria recomendada que no tienes (si la que lleva no es ya una recomendada)
    if (!s.mem || !s.c.mems.includes(s.mem.id)) {
      const want = s.c.mems.map((id) => memById.get(id)).find((m) => m && !account.mems[m.id]);
      if (want) out.push({ kind: 'memory', c: s.c, mem: want });
    }
  }
  for (const s of [...best.main, best.sub]) if (s && !account.chars[s.c.id]) out.push({ kind: 'missing', c: s.c, rank: s.rank, as: s.as });
  return out;
}
