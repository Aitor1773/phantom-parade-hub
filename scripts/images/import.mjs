#!/usr/bin/env node
// Convierte las imágenes del juego a WebP y genera los manifiestos que usa la web.
//
// Fuentes (por prioridad):
//   1. assets-src/characters/<id>.png    → tus capturas / arte propio
//   2. assets-src/jjkppdb/…               → descargadas con  npm run images:fetch
//
// Salida:
//   public/img/characters/<id>-<ancho>.webp      arte de cada personaje
//   public/img/icons/<tipo>/<nombre>-<ancho>.webp iconos (habilidades, personajes, memorias)
//   public/img/memories/<id>-<ancho>.webp        ilustración de cada memoria
//   src/data/local-images.json   (arte)  ·  src/data/local-icons.json  (iconos y memorias)
//
// Solo procesa lo que ha cambiado, así que se puede relanzar sin miedo.

import { readdir, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OWN = join(ROOT, 'assets-src', 'characters');
const JJK = join(ROOT, 'assets-src', 'jjkppdb');
const PUB = join(ROOT, 'public', 'img');
const ART_MANIFEST = join(ROOT, 'src', 'data', 'local-images.json');
const ICON_MANIFEST = join(ROOT, 'src', 'data', 'local-icons.json');
const MIN_HEIGHT = 900;
const EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

const ART_WIDTHS = [320, 640, 960, 1440];
const ICON_WIDTHS = { skills: [64, 128], characters: [96, 192], memories: [96, 192] };
const ILLUST_WIDTHS = [320, 640, 960];

const slug = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’"“”().:!?]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const key = (file) => basename(file, extname(file)).toLowerCase();
const list = async (dir) => (existsSync(dir) ? (await readdir(dir)).filter((f) => EXT.has(extname(f).toLowerCase())) : []);

const chars = JSON.parse(await readFile(join(ROOT, 'data', 'normalized', 'wiki', 'characters.json'), 'utf8')).items;
const ids = new Set(chars.map((c) => c.id));

/** Acepta el id exacto, "Epíteto Nombre", "Nombre Epíteto" o "Epíteto_Nombre" (jjkppdb). */
function resolveId(file) {
  const s = slug(basename(file, extname(file)).replace(/_/g, ' '));
  if (ids.has(s)) return s;
  const hit = chars.filter((c) => slug(`${c.epithet ?? ''} ${c.name}`) === s || slug(`${c.name} ${c.epithet ?? ''}`) === s);
  return hit.length === 1 ? hit[0].id : null;
}

/** Genera los anchos pedidos (sin ampliar). Salta si la salida es más nueva que el original. */
async function toWebp(src, outBase, widths, quality = 82) {
  const meta = await sharp(src, { animated: false }).metadata();
  const usable = widths.filter((w) => w <= (meta.width ?? 0));
  if (!usable.length) usable.push(meta.width);
  const last = `${outBase}-${usable.at(-1)}.webp`;
  if (existsSync(last) && (await stat(last)).mtimeMs >= (await stat(src)).mtimeMs) return { meta, widths: usable, skipped: true };
  await mkdir(dirname(outBase), { recursive: true });
  const input = sharp(src, { animated: false }).rotate();
  for (const w of usable) await input.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality, effort: 5 }).toFile(`${outBase}-${w}.webp`);
  return { meta, widths: usable, skipped: false };
}

