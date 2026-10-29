// Análisis de un equipo concreto frente a una fase: veredicto (¿te lo pasas?), hasta dónde llegas
// en un contenido con varias fases, qué cambios lo mejoran (con lo que tienes y lo que te falta)
// y el plan de combate para esa fase. Sin DOM: devuelve claves de traducción con sus variables.
import { stageNeeds, type Stage, type StageNeeds } from './stage';
import { allowed, damageCut, effectiveRank, slotScore, type Account, type ElementKey, type Role, type Team, type TeamChar, type TeamSlot } from './team-recs';

// ── Modelo de rendimiento ───────────────────────────────────────
/** Daño contra un enemigo débil (▲▲) / resistente (▼▼) a tu color: ×1,5 y ×0,75 en el juego */
export const ADV = 1.5;
export const DIS = 0.75;
/** Peso de los atacantes en el rendimiento del equipo (el resto lo aportan apoyos y aguante) */
const DMG_SHARE = 0.65;

export type Verdict = 'easy' | 'ok' | 'tight' | 'hard';
/** Proporción poder efectivo / poder recomendado a partir de la que aplica cada veredicto */
// El poder recomendado es orientativo (no bloquea): las guías superan fases por debajo de él, aunque
// con poco poder un solo golpe puede tumbar a un personaje
const CUTS: [number, Verdict][] = [[1.1, 'easy'], [0.95, 'ok'], [0.8, 'tight'], [0, 'hard']];
export const verdictOf = (ratio: number): Verdict => CUTS.find(([min]) => ratio >= min)![1];

const mainOf = (t: Team) => t.main.filter((s): s is TeamSlot => !!s);

/** Multiplicador de daño de un personaje en la fase: color del enemigo y reducción por tipo de daño. */
export function hitFactor(c: TeamChar, needs: StageNeeds | null) {
  if (!needs) return 1;
  const el = c.element as ElementKey;
  const aff = needs.weak.includes(el) ? ADV : needs.resist.includes(el) ? DIS : 1;
  return aff * (1 - damageCut(c, needs));
}

/** Rasgos que la fase pide y si el equipo los cubre (área, limpiar, curar/proteger) */
export function coverage(team: Team, needs: StageNeeds | null) {
  const all = [...mainOf(team), ...(team.sub ? [team.sub] : [])];
  const has = (k: 'aoe' | 'cleanse' | 'heal' | 'guard', who = all) => who.some((s) => s.c.traits?.[k]);
  const dealers = mainOf(team).filter((s) => s.as === 'dmg');
  return {
    aoe: !needs || !(needs.enemies >= 3 || needs.taunt) || has('aoe', dealers.length ? dealers : mainOf(team)),
    cleanse: !needs?.debuffs || has('cleanse'),
    sustain: !needs?.aoeDamage || has('heal') || has('guard'),
  };
}

/**
 * Factor de composición (1 = equipo neutro): cuánto rinde el equipo en esta fase por colores,
 * tipo de daño y rasgos que pide. El apoyo de otro jugador no cuenta: solo entra si cae uno de los tuyos.
 */
export function compFactor(team: Team, needs: StageNeeds | null) {
  const main = mainOf(team);
  if (!main.length) return 0;
  const dealers = main.filter((s) => s.as === 'dmg');
  const hitters = dealers.length ? dealers : main;
  const dmg = hitters.reduce((a, s) => a + hitFactor(s.c, needs), 0) / hitters.length;
  // Los apoyos de un color resistido también reciben más daño
  const supRes = main.filter((s) => s.as === 'sup' && needs?.resist.includes(s.c.element as ElementKey)).length;
  const cov = coverage(team, needs);
  let f = DMG_SHARE * dmg + (1 - DMG_SHARE) * (1 - 0.05 * supRes);
  if (!cov.aoe) f *= 0.9;
  if (!cov.cleanse) f *= 0.95;
  if (!cov.sustain) f *= 0.92;
  // Cada titular que falta resta una cuarta parte
  return f * (main.length / 4);
}

export interface PhaseCheck { key: string; name: string; power: number | null; ratio: number | null; verdict: Verdict | null }

/** Veredicto en una fase con el poder del equipo (el que muestra el juego en la formación). */
export function checkPhase(team: Team, key: string, stage: Stage, power: number | null): PhaseCheck {
  const needs = stageNeeds(stage);
  const ratio = power && stage.power ? (power * compFactor(team, needs)) / stage.power : null;
  return { key, name: stage.name ?? key, power: stage.power ?? null, ratio, verdict: ratio == null ? null : verdictOf(ratio) };
}

