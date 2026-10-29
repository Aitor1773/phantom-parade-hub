// Fichas de fases al día (npm run data:stages, a diario). Para cada fase de data/manual/stages.json
// vuelve a leer su página de la fuente (Game8, con permiso desde el 2026-10-20) y:
//   · actualiza lo que se puede leer sin traducir: poder recomendado y colores recomendados/desfavorables
//     → data/normalized/stage-live.json (la web lo pone encima de la ficha manual);
//   · marca las fichas cuya página ha cambiado desde que se transcribieron (enemigos, guía…);
//   · busca en las páginas índice (torre, torre «Anomalous Form», jefes) fases nuevas que aún no tenemos.
// Si hay algo que revisar, escribe un resumen en Markdown en la ruta de STAGE_REVIEW_OUT (el flujo diario
// de GitHub lo publica como aviso en una incidencia del repositorio).
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const STAGES = join(ROOT, 'data/manual/stages.json');
const OUT = join(ROOT, 'data/normalized/stage-live.json');
const UA = 'PhantomParadeHub-stages/1.0 (fan site; daily, low-rate; +https://phantom-parade-hub.pages.dev/en/credits/)';
const BASE = 'https://game8.jp/jujutsuphanpara/';
/** Páginas índice con la lista de fases de cada contenido */
const HUBS = { 'illusory-tower': '613593', 'illusory-tower-diverse': '801919', 'formidable-foe-back': '795601' };
const EL = { '幻': 'red', '影': 'blue', '夜': 'green', '行': 'yellow' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) return await res.text();
    } catch { /* se reintenta */ }
    await sleep(4000);
  }
  return null;
}

/** Colores (幻影夜行) de un trozo de texto, en orden y sin repetir */
const els = (txt) => [...new Set([...(txt ?? '').matchAll(/[幻影夜行]/g)].map((m) => EL[m[0]]))];

/**
 * Poder y colores de la tabla de la fase. Las páginas tienen formatos distintos, así que se lee el texto
 * (las imágenes de color pasan a su nombre). Si la página da varios poderes distintos (varias
 * dificultades, cambios anunciados…), no se toma ninguno: mejor la ficha manual que un dato equivocado.
 */
export function parse(html) {
  const body = html.slice(html.indexOf('<body'))
    .replace(/<img[^>]*alt="([幻影夜行])画像"[^>]*>/g, ' $1 ')
    .replace(/<img[^>]*>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
  const powers = [...new Set([...body.matchAll(/推奨戦力 (\d{1,3}(?:,\d{3})+|\d{4,})(?!\s*→)/g)].map((m) => Number(m[1].replace(/,/g, ''))))];
  const one = powers.length === 1;
  // Colores: lo que hay entre la etiqueta y la siguiente etiqueta de la tabla
  const after = (label) => body.match(new RegExp(`${label} ((?:[幻影夜行] ?)+)`))?.[1];
  return {
    power: one ? powers[0] : null,
    recommended: one ? els(after('推奨特性')) : [],
    unfavorable: one ? els(after('不利特性')) : [],
    modified: html.match(/"dateModified":"([^"]+)"/)?.[1] ?? null,
  };
}

const same = (a = [], b = []) => [...a].sort().join() === [...b].sort().join();

async function main() {
  const stages = JSON.parse(await readFile(STAGES, 'utf8')).stages;
  const prev = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : { stages: {} };
  const out = {};
  const changed = [];
  let fails = 0, total = 0;

  for (const [key, s] of Object.entries(stages)) {
    if (!s.url?.startsWith(BASE)) continue;
    total++;
    const html = await get(s.url);
    await sleep(2000);
    if (!html) { fails++; if (prev.stages[key]) out[key] = prev.stages[key]; continue; }
    const p = parse(html);
    out[key] = {
      ...(p.power ? { power: p.power } : {}),
      ...(p.recommended.length ? { recommended: p.recommended } : {}),
      ...(p.unfavorable.length ? { unfavorable: p.unfavorable } : {}),
      modified: p.modified,
    };
    // La página cambió después de transcribir la ficha: hay que revisar enemigos y guía
    const why = [];
    if (p.modified && s.checked && p.modified.slice(0, 10) > s.checked) why.push(`página actualizada el ${p.modified.slice(0, 10)}`);
    if (p.power && s.power && p.power !== s.power) why.push(`poder ${s.power} → ${p.power}`);
    if (p.recommended.length && !same(p.recommended, s.recommended)) why.push(`recomendados ${(s.recommended ?? []).join('/') || '—'} → ${p.recommended.join('/')}`);
    if (why.length) changed.push({ key, name: s.name ?? key, url: s.url, why });
  }

  // Fases nuevas: enlaces de las tablas de las páginas índice que no están en nuestras fichas
  const known = new Set(Object.values(stages).map((s) => s.url));
  const fresh = [];
  for (const [content, id] of Object.entries(HUBS)) {
    const html = await get(BASE + id);
    await sleep(2000);
    if (!html) continue;
    for (const t of html.matchAll(/<table class="a-table[\s\S]*?<\/table>/g)) {
      const head = t[0].match(/<th[^>]*>([^<]*)<\/th>/)?.[1] ?? '';
      if (!/階層|敵/.test(head)) continue;
      for (const m of t[0].matchAll(/href="(?:https:\/\/game8\.jp)?\/jujutsuphanpara\/(\d+)"[^>]*>(?:<img[^>]*alt="([^"]*)"[^>]*>)?([^<]*)/g)) {
        const url = BASE + m[1];
        const title = (m[3] || m[2] || '').replace(/の画像$/, '').trim();
        // Solo enlaces a pisos o jefes (las mismas tablas enlazan también a los personajes recomendados)
        if (!/階層|強敵.*[（(]|疱瘡/.test(title) || known.has(url) || fresh.some((f) => f.url === url)) continue;
        fresh.push({ content, url, title });
      }
    }
  }

  // Si la fuente no responde, se conservan los datos de ayer
  if (total && fails / total > 0.3) {
    console.warn(`check-stages: ${fails}/${total} páginas sin respuesta; se conserva ${OUT}`);
    return;
  }
  await writeFile(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), stages: out, changed, fresh }, null, 1) + '\n');
  console.log(`check-stages: ${Object.keys(out).length} fases al día, ${changed.length} por revisar, ${fresh.length} nuevas`);

  if (process.env.STAGE_REVIEW_OUT && (changed.length || fresh.length)) {
    const md = [
      'El aviso diario ha detectado fichas de fases que conviene revisar. El poder recomendado y los colores ya se actualizan solos; lo de abajo necesita revisar a mano enemigos y guía en `data/manual/stages.json`.',
      '',
      ...(fresh.length ? ['### Fases nuevas en la fuente', '', ...fresh.map((f) => `- [ ] ${f.content}: [${f.title || f.url}](${f.url})`), ''] : []),
      ...(changed.length ? ['### Fichas cuya página ha cambiado', '', ...changed.map((c) => `- [ ] \`${c.key}\` ${c.name} — ${c.why.join('; ')} ([fuente](${c.url}))`), ''] : []),
      `_Comprobado el ${new Date().toISOString().slice(0, 10)}._`,
    ].join('\n');
    await writeFile(process.env.STAGE_REVIEW_OUT, md);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(0); });
