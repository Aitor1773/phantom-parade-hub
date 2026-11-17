// Memorias (廻想残滓) desde Game8 (npm run data:g8memories, a diario). Fuente principal desde el 2026-11-17
// (permiso total desde el 2026-10-20; citado en Créditos).
// De la lista: rareza, valoración y estadísticas. De cada ficha: valoraciones (al máximo y en automático),
// cómo conseguirla, personajes recomendados por uso, habilidad activa (con su espera) y automática,
// estadísticas con y sin límite roto, e imagen. Todo en japonés en data/normalized/game8/memories.json;
// se enlaza con la web por data/manual/jp-memories.json (nombre japonés → id) y se traduce aparte.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE, get, sleep, text, imgs, links, tables, rows, sections, subsections, rankOf, paras } from './fetch-game8-chars.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'data/normalized/game8/memories.json');
const LIST = '572998';

/** Lista: tablas «キャラ | 最強評価 | 最大ステ», una por rareza (SSR, SR, R) */
export function parseMemoryList(html) {
  const body = html.slice(html.indexOf('<body'));
  const out = new Map();
  const RAR = ['SSR', 'SR', 'R'];
  let k = 0;
  for (const t of tables(body)) {
    const rs = rows(t);
    if (!/最強評価/.test(text(rs[0]?.map((c) => c.html).join('|') ?? ''))) continue;
    const rarity = RAR[k++] ?? null;
    for (const r of rs.slice(1)) {
      const l = links(r[0]?.html ?? '')[0];
      if (!l || out.has(l.id)) continue;
      out.set(l.id, { g8id: l.id, name: l.img?.alt || l.text, rarity, rank: rankOf(r[1]?.html ?? ''), icon: l.img?.src ?? null });
    }
  }
  return out;
}

const pct = (s) => { const m = (s ?? '').match(/([\d.]+)\s*[%％]/); return m ? Number(m[1]) : null; };

export function parseMemory(html) {
  const body = html.slice(html.indexOf('<body'));
  const S = sections(body);
  const part = (...suffixes) => suffixes.map((x) => S.find((s) => s.title.endsWith(x))?.html).find(Boolean) ?? '';

  // Valoración: pares cabecera/valor
  const evalTable = tables(part('の評価'))[0] ?? '';
  const ev = {};
  for (const r of rows(evalTable)) for (let k = 0; k + 1 < r.length; k++) if (r[k].th && !r[k + 1].th) ev[text(r[k].html)] ??= r[k + 1].html;
  const ratings = { overall: rankOf(ev['完凸評価'] ?? ev['最強評価'] ?? ''), auto: rankOf(ev['オート評価'] ?? '') };

  // Personajes recomendados, agrupados por motivo (<h4>)
  const charLinks = (h) => links(h).filter((l) => /^[「【]/.test(l.img?.alt ?? '')).map((l) => ({ g8id: l.id, name: l.img.alt }));
  const pairHtml = part('の相性のいいキャラ', 'のおすすめキャラ');
  const groups = [];
  for (const chunk of pairHtml.split(/<h4\b[^>]*>/).slice(1)) {
    const i = chunk.indexOf('</h4>');
    const members = charLinks(tables(chunk.slice(i))[0] ?? '');
    if (members.length) groups.push({ title: text(chunk.slice(0, i)), characters: members });
  }
  if (!groups.length) {
    const members = charLinks(pairHtml);
    if (members.length) groups.push({ title: null, characters: members });
  }

  // Habilidades y estadísticas
  const sub = subsections(part('のスキルとステータス', 'の性能', 'のスキル'));
  const block = (re) => {
    const s = sub.find((x) => re.test(x.title));
    if (!s) return null;
    const rs = rows(tables(s.html)[0] ?? '');
    const head = text(rs.filter((r) => r.every((c) => c.th)).flat().map((c) => c.html).join(''));
    const cd = head.match(/クールタイム[：:]\s*(\d+)/)?.[1];
    const effect = rs.filter((r) => !r.every((c) => c.th)).map((r) => text(r.map((c) => c.html).join('\n'))).join('\n');
    return { cooldown: cd ? Number(cd) : null, effect };
  };
  const statSub = sub.find((x) => x.title.endsWith('のステータス'));
  const stats = { max: {}, base: {}, maxLevel: null, baseLevel: null };
  let tags = [];
  if (statSub) {
    const rs = rows(tables(statSub.html)[0] ?? '');
    const KEY = { 'HP': 'hp', '体術': 'taijutsu', '術式': 'jujutsu' };
    for (const r of rs) {
      const k = KEY[text(r[0]?.html ?? '')];
      if (k && r.length >= 3) { stats.max[k] = pct(text(r[1].html)); stats.base[k] = pct(text(r[2].html)); }
    }
    tags = text(rs.at(-1)?.map((c) => c.html).join('') ?? '').split('\n').filter((l) => l && !/^【/.test(l));
    const lv = [...text(rs[0]?.map((c) => c.html).join('|') ?? '').matchAll(/Lv\.(\d+)/g)].map((m) => Number(m[1]));
    stats.maxLevel = lv[0] ?? null;
    stats.baseLevel = lv[1] ?? null;
  }

  return {
    ratings,
    rarity: text(ev['レアリティ'] ?? '').match(/SSR|SR|R/)?.[0] ?? null,
    obtain: text(ev['入手方法'] ?? '').replace(/で入手$/, '') || null,
    groups,
    active: block(/^【廻想】/),
    auto: block(/^【オート】/),
    stats,
    tags,
    image: imgs(evalTable)[0]?.src ?? null,
    modified: html.match(/"dateModified":"([^"]+)"/)?.[1] ?? null,
  };
}

async function main() {
  const listHtml = await get(BASE + LIST);
  if (!listHtml) { console.warn('fetch-game8-memories: la lista no responde; se conservan los datos de ayer'); return; }
  const list = parseMemoryList(listHtml);
  const prev = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : { memories: {} };
  const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a));
  const memories = {};
  let fails = 0;
  for (const [id, row] of list) {
    if (only.length && !only.includes(id)) { if (prev.memories[id]) memories[id] = prev.memories[id]; continue; }
    const html = await get(BASE + id);
    await sleep(2000);
    if (!html) { fails++; if (prev.memories[id]) memories[id] = prev.memories[id]; continue; }
    try {
      const m = parseMemory(html);
      memories[id] = { ...row, url: BASE + id, ...m, rarity: m.rarity ?? row.rarity, ratings: { ...m.ratings, overall: m.ratings.overall ?? row.rank } };
    } catch (e) {
      fails++;
      console.warn(`fetch-game8-memories: ${id} (${row.name}) no se pudo leer: ${e.message}`);
      if (prev.memories[id]) memories[id] = prev.memories[id];
    }
  }
  if (!only.length && list.size && fails / list.size > 0.3) {
    console.warn(`fetch-game8-memories: ${fails}/${list.size} fichas sin respuesta; se conserva ${OUT}`);
    return;
  }
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({ source: 'Game8', url: BASE + LIST, fetchedAt: new Date().toISOString(), memories }, null, 1) + '\n');
  console.log(`fetch-game8-memories: ${Object.keys(memories).length} memorias (${fails} fallos)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(0); });
