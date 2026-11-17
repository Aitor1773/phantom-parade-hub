// Personajes desde Game8 (npm run data:g8chars, a diario). Game8 es la fuente principal de la web
// desde el 2026-11-17 (permiso total desde el 2026-10-20; ver docs/EMAILS_PERMISO.md, citado en Créditos).
//
// Lee la lista de personajes y la ficha de cada uno: datos básicos, estadísticas al máximo, despertar,
// habilidades (comando, especial y combinado, automáticas, potencial), prioridad de mejora, valoraciones,
// puntos fuertes y débiles, memorias y equipos recomendados, cómo conseguirlo e imágenes.
// Todo se guarda en japonés en data/normalized/game8/characters.json; la traducción va aparte
// (scripts/data/translate.mjs) y la web enlaza cada ficha con su id por data/manual/jp-names.json.
// Respeta robots.txt (no lee comentarios ni ?page=) y espera 2 s entre páginas.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'data/normalized/game8/characters.json');
const BASE = 'https://game8.jp/jujutsuphanpara/';
const LIST = '572997';
const UA = 'PhantomParadeHub-chars/1.0 (fan site; daily, low-rate; +https://phantom-parade-hub.pages.dev/en/credits/)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EL = { '幻': 'red', '影': 'blue', '夜': 'green', '行': 'yellow' };
const FOCUS = { '体術': 'taijutsu', '体': 'taijutsu', '術式': 'jujutsu', '術': 'jujutsu', '複合': 'hybrid', '複': 'hybrid' };
const ROLE = { '攻撃': 'attack', '防衛': 'defense', '強化': 'buff', '弱体': 'debuff', '妨害': 'disrupt', '回復': 'heal' };
const RANKS = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D'];

async function get(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
    } catch { /* se reintenta */ }
    await sleep(4000 * (i + 1));
  }
  return null;
}

// ── Utilidades de HTML ────────────────────────────────────────────────
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
/** Texto plano: <br>, <hr> y bloques pasan a saltos de línea */
export const text = (html = '') => decode(html
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, '')
  .replace(/<br\b[^>]*>|<hr\b[^>]*>|<\/(p|div|li|tr|h\d)>/gi, '\n')
  .replace(/<[^>]+>/g, ''))
  .split('\n').map((l) => l.replace(/[ \t　]+/g, ' ').trim()).filter(Boolean).join('\n');
const imgs = (html = '') => [...html.matchAll(/<img\b[^>]*>/g)].map((m) => ({
  alt: decode(m[0].match(/alt="([^"]*)"/)?.[1] ?? '').replace(/(の画像|画像)$/, ''),
  src: (m[0].match(/data-src="([^"]+)"/) ?? m[0].match(/\ssrc="(https[^"]+)"/))?.[1]?.replace(/\/show$/, '/original') ?? null,
}));
const links = (html = '') => [...html.matchAll(/<a\b[^>]*href="(?:https:\/\/game8\.jp)?\/jujutsuphanpara\/(\d+)"[^>]*>([\s\S]*?)<\/a>/g)]
  .map((m) => ({ id: m[1], text: text(m[2]), img: imgs(m[2])[0] ?? null }));