// jjkppdb traduce los epítetos a su manera ("Hollow Technique: Purple" vs. "Hollow Purple"),
// así que su arte se asocia por los iconos de habilidad, que se llaman igual que en la wiki.
const wikiKey = (url) => url?.match(/\/images\/[^/]+\/[^/]+\/([^/]+?)\.[a-z0-9]+(?:\/|$)/i)?.[1]?.toLowerCase() ?? null;
const skillKeysById = new Map(
  chars.map((c) => {
    const kits = Object.values(c.kits ?? {}).filter(Boolean);
    const keys = kits.flatMap((k) => ['normal', 's1', 's2', 'ult'].map((s) => wikiKey(k[s]?.img))).filter(Boolean);
    return [c.id, new Set(keys)];
  }),
);
// Casos sin iconos que coincidan, resueltos por eliminación (las otras versiones
// de cada personaje ya están asociadas). Formato: archivo de jjkppdb → id de la wiki.
const artToId = new Map([
  ['Everlasting_Summer_Nobara_Kugisaki.png', 'striking-eternal-summer-nobara-kugisaki'],
  ['Grateful_Send-off_Kiyotaka_Ijichi.png', 'pick-up-after-hard-work-kiyotaka-ijichi'],
  ['Rondo_of_the_Beautiful_Blade_Mei_Mei.png', 'dance-of-the-beautiful-blades-mei-mei'],
  ['Unyielding_Sacred_Beast_Takuma_Ino.png', 'indomitable-auspicious-beasts-takuma-ino'],
]);
const jjkIndexFile = join(JJK, 'index.json');
if (existsSync(jjkIndexFile)) {
  const jjkIndex = JSON.parse(await readFile(jjkIndexFile, 'utf8'));
  for (const page of Object.values(jjkIndex.characters)) {
    if (!page.hdArt) continue;
    const keys = page.skillIcons.map((u) => key(u));
    let best = null, bestScore = 0;
    for (const [id, set] of skillKeysById) {
      const score = keys.filter((k) => set.has(k)).length;
      if (score > bestScore) [best, bestScore] = [id, score];
    }
    const file = basename(decodeURIComponent(page.hdArt));
    if (best && !artToId.has(file)) artToId.set(file, best);
  }
}

// ── Arte de personajes ──────────────────────────────────────────
const art = {};
const unknown = [];
const small = [];
let artNew = 0;

const artSources = [
  ...(await list(join(JJK, 'hd_arts'))).map((f) => ({ file: join(JJK, 'hd_arts', f), name: f, source: 'jjkppdb' })),
  ...(await list(OWN)).map((f) => ({ file: join(OWN, f), name: f, source: 'own' })), // las propias, al final: sobrescriben
];
for (const s of artSources) {
  const id = (s.source === 'jjkppdb' && artToId.get(s.name)) || resolveId(s.name);
  if (!id) { unknown.push(s.name); continue; }
  const r = await toWebp(s.file, join(PUB, 'characters', id), ART_WIDTHS);
  if ((r.meta.height ?? 0) < MIN_HEIGHT) small.push(`${s.name} (${r.meta.width}×${r.meta.height})`);
  art[id] = { width: r.meta.width, height: r.meta.height, widths: r.widths, source: s.source };
  if (!r.skipped) artNew++;
}
await writeFile(ART_MANIFEST, JSON.stringify(Object.fromEntries(Object.entries(art).sort()), null, 2) + '\n', 'utf8');
console.log(`Arte: ${Object.keys(art).length}/${ids.size} personajes (${artNew} nuevos)`);

// ── Iconos ──────────────────────────────────────────────────────
const icons = { skills: {}, characters: {}, memories: {} };
const ICON_DIRS = { skills: 'skill_icons', characters: 'character_icons' };
for (const [kind, dir] of Object.entries(ICON_DIRS)) {
  for (const f of await list(join(JJK, dir))) {
    const r = await toWebp(join(JJK, dir, f), join(PUB, 'icons', kind, key(f)), ICON_WIDTHS[kind], 85);
    icons[kind][key(f)] = r.widths;
  }
  console.log(`Iconos de ${kind}: ${Object.keys(icons[kind]).length}`);
}

