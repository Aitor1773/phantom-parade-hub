#!/usr/bin/env node
// Memorias recomendadas por personaje (hasta 4, en orden) desde las guías de cada personaje
// (Game8, con permiso; citado en Créditos). La guía da el nombre japonés y el icono de la memoria:
// el nombre se busca en data/manual/jp-memories.json y, si no está, el icono se compara con los
// nuestros. Las parejas nuevas quedan en _review para revisarlas antes de darlas por buenas.
//
// Uso: npm run data:char-memories   → data/manual/char-memories.json (se ejecuta a mano, no a diario)

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'data', 'manual', 'char-memories.json');
const JP = join(ROOT, 'data', 'manual', 'jp-memories.json');
const UA = 'PhantomParadeHub-guides/1.0 (fan site; low-rate; +https://phantom-parade-hub.pages.dev/en/credits/)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = async (f, d) => (existsSync(f) ? JSON.parse(await readFile(f, 'utf8')) : d);

const guides = JSON.parse(await readFile(join(ROOT, 'data', 'manual', 'char-guides.json'), 'utf8')).characters;
const jpNames = (await readJson(JP, { names: {} })).names; // nombre JP → id de memoria
const links = JSON.parse(await readFile(join(ROOT, 'data', 'links', 'memories.json'), 'utf8')).links; // id → jjkppdb
const icons = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'local-icons.json'), 'utf8')).memories;
const prev = await readJson(OUT, { characters: {} });

// Iconos de nuestras memorias para comparar
const feat = async (buf) => {
  const raw = await sharp(buf).flatten({ background: '#000' }).resize(24, 24, { fit: 'cover' }).removeAlpha().raw().toBuffer();
  const a = [...raw], mean = a.reduce((s, x) => s + x, 0) / a.length;
  const sd = Math.sqrt(a.reduce((s, x) => s + (x - mean) ** 2, 0) / a.length) || 1;
  return a.map((x) => (x - mean) / sd);
};
const corr = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0) / a.length;
const refs = [];
for (const [id, l] of Object.entries(links)) {
  const w = icons[l.jjkppdb]?.icon;
  const file = w && join(ROOT, 'public', 'img', 'icons', 'memories', `${l.jjkppdb}-${w.at(-1)}.webp`);
  if (file && existsSync(file)) refs.push({ id, f: await feat(await readFile(file)) });
}

const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  await sleep(2000);
  return res;
};

const review = {};
const out = {};
// Fichas de Game8 de personajes cuya guía venía de otra web (tienen la sección de memorias)
const URLS = {
  'a-clever-bullet-mai-zenin': 'https://game8.jp/jujutsuphanpara/578227',
  'mode-albatross-ultimate-mechamaru': 'https://game8.jp/jujutsuphanpara/578228',
  'reverse-cursed-technique-shoko-ieiri': 'https://game8.jp/jujutsuphanpara/578231',
  'reckless-grade-1-aoi-todo': 'https://game8.jp/jujutsuphanpara/578224',
  'blood-of-the-big-three-families-noritoshi-kamo': 'https://game8.jp/jujutsuphanpara/578225',
};
for (const [cid, g] of Object.entries(guides)) {
  const url = URLS[cid] ?? g.url;
  if (!url) { if (prev.characters[cid]) out[cid] = prev.characters[cid]; continue; }
  let html;
  try { html = await (await get(url)).text(); } catch (e) { console.warn('Aviso:', e.message); if (prev.characters[cid]) out[cid] = prev.characters[cid]; continue; }
  // Sección «…のおすすめ(廻想)残滓»: hasta el siguiente encabezado del mismo nivel
  const start = html.search(/<h[23][^>]*>[^<]*おすすめ(?:廻想)?残滓/);
  if (start < 0) { if (prev.characters[cid]) out[cid] = prev.characters[cid]; continue; }
  const level = html.slice(start + 2, start + 3);
  const end = html.indexOf(`<h${level}`, start + 10);
  const sec = html.slice(start, end > 0 ? end : start + 30000);
  const found = [];
  // Game8: alt="Nombre画像" data-src="…"; GameWith: alt="Nombre" con src o data-original
  for (const m of sec.matchAll(/<img[^>]*>/g)) {
    const alt = m[0].match(/alt="([^"]+)"/)?.[1]?.replace(/画像$/, '');
    const src = m[0].match(/(?:data-src|data-original|src)="(https?:[^"]+)"/)?.[1];
    if (!alt || !src || found.some((f) => f.jp === alt)) continue;
    found.push({ jp: alt, img: src.replace(/\/show$/, '/original') });
    if (found.length === 4) break;
  }
  const list = [];
  for (const f of found) {
    // null en jp-memories.json: revisada y no la tenemos (se omite en vez de adivinarla)
    if (f.jp in jpNames && jpNames[f.jp] === null) continue;
    let id = jpNames[f.jp] ?? null;
    if (!id) {
      try {
        const buf = Buffer.from(await (await get(f.img)).arrayBuffer());
        const fv = await feat(buf);
        const best = refs.map((x) => ({ id: x.id, c: corr(fv, x.f) })).sort((a, b) => b.c - a.c);
        id = best[0].id;
        review[f.jp] = { guess: id, score: +best[0].c.toFixed(3), second: best[1].id, img: f.img };
        jpNames[f.jp] = id; // se reutiliza para los siguientes personajes
      } catch (e) { console.warn('Aviso:', e.message); }
    }
    if (id && !list.includes(id)) list.push(id);
  }
  if (list.length) out[cid] = list;
  console.log(cid, list.length);
}

await writeFile(OUT, JSON.stringify({
  _comment: 'Memorias recomendadas por personaje (hasta 4, de mejor a peor), sacadas de las guías de cada personaje. _review: nombres japoneses emparejados por imagen que hay que revisar y pasar a jp-memories.json.',
  updated: new Date().toISOString().slice(0, 10),
  characters: out,
  _review: review,
}, null, 2) + '\n');
console.log(`Personajes con memorias: ${Object.keys(out).length} · emparejadas por imagen (revisar): ${Object.keys(review).length}`);
