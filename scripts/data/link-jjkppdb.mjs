#!/usr/bin/env node
// Empareja las memorias de la wiki con las de jjkppdb (para usar sus imágenes)
// y resuelve los nombres de memorias recomendadas en las fichas de personaje.
//
// jjkppdb traduce los nombres a su manera, así que se combinan tres señales:
//   1. misma rareza
//   2. mismo perfil de stats (proporción PV : Taijutsu : Jujutsu; la wiki los da a
//      nivel 55/45 y jjkppdb al máximo, pero la proporción se mantiene)
//   3. parecido del nombre
// De jjkppdb solo se usan nombre, rareza y stats para emparejar: no se publica nada suyo.
//
// Uso: npm run data:link   → data/links/memories.json y data/links/character-memories.json

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const UA = 'PhantomParadeHub-DataBot/0.1 (fan site; matching only)';

const slug = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’"“”().:!?,]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'and', 'for', 'with', 'is', 'be', 'you', 'i', 'me', 'my']);
const words = (s) => slug(s).split('-').filter((w) => w && !STOP.has(w));

/** Parecido de nombres entre 0 y 1: palabras en común + bigramas de letras. */
function similarity(a, b) {
  const wa = new Set(words(a)), wb = new Set(words(b));
  const inter = [...wa].filter((w) => wb.has(w) || [...wb].some((x) => x.length > 3 && (x.startsWith(w) || w.startsWith(x)))).length;
  const wordScore = wa.size && wb.size ? (2 * inter) / (wa.size + wb.size) : 0;
  const bi = (s) => { const t = slug(s).replace(/-/g, ''); return new Set(Array.from({ length: Math.max(0, t.length - 1) }, (_, i) => t.slice(i, i + 2))); };
  const ba = bi(a), bb = bi(b);
  const biScore = ba.size && bb.size ? (2 * [...ba].filter((x) => bb.has(x)).length) / (ba.size + bb.size) : 0;
  return Math.max(wordScore, 0.6 * wordScore + 0.4 * biScore);
}

/** Perfil de stats normalizado: [1, 0.7, 0.7] etc. */
const profile = (hp, tai, ju) => { const m = Math.max(hp, tai, ju) || 1; return [hp / m, tai / m, ju / m]; };
const sameProfile = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 0.03);

// ── Datos ───────────────────────────────────────────────────────
const wiki = JSON.parse(await readFile(join(ROOT, 'data', 'normalized', 'wiki', 'memories.json'), 'utf8')).items;
const chars = JSON.parse(await readFile(join(ROOT, 'data', 'normalized', 'wiki', 'characters.json'), 'utf8')).items;

const html = (await (await fetch('https://www.jjkppdb.com/recollection-bits', { headers: { 'User-Agent': UA } })).text()).replace(/\\"/g, '"');
const jj = [
  ...html.matchAll(/\{"id":(\d+),"name":"((?:[^"\\]|\\.)*)","rarity":"(\w+)","stat_orientation":"\w+","max_level":\d+,"released_at":[^,]*,"tags":\[[^\]]*\],"stats":\{"hp":([\d.]+),"taijutsu":([\d.]+),"jujutsu":([\d.]+)\}/g),
].map((m) => {
  let name = m[2];
  try { name = JSON.parse(`"${m[2]}"`); } catch {}
  return { id: Number(m[1]), name, rarity: m[3], profile: profile(+m[4], +m[5], +m[6]) };
});
console.log(`wiki: ${wiki.length} memorias · jjkppdb: ${jj.length}`);

// Parejas revisadas a mano por significado (misma rareza y mismo perfil de stats).
// Tienen prioridad sobre las automáticas. Formato: [nombre en la wiki, nombre en jjkppdb].
const MANUAL = [
  ['2 Problem Children, However The Strongest', 'Two Troublemakers. But the Strongest.'],
  ['The Strongest Quarrel', 'The Fiercest Argument'],
  ['Difference In Level', 'A Disparity in Strength'],
  ['Each On Their Own Path', 'Go Separate Ways'],
  ['Favorite Toy', 'Beloved Possession'],
  ['Bewildered', 'Dumbfounded'],
  ['Killing Time', 'Pastime'],
  ['Fleeting Moments', 'Transient Time'],
  ['Louder Than Words', 'Speak with Actions'],
  ['Ignoring Orders', 'Ignore Commands'],
  ['Mensore!', 'Okinawa Welcomes You!!'], // "mensore" = "bienvenido" en okinawense
  ['Strong Lineup', 'Rock-Solid Formation'],
  ["Student's Duty", 'Student Duties'],
  ['Super Freshman Welcoming Party', 'Mega New Student Welcome Party'],
  ['The City Where the Lights Went Out', 'Unlit City'],
  ['The Intention Behind Charity', 'Where Charity Casts Its Shadow'],
  ['The Kanto Dogs Vs Cats Battle', 'The Kanto Canine-Feline War'],
  ['The Memories of Days Gone By', 'Reminiscence of Old Days'],
  ['Thousand-Year Master & Follower Relation', 'Millennial Bond'],
  ['Two Shadows Reflected in The Evening', 'Twin Silhouettes at Sunset'],
  ['Rushing to a Mission on a Holy Night', 'Hallowed Night, Swift to Duty'],
  ['Sake for Blossom-Viewing on the Engawa', 'Hanami Sake on the Veranda'],
  ['Wish Summer Would Never End', 'When Summer Clings to Time'],
  ['The Footage Left Behind', 'Lingering Vision'],
  ['Narrow Escape From Death', 'A Thousand Lives, One Survival'], // 九死に一生
  ['Irretrievable Innocence', 'The Bygone Days of Youth'],
  ['Grand "Exorcism"', 'Purifying Duties'],
  ['The Mystery is In The Book', 'Truth Is Stranger Than Fiction'], // 事実は小説より奇なり
  ['Phantom Trails', 'The Path of Illusions'],
  ['Your Path Forward', 'The Chosen Path'],
  // "Someone Like Me?" ⇄ "The Same?" descartada: perfiles de stats distintos
];

