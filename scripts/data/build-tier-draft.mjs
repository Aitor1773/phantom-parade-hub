#!/usr/bin/env node
// Borrador de la tier list PROPIA, calculado con los datos de habilidad de la wiki (CC BY-SA).
// Es un punto de partida transparente: cada rango sale de una fórmula publicada en la web.
// Los rangos ajustados a mano ("manual": true) se conservan siempre.
//
// Uso: npm run data:tierdraft   → data/manual/tier-list.json

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'data', 'manual', 'tier-list.json');
const chars = JSON.parse(await readFile(join(ROOT, 'data', 'normalized', 'wiki', 'characters.json'), 'utf8')).items;

// ── Criterios (se muestran en la página) ──────────────────────────
const CRITERIA = {
  roleWeights: {
    attacker: { dmg: 0.6, buff: 0.2, debuff: 0.2, sustain: 0 },
    support: { dmg: 0.2, buff: 0.6, debuff: 0.2, sustain: 0 },
    debuffer: { dmg: 0.2, buff: 0.2, debuff: 0.6, sustain: 0 },
    sustain: { dmg: 0.1, buff: 0.25, debuff: 0.15, sustain: 0.5 },
  },
  roleGroup: { Attacker: 'attacker', Support: 'support', Enhancer: 'support', Debuffer: 'debuffer', Obstructor: 'debuffer', Healer: 'sustain', Defender: 'sustain', Agitator: 'sustain' },
  aoeFactor: 1.2,
  autoFactor: 0.5,
  selfBuffFactor: 0.5,
  rarityFactor: { SSR: 1, SR: 0.8, R: 0.6 },
  // Percentil acumulado desde arriba → rango
  thresholds: [['SS', 0.12], ['S', 0.35], ['A', 0.65], ['B', 0.85], ['C', 1]],
};

const maxLevel = (sk) => sk?.levels?.[9] ?? [...(sk?.levels ?? [])].reverse().find(Boolean) ?? '';

/** Kit vigente: el más reciente (2.º ajuste > ajuste > original) por habilidad. */
function currentKit(c) {
  const order = [c.kits.adjustedV2, c.kits.adjusted, c.kits.base].filter(Boolean);
  const pick = (k) => order.map((kit) => kit[k]).find((s) => s && s.levels?.some(Boolean));
  const autos = (order.find((k) => k.autos?.length) ?? c.kits.base).autos ?? [];
  return { s1: pick('s1'), s2: pick('s2'), ult: pick('ult'), normal: pick('normal'), autos };
}

