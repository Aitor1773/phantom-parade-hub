// Capa de datos de personajes para la web. Hoy lee la wiki normalizada;
// cuando haya más fuentes, leerá el conjunto publicado tras el comparador.
import wiki from '../../data/normalized/wiki/characters.json';
import localImages from './local-images.json';
import localIcons from './local-icons.json';
import { REMOTE_IMAGES } from '@/config/site';
import { memoryByCharacterName } from './memories';

type LocalImage = { width: number; height: number; widths: number[] };
const LOCAL = localImages as Record<string, LocalImage>;
const ICONS = localIcons as unknown as {
  skills: Record<string, number[]>;
  characters: Record<string, number[]>;
};
const LOCAL_PREFIX = '/img/characters/';

export type Element = 'red' | 'blue' | 'green' | 'yellow' | 'purple';
export type Rarity = 'SSR' | 'SR' | 'R';
export type KitVersion = 'base' | 'adjusted' | 'adjustedV2' | 'sp' | 'altered';

export interface Crit { rate: string | null; dmg: string | null; bfRate: string | null; bfDmg: string | null }
export interface Skill {
  name?: string | null;
  img?: string | null;
  cost?: number | null;
  levels: (string | null)[];
  crit?: Crit;
}
export interface Auto { name?: string | null; img?: string | null; effect: string; n?: number }
export interface Kit {
  normal: Skill | null;
  s1: Skill | null;
  s2: Skill | null;
  ult: Skill | null;
  autos: Auto[];
  comboUlt?: string | null;
  comboUltBuffed?: string | null;
}
export interface Character {
  id: string;
  name: string;
  epithet: string | null;
  rarity: Rarity;
  element: Element;
  role: string | null;
  focus: string | null;
  availability: string | null;
  affiliation: string | null;
  releaseDateJP: string | null;
  art: string | null;
  art2: string | null;
  /** Icono cuadrado del personaje (local), para listas compactas y el constructor de equipos */
  icon?: string | null;
  stats: { hp: number | null; attack: number | null; jujutsu: number | null; ceInitial: number | null; ceMax: number | null; specialGauge: number | null };
  characteristic: string | null;
  blackFlash: boolean | null;
  kits: { base: Kit } & Partial<Record<Exclude<KitVersion, 'base'>, Kit | null>>;
  memories: { name: string; img: string | null; id?: string | null }[];
  _source: { source: string; url: string; revid: number; updated: string };
}

export const SOURCE_META = {
  fetchedAt: wiki.fetchedAt as string,
  attribution: wiki.attribution as string,
  license: wiki.license as string,
};

const RARITY_ORDER: Record<string, number> = { SSR: 0, SR: 1, R: 2 };

/** Nombre de archivo de una URL de Fandom: ".../images/a/ab/YellowMegumiSSRS11.png/revision/latest" → "yellowmegumissrs11" */
const wikiFileKey = (url: string | null | undefined) => {
  const m = url?.match(/\/images\/[^/]+\/[^/]+\/([^/]+?)\.[a-z0-9]+(?:\/|$)/i);
  return m ? decodeURIComponent(m[1]).toLowerCase() : null;
};

/** Icono local (WebP) a partir de la URL de la wiki, si se ha importado. */
function localIcon(kind: 'skills' | 'characters', wikiUrl: string | null | undefined, width: number) {
  const k = wikiFileKey(wikiUrl);
  const widths = k ? ICONS[kind][k] : undefined;
  if (!widths) return null;
  return `/img/icons/${kind}/${k}-${widths.find((w) => w >= width) ?? widths.at(-1)}.webp`;
}

/**
 * Sustituye las imágenes de la wiki (que no se pueden enlazar) por las locales.
 * Lo que no exista en local queda en null y la web muestra un marcador.
 */
function localizeImages(c: Character): Character {
  const icon = localIcon('characters', c.art?.replace(/Art(\d+)\./, 'Icon$1.'), 96);
  const out: Character = JSON.parse(JSON.stringify(c), (k, v) => {
    if (k === 'img' && typeof v === 'string') return localIcon('skills', v, 128);
    if (k === 'art' || k === 'art2') return null;
    return v;
  });
  out.icon = icon;
  out.memories = out.memories
    .filter((m) => !/^placeholder/i.test(m.name)) // huecos vacíos de la plantilla de la wiki
    .map((m) => {
      const mem = memoryByCharacterName(m.name);
      return { name: mem?.name ?? m.name, img: mem?.icon ?? null, id: mem?.id ?? null };
    });
  return out;
}

