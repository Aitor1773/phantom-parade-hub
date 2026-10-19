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
  thresholds: [['S', 0.12], ['A', 0.35], ['B', 0.65], ['C', 0.85], ['D', 1]],
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

// ── Listas: una por elemento y tres por función ──────────────────
// Cada lista ordena a sus miembros con su propia ponderación.
const weighted = (x, w) => Math.round(100 * (w.dmg * P.dmg(x.total.dmg) + w.buff * P.buff(x.total.buff) + w.debuff * P.debuff(x.total.debuff) + w.sustain * P.sustain(x.total.sustain)) * (CRITERIA.rarityFactor[x.c.rarity] ?? 1));
const W = CRITERIA.roleWeights;
const LISTS = {
  blue: { members: (x) => x.c.element === 'blue', score: (x) => x.score },
  red: { members: (x) => x.c.element === 'red', score: (x) => x.score },
  green: { members: (x) => x.c.element === 'green', score: (x) => x.score },
  yellow: { members: (x) => x.c.element === 'yellow', score: (x) => x.score },
  damage: { members: (x) => x.group === 'attacker', score: (x) => weighted(x, W.attacker) },
  support: { members: (x) => x.group !== 'attacker', score: (x) => weighted(x, x.group === 'sustain' ? W.sustain : x.group === 'debuffer' ? W.debuffer : W.support) },
  sp: { members: (x) => !!x.c.kits.sp, score: (x) => x.score },
};

const today = new Date().toISOString().slice(0, 10);
const prev = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : {};
const changelog = [...(prev.changelog ?? [])];
const lists = {};
let kept = 0;

for (const [key, def] of Object.entries(LISTS)) {
  const old = prev.lists?.[key];
  // Lista curada ("curated": true): solo salen los que pusiste a mano. En las demás,
  // los miembros por fórmula más cualquier ajuste manual que añadas fuera de ella.
  const isManual = (x) => !!old?.entries?.[x.c.id]?.manual;
  const members = scored.filter((x) => (old?.curated ? isManual(x) : def.members(x) || isManual(x)))
    .map((x) => ({ x, s: def.score(x) })).sort((a, b) => b.s - a.s);
  const entries = {};
  let changed = false;
  members.forEach(({ x, s }, i) => {
    const draft = CRITERIA.thresholds.find(([, t]) => (i + 1) / members.length <= t)[0];
    const o = old?.entries?.[x.c.id];
    if (o?.manual) kept++;
    const rank = o?.manual ? o.rank : draft;
    // Historial: se compara con el rango publicado la última vez ("lastRank"), así también
    // se registran los ajustes que hagas a mano en el archivo entre dos ejecuciones
    // ("lastRank": null = añadido a mano a esta lista; cuenta como nuevo)
    const before = o ? (o.lastRank !== undefined ? o.lastRank : o.rank) : null;
    if (old && before !== rank) {
      changelog.push({ date: today, list: key, id: x.c.id, from: before, to: rank, by: o?.manual ? 'manual' : 'draft' });
      changed = true;
    }
    entries[x.c.id] = { rank, draftRank: draft, score: s, lastRank: rank, ...(o?.manual ? { manual: true } : {}), ...(o?.note ? { note: o.note } : {}) };
  });
  lists[key] = {
    // Fecha de revisión: la que pongas a mano, o hoy si el borrador cambió algo
    reviewed: old?.reviewedManual ? old.reviewed : changed || !old ? today : old.reviewed,
    ...(old?.reviewedManual ? { reviewedManual: true } : {}),
    ...(old?.curated ? { curated: true } : {}),
    entries,
  };
}

// Métricas por personaje (comunes a todas las listas)
const characters = Object.fromEntries(scored.map((x) => [x.c.id, {
  score: x.score,
  group: x.group,
  metrics: { ultDmg: Math.round(x.total.ultDmg), maxBuff: Math.round(x.total.maxBuff), maxDebuff: Math.round(x.total.maxDebuff), sustain: Math.round(x.total.sustain) },
}]));

await writeFile(OUT, JSON.stringify({
  _comment: 'Tier list PROPIA, con 7 listas (blue, red, green, yellow, damage, support, sp). Para ajustar: en lists.<lista>.entries.<id> cambia "rank", pon "manual": true y, si quieres, una "note". Para fijar la fecha de revisión de una lista: "reviewed": "AAAA-MM-DD" y "reviewedManual": true. Con "curated": true en una lista, solo salen en ella los personajes con "manual": true (para añadir uno nuevo: rank, manual y "lastRank": null). El borrador nunca toca lo manual y registra cada cambio en "changelog". Después: npm run data:tierdraft && npm run build',
  updatedAt: new Date().toISOString(),
  criteria: CRITERIA,
  lists,
  characters,
  changelog: changelog.slice(-500),
}, null, 2) + '\n', 'utf8');

for (const [k, l] of Object.entries(lists)) {
  const count = Object.values(l.entries).reduce((a, e) => ((a[e.rank] = (a[e.rank] ?? 0) + 1), a), {});
  console.log(`${k.padEnd(8)} ${Object.keys(l.entries).length} personajes`, JSON.stringify(count), `revisada ${l.reviewed}`);
}
console.log(`Ajustes manuales conservados: ${kept} · cambios registrados hoy: ${changelog.filter((c) => c.date === today).length}`);
