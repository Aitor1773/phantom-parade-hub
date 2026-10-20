#!/usr/bin/env node
// Eventos en curso (servidor JP) y su equipo recomendado, a diario.
// Lee la lista de eventos abiertos de Game8 (con permiso; citado en Créditos) y, de cada
// página de evento: fechas, equipos recomendados (personajes y memorias), elemento indicado,
// memorias con bonus y la memoria del evento. Solo guarda hechos con id de la web
// (nombres JP emparejados con data/manual/jp-names.json y jp-memories.json): sin textos copiados.
//
// Salida: data/normalized/event-guides.json · Uso: npm run data:events
// Ritmo bajo (una petición cada 3 s) y respeta robots.txt (las páginas de artículo están permitidas).

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'data', 'normalized', 'event-guides.json');
const BASE = 'https://game8.jp';
const LIST = `${BASE}/jujutsuphanpara/578683`;
const UA = 'PhantomParadeHub-events/1.0 (fan site; daily, low-rate; +https://phantom-parade-hub.pages.dev/en/credits/)';
const MAX_PAGES = 8;
const EL = { 幻: 'red', 影: 'blue', 夜: 'green', 行: 'yellow' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
};
const text = (h) => h.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').trim();
const abs = (href) => (href.startsWith('http') ? href : BASE + href);

/** "2026/10/19(月)15:00〜10/29(木)14:59" → ISO JST de inicio y fin */
function range(s) {
  const m = s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\([^)]*\)\s*(\d{1,2}):(\d{2})\s*[〜~]\s*(?:(\d{4})\/)?(?:(\d{1,2})\/(\d{1,2})\([^)]*\)\s*)?(\d{1,2})?:?(\d{2})?/);
  if (!m) return null;
  const p = (n) => String(n).padStart(2, '0');
  const start = `${m[1]}-${p(m[2])}-${p(m[3])}T${p(m[4])}:${m[5]}:00+09:00`;
  let end = null;
  if (m[7] && m[9]) {
    let y = Number(m[6] ?? m[1]);
    if (!m[6] && Number(m[7]) < Number(m[2])) y++; // cruza de año
    end = `${y}-${p(m[7])}-${p(m[8])}T${p(m[9])}:${m[10] ?? '00'}:00+09:00`;
  }
  return { start, end };
}

/** Bloques <h3> de la sección «最新/開催中イベント一覧» de la lista */
function listEvents(html) {
  const a = html.indexOf('最新/開催中イベント一覧');
  const b = html.indexOf('優先してやるべきこと', a);
  if (a < 0) throw new Error('No encuentro la lista de eventos (¿cambió la página?)');
  const sec = html.slice(a, b > a ? b : undefined);
  return sec.split(/<h3[^>]*>/).slice(1).map((blk) => {
    const title = text(blk.slice(0, blk.indexOf('</h3>')));
    // El primer enlace de la cabecera de la tabla es la página del evento
    const first = blk.match(/<th[^>]*>\s*<a[^>]*href="((?:https:\/\/game8\.jp)?\/jujutsuphanpara\/\d+)"/);
    const dates = range(text(blk.match(/<b[^>]*>([\s\S]*?)<\/b>/)?.[1] ?? ''));
    return { title, url: first ? abs(first[1]) : null, ...(dates ?? {}) };
  }).filter((e) => e.url && !/ガチャ(開催中|開幕)?$/.test(e.title.replace(/&.*$/, '')));
}

/** Personajes y memorias de una tabla de equipo (imágenes con alt «「apodo」nombre画像») */
function party(tableHtml, names, mems) {
  const cut = tableHtml.indexOf('廻想残滓');
  const charPart = cut > 0 ? tableHtml.slice(0, cut) : tableHtml;
  const memPart = cut > 0 ? tableHtml.slice(cut) : '';
  const chars = [...charPart.matchAll(/alt="(「[^」]+」[^"]+?)画像"/g)].map((m) => ({ jp: m[1], id: names[m[1]] ?? null }));
  const memories = [...memPart.matchAll(/<a[^>]*>(?:<img[^>]*>)?\s*([^<]{2,30})<\/a>/g)].map((m) => m[1].trim()).map((jp) => ({ jp, id: mems[jp] ?? null }));
  return { chars, memories };
}

