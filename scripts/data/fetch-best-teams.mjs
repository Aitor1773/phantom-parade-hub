#!/usr/bin/env node
// Mejores equipos desde la hoja de cálculo de la comunidad (pestaña «Equipos», pública).
// Cada equipo: color (mono azul/rojo/verde/amarillo) y estilo (ritual = técnica, físico, híbrido),
// 4 puestos con su rol, banquillo y sustitutos por rol.
// Los personajes son iconos (imágenes sin nombre): se reconocen por su contenido. Los iconos ya
// confirmados están en data/manual/best-teams-icons.json ({ hash: id }); los nuevos se reconocen
// comparándolos con nuestros iconos y quedan marcados como «auto» para revisarlos.
//
// Uso: npm run data:best-teams   → data/normalized/best-teams.json

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHEET = '1Qpro4uWVGvTBK7mIWbYHhd82X2NjHhhu1kk-QPiCkyk';
const GID = '1101206588';
const URL_VIEW = `https://docs.google.com/spreadsheets/d/${SHEET}/htmlview/sheet?headers=true&gid=${GID}`;
const URL_PUBLIC = `https://docs.google.com/spreadsheets/d/${SHEET}/edit?gid=${GID}`;
const OUT = join(ROOT, 'data', 'normalized', 'best-teams.json');
const ICONS = join(ROOT, 'data', 'manual', 'best-teams-icons.json');
const UA = 'Mozilla/5.0 (PhantomParadeHub-teams/1.0; fan site; daily)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = async (f, d) => (existsSync(f) ? JSON.parse(await readFile(f, 'utf8')) : d);

const COLORS = { AZUL: 'blue', ROJO: 'red', VERDE: 'green', AMARILLO: 'yellow' };
const STYLES = { RITUAL: 'jujutsu', 'FÍSICO': 'taijutsu', FISICO: 'taijutsu', 'HÍBRIDO': 'hybrid', HIBRIDO: 'hybrid' };

// ── 1. Cuadrícula de la hoja (con celdas combinadas) ─────────────
const html = await (await fetch(URL_VIEW, { headers: { 'User-Agent': UA } })).text();
const table = html.slice(html.indexOf('<table'), html.lastIndexOf('</table>'));
if (!table) throw new Error('No se pudo leer la hoja');
const grid = [];
let r = 0;
for (const tr of table.split(/<tr[^>]*>/).slice(1)) {
  grid[r] ??= [];
  let c = 0;
  for (const m of tr.matchAll(/<t([dh])([^>]*)>([\s\S]*?)<\/t\1>/g)) {
    while (grid[r][c] !== undefined) c++;
    const cs = Number(m[2].match(/colspan="(\d+)"/)?.[1] ?? 1), rs = Number(m[2].match(/rowspan="(\d+)"/)?.[1] ?? 1);
    const img = m[3].match(/<img src="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&') ?? null;
    const text = m[3].replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    for (let i = 0; i < rs; i++) for (let j = 0; j < cs; j++) { grid[r + i] ??= []; grid[r + i][c + j] = i || j ? null : { text, img }; }
    c += cs;
  }
  r++;
}
const cell = (row, col) => grid[row]?.[col] ?? null;

// ── 2. Reconocer los iconos (por su contenido) ──────────────────
const known = (await readJson(ICONS, { icons: {} })).icons;
const local = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'local-icons.json'), 'utf8'));
// Centro del icono (sin marco ni insignia de color), normalizado, para comparar
const feat = async (buf) => {
  const { width = 100, height = 100 } = await sharp(buf).metadata();
  const raw = await sharp(buf).flatten({ background: '#000' })
    .extract({ left: Math.round(width * 0.14), top: Math.round(height * 0.22), width: Math.round(width * 0.6), height: Math.round(height * 0.6) })
    .resize(20, 20).removeAlpha().raw().toBuffer();
  const a = [...raw], mean = a.reduce((s, x) => s + x, 0) / a.length;
  const sd = Math.sqrt(a.reduce((s, x) => s + (x - mean) ** 2, 0) / a.length) || 1;
  return a.map((x) => (x - mean) / sd);
};
const corr = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0) / a.length;
let refs = null;
// Color de cada personaje: los equipos son de un solo color, así que solo se compara con los suyos
const ELEMENT = Object.fromEntries(JSON.parse(await readFile(join(ROOT, 'data', 'normalized', 'wiki', 'characters.json'), 'utf8')).items.map((c) => [c.id, c.element]));
const loadRefs = async () => {
  refs = [];
  for (const id of Object.keys(ELEMENT)) {
    const v = local.byCharacter?.[id], w = v && local.characters[v.icon];
    // Icono del juego o, si no lo tenemos, la ilustración (recorte cuadrado de la parte de arriba)
    const file = w ? join(ROOT, 'public', 'img', 'icons', 'characters', `${v.icon}-${w.at(-1)}.webp`) : join(ROOT, 'public', 'img', 'characters', `${id}-320.webp`);
    if (!existsSync(file)) continue;
    const buf = w ? await readFile(file) : await sharp(file).resize(200, 200, { fit: 'cover', position: 'top' }).toBuffer();
    refs.push({ id, el: ELEMENT[id], f: await feat(buf) });
  }
};
const ids = new Map(); // url → { id, hash, auto, score }
const unknown = [];
async function identify(url, color) {
  const key = `${url}|${color}`;
  if (ids.has(key)) return ids.get(key);
  let buf = null;
  for (let k = 0; k < 4 && !buf; k++) {
    const res = await fetch(url.replace(/=w\d+-h\d+$/, ''), { headers: { 'User-Agent': UA } });
    if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image')) buf = Buffer.from(await res.arrayBuffer());
    else await sleep(1500 * (k + 1));
  }
  let out = { id: null, hash: null, failed: !buf };
  if (buf) {
    const hash = createHash('sha1').update(buf).digest('hex').slice(0, 16);
    const { width = 0 } = await sharp(buf).metadata();
    if (width < 80) out = { id: null, hash, icon: true }; // iconos de tipo (físico, técnica…)
    else if (hash in known) out = { id: known[hash], hash, unidentified: known[hash] === null || undefined }; // null: revisado pero sin identificar
    else {
      if (!refs) await loadRefs();
      const f = await feat(buf);
      const best = refs.filter((x) => !color || x.el === color).map((x) => ({ id: x.id, c: corr(f, x.f) })).sort((a, b) => b.c - a.c);
      out = { id: best[0].id, hash, auto: true, score: +best[0].c.toFixed(3) };
      unknown.push({ hash, url: url.replace(/=wd+-hd+$/, ''), guess: best[0].id, score: out.score, second: best[1]?.id });
    }
  }
  ids.set(key, out);
  await sleep(250);
  return out;
}

