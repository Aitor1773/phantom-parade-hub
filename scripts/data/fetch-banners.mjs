#!/usr/bin/env node
// Banners y eventos desde la JJK Phantom Parade Wiki (CC BY-SA 3.0):
//   · páginas "Banner Page"       → banners con fechas JP y Global (sobre todo 2023-2024)
//   · "Timeline Of Events (JP)"   → cronología JP completa (gachas y eventos)
// Los banners Global actuales se curan a mano en data/manual/global-banners.json,
// porque la wiki no lleva una cronología Global al día.
//
// Uso: npm run data:banners   → data/normalized/wiki/banners.json

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findTemplates, toPlain } from './lib/wikitext.mjs';

const API = 'https://jjk-phantom-parade.fandom.com/api.php';
const WIKI = 'https://jjk-phantom-parade.fandom.com/wiki/';
const UA = 'PhantomParadeHub-DataBot/0.1 (fan site; respectful, low-rate)';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const res = await fetch(`${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await sleep(1200);
  return res.json();
}

const slug = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’"“”().:!?]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** "28-12-2023" o "28/12/2023" → "2023-12-28" */
const iso = (s) => {
  const m = s?.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
};
/** "28-12-2023 (JP) / 15-11-2024 (Global)" → { jp, global } */
function dualDate(s = '') {
  const jp = s.match(/([\d/.-]+)\s*\(JP\)/i)?.[1];
  const gl = s.match(/([\d/.-]+)\s*\(Global\)/i)?.[1];
  return { jp: iso(jp ?? (!gl ? s : null)), global: iso(gl) };
}

const chars = JSON.parse(await readFile(join(ROOT, 'data', 'normalized', 'wiki', 'characters.json'), 'utf8')).items;
const charIds = new Set(chars.map((c) => c.id));
/** "(Incomplete Domain) Megumi Fushiguro" → id de personaje (si existe) */
const charFromLink = (link) => {
  const m = link?.match(/^\s*\(\s*(.+?)\s*\)\s*(.+)$/);
  const id = m ? slug(`${m[1]} ${m[2]}`) : null;
  return id && charIds.has(id) ? id : null;
};
/** Personajes cuyo epíteto aparece en el título de un gacha ("…: Pick Up After Hard Work & Sprinting") */
const charsFromTitle = (title) => {
  const t = slug(title);
  return chars.filter((c) => c.epithet && slug(c.epithet).length > 4 && t.includes(slug(c.epithet))).map((c) => c.id);
};

const kind = (title) =>
  /gacha|summon|pick ?up|scout/i.test(title) ? 'gacha' : /log-?in|login|bonus|reward|present|campaign/i.test(title) ? 'campaign' : 'event';

// ── 1. Páginas de banner (con fechas JP y Global) ──────────────
console.log('Páginas de banner…');
const bannerTitles = (await api({ action: 'query', list: 'embeddedin', eititle: 'Template:Banner Page', einamespace: '0', eilimit: '500' })).query.embeddedin.map((p) => p.title);
const pages = (await api({ action: 'query', prop: 'revisions', rvprop: 'content|timestamp', rvslots: 'main', titles: bannerTitles.join('|') })).query.pages;
const banners = [];
for (const p of pages) {
  const tpl = findTemplates(p.revisions?.[0]?.slots.main.content ?? '', ['Banner Page'])[0];
  if (!tpl) continue;
  const q = tpl.params;
  const start = dualDate(q['Start Date']), end = dualDate(q['End Date']);
  const featured = [1, 2, 3, 4].map((n) => charFromLink(q[`Featured Unit ${n} Name`])).filter(Boolean);
  banners.push({
    id: slug(q['Banner Name'] || p.title),
    name: toPlain(q['Banner Name'] || p.title),
    type: toPlain(q['Banner Type'] ?? '') || null,
    jp: { start: start.jp, end: end.jp },
    global: start.global ? { start: start.global, end: end.global } : null,
    characters: featured.length ? featured : charsFromTitle(q['Banner Name'] || p.title),
    memories: [1, 2, 3, 4].map((n) => toPlain(q[`Featured Memory ${n} Name`] ?? '')).filter(Boolean),
    _source: { source: 'wiki', url: WIKI + encodeURIComponent(p.title.replace(/ /g, '_')), updated: p.revisions[0].timestamp },
  });
}
console.log(`  ${banners.length} banners (${banners.filter((b) => b.global).length} con fecha Global)`);

// ── 2. Cronología JP ────────────────────────────────────────────
console.log('Cronología JP…');
const tl = (await api({ action: 'query', prop: 'revisions', rvprop: 'content|timestamp', rvslots: 'main', titles: 'Timeline Of Events (JP)' })).query.pages[0].revisions[0];
const text = tl.slots.main.content.replace(/\{\{!\}\}/g, '|');
const days = [];
for (const sec of text.split(/^==\s*(?=[A-Z][a-z]+ \d{1,2},? \d{4}\s*==)/m).slice(1)) {
  const head = sec.match(/^([A-Z][a-z]+ \d{1,2},? \d{4})\s*==/);
  if (!head) continue;
  const date = new Date(`${head[1].replace(',', '')} UTC`);
  if (Number.isNaN(+date)) continue;
  const [main, newer = ''] = sec.split(/===\s*New Characters\/Memories\s*===/);
  const items = [];
  // Cada entrada: [[File:…|link=Página]]<br>…End Date: X…  seguida del título en un <span>
  for (const m of main.matchAll(/\[\[File:([^|\]]+)[^\]]*?(?:\|link=([^\]|]+))?[^\]]*\]\][\s\S]*?End Date:\s*([^<]*)<\/span>[\s\S]*?<span[^>]*>([^<]+)<\/span>/g)) {
    const title = toPlain(m[4]);
    items.push({
      title,
      kind: kind(title),
      end: iso(m[3]),
      characters: kind(title) === 'gacha' ? charsFromTitle(title) : [],
      link: m[2]?.trim() || null,
    });
  }
  const added = [...newer.matchAll(/link=([^\]|]+)/g)].map((m) => m[1].trim());
  // Un gacha que no nombra a nadie, el día que sale un personaje nuevo, es su gacha de lanzamiento
  const newChars = added.map(charFromLink).filter(Boolean);
  const isLaunchGacha = (t) => /featured|pick ?up|limited-time gacha/i.test(t) && !/paid|ticket|standard|guaranteed|selectable/i.test(t);
  for (const it of items) if (it.kind === 'gacha' && !it.characters.length && newChars.length && isLaunchGacha(it.title)) it.characters = newChars;
  days.push({
    date: date.toISOString().slice(0, 10),
    items,
    newCharacters: added.map(charFromLink).filter(Boolean),
    newMemories: added.filter((l) => !charFromLink(l) && !/^\(/.test(l)),
  });
}
const nItems = days.reduce((n, d) => n + d.items.length, 0);
console.log(`  ${days.length} días, ${nItems} entradas (${days.reduce((n, d) => n + d.items.filter((i) => i.kind === 'gacha').length, 0)} gachas)`);

await mkdir(join(ROOT, 'data', 'normalized', 'wiki'), { recursive: true });
await writeFile(
  join(ROOT, 'data', 'normalized', 'wiki', 'banners.json'),
  JSON.stringify({
    source: 'wiki', license: 'CC BY-SA 3.0', attribution: 'JJK Phantom Parade Wiki (Fandom)', fetchedAt: new Date().toISOString(),
    timelineJP: { url: WIKI + 'Timeline_Of_Events_(JP)', updated: tl.timestamp, days },
    banners,
  }, null, 2) + '\n',
  'utf8',
);
console.log('  → data/normalized/wiki/banners.json');
