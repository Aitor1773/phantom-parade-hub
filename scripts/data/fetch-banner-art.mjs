#!/usr/bin/env node
// Imágenes oficiales de los banners (gachas y eventos), a diario.
// Lee la lista de eventos y la de gachas de Game8 (con permiso; citado en Créditos): cada imagen
// grande de banner con su fecha y sus personajes destacados. Las convierte a WebP optimizado
// (400 px y tamaño original, máx. 960) en public/img/banners/ y guarda el índice en
// data/normalized/banner-art.json, que src/data/banners.ts empareja con cada banner.
// Lo ya descargado se conserva, así que el historial crece con los días.
//
// Uso: npm run data:banner-art · Ritmo bajo (una petición cada 2 s).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'data', 'normalized', 'banner-art.json');
const IMG = join(ROOT, 'public', 'img', 'banners');
const PAGES = ['https://game8.jp/jujutsuphanpara/578683', 'https://game8.jp/jujutsuphanpara/573051'];
const UA = 'PhantomParadeHub-banners/1.0 (fan site; daily, low-rate; +https://phantom-parade-hub.pages.dev/en/credits/)';
const MAX = 960; // ancho máximo guardado (las originales rondan los 600-630 px)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (url, bin = false) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return bin ? Buffer.from(await res.arrayBuffer()) : res.text();
};
const readJson = async (f, d) => (existsSync(f) ? JSON.parse(await readFile(f, 'utf8')) : d);
const p2 = (n) => String(n).padStart(2, '0');

/** Primera fecha «2026/10/9(金)~10/23(金)» o «9/30開催» tras la imagen → inicio y fin (JST) */
function dates(s, year) {
  const m = s.match(/(?:(\d{4})\/)?(\d{1,2})\/(\d{1,2})(?:\([^)]*\))?\s*(?:(\d{1,2}):(\d{2}))?\s*(?:[〜~]\s*(?:(\d{4})\/)?(\d{1,2})\/(\d{1,2}))?/);
  if (!m) return null;
  const y = Number(m[1] ?? year);
  const start = `${y}-${p2(m[2])}-${p2(m[3])}T${p2(m[4] ?? 15)}:${m[5] ?? '00'}:00+09:00`;
  let end = null;
  if (m[7]) {
    const ey = Number(m[6] ?? (Number(m[7]) < Number(m[2]) ? y + 1 : y));
    end = `${ey}-${p2(m[7])}-${p2(m[8])}T14:59:00+09:00`;
  }
  return { start, end };
}

/** Imágenes de banner de una página: alt, url, fecha cercana y personajes destacados («「apodo」nombre») */
function scan(html, names) {
  const year = new Date().getFullYear();
  const out = [];
  const re = /<img[^>]*alt="([^"]*)"[^>]*data-src="(https:\/\/img\.game8\.jp\/[^"]+)"[^>]*width="(\d+)"/g;
  for (const m of html.matchAll(re)) {
    const [, alt, url, w] = m;
    if (Number(w) < 400 || alt === 'イベント' || !/ガチャ|アイキャッチ|イベント|大討祓|幻境|強敵|ストーリー/.test(alt) || /天井|演出|おすすめ|一覧|攻略TOP|引くべき/.test(alt)) continue;
    const after = html.slice(m.index, m.index + 2500).replace(/<[^>]+?alt="(「[^」]+」[^"]+?)画像"[^>]*>/g, ' $1 ');
    const plain = after.replace(/<[^>]+>/g, ' ');
    const d = dates(plain, year);
    // Personajes: los de la tabla o párrafo siguiente (se corta en el siguiente encabezado)
    const block = after.split(/<h[234][ >]/)[0];
    const chars = [...new Set([...block.matchAll(/「[^」]{1,20}」[^\s「」<>()（）画像]{1,12}/g)].map((x) => names[x[0]]).filter(Boolean))];
    const kind = /ガチャ/.test(alt) ? 'gacha' : 'event';
    out.push({ title: alt.replace(/^ガチャ画像_/, '').replace(/アイキャッチ$/, ''), url: url.replace(/\/show$/, '/original'), kind, ...(d ?? { start: null, end: null }), chars, standard: /ファンパレガチャ/.test(alt) });
  }
  return out;
}

async function convert(url) {
  const key = createHash('sha1').update(url.replace(/\/(show|original)$/, '')).digest('hex').slice(0, 12);
  const known = prevItems.find((x) => x.key === key);
  if (known && known.widths.every((w) => existsSync(join(IMG, `${key}-${w}.webp`)))) return { key, widths: known.widths, fresh: false };
  const buf = await get(url, true);
  const img = sharp(buf);
  const { width = 0 } = await img.metadata();
  // Miniatura de 400 px y la versión a tamaño real (nítida en pantallas HD); el nombre lleva el ancho real
  const widths = [...new Set([Math.min(400, width), Math.min(width, MAX)])];
  for (const w of widths) await img.clone().resize({ width: w }).webp({ quality: 78, effort: 6 }).toFile(join(IMG, `${key}-${w}.webp`));
  return { key, widths, fresh: true };
}

const names = (await readJson(join(ROOT, 'data', 'manual', 'jp-names.json'), { names: {} })).names;
const prev = await readJson(OUT, { items: [] });
const prevItems = prev.items;
await mkdir(IMG, { recursive: true });

const found = [];
for (const page of PAGES) {
  try { found.push(...scan(await get(page), names)); } catch (e) { console.warn('Aviso:', e.message); }
  await sleep(2000);
}
// Una entrada por imagen (la misma puede salir en las dos páginas: se unen sus datos)
const byUrl = new Map();
for (const f of found) {
  const o = byUrl.get(f.url);
  byUrl.set(f.url, o ? { ...o, start: o.start ?? f.start, end: o.end ?? f.end, chars: [...new Set([...o.chars, ...f.chars])] } : f);
}
const items = [...prev.items];
let fresh = 0;
for (const f of byUrl.values()) {
  if (!f.start && !f.standard && !f.chars.length) continue; // sin fecha ni personajes no se puede emparejar
  try {
    const { key, widths, fresh: isNew } = await convert(f.url);
    if (isNew) { fresh++; await sleep(2000); }
    const entry = { key, title: f.title, kind: f.kind, start: f.start, end: f.end, chars: f.chars, standard: f.standard || undefined, widths };
    const i = items.findIndex((x) => x.key === key);
    if (i >= 0) items[i] = { ...items[i], ...entry, chars: [...new Set([...items[i].chars, ...entry.chars])] }; else items.push(entry);
  } catch (e) { console.warn('Aviso:', e.message); }
}
items.sort((a, b) => (b.start ?? '').localeCompare(a.start ?? ''));
await writeFile(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), items }, null, 1) + '\n');
console.log(`Imágenes de banner: ${items.length} (nuevas hoy: ${fresh})`);