function parseEvent(html, names, mems) {
  const title = (html.match(/<title>([^<]+)/)?.[1] ?? '').replace(/【[^】]*】/g, '').replace(/｜.*$/, '').trim();
  const h1 = text(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? title);
  // Secciones por encabezado h3/h4 que traen una tabla de equipo
  const parts = [];
  for (const m of html.matchAll(/<h[34][^>]*>([\s\S]*?)<\/h[34]>([\s\S]*?)(?=<h[234][^>]*>)/g)) {
    const head = text(m[1]);
    if (!/パーティ|編成/.test(head)) continue;
    const table = m[2].match(/<table[\s\S]*?<\/table>/)?.[0];
    if (!table) continue;
    const p = party(table, names, mems);
    if (p.chars.length < 2) continue;
    const after = text(m[2].slice(m[2].indexOf('</table>')));
    const el = [...new Set([...`${head} ${after}`.matchAll(/([幻影夜行])特性/g)].map((x) => EL[x[1]]))];
    parts.push({ label: head, ...p, elements: el, auto: /オート/.test(head) });
  }
  const bonusSec = html.match(/イベントボーナスの対象<\/h[34]>([\s\S]*?)<\/table>/)?.[1] ?? '';
  const bonus = [...new Set([...bonusSec.matchAll(/<a[^>]*>(?:<img[^>]*>)?\s*([^<]{2,30})<\/a>/g)].map((m) => m[1].trim()))].map((jp) => ({ jp, id: mems[jp] ?? null }));
  const evMem = html.match(/イベントSSR残滓[｢「]([^｣」]+)[｣」]/)?.[1] ?? null;
  return { title: h1, parties: parts, bonusMemories: bonus, eventMemory: evMem ? { jp: evMem, id: mems[evMem] ?? null } : null };
}

const readJson = async (f, d) => (existsSync(f) ? JSON.parse(await readFile(f, 'utf8')) : d);

const names = (await readJson(join(ROOT, 'data', 'manual', 'jp-names.json'), { names: {} })).names;
const mems = (await readJson(join(ROOT, 'data', 'manual', 'jp-memories.json'), { names: {} })).names;
const prev = await readJson(OUT, { events: [] });

const list = listEvents(await get(LIST));
const events = [];
for (const e of list.slice(0, MAX_PAGES)) {
  await sleep(3000);
  try {
    const g = parseEvent(await get(e.url), names, mems);
    // Solo páginas de evento (no de gacha ni de modos permanentes)
    if (/ガチャ/.test(g.title) || (!g.parties.length && !g.eventMemory)) continue;
    events.push({ id: e.url.split('/').pop(), listTitle: e.title, start: e.start ?? null, end: e.end ?? null, url: e.url, ...g });
  } catch (err) {
    console.warn('Aviso:', err.message);
    const old = prev.events.find((x) => x.url === e.url);
    if (old) events.push(old); // si falla hoy, se conserva lo de ayer
  }
}
// Memorias nuevas sin nombre JP conocido: se emparejan por fecha de salida en JP
// (la del evento es la SSR gratuita que sale ese día; las de bonus, las SSR de gacha de ese día)
// y lo aprendido se guarda en jp-memories.json para los días siguientes.
const wikiMems = (await readJson(join(ROOT, 'data', 'normalized', 'wiki', 'memories.json'), { items: [] })).items;
const learned = {};
for (const e of events) {
  const day = e.start?.slice(0, 10);
  if (!day) continue;
  const sameDay = (avail) => wikiMems.filter((m) => m.releaseDateJP === day && m.rarity === 'SSR' && avail(m.availability));
  const free = sameDay((a) => a === 'f2p'), paid = sameDay((a) => a === 'gacha');
  if (e.eventMemory && !e.eventMemory.id && free.length === 1) learned[e.eventMemory.jp] = e.eventMemory.id = free[0].id;
  const others = e.bonusMemories.filter((m) => !m.id && m.jp !== e.eventMemory?.jp);
  if (others.length === 1 && paid.length === 1) learned[others[0].jp] = others[0].id = paid[0].id;
  for (const m of [...e.bonusMemories, ...e.parties.flatMap((p) => p.memories)]) if (!m.id) m.id = mems[m.jp] ?? learned[m.jp] ?? null;
}
if (Object.keys(learned).length) {
  const f = join(ROOT, 'data', 'manual', 'jp-memories.json');
  const j = await readJson(f, { names: {} });
  Object.assign(j.names, learned);
  await writeFile(f, JSON.stringify(j, null, 1) + '\n');
  console.log('Memorias aprendidas:', Object.entries(learned).map(([k, v]) => `${k} → ${v}`).join(', '));
}

// Se conservan los de días anteriores que aún no han terminado
const now = Date.now();
for (const old of prev.events) {
  if (!events.some((x) => x.url === old.url) && old.end && Date.parse(old.end) > now) events.push(old);
}
await writeFile(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), events }, null, 2) + '\n');
const unmatched = events.flatMap((e) => e.parties.flatMap((p) => p.chars.filter((c) => !c.id).map((c) => c.jp)));
console.log(`Eventos: ${events.length} · equipos: ${events.reduce((a, e) => a + e.parties.length, 0)}` + (unmatched.length ? ` · sin emparejar: ${[...new Set(unmatched)].join(', ')}` : ''));
