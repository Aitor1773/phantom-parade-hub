// Capa de datos de memorias (Recollection Bits). Base: wiki normalizada.
// Imágenes: jjkppdb, emparejadas en data/links/memories.json (npm run data:link).
import wiki from '../../data/normalized/wiki/memories.json';
import links from '../../data/links/memories.json';
import charMemories from '../../data/links/character-memories.json';
import localIcons from './local-icons.json';

export type MemoryTag =
  | 'heal' | 'ce' | 'gauge' | 'crit' | 'break' | 'defense' | 'taijutsu' | 'jujutsu' | 'damage' | 'taunt' | 'revive' | 'evade' | 'debuff';
export type Orientation = 'taijutsu' | 'jujutsu' | 'hp' | 'mixed' | 'balanced';

export interface MemoryEffect { text: string; textLv2: string | null; cd: number | null; cdLv2: number | null }
export interface Memory {
  id: string;
  name: string;
  title: string;
  rarity: 'SSR' | 'SR' | 'R';
  releaseDateJP: string | null;
  availability: string;
  stats: { hp: number | null; taijutsu: number | null; jujutsu: number | null; level: number | null };
  effects: MemoryEffect[];
  tags: MemoryTag[];
  adjusted: boolean;
  orientation: Orientation;
  icon: string | null;
  illust: string | null;
  illustWidths: number[];
  /** Pareja en jjkppdb dudosa (nombre poco parecido): se muestra igual pero se revisa */
  imageReview: boolean;
  _source: { source: string; url: string; revid: number; updated: string };
}

type Link = { jjkppdb: number; method: string; similarity: number; review?: boolean };
type LocalMemory = { icon?: number[]; illust?: number[] };
const LINKS = (links as unknown as { links: Record<string, Link> }).links;
const ICONS = (localIcons as unknown as { memories: Record<string, LocalMemory> }).memories;

/** Orientación por stats: pura si un stat es 0; si no, el stat dominante. */
function orientation(s: Memory['stats']): Orientation {
  const hp = s.hp ?? 0, t = s.taijutsu ?? 0, j = s.jujutsu ?? 0;
  if (Math.abs(hp - t) < 0.01 && Math.abs(t - j) < 0.01) return 'balanced';
  if (Math.abs(t - j) < 0.01 && t > hp) return 'mixed';
  const max = Math.max(hp, t, j);
  return max === hp ? 'hp' : max === t ? 'taijutsu' : 'jujutsu';
}

const completeness = (m: Memory) => m.effects.length * 10 + (m.stats.hp != null ? 5 : 0) + (m.releaseDateJP ? 2 : 0);

type RawMemory = Omit<Memory, 'orientation' | 'icon' | 'illust' | 'illustWidths' | 'imageReview'>;
const all: Memory[] = (wiki.items as unknown as RawMemory[]).map((m) => {
  const link = LINKS[m.id];
  const local = link ? ICONS[link.jjkppdb] : undefined;
  return {
    ...m,
    orientation: orientation(m.stats),
    icon: link && local?.icon ? `/img/icons/memories/${link.jjkppdb}-${local.icon.at(-1)}.webp` : null, // la mayor: nítida en pantallas HD
    illust: link && local?.illust ? `/img/memories/${link.jjkppdb}` : null,
    illustWidths: local?.illust ?? [],
    imageReview: !!link?.review,
  };
});

// La wiki tiene a veces dos páginas para la misma memoria (misma pareja en jjkppdb):
// se queda la más completa y la otra redirige a ella.
const byJJ = new Map<number, Memory>();
const REDIRECT = new Map<string, string>();
for (const m of all) {
  const jj = LINKS[m.id]?.jjkppdb;
  if (jj == null) continue;
  const prev = byJJ.get(jj);
  if (!prev) { byJJ.set(jj, m); continue; }
  const [keep, drop] = completeness(m) > completeness(prev) ? [m, prev] : [prev, m];
  byJJ.set(jj, keep);
  REDIRECT.set(drop.id, keep.id);
}

/** Todas las memorias (sin duplicados), de la más reciente a la más antigua. */
export const MEMORIES: Memory[] = all
  .filter((m) => !REDIRECT.has(m.id))
  .sort((a, b) => (b.releaseDateJP ?? '').localeCompare(a.releaseDateJP ?? '') || a.name.localeCompare(b.name));

const BY_ID = new Map(MEMORIES.map((m) => [m.id, m]));
export const getMemory = (id: string) => BY_ID.get(REDIRECT.get(id) ?? id);

/** Memoria a partir del nombre que aparece en la ficha de un personaje. */
export function memoryByCharacterName(name: string) {
  const id = (charMemories as Record<string, string>)[name];
  return id ? getMemory(id) ?? null : null;
}

/** Ilustración al ancho más cercano disponible. */
export function illustSrc(m: Memory, width: number) {
  if (!m.illust) return null;
  const w = m.illustWidths.find((x) => x >= width) ?? m.illustWidths.at(-1);
  return `${m.illust}-${w}.webp`;
}

/** Todas las versiones de la ilustración para `srcset`. */
export function illustSrcset(m: Memory) {
  return m.illust ? m.illustWidths.map((w) => `${m.illust}-${w}.webp ${w}w`).join(', ') : undefined;
}

export const MEMORY_TAGS: MemoryTag[] = ['damage', 'crit', 'break', 'taijutsu', 'jujutsu', 'ce', 'gauge', 'heal', 'defense', 'taunt', 'evade', 'revive', 'debuff'];