// ── 3. Equipos ──────────────────────────────────────────────────
const teams = [];
for (let row = 0; row < grid.length; row++) {
  for (let col = 0; col < (grid[row]?.length ?? 0); col++) {
    const m = cell(row, col)?.text?.match(/^MONO (AZUL|ROJO|VERDE|AMARILLO) (RITUAL|F[ÍI]SICO|H[ÍI]BRIDO)/i);
    if (!m) continue;
    // Columnas del bloque: las que tienen rol en la fila siguiente, hasta 12 columnas a la derecha
    const roleRow = row + 1;
    const cols = [];
    for (let c = col; c < col + 12; c++) if (cell(roleRow, c)?.text) cols.push(c);
    const blockCols = cols.slice(0, 5);
    // Fila de titulares: la primera con imágenes en esas columnas
    let mainRow = roleRow + 1;
    while (mainRow < grid.length && !blockCols.some((c) => cell(mainRow, c)?.img)) mainRow++;
    const slots = [];
    for (const c of blockCols) {
      const who = cell(mainRow, c)?.img ? await identify(cell(mainRow, c).img, COLORS[m[1].toUpperCase()]) : null;
      slots.push({ role: cell(roleRow, c).text, id: who?.id ?? null, auto: who?.auto || undefined });
    }
    // Sustitutos: tras la fila «SUSTITUTOS», la de roles y luego las imágenes hasta el siguiente bloque
    let subHead = mainRow + 1;
    while (subHead < grid.length && !grid[subHead]?.some((x, c) => c >= col - 1 && c < col + 12 && /SUSTITUTOS/i.test(x?.text ?? ''))) subHead++;
    const subs = [];
    if (subHead < grid.length) {
      const subRoleRow = subHead + 1;
      for (const c of blockCols) {
        const list = [];
        for (let rr = subRoleRow + 1; rr < grid.length; rr++) {
          if (grid[rr]?.some((x) => /^MONO /i.test(x?.text ?? ''))) break;
          if (cell(rr, c)?.img) { const who = await identify(cell(rr, c).img, COLORS[m[1].toUpperCase()]); if (who.id && !list.some((x) => x.id === who.id)) list.push({ id: who.id, auto: who.auto || undefined }); }
        }
        subs.push({ role: cell(subRoleRow, c)?.text ?? '', ids: list });
      }
    }
    teams.push({ color: COLORS[m[1].toUpperCase()], style: STYLES[m[2].toUpperCase()], title: cell(row, col).text, slots, subs });
  }
}

const failed = [...ids.values()].filter((x) => x.failed).length;
if (teams.length < 6 || failed > 3) {
  console.warn(`⚠ ${teams.length} equipos y ${failed} imágenes sin descargar: se conserva el archivo anterior.`);
  process.exit(0);
}
await writeFile(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), source: URL_PUBLIC, teams, unknownIcons: unknown }, null, 2) + '\n');
console.log(`Mejores equipos: ${teams.length} · iconos nuevos sin confirmar: ${unknown.length}`);
