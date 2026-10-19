#!/usr/bin/env node
// Tier lists de las webs JP, como señal para las recomendaciones.
// Solo se toma el RANGO de cada personaje (SSS, SS…), nunca los textos de valoración.
// Los nombres japoneses se pasan a nuestros ids con data/manual/jp-names.json.
//
// Estado de las fuentes (revisado el 19/10/2026):
//   Game8     → utilizable: secciones por rango con epíteto + nombre.
//   AppMedia  → su wiki indica "更新を停止中" (ha dejado de actualizarse): se excluye.
//   GameWith  → solo nombra al personaje base (sin epíteto): no se puede saber la versión.
//   Kamigame  → igual que GameWith y con contenido de la época del lanzamiento.
//
// Uso: npm run data:tiers   → data/normalized/tiers.json

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const UA = 'Mozilla/5.0 (compatible; PhantomParadeHub-DataBot/0.1; fan site, one request per source)';
const { names: JP } = JSON.parse(await readFile(join(ROOT, 'data', 'manual', 'jp-names.json'), 'utf8'));

const SOURCES = [
  {
    id: 'game8', name: 'Game8', url: 'https://game8.jp/jujutsuphanpara/573071', status: 'ok',
    scale: ['SSS', 'SS', 'S', 'A', 'B', 'C'],
    // Cada rango es una sección "SSSランクキャラ" con sus personajes hasta la siguiente
    parse(html) {
      const body = html.replace(/<script[\s\S]*?<\/script>/g, '');
      const marks = [...body.matchAll(/>\s*(SSS|SS|S|A|B|C)ランクキャラ\s*</g)].map((m) => ({ rank: m[1], at: m.index }));
      const stop = body.indexOf('最強キャラランキングの評価基準');
      const out = {};
      marks.forEach((m, i) => {
        const end = Math.min(marks[i + 1]?.at ?? body.length, stop > m.at ? stop : body.length);
        for (const n of body.slice(m.at, end).matchAll(/alt="(「[^"]+」[^"]+?)画像"/g)) out[n[1]] ??= m.rank;
      });
      // Personajes recién salidos: tabla "新キャラの最強ランキング", con tres rangos por fila
      // (総合 / オート / 高難度). Se toma el primero (総合 = general) si aún no tenían rango.
      const all = [...body.matchAll(/新キャラの最強ランキング/g)];
      const start = all.at(-1)?.index ?? -1;
      if (start > -1) {
        const end = body.indexOf('ランクキャラ', start);
        const seg = body.slice(start, end > start ? end : start + 60000);
        const rows = [...seg.matchAll(/alt="(「[^"]+」[^"]+?)画像"/g)];
        rows.forEach((r, i) => {
          const rowEnd = rows[i + 1]?.index ?? seg.length;
          const rank = seg.slice(r.index, rowEnd).match(/alt="(SSS|SS|S|A|B|C)画像"/)?.[1];
          if (rank) out[r[1]] ??= rank;
        });
      }
      return out;
    },
  },
  { id: 'appmedia', name: 'AppMedia', url: 'https://appmedia.jp/phanpara/77222969', status: 'stale', note: 'La web indica que ha dejado de actualizarse.' },
  { id: 'gamewith', name: 'GameWith', url: 'https://gamewith.jp/jujutsuphanpara/425595', status: 'unsupported', note: 'Solo nombra al personaje base, sin la versión (epíteto).' },
  { id: 'kamigame', name: 'Kamigame', url: 'https://kamigame.jp/jujutsuphanpara/page/290522848617882470.html', status: 'unsupported', note: 'Solo nombra al personaje base y su contenido es de la época del lanzamiento.' },
];

const ranks = {}; // id → { fuente: rango }
const report = [];
for (const src of SOURCES.filter((s) => s.parse)) {
  const html = await (await fetch(src.url, { headers: { 'User-Agent': UA } })).text();
  src.updated = html.match(/"dateModified"\s*:\s*"([^"]+)"/)?.[1] ?? null;
  const found = src.parse(html);
  const unknown = [];
  for (const [jp, rank] of Object.entries(found)) {
    const id = JP[jp];
    if (!id) { unknown.push(jp); continue; }
    (ranks[id] ??= {})[src.id] = rank;
  }
  src.count = Object.keys(found).length - unknown.length;
  report.push(`  ✓ ${src.name}: ${src.count} personajes${src.updated ? ` (actualizada ${src.updated.slice(0, 10)})` : ''}`);
  if (unknown.length) report.push(`  ⚠ ${src.name}: nombres sin equivalencia (añádelos a data/manual/jp-names.json):\n     ${unknown.join('\n     ')}`);
}

// Puntuación 0–100 por fuente según la posición en su escala; consenso = media de las fuentes
const usable = SOURCES.filter((s) => s.parse);
const scores = {};
for (const [id, byRank] of Object.entries(ranks)) {
  const vals = usable.filter((s) => byRank[s.id]).map((s) => {
    const used = s.scale.filter((r) => Object.values(ranks).some((x) => x[s.id] === r));
    return Math.round(100 * (1 - used.indexOf(byRank[s.id]) / Math.max(1, used.length)));
  });
  scores[id] = { score: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), sources: vals.length };
}

await mkdir(join(ROOT, 'data', 'normalized'), { recursive: true });
await writeFile(
  join(ROOT, 'data', 'normalized', 'tiers.json'),
  JSON.stringify({
    fetchedAt: new Date().toISOString(),
    server: 'jp',
    sources: SOURCES.map(({ parse, ...s }) => s),
    ranks,
    scores,
  }, null, 2) + '\n',
  'utf8',
);
console.log(report.join('\n'));
console.log(`  → data/normalized/tiers.json (${Object.keys(ranks).length} personajes con rango)`);
