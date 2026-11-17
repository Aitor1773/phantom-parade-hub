// Guías de recomendaciones de Game8 (npm run data:g8guides, a diario): reroll, ticket de SSR, ranking de SR,
// mejores de rareza baja y personajes que pasan al gacha permanente. Todas siguen el mismo patrón
// (apartados con tablas «personaje o memoria | rango | puntos clave» y texto), así que las lee un solo lector.
// Resultado en japonés en data/normalized/game8/guides.json; se traduce aparte (scripts/data/translate.mjs).
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE, RANKS, get, sleep, text, imgs, links, tables, rows, sections, subsections, paras } from './fetch-game8-chars.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'data/normalized/game8/guides.json');
/** Páginas que se leen (id de la web → id de Game8) */
export const GUIDES = { reroll: '573060', ticket: '578064', sr: '578742', lowrarity: '578797', standard: '635597' };
/** Apartados de pie de página que no son contenido */
const SKIP = /関連記事|【PR】|コメント|攻略メンバー|人気ゲーム|おすすめゲーム|^ランキング$|攻略メニュー|新作ゲーム|権利表記|お知らせ|掲示板/;
const bullets = (html) => text(html).split('\n').map((l) => l.replace(/^・\s*/, '').replace(/^└\s*/, '└ ')).filter((l) => l && l !== '-' && !l.startsWith('▶'));
const isNamed = (alt) => /^[「【]/.test(alt);

/** Filas «icono | (rango) | texto» de una tabla; también tablas solo de iconos (listas de personajes) */
function entries(table) {
  const out = [];
  for (const r of rows(table)) {
    if (r.every((c) => c.th)) continue;
    const first = imgs(r[0]?.html ?? '')[0];
    const rest = r.slice(1);
    // Ficha = icono enlazado + al menos una celda de texto sin imágenes (las filas de solo iconos son listas)
    const textCells = rest.filter((c) => text(c.html) && !imgs(c.html).length);
    if (first && links(r[0].html).length && textCells.length) {
      const rank = rest.map((c) => imgs(c.html).map((i) => i.alt).find((a) => RANKS.includes(a))).find(Boolean) ?? null;
      const last = { name: first.alt, g8id: links(r[0].html)[0]?.id ?? null, rank, points: textCells.flatMap((c) => bullets(c.html)), related: [] };
      out.push(last);
    } else {
      const icons = r.flatMap((c) => imgs(c.html).filter((i) => !RANKS.includes(i.alt)).map((i) => ({ name: i.alt, g8id: links(c.html)[0]?.id ?? null })));
      // Iconos de personajes = lista (cada uno es una entrada); de memorias tras una ficha = sus memorias recomendadas
      // Rango de la fila (cabecera con el icono o el texto del rango), en los cuadros resumen por rangos
      const rankOfLabel = (s) => s.match(/^(SSS|SS|S|A|B|C|D)(のアイコン|ランク)?$/)?.[1] ?? null;
      const rowRank = r.filter((c) => c.th).map((c) => imgs(c.html).map((i) => rankOfLabel(i.alt)).find(Boolean) ?? rankOfLabel(text(c.html))).find(Boolean) ?? null;
      if (icons.some((i) => isNamed(i.name))) for (const i of icons) { if (isNamed(i.name)) out.push({ ...i, rank: rowRank, points: [], related: [] }); }
      else if (out.length && icons.length) out.at(-1).related.push(...icons);
    }
  }
  return out;
}

export function parseGuide(html) {
  const body = html.slice(html.indexOf('<body'));
  const title = text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '').replace(/^【ファンパレ】/, '').replace(/【[^】]*】$/, '');
  const out = [];
  for (const s of sections(body)) {
    if (SKIP.test(s.title)) continue;
    const subs = subsections(s.html);
    const blocks = (subs.length ? subs : [{ title: null, html: s.html }]).map((x) => ({
      title: x.title,
      entries: tables(x.html).flatMap(entries),
      text: paras(x.html).filter((p) => p.length > 8),
    })).filter((b) => b.entries.length || b.text.length);
    if (blocks.length) out.push({ title: s.title, blocks });
  }
  return { title, sections: out, modified: html.match(/"dateModified":"([^"]+)"/)?.[1] ?? null };
}

async function main() {
  const guides = {};
  for (const [key, id] of Object.entries(GUIDES)) {
    const html = await get(BASE + id);
    await sleep(2000);
    if (!html) { console.warn(`fetch-game8-guides: ${key} no responde`); continue; }
    guides[key] = { url: BASE + id, ...parseGuide(html) };
  }
  if (Object.keys(guides).length < Object.keys(GUIDES).length / 2) { console.warn('fetch-game8-guides: Game8 no responde; se conservan los datos de ayer'); return; }
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({ source: 'Game8', fetchedAt: new Date().toISOString(), guides }, null, 1) + '\n');
  const n = Object.values(guides).reduce((a, g) => a + g.sections.flatMap((s) => s.blocks).reduce((b, x) => b + x.entries.length, 0), 0);
  console.log(`fetch-game8-guides: ${Object.keys(guides).length} guías, ${n} recomendaciones`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(0); });