/** Iniciales para los marcadores de posición: "Atsuya Kusakabe" → "AK". */
export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Todos los personajes, del más reciente al más antiguo. */
export const CHARACTERS: Character[] = (wiki.items as unknown as Character[])
  .map((c) => (REMOTE_IMAGES ? c : localizeImages(c)))
  // El arte propio (npm run images) tiene prioridad sobre cualquier otro
  .map((c) => (LOCAL[c.id] ? { ...c, art: LOCAL_PREFIX + c.id } : c))
  .sort((a, b) => (b.releaseDateJP ?? '').localeCompare(a.releaseDateJP ?? '') || a.name.localeCompare(b.name));

export const getCharacter = (id: string) => CHARACTERS.find((c) => c.id === id);

export const rarityRank = (r: string) => RARITY_ORDER[r] ?? 9;

/** Miniatura del CDN de Fandom (evita descargar el arte a tamaño completo). */
export function thumb(url: string | null | undefined, width: number) {
  if (!url) return null;
  if (url.startsWith(LOCAL_PREFIX)) {
    const img = LOCAL[url.slice(LOCAL_PREFIX.length)];
    const w = img.widths.find((x) => x >= width) ?? img.widths.at(-1);
    return `${url}-${w}.webp`;
  }
  if (url.startsWith('/img/')) return url; // iconos locales: ya vienen con su tamaño
  if (!REMOTE_IMAGES) return null;
  return url.replace(/\/revision\/latest(\/[^?]*)?/, `/revision/latest/scale-to-width-down/${width}`);
}

/** Versiones disponibles del kit de un personaje, en orden. */
export function kitVersions(c: Character): KitVersion[] {
  const order: KitVersion[] = ['base', 'adjusted', 'adjustedV2', 'sp', 'altered'];
  return order.filter((v) => v === 'base' || !!c.kits[v]);
}

type SkillKey = 'normal' | 's1' | 's2' | 'ult';
const SKILL_KEYS: SkillKey[] = ['normal', 's1', 's2', 'ult'];

/**
 * Kit completo para una versión: la variante se superpone sobre la versión anterior
 * (el 2.º ajuste sobre el 1.º, y este sobre el original). Marca qué cambia.
 */
export function resolveKit(c: Character, version: KitVersion) {
  const chain: Kit[] = [c.kits.base];
  if (version === 'adjustedV2' && c.kits.adjusted) chain.push(c.kits.adjusted);
  if (version !== 'base' && c.kits[version]) chain.push(c.kits[version]!);

  const top = chain.length > 1 ? chain[chain.length - 1] : null;
  const skills = Object.fromEntries(
    SKILL_KEYS.map((key) => {
      const merged = chain.reduce<Skill | null>((prev, k) => {
        const s = k[key];
        if (!s) return prev;
        if (!prev) return { ...s };
        const defined = Object.fromEntries(Object.entries(s).filter(([, v]) => v != null));
        return { ...prev, ...defined, levels: s.levels.map((l, i) => l ?? prev.levels[i]) };
      }, null);
      return [key, merged ? { ...merged, changed: !!top?.[key] } : null];
    }),
  ) as Record<SkillKey, (Skill & { changed: boolean }) | null>;

  // Pasivas: la variante reemplaza por número de pasiva; las nuevas se añaden
  const autos = c.kits.base.autos.map((a, i) => ({ ...a, changed: false, n: a.n ?? i + 1 }));
  for (const k of chain.slice(1)) {
    for (const a of k.autos) {
      const idx = autos.findIndex((x) => x.n === a.n);
      if (idx >= 0) autos[idx] = { ...autos[idx], effect: a.effect, changed: true };
      else autos.push({ ...a, changed: true, n: a.n ?? autos.length + 1 });
    }
  }

  return { ...skills, autos, comboUlt: c.kits.base.comboUlt ?? null, comboUltBuffed: c.kits.base.comboUltBuffed ?? null };
}

export type ResolvedKit = ReturnType<typeof resolveKit>;
