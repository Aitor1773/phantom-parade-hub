#!/usr/bin/env node
// Descarga personajes y memorias de la JJK Phantom Parade Wiki (Fandom, CC BY-SA 3.0)
// usando la API pública de MediaWiki, y genera:
//   data/raw/wiki/*.json          → copia en bruto (no se sube a git)
//   data/normalized/wiki/*.json   → formato común que usa el comparador
//
// Uso: npm run data:fetch                (todo)
//      npm run data:fetch -- --limit 5   (prueba rápida)

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findTemplates, toPlain } from './lib/wikitext.mjs';

const API = 'https://jjk-phantom-parade.fandom.com/api.php';
const WIKI = 'https://jjk-phantom-parade.fandom.com/wiki/';
const UA = 'PhantomParadeHub-DataBot/0.1 (fan site; respectful, low-rate)';
const DELAY_MS = 1200; // pausa entre peticiones para no cargar la wiki
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const CHARACTER_TEMPLATES = [
  'Character Page',
  'Character Page (Adjustment)',
  'Character Page (Second Adjustment)',
  'Character Page (SP Awaken Character)',
];
const MEMORY_TEMPLATES = ['Memory Page', 'Memory Page (Adjustment)', 'Paid Memory Page'];

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      const json = await res.json();
      if (!json.error) return json;
      if (json.error.code !== 'maxlag') throw new Error(`API: ${json.error.info}`);
    }
    await sleep(DELAY_MS * attempt * 2);
  }
  throw new Error(`No se pudo consultar ${url}`);
}

/** Títulos de todas las páginas (ns 0) que usan alguna de las plantillas. */
async function pagesUsing(templates) {
  const titles = new Set();
  for (const tpl of templates) {
    let cont = {};
    do {
      const j = await api({ action: 'query', list: 'embeddedin', eititle: `Template:${tpl}`, einamespace: '0', eilimit: '500', ...cont });
      j.query.embeddedin.forEach((p) => titles.add(p.title));
      cont = j.continue ?? null;
      await sleep(DELAY_MS);
    } while (cont);
  }
  return [...titles].slice(0, LIMIT);
}

/** Wikitext + revisión de cada página, en lotes de 50. */
async function fetchPages(titles) {
  const pages = [];
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const j = await api({ action: 'query', prop: 'revisions', rvprop: 'content|ids|timestamp', rvslots: 'main', titles: batch.join('|') });
    for (const p of j.query.pages) {
      const rev = p.revisions?.[0];
      if (!rev) continue;
      pages.push({ title: p.title, pageid: p.pageid, revid: rev.revid, timestamp: rev.timestamp, wikitext: rev.slots.main.content });
    }
    process.stdout.write(`  · ${Math.min(i + 50, titles.length)}/${titles.length}\r`);
    await sleep(DELAY_MS);
  }
  process.stdout.write('\n');
  return pages;
}

// ── Normalización ────────────────────────────────────────────────

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’"“”().:!?]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** "(The Strongest) Satoru Gojo" → { epithet: "The Strongest", name: "Satoru Gojo" } */
function splitTitle(title) {
  const m = title.match(/^\s*\(\s*(.+?)\s*\)\s*(.+)$/);
  return m ? { epithet: m[1], name: m[2].trim() } : { epithet: null, name: title.trim() };
}

