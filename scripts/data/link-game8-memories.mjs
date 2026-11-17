// Empareja las memorias de Game8 sin nombre japonés conocido con las de la web (npm run data:g8link, a diario).
// Señal: misma rareza y mismas estadísticas sin límite roto (HP, cuerpo a cuerpo y técnica al nivel 55, con
// dos decimales), que en la wiki y en Game8 son idénticas. Solo se acepta si la pareja es única en los dos sentidos.
// Las nuevas parejas se añaden a data/manual/jp-memories.json (nombre japonés → id), que también se edita a mano.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const JP = join(ROOT, 'data/manual/jp-memories.json');
const G8 = join(ROOT, 'data/normalized/game8/memories.json');
const WIKI = join(ROOT, 'data/normalized/wiki/memories.json');

const key = (rarity, s) => (s && s.hp != null && s.taijutsu != null && s.jujutsu != null
  ? `${rarity}|${Number(s.hp).toFixed(2)}|${Number(s.taijutsu).toFixed(2)}|${Number(s.jujutsu).toFixed(2)}` : null);

const jpFile = JSON.parse(await readFile(JP, 'utf8'));
const g8 = Object.values(JSON.parse(await readFile(G8, 'utf8')).memories);
const wikiRaw = JSON.parse(await readFile(WIKI, 'utf8'));
const wiki = wikiRaw.items ?? wikiRaw;

const taken = new Set(Object.values(jpFile.names));
const count = (arr) => arr.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map());
const g8Keys = count(g8.map((m) => key(m.rarity, m.stats?.base)).filter(Boolean));
const wikiKeys = count(wiki.map((m) => key(m.rarity, m.stats)).filter(Boolean));
const wikiByKey = new Map(wiki.map((m) => [key(m.rarity, m.stats), m]));

// Segunda señal cuando las estadísticas se repiten (son plantillas): los números de los efectos
// (porcentajes, cantidades, turnos, espera), con la versión mejorada de la wiki, que es la que da Game8
const nums = (s) => new Set([...(s ?? '').matchAll(/\d+(?:\.\d+)?/g)].map((x) => String(Number(x[0]))));
const g8Nums = (m) => nums([m.active?.effect, m.auto?.effect, m.active?.cooldown].join(' '));
const wikiNums = (w) => nums((w.effects ?? []).map((e) => `${e.textLv2 ?? e.text} ${e.cdLv2 ?? e.cd ?? ''}`).join(' '));
const sim = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const x of a) if (b.has(x)) n++; return n / Math.max(a.size, b.size); };

let added = 0, byFx = 0;
const left = [];
for (const m of g8) {
  if (jpFile.names[m.name]) continue;
  const k = key(m.rarity, m.stats?.base);
  let w = k && g8Keys.get(k) === 1 && wikiKeys.get(k) === 1 ? wikiByKey.get(k) : null;
  if (!w && k) {
    const a = g8Nums(m);
    const cands = wiki.filter((x) => !taken.has(x.id) && key(x.rarity, x.stats) === k)
      .map((x) => ({ x, s: sim(a, wikiNums(x)) })).sort((p, q) => q.s - p.s);
    // Aceptar solo si la mejor encaja de verdad y se distingue bien de la segunda
    if (cands[0] && cands[0].s >= 0.6 && cands[0].s - (cands[1]?.s ?? 0) >= 0.2) { w = cands[0].x; byFx++; }
  }
  if (w && !taken.has(w.id)) { jpFile.names[m.name] = w.id; taken.add(w.id); added++; }
  else left.push(m.name);
}
await writeFile(JP, JSON.stringify(jpFile, null, 2) + '\n');
console.log(`link-game8-memories: ${added} parejas nuevas (${byFx} por los números de sus efectos); ${left.length} sin emparejar${left.length ? `: ${left.slice(0, 15).join(', ')}${left.length > 15 ? '…' : ''}` : ''}`);
