#!/usr/bin/env node
// Descarga, una sola vez y despacio, las imágenes del juego que aloja jjkppdb.com
// (arte HD, iconos de personajes, iconos de habilidades y memorias).
// Solo imágenes del juego: no se copia ningún texto ni contenido propio de jjkppdb.
//
//   npm run images:fetch     → descarga a assets-src/jjkppdb/ (no se sube a git)
//   npm run images           → convierte a WebP y las asocia a cada dato
//
// Si se interrumpe, al relanzarlo salta lo que ya está descargado.

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://www.jjkppdb.com';
const CDN = 'https://cdn.jjkppdb.com/';
const UA = 'PhantomParadeHub-ImageFetch/0.1 (fan site; one-off, low-rate)';
const PAGE_DELAY = 1500; // entre páginas HTML
const FILE_DELAY = 600; // entre imágenes
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'assets-src', 'jjkppdb');
const FOLDERS = ['hd_arts/', 'character_icons/', 'skill_icons/', 'rec_bits/', 'others/'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, as = 'text') {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) return as === 'text' ? res.text() : Buffer.from(await res.arrayBuffer());
      if (res.status === 404) return null;
    } catch {}
    await sleep(3000 * attempt);
  }
  throw new Error(`No se pudo descargar ${url}`);
}

const cdnUrls = (html) =>
  [...new Set(html.match(/https:\/\/cdn\.jjkppdb\.com\/[^"\\\s)]+?\.(?:png|webp|jpe?g|gif|avif)/g) ?? [])].filter((u) =>
    FOLDERS.some((f) => u.startsWith(CDN + f)),
  );

// ── 1. Páginas de personajes (del sitemap) ──────────────────────
console.log('Leyendo sitemap…');
const sitemap = await get(`${SITE}/sitemap.xml`);
const charPages = [...sitemap.matchAll(/<loc>https:\/\/www\.jjkppdb\.com\/characters\/([^<]+)<\/loc>/g)].map((m) => decodeURIComponent(m[1]));
console.log(`  ${charPages.length} personajes`);

const index = { fetchedAt: new Date().toISOString(), characters: {}, memories: [] };
const all = new Set();

for (const [i, slug] of charPages.entries()) {
  const html = await get(`${SITE}/characters/${encodeURIComponent(slug)}`);
  if (!html) continue;
  const urls = cdnUrls(html);
  urls.forEach((u) => all.add(u));
  index.characters[slug] = {
    hdArt: urls.find((u) => u.startsWith(CDN + 'hd_arts/')) ?? null,
    skillIcons: urls.filter((u) => u.startsWith(CDN + 'skill_icons/')),
  };
  process.stdout.write(`  · páginas ${i + 1}/${charPages.length}\r`);
  await sleep(PAGE_DELAY);
}
process.stdout.write('\n');

// ── 2. Memorias: id, nombre e imágenes (del listado) ────────────
console.log('Leyendo memorias…');
const recHtml = (await get(`${SITE}/recollection-bits`)).replace(/\\"/g, '"');
for (const m of recHtml.matchAll(/\{"id":(\d+),"name":"((?:[^"\\]|\\.)*)","rarity":"(\w+)"[\s\S]*?"icon":"([^"]+)","illust":"([^"]*)"/g)) {
  const [, id, name, rarity, icon, illust] = m;
  if (index.memories.some((x) => x.id === Number(id))) continue;
  const iconUrl = `${CDN}rec_bits/rec_bit_icons/${icon}`;
  const illustUrl = illust ? `${CDN}rec_bits/rec_bit_illust/${illust}` : null;
  let parsed = name;
  try { parsed = JSON.parse(`"${name}"`); } catch {}
  index.memories.push({ id: Number(id), name: parsed, rarity, icon: iconUrl, illust: illustUrl });
  all.add(iconUrl);
  if (illustUrl) all.add(illustUrl);
}
cdnUrls(recHtml).forEach((u) => all.add(u));
console.log(`  ${index.memories.length} memorias`);

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');

// ── 3. Descarga de imágenes (con caché) ─────────────────────────
const list = [...all].sort();
let downloaded = 0, skipped = 0, missing = 0, bytes = 0;
console.log(`Descargando ${list.length} imágenes…`);
for (const [i, url] of list.entries()) {
  const file = join(OUT, decodeURIComponent(url.slice(CDN.length)));
  if (existsSync(file)) { skipped++; continue; }
  const buf = await get(url, 'buffer');
  if (!buf) { missing++; continue; }
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, buf);
  downloaded++;
  bytes += buf.length;
  process.stdout.write(`  · ${i + 1}/${list.length} (${(bytes / 1e6).toFixed(0)} MB)\r`);
  await sleep(FILE_DELAY);
}
process.stdout.write('\n');
console.log(`Listo: ${downloaded} nuevas, ${skipped} ya estaban, ${missing} no encontradas · ${(bytes / 1e6).toFixed(1)} MB`);
console.log('Siguiente paso: npm run images');