/** "19-10-2026" → "2026-10-19" (la wiki usa DD-MM-AAAA) */
function isoDate(s) {
  const m = s?.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

const num = (s) => {
  const n = Number(String(s ?? '').replace(/[,\s]/g, ''));
  return Number.isFinite(n) && String(s ?? '').trim() !== '' ? n : null;
};
const clean = (s) => (s && s !== 'N/A' ? toPlain(s) : null);

const TYPE_MAP = { RedType: 'red', BlueType: 'blue', GreenType: 'green', YellowType: 'yellow', PurpleType: 'purple' };
// La wiki usa sinónimos para el mismo rol; se unifican solo los evidentes
const ROLE_MAP = { Supporter: 'Support', Tank: 'Defender', Interferer: 'Obstructor' };
const FOCUS_MAP = { Combined: 'Mixed' };
const AVAILABILITY_MAP = { 'Free To Play': 'f2p', Standard: 'standard', Limited: 'limited', 'Event-Limited': 'event', 'Movie-Limited': 'collab' };

// Mapa nombre de archivo (sin extensión) → URL, se rellena con loadImageMap()
let IMAGES = new Map();
const imgKey = (s) => s.replace(/\.[a-z0-9]+$/i, '').replace(/[ _]+/g, '_').toLowerCase();
const PLACEHOLDER = /placeholder/i;
function img(name) {
  if (!name || PLACEHOLDER.test(name)) return null;
  return IMAGES.get(imgKey(name.trim())) ?? null;
}

async function loadImageMap() {
  console.log('\nimágenes: indexando…');
  let cont = {};
  do {
    const j = await api({ action: 'query', list: 'allimages', aiprop: 'url', ailimit: '500', ...cont });
    for (const im of j.query.allimages) IMAGES.set(imgKey(im.name), im.url);
    cont = j.continue ?? null;
    await sleep(DELAY_MS);
  } while (cont);
  console.log(`  ${IMAGES.size} imágenes`);
}

const pct = (s) => (s && s !== 'N/A' ? toPlain(s) : null);

/**
 * Lee una habilidad. `prefix` antepone variantes de la wiki ("Post-adjust ", "SP ",
 * "Changed "…) y `suffix` añade " (V2)" en el segundo ajuste. Devuelve null si no hay nada.
 */
function readSkill(p, key, { prefix = '', suffix = '', cost, imgKey: ik, crit } = {}) {
  const base = `${prefix}${key} Effect`;
  const levels = [base + suffix, ...Array.from({ length: 9 }, (_, i) => `${base} ${i + 2}${suffix}`)].map((k) => clean(p[k]));
  if (!levels.some(Boolean)) return null;
  const out = { levels };
  if (cost) out.cost = num(p[`${prefix}${cost}${suffix}`]);
  if (ik) out.img = img(p[ik]);
  if (crit) {
    const c = { rate: pct(p[`${crit}CritRate`]), dmg: pct(p[`${crit}CritDmg`]), bfRate: pct(p[`${crit}BFRate`]), bfDmg: pct(p[`${crit}BFDmg`]) };
    if (Object.values(c).some(Boolean)) out.crit = c;
  }
  return out;
}

function readKit(p, prefix = '', suffix = '') {
  const kit = {
    normal: readSkill(p, 'Normal Attack', { prefix, suffix }),
    s1: readSkill(p, 'Skill 1', { prefix, suffix, cost: 'Energy Cost S1' }),
    s2: readSkill(p, 'Skill 2', { prefix, suffix, cost: 'Energy Cost S2' }),
    ult: readSkill(p, 'Ult', { prefix, suffix }),
    autos: [1, 2, 3, 4, 5, 6]
      .map((n) => ({ n, effect: clean(p[`${prefix}Auto Skill ${n} Effect${suffix}`]) }))
      .filter((a) => a.effect && a.effect !== '/'),
  };
  return Object.values(kit).some((v) => (Array.isArray(v) ? v.length : v)) ? kit : null;
}

function mergeKits(a, b) {
  if (!a || !b) return a ?? b;
  return { normal: a.normal ?? b.normal, s1: a.s1 ?? b.s1, s2: a.s2 ?? b.s2, ult: a.ult ?? b.ult, autos: a.autos.length ? a.autos : b.autos };
}

function normalizeCharacter(page, tpl) {
  const p = tpl.params;
  const { epithet, name } = splitTitle(page.title);
  const cardName = p['Card Name']?.trim() || name;
  const role = p.Role?.trim() || null;
  const focus = p.Focus?.trim() || null;
  const named = (key, extra) => (p[key] ? { name: clean(p[key]), ...extra } : null);

  // Kit base, con nombres, iconos y críticos
  const base = {
    normal: named('Normal Attack', { img: img(p.NormalAttackImg), ...readSkill(p, 'Normal Attack') }),
    s1: named('Skill 1', { img: img(p.Skill1Img), ...readSkill(p, 'Skill 1', { cost: 'Energy Cost S1', crit: 'S1' }) }),
    s2: named('Skill 2', { img: img(p.Skill2Img), ...readSkill(p, 'Skill 2', { cost: 'Energy Cost S2', crit: 'S2' }) }),
    ult: named('Ult', { img: img(p.UltImg), ...(readSkill(p, 'Ult', { crit: 'Ult' }) ?? readSkill(p, 'Ult', { crit: 'S3' })) }),
    comboUlt: clean(p['Combo Ult Effect']),
    comboUltBuffed: clean(p['Buffed Combo Ult Effect']),
    autos: [1, 2, 3, 4, 5, 6]
      .map((n) => ({ n, name: clean(p[`Auto Skill ${n} Name`] ?? (n === 3 ? p['Auto Skill 3Name'] : null)), img: img(p[`Auto Skill ${n} Img`]), effect: clean(p[`Auto Skill ${n} Effect`]) }))
      .filter((a) => a.effect && a.effect !== '/' && a.name !== 'None'),
  };

  return {
    id: slugify(`${epithet ?? ''} ${cardName}`),
    name: cardName,
    epithet,
    rarity: p.Rarity?.trim() || null,
    element: TYPE_MAP[p.Type?.trim()] ?? (p.Type?.trim() || null),
    role: ROLE_MAP[role] ?? role,
    focus: FOCUS_MAP[focus] ?? focus,
    availability: AVAILABILITY_MAP[p['Limited-Yes']?.trim()] ?? null,
    affiliation: clean(p.Affiliation),
    releaseDateJP: isoDate(p['Release Date']?.trim()),
    art: img(p['Card Art']),
    art2: img(p['Card Art 2']),
    stats: {
      hp: num(p.HP),
      attack: num(p.Attack),
      jujutsu: num(p.Jujutsu),
      ceInitial: num(p['Initial Cursed Energy']),
      ceMax: num(p['Max Cursed Energy']),
      specialGauge: num(p['Special Gauge']),
    },
    characteristic: clean(p['Post-adjustment Characteristic']) ?? clean(p.Characteristic),
    blackFlash: /^yes/i.test(p['Post-adjustment Black Flash'] ?? p['Black Flash'] ?? '') ? true : /^no/i.test(p['Black Flash'] ?? '') ? false : null,
    kits: {
      base,
      adjusted: readKit(p, 'Post-adjust '),
      // La wiki nombra el ataque normal del 2.º ajuste como 'Post-adjust Skill Normal Attack…'
      adjustedV2: mergeKits(readKit(p, 'Post-adjust ', ' (V2)'), readKit(p, 'Post-adjust Skill ', ' (V2)')),
      altered: readKit(p, 'Changed '),
      sp: readKit(p, 'SP '),
    },
    memories: [1, 2, 3, 4, 5]
      .map((n) => ({ name: p[`Memory${n}Link`]?.trim() || null, img: img(p[`Memory${n}`]) }))
      .filter((m) => m.name),
    variant: tpl.name,
    _source: { source: 'wiki', url: WIKI + encodeURIComponent(page.title.replace(/ /g, '_')), revid: page.revid, updated: page.timestamp },
  };
}

// Etiquetas de efecto deducidas del texto (reglas simples y revisables)
const MEMORY_TAGS = [
  ['heal', /Recovers? (?:own |all allies' |\w+ )?HP/i],
  ['ce', /Cursed Energy (?:by|Recovery)|Recovers? (?:own |all allies' )?Cursed Energy|Cursed Energy Cost/i],
  ['gauge', /Ultimate (?:Skill )?Gauge|Special Gauge/i],
  ['crit', /Critical/i],
  ['break', /Break/i],
  ['defense', /Damage Received|Damage Taken|Resistance/i],
  ['taijutsu', /Taijutsu Stat|Physical|Melee/i],
  ['jujutsu', /Jujutsu Stat|Jujutsu Damage/i],
  ['damage', /Damage Dealt|Increases own Damage|Damage by/i],
  ['taunt', /Taunt/i],
  ['revive', /Revive|revival/i],
  ['evade', /Evad|Dodge/i],
  ['debuff', /Decreases (?:the selected enemy|all enemies|enemy)/i],
];
const AVAILABILITY_MEMORY = { 'Free To Play': 'f2p', 'Movie-Limited': 'collab', 'Blu-ray Exclusive': 'bluray' };

/** "21.20%<br>(Level 55)" → { value: 21.2, level: 55 } */
function memStat(s) {
  const value = num(String(s ?? '').split(/<br\s*\/?>/i)[0].replace('%', ''));
  const level = Number(String(s ?? '').match(/Level\s*(\d+)/i)?.[1]) || null;
  return { value, level };
}

function normalizeMemory(page, tpl) {
  const p = tpl.params;
  const pre = (k) => clean(p[`Post-Adjust ${k}`]) ?? clean(p[k]); // valores tras ajuste si existen
  const cd = (k) => (p[k] && p[k] !== '/' ? num(p[k]) : null);
  const hp = memStat(p['Stat 1']), tai = memStat(p['Stat 2']), ju = memStat(p['Stat 3']);
  const effects = [
    { text: pre('Effect 1'), textLv2: pre('Effect 1 Lvl2'), cd: cd('Post-CD 1') ?? cd('CD 1'), cdLv2: cd('Post-CD 1.2') ?? cd('CD 1.2') },
    { text: pre('Effect 2'), textLv2: null, cd: cd('Post-CD 2') ?? cd('CD 2'), cdLv2: null },
  ].filter((e) => e.text && e.text !== '/');
  const allText = effects.map((e) => `${e.text} ${e.textLv2 ?? ''}`).join(' ');
  const name = clean(p['Memory Name']) || page.title;
  return {
    id: slugify(name),
    name,
    title: page.title,
    rarity: p.Rarity?.trim() || null,
    releaseDateJP: isoDate(p['Release Date']?.trim()),
    availability: AVAILABILITY_MEMORY[p['Limited-Yes']?.trim()] ?? 'gacha',
    stats: { hp: hp.value, taijutsu: tai.value, jujutsu: ju.value, level: hp.level ?? tai.level ?? ju.level },
    effects,
    tags: MEMORY_TAGS.filter(([, re]) => re.test(allText)).map(([t]) => t),
    adjusted: Object.keys(p).some((k) => k.startsWith('Post-')),
    art: img(p['Card Art']),
    variant: tpl.name,
    _source: { source: 'wiki', url: WIKI + encodeURIComponent(page.title.replace(/ /g, '_')), revid: page.revid, updated: page.timestamp },
  };
}

/** Une duplicados con el mismo id: se queda con la revisión más reciente y avisa. */
function dedupe(items, label) {
  const byId = new Map();
  const dupes = [];
  for (const it of items) {
    const prev = byId.get(it.id);
    if (!prev) byId.set(it.id, it);
    else {
      dupes.push([prev._source.url, it._source.url]);
      if (it._source.updated > prev._source.updated) byId.set(it.id, it);
    }
  }
  if (dupes.length) console.log(`  ⚠ ${dupes.length} ${label} duplicados en la wiki (se usa la edición más reciente)`);
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

async function save(rel, data) {
  const file = join(ROOT, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`  → ${rel}`);
}

async function run(kind, templates, normalize) {
  console.log(`\n${kind}: buscando páginas…`);
  const titles = await pagesUsing(templates);
  console.log(`  ${titles.length} páginas`);
  const pages = await fetchPages(titles);
  await save(`data/raw/wiki/${kind}.json`, pages);

  const items = [];
  const skipped = [];
  for (const page of pages) {
    // Si una página tiene varias versiones (ajustes), la última plantilla es la vigente
    const tpls = findTemplates(page.wikitext, templates);
    if (!tpls.length) { skipped.push(page.title); continue; }
    items.push(normalize(page, tpls.at(-1)));
  }
  if (skipped.length) console.log(`  ⚠ ${skipped.length} páginas sin plantilla legible: ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? '…' : ''}`);
  const final = dedupe(items, kind);
  await save(`data/normalized/wiki/${kind}.json`, {
    source: 'wiki',
    license: 'CC BY-SA 3.0',
    attribution: 'JJK Phantom Parade Wiki (Fandom)',
    fetchedAt: new Date().toISOString(),
    count: final.length,
    items: final,
  });
}

await loadImageMap();
await run('characters', CHARACTER_TEMPLATES, normalizeCharacter);
await run('memories', MEMORY_TEMPLATES, normalizeMemory);
console.log('\nListo. Siguiente paso: npm run data:compare');