/**
 * Hasta dónde llegas en un contenido con fases en orden (pisos de la torre, dificultades de un jefe…):
 * las fases seguidas que el equipo supera (veredicto «ajustado» o mejor), la primera que se le
 * atraganta y en cuántas fases en total sirve (en las demás, otro equipo: cada fase pide su color).
 */
export function reach(team: Team, phases: [string, Stage][], power: number | null) {
  const checks = phases.filter(([, s]) => s.power).map(([k, s]) => checkPhase(team, k, s, power));
  if (!power || !checks.length) return null;
  const firstHard = checks.findIndex((c) => c.verdict === 'hard');
  const last = firstHard < 0 ? checks.at(-1)! : firstHard > 0 ? checks[firstHard - 1] : null;
  const wall = firstHard >= 0 ? checks[firstHard] : null;
  const cleared = checks.filter((c) => c.verdict !== 'hard').length;
  // Poder que haría falta para superar (ajustado) esa fase con este mismo equipo
  const need = wall?.ratio ? Math.ceil((power * CUTS[2][0]) / wall.ratio / 100) * 100 : null;
  return { checks, last, wall, need, cleared };
}

// ── Cambios recomendados ────────────────────────────────────────
export type Reason = 'weak' | 'notresist' | 'nocut' | 'aoe' | 'cleanse' | 'sustain' | 'proven' | 'rank';
export interface Swap { slot: number; from: TeamChar | null; to: TeamChar; as: Role; gain: number; reasons: Reason[]; owned: boolean }

const affinityOf = (needs: StageNeeds | null) => {
  const a: Partial<Record<ElementKey, 'weak' | 'resist'>> = {};
  needs?.weak.forEach((e) => (a[e] = 'weak'));
  needs?.resist.forEach((e) => (a[e] = 'resist'));
  return a;
};
const maxLevelOf = (account: Account | null) => Math.max(0, ...Object.values(account?.chars ?? {}).map((o) => o.level ?? 0));

/** Valor del equipo para comparar cambios: titulares, suplente y lo que pide la fase. */
function teamValue(team: Team, needs: StageNeeds | null, account: Account | null) {
  const affinity = affinityOf(needs), maxLevel = maxLevelOf(account);
  const sc = (s: TeamSlot | null) => (s ? slotScore(s.c, s.as, affinity, account?.chars[s.c.id] ?? null, maxLevel, needs) ?? 0 : 0);
  const cov = coverage(team, needs);
  return mainOf(team).reduce((a, s) => a + sc(s), 0) + 0.3 * sc(team.sub) + (cov.aoe ? 0 : -1.5) + (cov.cleanse ? 0 : -0.8) + (cov.sustain ? 0 : -1);
}

const replace = (team: Team, i: number, slot: TeamSlot): Team =>
  i < 4 ? { ...team, main: team.main.map((s, j) => (j === i ? slot : s)) } : { ...team, sub: slot };

/**
 * Mejores cambios hueco a hueco (titulares y suplente): con tus personajes (`owned: true`) o con
 * los que no tienes. Un solo cambio por hueco, sin repetir personaje, de más a menos mejora.
 */