// Iconos por personaje según jjkppdb (respaldo cuando el nombre de archivo de la wiki no coincide):
// cada página de jjkppdb lista sus iconos de habilidad ("BlueSSRMiwaS21") y de ahí sale el
// icono del personaje ("BlueSSRMiwaIcon1").
icons.byCharacter = {};
if (existsSync(jjkIndexFile)) {
  const jjkIndex = JSON.parse(await readFile(jjkIndexFile, 'utf8'));
  const SLOT = [[/normalattack(\d*)$/, 'normal'], [/ult(\d*)$/, 'ult'], [/s1(\d*)$/, 's1'], [/s2(\d*)$/, 's2']];
  for (const page of Object.values(jjkIndex.characters)) {
    const id = page.hdArt && artToId.get(basename(decodeURIComponent(page.hdArt)));
    if (!id) continue;
    const entry = { skills: {} };
    for (const k of page.skillIcons.map((u) => key(decodeURIComponent(u)))) {
      if (!icons.skills[k]) continue;
      for (const [re, slot] of SLOT) {
        const m = k.match(re);
        if (!m) continue;
        entry.skills[slot] ??= k;
        const prefix = k.slice(0, m.index), v = m[1] || '1';
        entry.icon ??= [`${prefix}icon${v}`, `${prefix}icon1`, `${prefix}icon`].find((c) => icons.characters[c]);
        break;
      }
    }
    if (entry.icon || Object.keys(entry.skills).length) icons.byCharacter[id] = entry;
  }
  // Iconos de jjkppdb con un nombre que no sigue el patrón (comprobados a mano)
  const MANUAL_ICONS = {
    'early-morning-departure-maki-zenin': { icon: 'bluessrmakiicon1' },
    'mode-albatross-ultimate-mechamaru': { icon: 'greenmechamarusricon1' },
    'the-resolve-of-being-a-sorcerer-kaito-yuuki': { icon: 'greenyuukisricon1' },
    'bond-of-friendship-megumi-fushiguro': { icon: 'greenssrmegumiicon1' },
    'effective-range-mai-zenin': { skills: { s1: 'bluessrmaiskill1', s2: 'bluessrmaiskill2' } },
    'melting-sweet-summer-treats-satoru-gojo': { skills: { ult: 'yellogojossrult2sp' } },
  };
  for (const [id, m] of Object.entries(MANUAL_ICONS)) {
    const e = (icons.byCharacter[id] ??= { skills: {} });
    if (m.icon && icons.characters[m.icon]) e.icon = m.icon;
    for (const [slot, k] of Object.entries(m.skills ?? {})) if (icons.skills[k]) e.skills[slot] = k;
  }
}

// Personajes sin icono en ninguna fuente: se recorta uno cuadrado de su arte HD
// (recorte automático por la zona más llamativa, normalmente la cara).
let generated = 0;
for (const c of chars) {
  const wikiIcon = wikiKey(c.art?.replace(/Art(\d+)\./, 'Icon$1.'));
  if (icons.characters[wikiIcon] || icons.byCharacter[c.id]?.icon || !art[c.id]) continue;
  const src = join(PUB, 'characters', `${c.id}-${art[c.id].widths.at(-1)}.webp`);
  if (!existsSync(src)) continue;
  const k = `gen-${c.id}`;
  await mkdir(join(PUB, 'icons', 'characters'), { recursive: true });
  for (const w of ICON_WIDTHS.characters) {
    await sharp(src).resize(w, w, { fit: 'cover', position: sharp.strategy.attention }).webp({ quality: 85 }).toFile(join(PUB, 'icons', 'characters', `${k}-${w}.webp`));
  }
  icons.characters[k] = ICON_WIDTHS.characters;
  (icons.byCharacter[c.id] ??= { skills: {} }).icon = k;
  generated++;
}
if (generated) console.log(`Iconos generados desde el arte: ${generated}`);
console.log(`Iconos asociados por personaje: ${Object.keys(icons.byCharacter).length} (con icono: ${Object.values(icons.byCharacter).filter((e) => e.icon).length})`);

// ── Memorias (icono + ilustración, por id de jjkppdb y nombre) ──
const idxFile = join(JJK, 'index.json');
if (existsSync(idxFile)) {
  const idx = JSON.parse(await readFile(idxFile, 'utf8'));
  for (const m of idx.memories) {
    const entry = { name: m.name, slug: slug(m.name), rarity: m.rarity };
    const iconFile = join(JJK, 'rec_bits', 'rec_bit_icons', basename(m.icon));
    if (existsSync(iconFile)) entry.icon = (await toWebp(iconFile, join(PUB, 'icons', 'memories', String(m.id)), ICON_WIDTHS.memories, 85)).widths;
    const illFile = m.illust && join(JJK, 'rec_bits', 'rec_bit_illust', basename(m.illust));
    if (illFile && existsSync(illFile)) entry.illust = (await toWebp(illFile, join(PUB, 'memories', String(m.id)), ILLUST_WIDTHS)).widths;
    icons.memories[m.id] = entry;
  }
  console.log(`Memorias: ${Object.keys(icons.memories).length}`);
}
await writeFile(ICON_MANIFEST, JSON.stringify(icons) + '\n', 'utf8');

if (small.length) console.log(`⚠ Resolución baja (mínimo recomendado ${MIN_HEIGHT}px de alto):\n  - ${small.join('\n  - ')}`);
if (unknown.length) console.log(`⚠ Sin personaje asociado (renómbralas con el id de docs/IMAGENES.md):\n  - ${unknown.join('\n  - ')}`);
