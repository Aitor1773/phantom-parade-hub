// Ficha de una fase (piso de la torre, jefe, combate de evento) y lo que exige al equipo.
// Sin dependencias del DOM: la usan las páginas (al compilar) y las islas (en el navegador).
import type { ElementKey } from './team-recs';

export type DamageType = 'taijutsu' | 'jujutsu' | 'mixed';
export type SkillKind = 'aoe' | 'single' | 'debuff' | 'buff' | 'heal' | 'taunt' | 'summon' | 'counter' | 'enrage' | 'other';

export interface EnemySkill { name: string; text: string; kind?: SkillKind }
export interface Enemy {
  name: string;
  level?: number;
  hp?: number;
  boss?: boolean;
  /** Cuántos iguales hay en el combate */
  count?: number;
  wave?: number;
  weak?: ElementKey[];
  resist?: ElementKey[];
  /** Reducción del daño recibido por tipo, en % (90 = recibe un 10 %) */
  cut?: Partial<Record<DamageType, number>>;
  /** Atrae los ataques individuales (hay que quitarlo de en medio o usar área) */
  taunt?: boolean;
  skills?: EnemySkill[];
  note?: string;
}
export interface StageRules {
  /** Solo se pueden usar estos elementos */
  only?: ElementKey[];
  /** Elementos que no se pueden usar o que salen muy perjudicados */
  banned?: ElementKey[];
  /** Otras reglas tal como las muestra el juego */
  notes?: string[];
}
export interface Stage {
  name?: string;
  server?: 'global' | 'jp';
  checked?: string;
  power?: number;
  recommended?: ElementKey[];
  unfavorable?: ElementKey[];
  rules?: StageRules;
  enemies?: Enemy[];
  /** Estrategia escrita a mano (se muestra antes que la generada) */
  strategy?: string;
  source?: string;
}

/** Lo que el motor de equipos necesita saber de una fase. */
export interface StageNeeds {
  weak: ElementKey[];
  resist: ElementKey[];
  /** Reducción efectiva por tipo de daño (la peor entre los enemigos importantes), 0–100 */
  cut: Record<DamageType, number>;
  only?: ElementKey[];
  banned?: ElementKey[];
  /** Total de enemigos (para valorar el daño en área) */
  enemies: number;
  taunt: boolean;
  debuffs: boolean;
  aoeDamage: boolean;
}

const uniq = <T,>(xs: T[]) => [...new Set(xs)];

/**
 * Resume una fase: debilidades del jefe (o de la mayoría), peor reducción por tipo de daño
 * entre jefes, número de enemigos y mecánicas que cambian el equipo ideal.
 */
export function stageNeeds(s: Stage | null | undefined): StageNeeds | null {
  if (!s) return null;
  const enemies = s.enemies ?? [];
  const key = enemies.filter((e) => e.boss).length ? enemies.filter((e) => e.boss) : enemies;
  const total = enemies.reduce((a, e) => a + (e.count ?? 1), 0);
  const cut: Record<DamageType, number> = { taijutsu: 0, jujutsu: 0, mixed: 0 };
  for (const e of key) for (const t of ['taijutsu', 'jujutsu', 'mixed'] as const) cut[t] = Math.max(cut[t], e.cut?.[t] ?? 0);
  const skills = enemies.flatMap((e) => e.skills ?? []);
  return {
    weak: uniq([...(s.recommended ?? []), ...key.flatMap((e) => e.weak ?? [])]),
    resist: uniq([...(s.unfavorable ?? []), ...key.flatMap((e) => e.resist ?? [])]),
    cut,
    only: s.rules?.only?.length ? s.rules.only : undefined,
    banned: s.rules?.banned?.length ? s.rules.banned : undefined,
    enemies: total,
    taunt: enemies.some((e) => e.taunt || e.skills?.some((k) => k.kind === 'taunt')),
    debuffs: skills.some((k) => k.kind === 'debuff'),
    aoeDamage: skills.some((k) => k.kind === 'aoe'),
  };
}