// ── Emparejado: todas las parejas posibles, de mejor a peor ─────
const pairs = [];
const jjBySlug = new Map(jj.map((j) => [slug(j.name), j]));
const wikiBySlug = new Map(wiki.map((w) => [slug(w.name), w]));
for (const [wn, jn] of MANUAL) {
  const w = wikiBySlug.get(slug(wn)), j = jjBySlug.get(slug(jn));
  if (!w || !j) { console.log(`⚠ Pareja manual sin encontrar: ${wn} ⇄ ${jn}`); continue; }
  pairs.push({ w: w.id, j: j.id, score: 3, method: 'manual', sim: 1 });
}
for (const w of wiki) {
  const wp = profile(w.stats.hp ?? 0, w.stats.taijutsu ?? 0, w.stats.jujutsu ?? 0);
  for (const j of jj) {
    if (j.rarity !== w.rarity) continue;
    const exact = slug(j.name) === slug(w.name) || slug(j.name) === slug(w.title);
    const stats = sameProfile(wp, j.profile);
    const sim = Math.max(similarity(w.name, j.name), similarity(w.title, j.name));
    // Nombre idéntico manda; si no, hace falta perfil de stats igual y algo de parecido
    const score = exact ? 2 : stats ? sim : sim * 0.5;
    if (exact || (stats && sim >= 0.3) || sim >= 0.75) pairs.push({ w: w.id, j: j.id, score, method: exact ? 'name' : stats ? 'stats+name' : 'name-fuzzy', sim: +sim.toFixed(2) });
  }
}
pairs.sort((a, b) => b.score - a.score);

const links = {};
const usedJ = new Map(); // jjId → wikiId (la wiki tiene páginas duplicadas con otro nombre)
for (const p of pairs) {
  if (links[p.w]) continue;
  if (usedJ.has(p.j) && p.method !== 'name') continue;
  // Parecido bajo: se usa la imagen pero queda marcada para revisar
  links[p.w] = { jjkppdb: p.j, method: p.method, similarity: p.sim, ...(p.method === 'stats+name' && p.sim < 0.4 ? { review: true } : {}) };
  if (!usedJ.has(p.j)) usedJ.set(p.j, p.w);
}

const unmatchedWiki = wiki.filter((w) => !links[w.id]).map((w) => `${w.name} [${w.rarity}]`);
const unmatchedJJ = jj.filter((j) => !usedJ.has(j.id)).map((j) => `${j.name} [${j.rarity}] #${j.id}`);

// ── Memorias recomendadas en las fichas de personaje → id de la wiki ──
const byName = new Map(wiki.flatMap((w) => [[slug(w.name), w.id], [slug(w.title), w.id]]));
// Las fichas de personaje a veces usan otra traducción del nombre que la página de la memoria
const CHAR_ALIASES = { 'Here We Come, Fukuoka': 'Visit Fukuoka' };
for (const [alias, real] of Object.entries(CHAR_ALIASES)) if (byName.has(slug(real))) byName.set(slug(alias), byName.get(slug(real)));
const charMem = {};
const charMissing = new Set();
for (const c of chars) {
  for (const m of c.memories ?? []) {
    if (!m.name || /^placeholder/i.test(m.name) || charMem[m.name]) continue;
    let id = byName.get(slug(m.name));
    if (!id) {
      const best = wiki.map((w) => ({ id: w.id, s: Math.max(similarity(m.name, w.name), similarity(m.name, w.title)) })).sort((a, b) => b.s - a.s)[0];
      if (best && best.s >= 0.6) id = best.id;
    }
    if (id) charMem[m.name] = id;
    else charMissing.add(m.name);
  }
}

await mkdir(join(ROOT, 'data', 'links'), { recursive: true });
await writeFile(
  join(ROOT, 'data', 'links', 'memories.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), links, unmatchedWiki, unmatchedJJ }, null, 2) + '\n',
  'utf8',
);
await writeFile(join(ROOT, 'data', 'links', 'character-memories.json'), JSON.stringify(charMem, null, 2) + '\n', 'utf8');

const by = (m) => Object.values(links).filter((l) => l.method === m).length;
console.log(`Emparejadas: ${Object.keys(links).length}/${wiki.length} (nombre exacto ${by('name')}, manual ${by('manual')}, stats+nombre ${by('stats+name')}, nombre aproximado ${by('name-fuzzy')}) · para revisar: ${Object.values(links).filter((l) => l.review).length}`);
if (unmatchedWiki.length) console.log(`⚠ Wiki sin pareja (${unmatchedWiki.length}): ${unmatchedWiki.slice(0, 12).join(' | ')}${unmatchedWiki.length > 12 ? '…' : ''}`);
if (unmatchedJJ.length) console.log(`⚠ jjkppdb sin pareja (${unmatchedJJ.length}): ${unmatchedJJ.slice(0, 12).join(' | ')}${unmatchedJJ.length > 12 ? '…' : ''}`);
console.log(`Memorias recomendadas resueltas: ${Object.keys(charMem).length}${charMissing.size ? ` · sin resolver: ${[...charMissing].join(' | ')}` : ''}`);