/** Métricas de un texto de habilidad. */
function measure(text) {
  const m = { dmg: 0, buff: 0, debuff: 0, sustain: 0, maxBuff: 0, maxDebuff: 0 };
  for (const line of text.split('\n')) {
    let x;
    if ((x = line.match(/Deals ([\d.]+)%[^\n]*?Damage to (all enemies|the selected enemy|selected enemy|the same enemy)/i))) {
      m.dmg += Number(x[1]) * (/all enemies/i.test(x[2]) ? CRITERIA.aoeFactor : 1);
    } else if ((x = line.match(/Deals[^\n]*?Damage equal to ([\d.]+)% \w+ (?:&|and) ([\d.]+)% \w+ to (all enemies|the selected enemy|selected enemy|the same enemy)/i))) {
      // Daño mixto: "equal to X% Taijutsu & Y% Jujutsu"
      m.dmg += (Number(x[1]) + Number(x[2])) * (/all enemies/i.test(x[3]) ? CRITERIA.aoeFactor : 1);
    } else if ((x = line.match(/Increases own (?!and)[^\n]*? by ([\d.]+)%/i)) && !/Damage Received/i.test(line)) {
      // Autobuff: cuenta como buff a medio peso
      m.buff += Number(x[1]) * CRITERIA.selfBuffFactor;
    } else if ((x = line.match(/(?:Increases|Decreases) (?:all enemies'|the selected enemy's|that enemy's|the countered enemy's|selected enemy's)[^\n]*? by ([\d.]+)%/i))) {
      m.debuff += Number(x[1]); m.maxDebuff = Math.max(m.maxDebuff, Number(x[1]));
    } else if ((x = line.match(/Increases (?:all[^\n]*allies'|own and[^\n]*?|the selected ally's|all allies')[^\n]*? by ([\d.]+)%/i)) && !/Damage Received/i.test(line)) {
      m.buff += Number(x[1]); m.maxBuff = Math.max(m.maxBuff, Number(x[1]));
    } else if ((x = line.match(/Recovers[^\n]*?HP by ([\d.]+)%/i)) || (x = line.match(/Decreases (?:all allies'|own|the selected ally's)[^\n]*?Damage Received by ([\d.]+)%/i))) {
      m.sustain += Number(x[1]);
    }
  }
  return m;
}

const metrics = chars.map((c) => {
  const k = currentKit(c);
  const total = { dmg: 0, buff: 0, debuff: 0, sustain: 0, maxBuff: 0, maxDebuff: 0, ultDmg: 0 };
  for (const [key, w] of [['ult', 1], ['s1', 0.6], ['s2', 0.6], ['normal', 0.3]]) {
    const mm = measure(maxLevel(k[key]));
    total.dmg += mm.dmg * w; total.buff += mm.buff * w; total.debuff += mm.debuff * w; total.sustain += mm.sustain * w;
    total.maxBuff = Math.max(total.maxBuff, mm.maxBuff); total.maxDebuff = Math.max(total.maxDebuff, mm.maxDebuff);
    if (key === 'ult') total.ultDmg = mm.dmg;
  }
  for (const a of k.autos) {
    const mm = measure(a.effect ?? '');
    total.buff += mm.buff * CRITERIA.autoFactor; total.debuff += mm.debuff * CRITERIA.autoFactor; total.sustain += mm.sustain * CRITERIA.autoFactor;
  }
  return { c, total };
});

// Percentil de cada métrica entre todos los personajes (0–1)
const pr = (key) => {
  const sorted = metrics.map((x) => x.total[key]).sort((a, b) => a - b);
  return (v) => (sorted.length > 1 ? sorted.filter((s) => s < v).length / (sorted.length - 1) : 0);
};
const P = { dmg: pr('dmg'), buff: pr('buff'), debuff: pr('debuff'), sustain: pr('sustain') };

const scored = metrics.map(({ c, total }) => {
  const group = CRITERIA.roleGroup[c.role] ?? 'attacker';
  const w = CRITERIA.roleWeights[group];
  const raw = w.dmg * P.dmg(total.dmg) + w.buff * P.buff(total.buff) + w.debuff * P.debuff(total.debuff) + w.sustain * P.sustain(total.sustain);
  const score = Math.round(100 * raw * (CRITERIA.rarityFactor[c.rarity] ?? 1));
  return { c, total, group, score };
}).sort((a, b) => b.score - a.score);

const prev = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : { entries: {} };
const entries = {};
let kept = 0;
scored.forEach((x, i) => {
  const p = (i + 1) / scored.length;
  const draft = CRITERIA.thresholds.find(([, t]) => p <= t)[0];
  const old = prev.entries?.[x.c.id];
  if (old?.manual) kept++;
  entries[x.c.id] = {
    rank: old?.manual ? old.rank : draft,
    draftRank: draft,
    score: x.score,
    group: x.group,
    metrics: {
      ultDmg: Math.round(x.total.ultDmg),
      maxBuff: Math.round(x.total.maxBuff),
      maxDebuff: Math.round(x.total.maxDebuff),
      sustain: Math.round(x.total.sustain),
    },
    ...(old?.manual ? { manual: true } : {}),
    ...(old?.note ? { note: old.note } : {}),
  };
});

await writeFile(OUT, JSON.stringify({
  _comment: 'Tier list PROPIA. "rank" es el rango publicado; "draftRank" el del borrador automático. Para ajustar un personaje: cambia "rank", pon "manual": true y, si quieres, una "note". El borrador nunca toca las entradas manuales. Después: npm run data:tierdraft && npm run build',
  updatedAt: new Date().toISOString(),
  criteria: CRITERIA,
  entries,
}, null, 2) + '\n', 'utf8');

const count = Object.values(entries).reduce((a, e) => ((a[e.rank] = (a[e.rank] ?? 0) + 1), a), {});
console.log('Rangos:', count, `· ajustes manuales conservados: ${kept}`);
console.log('Top 12:', scored.slice(0, 12).map((x) => `${x.c.epithet} ${x.c.name} (${x.score})`).join(' | '));
console.log('Últimos 5:', scored.slice(-5).map((x) => `${x.c.epithet} ${x.c.name} (${x.score})`).join(' | '));
