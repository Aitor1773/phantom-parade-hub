#!/usr/bin/env node
// Códigos de recompensa del servidor Global, contrastados entre varias webs.
//
// Cada web se lee una vez (respetando su robots.txt). De cada una se extraen solo
// hechos: el código, la recompensa y si la web lo da por activo o caducado.
// Después se cruza todo y cada código recibe un estado:
//   verified  → ≥2 webs lo dan por activo y ninguna por caducado
//   single    → solo 1 web lo da por activo
//   conflict  → unas lo dan por activo y otras por caducado
//   expired   → solo aparece como caducado
// data/manual/codes.json (probados en el juego) tiene siempre la última palabra.
//
// Uso: npm run data:codes   → data/normalized/codes.json

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const UA = 'Mozilla/5.0 (compatible; PhantomParadeHub-CodesBot/0.1; fan site, one request per source)';

const SOURCES = [
  { id: 'pocketgamer', name: 'Pocket Gamer', url: 'https://www.pocketgamer.com/jujutsu-kaisen-phantom-parade/codes/' },
  { id: 'beebom', name: 'Beebom', url: 'https://beebom.com/jujutsu-kaisen-phantom-parade-codes/' },
  { id: 'urgametips', name: 'UrGameTips', url: 'https://urgametips.com/jujutsu-kaisen-phantom-parade-codes/' },
  { id: 'gameguide', name: 'Game.guide', url: 'https://www.game.guide/jujutsu-kaisen-phantom-parade-codes' },
  { id: '9to5gaming', name: '9to5Gaming', url: 'https://9to5gaming.com/jujutsu-kaisen-phantom-parade-codes/' },
  { id: 'bluestacks', name: 'BlueStacks', url: 'https://www.bluestacks.com/blog/redeem-codes/jujutsu-kaisen-phantom-parade-redeem-codes-en.html' },
  { id: 'mobigg', name: 'Mobi.gg', url: 'https://mobi.gg/en/tips/jujutsu-kaisen-phantom-parade-codes/' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) =>
  s.replace(/&nbsp;|&#160;/g, ' ').replace(/&ndash;|&#8211;/g, '–').replace(/&mdash;|&#8212;/g, '—').replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ').trim();
const strip = (html) => decode(html.replace(/<[^>]+>/g, ' '));

/** ¿Permite el robots.txt leer esta ruta? (solo reglas de "User-agent: *") */
async function allowed(url) {
  const u = new URL(url);
  try {
    const txt = await (await fetch(`${u.origin}/robots.txt`, { headers: { 'User-Agent': UA } })).text();
    let applies = false;
    const rules = [];
    for (const raw of txt.split(/\r?\n/)) {
      const line = raw.split('#')[0].trim();
      const [k, ...rest] = line.split(':');
      const v = rest.join(':').trim();
      if (/^user-agent$/i.test(k)) applies = v === '*';
      else if (applies && /^disallow$/i.test(k) && v) rules.push(v);
    }
    // Comodines de robots.txt: "*" = cualquier cosa, "$" = fin de la URL
    const path = u.pathname + u.search;
    return !rules.some((r) => new RegExp('^' + r.replace(/[.+?^${}()|[\]\\]/g, (c) => (c === '$' ? c : '\\' + c)).replace(/\*/g, '.*')).test(path));
  } catch {
    return true;
  }
}

// Palabras que parecen códigos pero no lo son
const NOT_CODES = new Set(['cubes', 'gacha', 'tickets', 'ticket', 'codes', 'code', 'reward', 'rewards', 'expired', 'active', 'none', 'new', 'update']);

/** Extrae {code, reward, state} de las listas bajo títulos "active"/"expired". */
function parse(html) {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '');
  const parts = body.split(/(<h[2-4][^>]*>[\s\S]*?<\/h[2-4]>)/i);
  const out = [];
  let state = null;
  for (const part of parts) {
    if (/^<h[2-4]/i.test(part)) {
      const h = strip(part).toLowerCase();
      const listTitle = /codes?$/.test(h) && !/more|how|redeem|problem|unlock|what|where|why|faq|other|similar/.test(h);
      state = /expired|inactive|no longer|old codes/.test(h) ? 'expired' : (/active|working|valid|new codes|latest/.test(h) && /code/.test(h)) || listTitle ? 'active' : null;
      continue;
    }
    if (!state) continue;
    // Un código tiene dígitos, mayúsculas internas (CullingGame) o va todo en mayúsculas (NEWYEAR);
    // una palabra normal con mayúscula inicial ("About", "Typos") no lo es
    const valid = (c) =>
      /^[A-Za-z0-9]{4,24}$/.test(c) && !NOT_CODES.has(c.toLowerCase()) && !/^\d+$/.test(c) && !/^[A-Z]?[a-z]+$/.test(c);
    const clean = (r) =>
      r?.replace(/\(.*?(new|added).*?\)/i, '').replace(/\s*Copy\s*$/i, '').replace(/\s*[A-Z][a-z]{2,8}\.? \d{1,2}, \d{4}\s*$/, '').trim() || null;
    // Listas: "CÓDIGO - recompensa"
    for (const li of part.match(/<li[^>]*>[\s\S]*?<\/li>/gi) ?? []) {
      const text = strip(li);
      const m = text.match(/^([A-Za-z0-9]{4,24})\s*(?:[-–—:|]\s*(.*))?$/) ?? text.match(/^([A-Za-z0-9]{4,24})\s+(.*)$/);
      if (m && valid(m[1])) out.push({ code: m[1], reward: clean(m[2]), state });
    }
    // Tablas: primera celda = código, segunda = recompensa
    for (const tr of part.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? []) {
      const cells = (tr.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? []).map(strip);
      if (cells.length >= 2 && valid(cells[0])) out.push({ code: cells[0], reward: clean(cells[1].replace(/\d{4}-\d{2}-\d{2}.*$/, '')), state });
    }
  }
  return out;
}

const results = [];
for (const src of SOURCES) {
  if (!(await allowed(src.url))) {
    console.log(`  ✗ ${src.name}: robots.txt no lo permite, se omite`);
    continue;
  }
  try {
    const res = await fetch(src.url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const items = parse(html);
    const modified = html.match(/"dateModified"\s*:\s*"([^"]+)"/)?.[1] ?? html.match(/article:modified_time"\s+content="([^"]+)"/)?.[1] ?? null;
    results.push({ ...src, modified, items });
    const a = items.filter((i) => i.state === 'active').length;
    console.log(`  ✓ ${src.name}: ${a} activos, ${items.length - a} caducados${modified ? ` (actualizada ${modified.slice(0, 10)})` : ''}`);
  } catch (e) {
    console.log(`  ✗ ${src.name}: ${e.message}`);
  }
  await sleep(1500);
}

