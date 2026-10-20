// Estrategia para un equipo concreto en una fase: consejos generados a partir de la ficha
// del enemigo y de los rasgos del equipo. Devuelve claves de traducción con sus variables,
// así se muestra en los 8 idiomas.
import type { Stage, StageNeeds } from './stage';
import type { ElementKey, Team, TeamSlot } from './team-recs';
import { damageCut } from './team-recs';

export interface Tip { key: string; vars?: Record<string, string | number>; tone: 'rule' | 'good' | 'warn' | 'info' }

const names = (xs: TeamSlot[]) => xs.map((s) => s.c.name).join(', ');

export function strategyTips(team: Team, needs: StageNeeds | null, stage: Stage | null, elName: (e: ElementKey) => string): Tip[] {
  const tips: Tip[] = [];
  const main = team.main.filter((s): s is TeamSlot => !!s);
  const all = [...main, ...(team.sub ? [team.sub] : []), ...(team.helper ? [team.helper] : [])];
  const dealers = main.filter((s) => s.as === 'dmg');
  const els = (xs: ElementKey[]) => xs.map(elName).join(', ');

  if (needs?.only) tips.push({ key: 'st.only', vars: { els: els(needs.only) }, tone: 'rule' });
  if (needs?.banned) tips.push({ key: 'st.banned', vars: { els: els(needs.banned) }, tone: 'rule' });
  for (const n of stage?.rules?.notes ?? []) tips.push({ key: 'st.note', vars: { note: n }, tone: 'rule' });

  // Tipo de daño: qué atacantes sufren la reducción
  if (needs) {
    for (const t of ['taijutsu', 'jujutsu', 'mixed'] as const) {
      const pct = needs.cut[t];
      if (pct < 30) continue;
      const hurt = dealers.filter((s) => damageCut(s.c, needs) * 100 >= pct * 0.8);
      tips.push(hurt.length
        ? { key: 'st.cut.warn', vars: { type: t, pct, names: names(hurt) }, tone: 'warn' }
        : { key: 'st.cut.ok', vars: { type: t, pct }, tone: 'good' });
    }
  }

  // Elementos
  if (needs?.weak.length) {
    const hit = all.filter((s) => needs.weak.includes(s.c.element as ElementKey));
    tips.push({ key: hit.length ? 'st.weak' : 'st.weak.none', vars: { els: els(needs.weak), names: names(hit) }, tone: hit.length ? 'good' : 'warn' });
  }
  if (needs?.resist.length) {
    const bad = main.filter((s) => needs.resist.includes(s.c.element as ElementKey));
    if (bad.length) tips.push({ key: 'st.resist', vars: { els: els(needs.resist), names: names(bad) }, tone: 'warn' });
  }

  // Número de enemigos, provocación y daño en área
  const aoe = dealers.filter((s) => s.c.traits?.aoe);
  if (needs && (needs.enemies >= 3 || needs.taunt)) {
    tips.push(aoe.length
      ? { key: 'st.aoe', vars: { n: needs.enemies, names: names(aoe) }, tone: 'good' }
      : { key: 'st.aoe.none', vars: { n: needs.enemies }, tone: 'warn' });
  }
  const tauntEnemies = (stage?.enemies ?? []).filter((e) => e.taunt || e.skills?.some((k) => k.kind === 'taunt'));
  if (tauntEnemies.length) tips.push({ key: 'st.taunt', vars: { enemy: tauntEnemies.map((e) => e.name).join(', ') }, tone: 'info' });

  // Debilitamientos y daño a todo el equipo
  if (needs?.debuffs) {
    const fix = all.filter((s) => s.c.traits?.cleanse);
    tips.push(fix.length ? { key: 'st.debuff', vars: { names: names(fix) }, tone: 'good' } : { key: 'st.debuff.none', tone: 'warn' });
  }
  if (needs?.aoeDamage) {
    const sustain = all.filter((s) => s.c.traits?.heal || s.c.traits?.guard);
    tips.push(sustain.length ? { key: 'st.sustain', vars: { names: names(sustain) }, tone: 'good' } : { key: 'st.sustain.none', tone: 'warn' });
  }
  const kinds = new Set((stage?.enemies ?? []).flatMap((e) => (e.skills ?? []).map((k) => k.kind)));
  if (kinds.has('counter')) tips.push({ key: 'st.counter', tone: 'warn' });
  if (kinds.has('summon')) tips.push({ key: 'st.summon', tone: 'info' });
  if (kinds.has('enrage')) tips.push({ key: 'st.enrage', tone: 'warn' });

  // Cómo jugarlo (mecánicas generales del juego)
  const sup = main.filter((s) => s.as === 'sup');
  if (sup.length) tips.push({ key: 'st.order', vars: { names: names(sup) }, tone: 'info' });
  tips.push({ key: 'st.break', tone: 'info' });
  if (dealers.length >= 2) tips.push({ key: 'st.coop', vars: { names: names(dealers.slice(0, 2)) }, tone: 'info' });
  return tips;
}