const tables = (html = '') => [...html.matchAll(/<table\b[\s\S]*?<\/table>/g)].map((m) => m[0]);
const rows = (table) => [...table.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map((r) =>
  [...r[0].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((c) => ({ th: c[1] === 'th', html: c[2] })));

/** Trozos de la página: cada <h2> con su HTML hasta el siguiente <h2> */
function sections(body) {
  const out = [];
  const re = /<h2\b[^>]*>([\s\S]*?)<\/h2>/g;
  let m, last = null;
  while ((m = re.exec(body))) {
    if (last) last.html = body.slice(last.start, m.index);
    last = { title: text(m[1]), start: re.lastIndex };
    out.push(last);
  }
  if (last) last.html = body.slice(last.start);
  return out;
}
/** Dentro de un trozo: cada <h3> con su HTML */
function subsections(html) {
  const parts = html.split(/<h3\b[^>]*>/);
  return parts.slice(1).map((p) => {
    const i = p.indexOf('</h3>');
    return { title: text(p.slice(0, i)), html: p.slice(i + 5) };
  });
}
const rankOf = (html) => imgs(html).map((i) => i.alt).find((a) => RANKS.includes(a)) ?? null;
/** Párrafos de texto corrido (sin tablas ni enlaces de «ver más») */
const paras = (html) => [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => text(m[1])).filter((t) => t && !t.startsWith('▶'));

// ── Ficha de un personaje ─────────────────────────────────────────────
export function parseCharacter(html) {
  const body = html.slice(html.indexOf('<body'));
  const S = sections(body);
  // Las fichas antiguas (R/SR de 2023) usan otros títulos: se prueba cada variante en orden
  const part = (...suffixes) => suffixes.map((x) => S.find((s) => s.title.endsWith(x))?.html).find(Boolean) ?? '';

  // Datos básicos: cabeceras y valores en filas alternas, o pares cabecera/valor en la misma fila.
  // Si hay estadísticas sin despertar (無凸) y al máximo (完凸 / 5凸), mandan las del máximo.
  const status = part('のステータス', 'の性能');
  const statusSubs = subsections(status);
  const ordered = statusSubs.length
    ? [...statusSubs.filter((s) => !s.title.includes('無凸')), ...statusSubs.filter((s) => s.title.includes('無凸'))].map((s) => s.html)
    : [status];
  const info = {};
  for (const t of ordered.flatMap(tables)) {
    const rs = rows(t);
    for (let i = 0; i < rs.length; i++) {
      const r = rs[i];
      if (r.every((c) => c.th) && rs[i + 1] && !rs[i + 1].every((c) => c.th)) r.forEach((c, k) => { if (rs[i + 1][k]) info[text(c.html)] ??= rs[i + 1][k].html; });
      else for (let k = 0; k + 1 < r.length; k++) if (r[k].th && !r[k + 1].th) info[text(r[k].html)] ??= r[k + 1].html;
    }
  }
  const num = (k) => { const t = text(info[k] ?? '').replace(/[^\d.]/g, ''); return t ? Number(t) : null; };
  const word = (k) => text(info[k] ?? '').split('\n')[0] || null;

  // Despertar
  const awakeTable = tables(status + part('の覚醒')).find((t) => /連携必殺の効果/.test(t) && /Lv\.\d/.test(t));
  const awakening = awakeTable ? rows(awakeTable).filter((r) => /Lv\.\d/.test(text(r[0]?.html))).map((r) => ({
    lv: Number(text(r[0].html).replace(/\D/g, '')),
    stats: text(r[1]?.html),
    combo: text(r[2]?.html),
  })) : [];

  // Habilidades
  const sub = subsections(part('のスキルと強化優先度', 'のスキル'));
  const skillRows = (title) => {
    const h = sub.find((s) => s.title.includes(title))?.html ?? '';
    const t = tables(h)[0] ?? '';
    return rows(t).filter((r) => r.length >= 2 && r[0].th).map(([th, td]) => {
      const [main, combo] = td.html.split(/<b\b[^>]*>\s*連携必殺効果\s*<\/b>/);
      const effect = text((main ?? '').replace(/^[\s\S]*?<b\b[^>]*>\s*効果\s*<\/b>/, ''));
      const element = imgs(td.html.split(/<b\b[^>]*>\s*効果/)[0]).map((i) => EL[i.alt]).find(Boolean) ?? null;
      return { name: text(th.html), img: imgs(th.html)[0]?.src ?? null, element, effect, ...(combo ? { combo: text(combo) } : {}) };
    });
  };
  const command = skillRows('コマンドスキル');
  const prioTable = tables(sub.find((s) => s.title.includes('優先度'))?.html ?? '')[0];
  const priority = {};
  if (prioTable) {
    const rs = rows(prioTable).filter((r) => r.length >= 2 && !r[0].th);
    const names = rs[0]?.map((c) => text(c.html).split('\n').at(-1)) ?? [];
    const stars = rs[1]?.map((c) => (text(c.html).match(/★/g) ?? []).length) ?? [];
    names.forEach((n, i) => { priority[n.includes('必殺') ? 'ult' : `s${n.replace(/\D/g, '')}`] = stars[i] ?? null; });
  }

  // Valoraciones
  const evalHtml = part('の評価');
  const evalTable = tables(evalHtml)[0] ?? '';
  const er = rows(evalTable);
  const ratings = { overall: rankOf(er.slice(0, 2).flat().map((c) => c.html).join('')) };
  const heads = er.find((r) => r.length >= 3 && r.every((c) => c.th));
  if (heads) {
    const vals = er[er.indexOf(heads) + 1] ?? [];
    const KEY = { 'オート': 'auto', '高難度': 'hard', 'リセマラ': 'reroll' };
    heads.forEach((c, i) => { const k = KEY[text(c.html)]; if (k) ratings[k] = rankOf(vals[i]?.html ?? ''); });
  }
  // Fichas antiguas: pares cabecera/valor (レア度, 最強評価, リセマラ評価, オート性能, 入手方法)
  const evalInfo = {};
  for (const r of er) for (let k = 0; k + 1 < r.length; k++) if (r[k].th && !r[k + 1].th) evalInfo[text(r[k].html)] ??= r[k + 1].html;
  ratings.overall ??= rankOf(evalInfo['最強評価'] ?? '');
  ratings.reroll ??= rankOf(evalInfo['リセマラ評価'] ?? '');
  ratings.auto ??= rankOf(evalInfo['オート性能'] ?? '');
  const summary = text((evalHtml.match(/簡易性能を見る<\/button>([\s\S]*?)<\/table>/) ?? [])[1] ?? '')
    .split('\n').map((l) => l.replace(/^・\s*/, '').replace(/^└\s*/, '└ ')).filter(Boolean);

  // Puntos fuertes y débiles
  const prosHtml = part('の強い点／弱い点', 'の使い方と強い点／弱い点', 'の使い方や解説');
  const pros = [], cons = [];
  for (const d of (tables(prosHtml)[0] ?? '').split(/<hr\b[^>]*>/)) {
    const t = text(d);
    if (t) (/alt="低評価/.test(d) ? cons : pros).push(t);
  }
  const review = subsections(prosHtml).map((s) => ({ title: s.title, text: paras(s.html) })).filter((s) => s.title);

  // Memorias recomendadas
  const memHtml = part('のおすすめ廻想残滓');
  const memories = tables(memHtml).flatMap((t) => rows(t).filter((r) => r.length >= 2 && !r[0].th).map(([a, b]) => {
    const l = links(a.html)[0];
    return l ? { g8id: l.id, name: l.text || l.img?.alt, points: text(b.html).split('\n').filter((x) => !/評価ポイント/.test(x)).map((x) => x.replace(/^・/, '')) } : null;
  }).filter(Boolean));

  // Equipos recomendados
  const teams = subsections(part('のおすすめパーティー編成')).map((s) => {
    const t = tables(s.html)[0];
    if (!t) return null;
    // El orden de las filas cambia entre fichas: se busca cada fila por su contenido.
    // Personajes = imágenes «「epíteto」nombre»; papeles = fila de cabecera justo antes; memorias = la fila de después con enlaces
    const rs = rows(t);
    const isChar = (r) => r.some((c) => imgs(c.html).some((i) => /^[「【]/.test(i.alt)));
    const mi = rs.findIndex(isChar);
    if (mi < 0) return null;
    const head = rs[mi - 1];
    const roles = head && head.every((c) => c.th) ? head.map((c) => text(c.html)).map((r) => (/^[↑↓]*$/.test(r) ? null : r)) : [];
    const members = rs[mi].map((c, i) => ({
      g8id: links(c.html)[0]?.id ?? null, name: imgs(c.html)[0]?.alt ?? text(c.html), role: roles[i] ?? null,
    }));
    const memRow = rs.find((r, i) => i > mi && !r.some((c) => c.th) && !isChar(r) && r.some((c) => links(c.html).length));
    const mems = (memRow ?? []).map((c) => { const l = links(c.html)[0]; return l ? { g8id: l.id, name: imgs(c.html)[0]?.alt ?? l.text } : null; });
    return { title: s.title, members, memories: mems, note: paras(s.html.split('</table>').slice(1).join('</table>')) };
  }).filter((t) => t && t.members.length);

  // Cómo conseguirlo y potencial
  const blocks = (suffix) => subsections(part(suffix)).map((s) => ({ title: s.title, text: paras(s.html) }));

  // Nombre: el texto alternativo de la imagen grande, «「epíteto」nombre»
  const artImg = imgs(status).find((i) => /^[「【]/.test(i.alt));
  const full = (artImg?.alt ?? imgs(evalTable)[0]?.alt ?? '').replace(/のキャラ$/, '').trim();
  const nm = full.match(/^「(.+?)」(.+)$/) ?? full.match(/^【(.+?)】(.+)$/);

  // Fichas antiguas: «攻撃｜役割» con iconos (術｜攻撃) y el color en «コマンド特性»
  const typeAlts = imgs(info['攻撃｜役割'] ?? '').map((i) => i.alt);

  return {
    full,
    epithet: nm?.[1] ?? null,
    name: nm?.[2] ?? full,
    rarity: word('レアリティ') ?? word('レア度') ?? (text(evalInfo['レア度'] ?? '').match(/SSR|SR|R/)?.[0] ?? null),
    element: EL[word('特性')] ?? EL[word('コマンド特性')] ?? EL[imgs(info['コマンド特性'] ?? '')[0]?.alt] ?? null,
    affiliation: word('特徴'),
    focus: FOCUS[word('攻撃タイプ')] ?? typeAlts.map((a) => FOCUS[a]).find(Boolean) ?? null,
    roles: [...text(info['役割'] ?? '').split('\n').map((r) => ROLE[r]), ...typeAlts.map((a) => ROLE[a])].filter(Boolean),
    obtain: word('入手方法') ?? (text(evalInfo['入手方法'] ?? '').replace(/で入手$/, '') || null),
    special: text(info['特殊'] ?? '') || null,
    stats: {
      hp: num('HP'), attack: num('体術'), jujutsu: num('術式'),
      ceInitial: num('初期呪力'), ceMax: num('最大呪力'), specialGauge: num('必殺ゲージ') ?? num('必殺ゲージ量'),
    },
    awakening,
    skills: {
      s1: command[0] ?? null, s2: command[1] ?? null, s3: command[2] ?? null,
      ult: skillRows('必殺')[0] ?? null, autos: skillRows('オートスキル'), potential: skillRows('潜在解放'),
    },
    priority,
    ratings,
    summary,
    pros, cons, review,
    memories, memoryNote: paras(memHtml),
    teams,
    acquisition: blocks('の入手方法'),
    potentialTips: blocks('の潜在解放'),
    images: { art: artImg?.src ?? null, icon: imgs(evalTable)[0]?.src ?? null },
    modified: html.match(/"dateModified":"([^"]+)"/)?.[1] ?? null,
  };
}

/** Lista de personajes: cada enlace con imagen «「epíteto」nombre» */
export function parseList(html) {
  const out = new Map();
  for (const l of links(html)) {
    const alt = l.img?.alt ?? '';
    if (/^[「【].+[」】].+/.test(alt) && !out.has(l.id)) out.set(l.id, alt);
  }
  return out;
}

async function main() {
  const listHtml = await get(BASE + LIST);
  if (!listHtml) { console.warn('fetch-game8-chars: la lista no responde; se conservan los datos de ayer'); return; }
  const list = parseList(listHtml);
  const prev = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : { characters: {} };
  const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a)); // para probar: ids concretos
  const characters = {};
  let fails = 0;
  for (const [id, alt] of list) {
    if (only.length && !only.includes(id)) { if (prev.characters[id]) characters[id] = prev.characters[id]; continue; }
    const html = await get(BASE + id);
    await sleep(2000);
    if (!html) { fails++; if (prev.characters[id]) characters[id] = prev.characters[id]; continue; }
    try {
      const c = parseCharacter(html);
      // En sus propios equipos el personaje aparece sin enlace
      for (const t of c.teams) for (const m of t.members) if (!m.g8id && m.name === c.full) m.g8id = id;
      characters[id] = { g8id: id, url: BASE + id, listName: alt, ...c };
    } catch (e) {
      fails++;
      console.warn(`fetch-game8-chars: ${id} (${alt}) no se pudo leer: ${e.message}`);
      if (prev.characters[id]) characters[id] = prev.characters[id];
    }
  }
  if (!only.length && list.size && fails / list.size > 0.3) {
    console.warn(`fetch-game8-chars: ${fails}/${list.size} fichas sin respuesta; se conserva ${OUT}`);
    return;
  }
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({ source: 'Game8', url: BASE + LIST, fetchedAt: new Date().toISOString(), characters }, null, 1) + '\n');
  console.log(`fetch-game8-chars: ${Object.keys(characters).length} personajes (${fails} fallos)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(0); });