// ── Cruce ───────────────────────────────────────────────────────
const codes = new Map();
for (const r of results) {
  const seen = new Set();
  for (const it of r.items) {
    const key = it.code.toUpperCase();
    if (seen.has(key + it.state)) continue;
    seen.add(key + it.state);
    const c = codes.get(key) ?? { spellings: {}, rewards: {}, active: [], expired: [] };
    c.spellings[it.code] = (c.spellings[it.code] ?? 0) + 1;
    if (it.reward) c.rewards[it.reward] = (c.rewards[it.reward] ?? 0) + 1;
    c[it.state].push({ source: r.id, name: r.name, url: r.url, modified: r.modified });
    codes.set(key, c);
  }
}

const manualFile = join(ROOT, 'data', 'manual', 'codes.json');
const manual = existsSync(manualFile) ? JSON.parse(await readFile(manualFile, 'utf8')).codes ?? {} : {};
const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

const list = [...codes.entries()].map(([key, c]) => {
  const tested = Object.entries(manual).find(([k]) => k.toUpperCase() === key)?.[1];
  // Si una web lo pone en ambas listas, cuenta como activo solo si está en la de activos
  const act = c.active.length, exp = c.expired.filter((e) => !c.active.some((a) => a.source === e.source)).length;
  let status = act >= 2 && !exp ? 'verified' : act === 1 && !exp ? 'single' : act && exp ? 'conflict' : 'expired';
  if (tested) status = tested.works ? 'tested' : 'expired';
  return { code: top(c.spellings), reward: tested?.reward ?? top(c.rewards), status, activeIn: c.active, expiredIn: c.expired, tested: tested ?? null };
});
// Códigos probados a mano que ninguna web recoge todavía
for (const [code, t] of Object.entries(manual)) {
  if (!codes.has(code.toUpperCase())) list.push({ code, reward: t.reward ?? null, status: t.works ? 'tested' : 'expired', activeIn: [], expiredIn: [], tested: t });
}

const ORDER = { tested: 0, verified: 1, single: 2, conflict: 3, expired: 4 };
list.sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.activeIn.length - a.activeIn.length || a.code.localeCompare(b.code));

await mkdir(join(ROOT, 'data', 'normalized'), { recursive: true });
await writeFile(
  join(ROOT, 'data', 'normalized', 'codes.json'),
  JSON.stringify({ fetchedAt: new Date().toISOString(), server: 'global', sources: results.map(({ items, ...s }) => s), codes: list }, null, 2) + '\n',
  'utf8',
);
const n = (s) => list.filter((c) => c.status === s).length;
console.log(`\n${list.length} códigos · probados ${n('tested')} · verificados ${n('verified')} · una fuente ${n('single')} · en conflicto ${n('conflict')} · caducados ${n('expired')}`);
list.filter((c) => c.status === 'conflict').forEach((c) => console.log(`  ⚠ ${c.code}: activo en ${c.activeIn.map((s) => s.name).join(', ')} · caducado en ${c.expiredIn.map((s) => s.name).join(', ')}`));
