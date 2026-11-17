// Traducción automática de los textos de Game8 (japonés) a los otros 7 idiomas de la web
// (npm run data:translate, a diario después de leer Game8).
//
// · Recoge los textos de data/normalized/game8/*.json y traduce solo los que aún no están en la
//   memoria de traducciones data/i18n/game8.json (cada texto se traduce una vez y se reutiliza).
// · Usa Cloudflare Workers AI con el plan gratuito (10.000 «neuronas» al día). Necesita dos secretos:
//   CF_ACCOUNT_ID y CF_API_TOKEN (permiso «Workers AI»). Sin ellos no hace nada y la web enseña
//   lo que ya esté traducido (y el resto en japonés o con los datos anteriores).
// · Para no pasar del plan gratuito se para al llegar a CF_AI_DAILY_NEURONS (9.000 por defecto).
// · El glosario de la web (src/data/glossary.ts) se pasa al modelo para que use los términos del juego.
// · Las traducciones revisadas a mano («by": "manual"») no se sobrescriben nunca.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'data/normalized/game8');
const OUT = join(ROOT, 'data/i18n/game8.json');
export const LANGS = ['en', 'es', 'pt', 'fr', 'de', 'ko', 'zh'];
const LANG_NAMES = { en: 'English', es: 'Spanish (Spain)', pt: 'Portuguese (Brazil)', fr: 'French', de: 'German', ko: 'Korean', zh: 'Simplified Chinese' };
const MODEL = process.env.CF_AI_MODEL || '@cf/google/gemma-4-26b-a4b-it';
/** Neuronas por millón de tokens [entrada, salida] (developers.cloudflare.com/workers-ai/platform/pricing, 2026-11-17) */
const PRICE = { '@cf/google/gemma-4-26b-a4b-it': [9091, 27273], '@cf/qwen/qwen3-30b-a3b-fp8': [4625, 30475], '@cf/google/gemma-3-12b-it': [31371, 50560] };
/** Gasto máximo al día, por debajo de las 10.000 neuronas gratis (lo usado por otras cosas de la cuenta también cuenta) */
const BUDGET = Number(process.env.CF_AI_DAILY_NEURONS || 9000);
const BATCH = 8;

/** Textos de una ficha de personaje que se enseñan en la web */
export function charStrings(c) {
  const s = c.skills ?? {};
  const skills = [s.s1, s.s2, s.s3, s.ult, ...(s.autos ?? []), ...(s.potential ?? [])].filter(Boolean);
  return [
    c.epithet, c.affiliation, c.special,
    ...skills.flatMap((k) => [k.name, k.effect, k.combo]),
    ...(c.awakening ?? []).flatMap((a) => [a.combo]),
    ...(c.summary ?? []), ...(c.pros ?? []), ...(c.cons ?? []),
    ...(c.review ?? []).flatMap((r) => [r.title, ...r.text]),
    ...(c.memories ?? []).flatMap((m) => m.points),
    ...(c.memoryNote ?? []),
    ...(c.teams ?? []).flatMap((t) => [t.title, ...t.members.map((m) => m.role), ...t.note]),
    ...(c.acquisition ?? []).flatMap((a) => [a.title, ...a.text]),
    ...(c.potentialTips ?? []).flatMap((a) => [a.title, ...a.text]),
  ].filter((x) => typeof x === 'string' && /[぀-ヿ一-鿿]/.test(x));
}

/** Textos de una memoria */
export const memStrings = (m) => [
  m.obtain, m.active?.effect, m.auto?.effect, ...(m.tags ?? []), ...(m.groups ?? []).map((g) => g.title),
];
/** Textos de la tier list */
export const tierStrings = (t) => [
  ...Object.values(t.characters?.ranks ?? {}).flat().flatMap((e) => e.points),
  ...Object.values(t.memories?.ranks ?? {}).flat().flatMap((e) => e.points),
  ...(t.characters?.roles ?? []).flatMap((r) => [r.title, ...r.rows.map((x) => x.label)]),
  ...(t.characters?.latest ?? []).flatMap((l) => l.points),
  ...(t.characters?.history ?? []).flatMap((h) => h.changes),
  ...(t.characters?.criteria ?? []).flatMap((c) => c.text),
];
const isJa = (x) => typeof x === 'string' && /[぀-ヿ一-鿿]/.test(x);

