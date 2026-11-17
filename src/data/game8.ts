// Datos de Game8 (fuente principal desde el 2026-11-17) para la web: fichas de personaje en japonés
// (scripts/data/fetch-game8-chars.mjs) + traducciones (scripts/data/translate.mjs).
// Cada ficha se enlaza con su id de la web por el nombre japonés «「epíteto」nombre» (data/manual/jp-names.json).
import g8chars from '../../data/normalized/game8/characters.json';
import jpNamesFile from '../../data/manual/jp-names.json';
import jpMemFile from '../../data/manual/jp-memories.json';
import i18nFile from '../../data/i18n/game8.json';
import g8tier from '../../data/normalized/game8/tier.json';
import g8mems from '../../data/normalized/game8/memories.json';
import g8guides from '../../data/normalized/game8/guides.json';
import type { Locale } from '@/i18n/utils';

export interface G8Skill { name: string; img: string | null; element: string | null; effect: string; combo?: string }
export interface G8Block { title: string; text: string[] }
export interface G8Char {
  g8id: string; url: string; listName?: string; full: string; epithet: string | null; name: string;
  rarity: string | null; element: string | null; affiliation: string | null; focus: string | null; roles: string[];
  obtain: string | null; special: string | null;
  stats: { hp: number | null; attack: number | null; jujutsu: number | null; ceInitial: number | null; ceMax: number | null; specialGauge: number | null };
  awakening: { lv: number; stats: string; combo: string }[];
  skills: { s1: G8Skill | null; s2: G8Skill | null; s3: G8Skill | null; ult: G8Skill | null; autos: G8Skill[]; potential: G8Skill[] };
  priority: Partial<Record<'s1' | 's2' | 's3' | 'ult', number | null>>;
  ratings: { overall: string | null; auto?: string | null; hard?: string | null; reroll?: string | null };
  summary: string[]; pros: string[]; cons: string[]; review: G8Block[];
  memories: { g8id: string; name: string; points: string[] }[]; memoryNote: string[];
  teams: { title: string; members: { g8id: string | null; name: string; role: string | null }[]; memories: ({ g8id: string; name: string } | null)[]; note: string[] }[];
  acquisition: G8Block[]; potentialTips: G8Block[];
  images: { art: string | null; icon: string | null };
  modified: string | null;
}

const RAW = g8chars as unknown as { characters: Record<string, G8Char>; fetchedAt: string };
export const G8_FETCHED_AT = RAW.fetchedAt;
const JP_NAMES = (jpNamesFile as unknown as { names: Record<string, string> }).names;
const JP_MEMS = (jpMemFile as unknown as { names: Record<string, string> }).names;
const STRINGS = (i18nFile as unknown as { strings: Record<string, Partial<Record<Locale, string>>> }).strings;

/** Nombre japonés normalizado para comparar (comillas, espacios y «&») */
const norm = (s: string) => s.replace(/&amp;/g, '&').replace(/[\s　]/g, '').replace(/[【】]/g, (m) => (m === '【' ? '「' : '」'));
const ID_BY_JP = new Map(Object.entries(JP_NAMES).map(([jp, id]) => [norm(jp), id]));

/** id de la web de una ficha de Game8 (o null si aún no está emparejada) */
export const webIdOf = (c: Pick<G8Char, 'full' | 'listName'>) =>
  ID_BY_JP.get(norm(c.full)) ?? (c.listName ? ID_BY_JP.get(norm(c.listName)) : undefined) ?? null;

const ALL = Object.values(RAW.characters);
const BY_WEB = new Map<string, G8Char>();
const BY_G8 = new Map<string, G8Char>();
for (const c of ALL) {
  BY_G8.set(c.g8id, c);
  const id = webIdOf(c);
  if (id) BY_WEB.set(id, c);
}

/** Ficha de Game8 de un personaje de la web */
export const g8Of = (webId: string) => BY_WEB.get(webId) ?? null;
/** id de la web de un personaje de Game8 por su id de Game8 */
export const webIdOfG8 = (g8id: string | null) => {
  const c = g8id ? BY_G8.get(g8id) : null;
  return c ? webIdOf(c) : null;
};
/** id de la web de un personaje por su nombre japonés «「epíteto」nombre» */
export const webIdOfJp = (full: string) => ID_BY_JP.get(norm(full)) ?? null;
/** id de la web de una memoria por su nombre japonés */
export const memoryIdOfJp = (jp: string) => JP_MEMS[jp] ?? JP_MEMS[jp.replace(/&amp;/g, '&')] ?? null;
/** Fichas de Game8 que aún no tienen personaje en la web */
export const g8Unmatched = () => ALL.filter((c) => !webIdOf(c));