export function suggestSwaps(team: Team, chars: TeamChar[], needs: StageNeeds | null, account: Account | null, opts: { owned: boolean; max?: number }): Swap[] {
  const affinity = affinityOf(needs), maxLevel = maxLevelOf(account);
  const inTeam = new Set([...mainOf(team), team.sub, team.helper].filter((s): s is TeamSlot => !!s).map((s) => s.c.name));
  // Sin cuenta, «tuyos» no tiene sentido: todas las propuestas son de personajes en general
  const pool = chars.filter((c) => !inTeam.has(c.name) && allowed(c, needs) && (account ? !!account.chars[c.id] === opts.owned : !opts.owned));
  const base = teamValue(team, needs, account);
  const cov = coverage(team, needs);
  const out: Swap[] = [];
  const slots = [...team.main, team.sub];
  for (let i = 0; i < slots.length; i++) {
    const cur = slots[i];
    let best: Swap | null = null;
    for (const c of pool) {
      for (const as of (cur ? [cur.as] : ['dmg', 'sup']) as Role[]) {
        const own = opts.owned ? account?.chars[c.id] ?? null : null;
        const score = slotScore(c, as, affinity, own, maxLevel, needs);
        const rank = effectiveRank(c, as, own);
        if (score == null || !rank) continue;
        const next = replace(team, i, { c, as, score, rank });
        // El suplente solo entra si cae alguien: su mejora cuenta menos
        const gain = (teamValue(next, needs, account) - base) * (i === 4 ? 0.6 : 1);
        if (gain <= 0.4 || (best && gain <= best.gain)) continue;
        const reasons: Reason[] = [];
        const el = c.element as ElementKey, curEl = cur?.c.element as ElementKey | undefined;
        if (needs?.weak.includes(el) && !(curEl && needs.weak.includes(curEl))) reasons.push('weak');
        else if (curEl && needs?.resist.includes(curEl) && !needs.resist.includes(el)) reasons.push('notresist');
        if (as === 'dmg' && cur && damageCut(cur.c, needs) > damageCut(c, needs) + 0.2) reasons.push('nocut');
        const nextCov = coverage(next, needs);
        if (!cov.aoe && nextCov.aoe) reasons.push('aoe');
        if (!cov.cleanse && nextCov.cleanse) reasons.push('cleanse');
        if (!cov.sustain && nextCov.sustain) reasons.push('sustain');
        if (needs?.picks?.includes(c.id) && !(cur && needs.picks.includes(cur.c.id))) reasons.push('proven');
        if (!reasons.length) reasons.push('rank');
        best = { slot: i, from: cur?.c ?? null, to: c, as, gain, reasons, owned: opts.owned };
      }
    }
    if (best) out.push(best);
  }
  // Un mismo personaje solo se propone para un hueco (el que más mejora)
  const seen = new Set<string>();
  return out.sort((a, b) => b.gain - a.gain).filter((s) => !seen.has(s.to.name) && !!seen.add(s.to.name)).slice(0, opts.max ?? 4);
}

// ── Plan de combate para la fase ────────────────────────────────
export interface PlanStep { key: string; vars?: Record<string, string | number>; turn: 't1' | 'mid' | 'break' | 'ult' | 'end' }

const names = (xs: { c: TeamChar }[]) => [...new Set(xs.map((s) => s.c.name))].join(', ');
const num = (re: RegExp, s: string) => { const m = s.match(re); return m ? Number(m[1].replace(',', '.')) : null; };
/** Estados de la ficha (a veces en japonés) → clave de traducción sh.st.* */
const STATUS: Record<string, string> = { '撹乱': 'confusion', 'スタン': 'stun', '暗闇': 'blind', '足止め': 'bind', '毒': 'poison', '火傷': 'burn', '出血': 'bleed', '封印': 'seal', '沈黙': 'silence' };

/** Datos de la fase que cambian cómo se juega: Break, regeneración, cuenta del especial, furia… */
export function stageFacts(stage: Stage | null) {
  const enemies = stage?.enemies ?? [];
  const boss = enemies.find((e) => e.boss) ?? (enemies.length === 1 ? enemies[0] : null);
  const texts = enemies.flatMap((e) => (e.skills ?? []).map((k) => `${k.name} ${k.text}`));
  const find = (re: RegExp) => texts.map((t) => num(re, t)).find((x) => x != null) ?? null;
  return {
    boss,
    adds: enemies.filter((e) => e !== boss),
    breakTurns: find(/Break dura (\d+) turnos/i),
    breakBonus: find(/Break recibe un (\d+) ?%/i),
    /** Fuera del Break se protege (reduce el daño que recibe): hay que romperlo para hacerle daño */
    breakGate: texts.some((t) => /Mientras no est[áa] en Break, reduce/i.test(t)),
    regen: find(/[Rr]ecupera un (\d+(?:[.,]\d+)?) ?% de (?:vida|PV)/),
    ult: boss?.ultCount ?? null,
    actions: Math.max(1, ...enemies.map((e) => e.actions ?? (/[Aa]ctúa 2 veces/.test((e.skills ?? []).map((k) => k.name).join(' ')) ? 2 : 1))),
    enrage: enemies.some((e) => e.skills?.some((k) => k.kind === 'enrage')),
    summon: enemies.some((e) => e.skills?.some((k) => k.kind === 'summon')),
    counter: enemies.some((e) => e.skills?.some((k) => k.kind === 'counter')),
    taunters: enemies.filter((e) => e.taunt || e.skills?.some((k) => k.kind === 'taunt')),
    immune: [...new Set(enemies.flatMap((e) => e.immune ?? []).map((x) => x.replace(/^△/, '')).map((x) => STATUS[x] ?? x))],
  };
}

