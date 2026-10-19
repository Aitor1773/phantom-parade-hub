#!/usr/bin/env node
// Comparador de fuentes. Lee data/normalized/<fuente>/<tipo>.json de todas las
// fuentes disponibles, cruza los campos clave por id y clasifica cada dato:
//   verified   → ≥2 fuentes coinciden
//   conflict   → las fuentes no coinciden (va a revisión manual)
//   single     → solo una fuente lo tiene
// Escribe data/review/<tipo>.report.json y muestra un resumen.

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NORMALIZED = join(ROOT, 'data', 'normalized');

// Campos que se contrastan por tipo (rutas con puntos)
const FIELDS = {
  characters: ['name', 'epithet', 'rarity', 'element', 'role', 'focus', 'releaseDateJP', 'releaseDateGlobal', 'stats.hp', 'stats.attack', 'stats.jujutsu', 'stats.specialGauge', 'kits.base.s1.cost', 'kits.base.s2.cost'],
  memories: ['name', 'rarity'],
};

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const canon = (v) => (typeof v === 'string' ? v.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim() : v);

async function loadSources(kind) {
  if (!existsSync(NORMALIZED)) return [];
  const out = [];
  for (const source of await readdir(NORMALIZED)) {
    const file = join(NORMALIZED, source, `${kind}.json`);
    if (existsSync(file)) out.push(JSON.parse(await readFile(file, 'utf8')));
  }
  return out;
}

async function compare(kind) {
  const sources = await loadSources(kind);
  if (!sources.length) {
    console.log(`${kind}: no hay datos normalizados todavía (ejecuta npm run data:fetch)`);
    return;
  }

  const ids = new Set(sources.flatMap((s) => s.items.map((i) => i.id)));
  const report = { kind, generatedAt: new Date().toISOString(), sources: sources.map((s) => s.source), summary: { verified: 0, conflict: 0, single: 0 }, items: [] };

  for (const id of [...ids].sort()) {
    const entry = { id, presentIn: [], fields: {} };
    const found = sources.map((s) => ({ source: s.source, item: s.items.find((i) => i.id === id) })).filter((x) => x.item);
    entry.presentIn = found.map((f) => f.source);

    for (const field of FIELDS[kind]) {
      const values = found.map((f) => ({ source: f.source, value: get(f.item, field) })).filter((v) => v.value != null && v.value !== '');
      if (!values.length) continue;
      const distinct = new Set(values.map((v) => JSON.stringify(canon(v.value))));
      const status = values.length < 2 ? 'single' : distinct.size === 1 ? 'verified' : 'conflict';
      report.summary[status]++;
      entry.fields[field] = { status, values };
    }
    report.items.push(entry);
  }

  const outFile = join(ROOT, 'data', 'review', `${kind}.report.json`);
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const { verified, conflict, single } = report.summary;
  console.log(`\n${kind} — fuentes: ${report.sources.join(', ')} · ${ids.size} entradas`);
  console.log(`  ✅ verificados: ${verified}   ⚠️  conflictos: ${conflict}   ❓ una sola fuente: ${single}`);
  const conflicts = report.items.filter((i) => Object.values(i.fields).some((f) => f.status === 'conflict'));
  conflicts.slice(0, 10).forEach((i) => {
    const fields = Object.entries(i.fields).filter(([, f]) => f.status === 'conflict').map(([k]) => k);
    console.log(`     · ${i.id}: ${fields.join(', ')}`);
  });
  if (conflicts.length > 10) console.log(`     … y ${conflicts.length - 10} más`);
  console.log(`  → data/review/${kind}.report.json`);
}

await compare('characters');
await compare('memories');