async function collect() {
  const out = [];
  if (!existsSync(SRC)) return out;
  for (const f of await readdir(SRC)) {
    if (!f.endsWith('.json')) continue;
    const d = JSON.parse(await readFile(join(SRC, f), 'utf8'));
    if (f === 'characters.json') for (const c of Object.values(d.characters)) out.push(...charStrings(c));
    else if (f === 'memories.json') for (const m of Object.values(d.memories)) out.push(...memStrings(m));
    else if (f === 'tier.json') out.push(...tierStrings(d));
    else if (f === 'guides.json') for (const g of Object.values(d.guides)) out.push(g.title, ...g.sections.flatMap((s) => [s.title, ...s.blocks.flatMap((b) => [b.title, ...b.text, ...b.entries.flatMap((e) => e.points)])]));
  }
  return [...new Set(out.filter(isJa))];
}

async function glossary() {
  try {
    const { GLOSSARY } = await import('../../src/data/glossary.ts');
    return GLOSSARY.flatMap((g) => g.terms).map((t) => `${t.jp} = ${t.name.en} / ${t.name.es}`).join('\n');
  } catch { return ''; }
}

async function translateBatch(texts, terms) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/${MODEL}`;
  const system = [
    'You translate Japanese text from a guide to the mobile game "Jujutsu Kaisen Phantom Parade" for a fan site.',
    `Translate each input into: ${LANGS.map((l) => `${l} (${LANG_NAMES[l]})`).join(', ')}.`,
    'Keep every number, percentage, turn count and hit count exactly. Keep line breaks. Character and technique names use the official anime/manga names in each language.',
    'Colors/traits: 幻 = red, 影 = blue, 夜 = green, 行 = yellow. 体術 = Taijutsu, 術式 = Jujutsu (technique stat), 廻想残滓 = Memory, 夢幻廻楼 = Illusory Tower.',
    terms ? `Game glossary (Japanese = English / Spanish):\n${terms}` : '',
    'Answer ONLY with a JSON array, one object per input in the same order, each with the keys ' + LANGS.join(', ') + '.',
  ].filter(Boolean).join('\n');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(texts) }],
      max_tokens: 4096,
      temperature: 0.2,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new Error(`Workers AI ${res.status}: ${JSON.stringify(data?.errors ?? data).slice(0, 300)}`);
  const raw = typeof data.result.response === 'string' ? data.result.response : JSON.stringify(data.result.response);
  const arr = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1));
  const u = data.result.usage ?? {};
  const [pin, pout] = PRICE[MODEL] ?? [50000, 300000]; // modelo desconocido: se cuenta caro para no pasarse
  const tin = u.prompt_tokens ?? system.length + JSON.stringify(texts).length;
  const tout = u.completion_tokens ?? raw.length;
  return { arr, neurons: (tin * pin + tout * pout) / 1e6 };
}

async function main() {
  const store = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : { strings: {} };
  const all = await collect();
  // Primero lo corto (nombres, efectos, puntos clave): se ve antes en la web
  const missing = all.filter((s) => !store.strings[s]).sort((a, b) => a.length - b.length);
  console.log(`translate: ${all.length} textos, ${missing.length} sin traducir`);
  if (!missing.length) return;
  if (!process.env.CF_ACCOUNT_ID || !process.env.CF_API_TOKEN) {
    console.log('translate: faltan CF_ACCOUNT_ID / CF_API_TOKEN; no se traduce nada hoy');
    return;
  }
  const terms = await glossary();
  let used = 0, done = 0;
  for (let i = 0; i < missing.length && used < BUDGET; i += BATCH) {
    const texts = missing.slice(i, i + BATCH);
    try {
      const { arr, neurons } = await translateBatch(texts, terms);
      used += neurons;
      texts.forEach((t, k) => {
        const tr = arr[k];
        if (tr && LANGS.every((l) => typeof tr[l] === 'string' && tr[l].trim())) {
          store.strings[t] = { ...Object.fromEntries(LANGS.map((l) => [l, tr[l].trim()])), by: 'cf', at: new Date().toISOString().slice(0, 10) };
          done++;
        }
      });
    } catch (e) {
      console.warn(`translate: lote fallido (${e.message})`);
      if (/40[13]|quota|limit|neuron/i.test(e.message)) break; // sin cuota o sin permiso: mañana sigue
    }
  }
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(store, null, 1) + '\n');
  console.log(`translate: ${done} traducidos hoy (~${Math.round(used)} neuronas de ${BUDGET}), quedan ${missing.length - done}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(0); });