/**
 * Plan turno a turno para este equipo en esta fase. Combina lo que hace cada enemigo
 * (cuenta del especial, Break, regeneración, provocación…) con lo que tiene el equipo.
 */
export function stagePlan(team: Team, stage: Stage | null, needs: StageNeeds | null): PlanStep[] {
  const f = stageFacts(stage);
  const main = mainOf(team);
  const sups = main.filter((s) => s.as === 'sup'), dmgs = main.filter((s) => s.as === 'dmg');
  const by = (k: 'aoe' | 'heal' | 'guard' | 'cleanse') => [...main, ...(team.sub ? [team.sub] : [])].filter((s) => s.c.traits?.[k]);
  const hitters = dmgs;
  const weakHit = hitters.filter((s) => needs?.weak.includes(s.c.element as ElementKey));
  const steps: PlanStep[] = [];

  // Turno 1: mejoras primero; después, a por el objetivo correcto
  steps.push(sups.length ? { turn: 't1', key: 'pl.t1.buffs', vars: { sups: names(sups), dmgs: names(dmgs.length ? dmgs : main) } } : { turn: 't1', key: 'pl.t1.nosup' });
  const aoe = by('aoe');
  if (f.taunters.length) steps.push({ turn: 't1', key: aoe.length ? 'pl.taunt.aoe' : 'pl.taunt', vars: { enemy: f.taunters.map((e) => e.name).join(', '), aoe: names(aoe) } });
  else if (f.adds.length && f.boss) steps.push({ turn: 't1', key: aoe.length ? 'pl.adds.aoe' : 'pl.adds', vars: { adds: [...new Set(f.adds.map((e) => e.name))].join(', '), boss: f.boss.name, aoe: names(aoe) } });

  // Break: con quién vaciarlo y qué hacer cuando cae
  if (f.boss || needs) {
    const who = weakHit.length ? weakHit : hitters.length ? hitters : main;
    steps.push({ turn: 'mid', key: f.breakGate ? 'pl.break.gate' : weakHit.length ? 'pl.break.weak' : 'pl.break', vars: { names: names(who), boss: f.boss?.name ?? '' } });
    // En Break no actúa y recibe más daño (×1,2 de base; algunas fases dan mucho más)
    steps.push({ turn: 'break', key: f.breakTurns ? 'pl.burst' : 'pl.burst.any', vars: { turns: f.breakTurns ?? '', bonus: f.breakBonus ?? 20 } });
  }

  // Cuenta atrás del especial del jefe: defensa justo antes
  if (f.ult) {
    const def = [...by('guard'), ...by('heal')];
    steps.push({ turn: 'ult', key: def.length ? 'pl.ult.def' : 'pl.ult', vars: { n: f.ult, before: Math.max(1, f.ult - 1), names: names(def) } });
  }
  if (needs?.debuffs) { const cl = by('cleanse'); steps.push({ turn: 'mid', key: cl.length ? 'pl.cleanse' : 'pl.cleanse.none', vars: { names: names(cl) } }); }
  if (needs?.aoeDamage) { const h = [...by('heal'), ...by('guard')]; if (h.length) steps.push({ turn: 'mid', key: 'pl.sustain', vars: { names: names(h) } }); }
  if (f.regen) steps.push({ turn: 'mid', key: 'pl.regen', vars: { pct: f.regen } });
  if (f.actions > 1) steps.push({ turn: 'mid', key: 'pl.actions', vars: { n: f.actions } });
  if (f.counter) steps.push({ turn: 'mid', key: 'pl.counter' });
  if (f.summon) steps.push({ turn: 'mid', key: 'pl.summon' });
  if (f.immune.length) steps.push({ turn: 'mid', key: 'pl.immune', vars: { list: f.immune.join(', ') } });
  if (f.enrage) steps.push({ turn: 'end', key: 'pl.enrage' });
  if (team.sub || team.helper) steps.push({ turn: 'end', key: 'pl.sub', vars: { name: names([team.sub, team.helper].filter((s): s is TeamSlot => !!s)) } });
  return steps;
}
