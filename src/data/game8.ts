// Datos de Game8 (fuente principal desde el 2026-11-17) para la web: fichas de personaje en japonés
// (scripts/data/fetch-game8-chars.mjs) + traducciones (scripts/data/translate.mjs).
// Cada ficha se enlaza con su id de la web por el nombre japonés «「epíteto」nombre» (data/manual/jp-names.json).
import g8chars from '../../data/normalized/game8/characters.json';
import jpNamesFile from '../../data/manual/jp-names.json';
import jpMemFile from '../../data/manual/jp-memories.json';
import i18nFile from '../../data/i18n/game8.json';
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