// ── Tier list ────────────────────────────────────────────────────────
export interface G8TierEntry { name: string; g8id: string | null; points: string[]; related: { g8id: string; name: string }[] }
export interface G8RoleGrid { title: string; rows: { label: string; cells: { element: string | null; characters: string[] }[] }[] }
export interface G8Tier {
  fetchedAt: string;
  characters: {
    url: string; ranks: Record<string, G8TierEntry[]>; roles: G8RoleGrid[];
    latest: { name: string; release: string | null; points: string[] }[];
    history: { date: string; changes: string[] }[];
    criteria: { rank: string; text: string[] }[];
  };
  memories: { url: string; ranks: Record<string, G8TierEntry[]> };
}
export const G8_TIER = g8tier as unknown as G8Tier;
export const G8_RANKS = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D'] as const;
export type G8Rank = (typeof G8_RANKS)[number];

/** Rango de un personaje de la web: el de la tier list de Game8 y, si no sale, el de su propia ficha */
const CHAR_TIER = new Map<string, { rank: G8Rank; entry: G8TierEntry | null }>();
for (const [rank, list] of Object.entries(G8_TIER.characters.ranks)) {
  for (const e of list) { const id = webIdOfJp(e.name); if (id && !CHAR_TIER.has(id)) CHAR_TIER.set(id, { rank: rank as G8Rank, entry: e }); }
}
for (const [id, c] of BY_WEB) if (!CHAR_TIER.has(id) && c.ratings.overall) CHAR_TIER.set(id, { rank: c.ratings.overall as G8Rank, entry: null });
export const charTier = (webId: string) => CHAR_TIER.get(webId) ?? null;

// ── Memorias ─────────────────────────────────────────────────────────
export interface G8Memory {
  g8id: string; url: string; name: string; rarity: string | null; icon: string | null;
  ratings: { overall: string | null; auto: string | null };
  obtain: string | null;
  groups: { title: string | null; characters: { g8id: string; name: string }[] }[];
  active: { cooldown: number | null; effect: string } | null;
  auto: { cooldown: number | null; effect: string } | null;
  stats: { max: Partial<Record<'hp' | 'taijutsu' | 'jujutsu', number | null>>; base: Partial<Record<'hp' | 'taijutsu' | 'jujutsu', number | null>>; maxLevel: number | null; baseLevel: number | null };
  tags: string[];
  modified: string | null;
}
const G8_MEMS = Object.values((g8mems as unknown as { memories: Record<string, G8Memory> }).memories);
export const g8MemoriesAll = () => G8_MEMS;
const MEM_BY_WEB = new Map<string, G8Memory>();
for (const m of G8_MEMS) { const id = memoryIdOfJp(m.name); if (id && !MEM_BY_WEB.has(id)) MEM_BY_WEB.set(id, m); }
/** Ficha de Game8 de una memoria de la web */
export const g8MemOf = (webId: string) => MEM_BY_WEB.get(webId) ?? null;
const MEM_POINTS = new Map<string, { rank: string; entry: G8TierEntry }>();
for (const [rank, list] of Object.entries(G8_TIER.memories.ranks)) for (const e of list) if (!MEM_POINTS.has(e.name)) MEM_POINTS.set(e.name, { rank, entry: e });
/** Puntos clave de una memoria en la tier list de Game8 (solo las SS y S los tienen) */
export const memTierPoints = (jpName: string) => MEM_POINTS.get(jpName) ?? null;

// ── Guías de recomendaciones (reroll, ticket, SR, rareza baja, gacha permanente) ──
export interface G8GuideEntry { name: string; g8id: string | null; rank: string | null; points: string[]; related?: { name: string; g8id: string | null }[] }
export interface G8Guide { url: string; title: string; modified: string | null; sections: { title: string; blocks: { title: string | null; entries: G8GuideEntry[]; text: string[] }[] }[] }
const GUIDES_RAW = g8guides as unknown as { fetchedAt: string; guides: Record<string, G8Guide> };
export const G8_GUIDES = GUIDES_RAW.guides;
export const G8_GUIDES_AT = GUIDES_RAW.fetchedAt;

/**
 * Texto de Game8 en el idioma pedido: el original en japonés, la traducción si existe,
 * y si no, null (la web usa entonces sus datos anteriores).
 */
export function g8t(jp: string | null | undefined, lang: Locale): string | null {
  if (!jp) return null;
  if (lang === 'ja') return jp;
  const t = STRINGS[jp];
  return t?.[lang] ?? t?.en ?? null;
}
/** Como g8t, pero si falta la traducción devuelve el japonés (para bloques que solo existen en Game8) */
export const g8tOrJp = (jp: string | null | undefined, lang: Locale) => g8t(jp, lang) ?? jp ?? '';
/** ¿Está traducido todo este conjunto de textos? */
export const g8Translated = (texts: (string | null | undefined)[], lang: Locale) => texts.every((t) => !t || g8t(t, lang) != null);
