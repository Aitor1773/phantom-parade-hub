// Tier list de Game8 (npm run data:g8tier, a diario): sustituye a la tier list propia desde el 2026-11-17.
// · Personajes (573071): rango SSS–A con sus puntos clave y memorias recomendadas, los mejores por papel
//   (atacante / mejora / debilitación) para cada color y tipo, las últimas altas y el historial de cambios.
// · Memorias (578118): puntos clave de las memorias SS y S.
// El rango de cada personaje o memoria que no sale en estas páginas se toma de su propia ficha (fetch-game8-*.mjs).
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE, EL, get, sleep, text, imgs, links, tables, rows, sections, subsections } from './fetch-game8-chars.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'data/normalized/game8/tier.json');
const bullets = (html) => text(html).split('\n').map((l) => l.replace(/^・\s*/, '').replace(/^└\s*/, '└ ')).filter(Boolean);
const names = (html) => imgs(html).map((i) => i.alt).filter((a) => /^[「【]/.test(a));

/** Tablas «キャラ | 評価ポイント» con filas de «おすすめ廻想残滓» debajo de cada personaje */
function rankedEntries(html, kind) {
  const out = [];
  for (const t of tables(html)) {
    let last = null;
    for (const r of rows(t)) {
      const head = text(r[0]?.html ?? '');
      if (r.every((c) => c.th) || /^(キャラ|廻想残滓)$/.test(head)) continue;
      if (/おすすめ廻想残滓|相性の良いキャラ/.test(head) && r.length === 1) continue;
      const first = imgs(r[0]?.html ?? '')[0];
      // Fila de ficha = icono + celda de texto (sin imágenes); el resto son filas de iconos relacionados
      if (r.length === 2 && first && text(r[1].html) && !imgs(r[1].html).length) {
        last = { name: first.alt, g8id: links(r[0].html)[0]?.id ?? null, points: bullets(r[1].html), related: [] };
        out.push(last);
      } else if (last) {
        // Fila de memorias recomendadas (personajes) o de personajes afines (memorias)
        last.related.push(...r.flatMap((c) => links(c.html).map((l) => ({ g8id: l.id, name: imgs(c.html)[0]?.alt ?? l.text }))));
      }
    }
  }
  return kind === 'char' ? out.filter((e) => /^[「【]/.test(e.name)) : out;
}

export function parseCharTier(html) {
  const body = html.slice(html.indexOf('<body'));
  const S = sections(body);
  const sec = (re) => S.find((s) => re.test(s.title))?.html ?? '';

  // Rangos con sus puntos clave
  const ranks = {};
  for (const s of subsections(sec(/評価解説/))) {
    const rank = s.title.match(/^(SSS|SS|S|A|B|C)ランク/)?.[1];
    if (rank) ranks[rank] = rankedEntries(s.html, 'char');
  }

  // Mejores por papel: columnas = color, filas = tipo
  const roles = subsections(sec(/ティア表/)).filter((s) => /最強キャラ：/.test(s.title)).map((s) => {
    const rs = rows(tables(s.html)[0] ?? '');
    const cols = (rs[0] ?? []).slice(1).map((c) => EL[imgs(c.html)[0]?.alt] ?? null);
    return {
      title: s.title.replace(/：.*$/, ''),
      rows: rs.slice(1).map((r) => ({ label: text(r[0].html), cells: r.slice(1).map((c, i) => ({ element: cols[i], characters: names(c.html) })) })),
    };
  });

  // Últimas altas e historial
  const fresh = subsections(sec(/新キャラ/));
  const latest = rows(tables(fresh.find((s) => /追加/.test(s.title))?.html ?? '')[0] ?? '')
    .filter((r) => !r.every((c) => c.th)).reduce((acc, r) => {
      const n = names(r[0]?.html ?? '')[0];
      if (n) acc.push({ name: n, release: text(r[0].html).match(/(\d{1,2}\/\d{1,2})実装/)?.[1] ?? null, points: [] });
      else if (acc.length) acc.at(-1).points.push(...bullets(r.map((c) => c.html).join('\n')).filter((p) => p !== '実装後評価'));
      return acc;
    }, []);
  const history = rows(tables(fresh.find((s) => /履歴/.test(s.title))?.html ?? '')[0] ?? '')
    .filter((r) => !r.every((c) => c.th) && r.length >= 2)
    .map((r) => ({ date: text(r[0].html).match(/\d{4}\/\d{1,2}\/\d{1,2}/)?.[0]?.replace(/\//g, '-') ?? text(r[0].html), changes: bullets(r[1].html) }));

  // Criterios de cada rango
  const crit = subsections(sec(/評価基準/));
  const criteria = rows(tables(crit[0]?.html ?? '')[0] ?? '').filter((r) => r.length >= 2 && !text(r[0].html).includes('ランク'))
    .map((r) => ({ rank: imgs(r[0].html)[0]?.alt?.match(/SSS|SS|S|A|B|C/)?.[0] ?? text(r[0].html), text: bullets(r[1].html) }));

  return { ranks, roles, latest, history, criteria };
}

export function parseMemoryTier(html) {
  const body = html.slice(html.indexOf('<body'));
  const S = sections(body);
  const ranks = {};
  for (const s of subsections(S.find((x) => /評価解説/.test(x.title))?.html ?? '')) {
    const rank = s.title.match(/(SSS|SS|S|A|B)ランク/)?.[1];
    if (rank) ranks[rank] = rankedEntries(s.html, 'memory');
  }
  return { ranks };
}

async function main() {
  const out = { source: 'Game8', fetchedAt: new Date().toISOString(), characters: null, memories: null };
  const ch = await get(BASE + '573071');
  await sleep(2000);
  const mem = await get(BASE + '578118');
  if (!ch || !mem) { console.warn('fetch-game8-tier: Game8 no responde; se conservan los datos de ayer'); return; }
  out.characters = { url: BASE + '573071', ...parseCharTier(ch) };
  out.memories = { url: BASE + '578118', ...parseMemoryTier(mem) };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out, null, 1) + '\n');
  const n = (r) => Object.values(r).reduce((a, x) => a + x.length, 0);
  console.log(`fetch-game8-tier: ${n(out.characters.ranks)} personajes con puntos clave, ${n(out.memories.ranks)} memorias, ${out.characters.history.length} cambios`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(0); });
