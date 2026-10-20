// Contenido del juego para la sección de equipos: modos permanentes (Beginner's Guide de la wiki),
// pisos de la Torre ilusoria y eventos de combate (cronología JP de la wiki + eventos Global curados).
// Las debilidades/resistencias vienen de data/manual/content.json (a mano, desde el juego).
import manual from '../../data/manual/content.json';
import { GLOBAL_BANNERS, JP_BANNERS } from './banners';
import type { ElementKey } from '@/lib/team-recs';

export type ContentKind = 'mode' | 'event';
export type EventCategory = 'story' | 'map' | 'formidable' | 'raid' | 'domain' | 'allout' | 'exploration' | 'memory' | 'exorcism' | 'corpse';
export interface AffinityData { weak?: ElementKey[]; resist?: ElementKey[]; note?: string; checked?: string }

export interface Content {
  id: string;
  kind: ContentKind;
  /** Modos: su id (se traduce en la página). Eventos: nombre en inglés de la wiki. */
  name: string;
  category?: EventCategory;
  server?: 'jp' | 'global';
  start?: string;
  end?: string | null;
  /** Solo la Torre ilusoria */
  floors?: number;
  source: { label: string; url: string };
}

const WIKI_GUIDE = { label: "JJK Phantom Parade Wiki · Beginner's Guide", url: 'https://jjk-phantom-parade.fandom.com/wiki/Beginner%27s_Guide' };
const M = manual as unknown as { towerFloors: number; affinity: Record<string, AffinityData> };

// Modos con combates (la wiki describe también Dispatch, que no tiene combates)
export const MODE_IDS = ['illusory-tower', 'domain-investigation', 'formidable-foes', 'main-quest', 'cursed-object-collection', 'strengthening-quest'] as const;
export type ModeId = (typeof MODE_IDS)[number];
export const MODES: Content[] = MODE_IDS.map((id) => ({
  id,
  kind: 'mode',
  name: id,
  ...(id === 'illusory-tower' ? { floors: M.towerFloors } : {}),
  source: WIKI_GUIDE,
}));

// Eventos con combates, por el prefijo del título en la cronología de la wiki
const CATEGORY: [RegExp, EventCategory][] = [
  [/^Story Event/i, 'story'],
  [/^Map Event/i, 'map'],
  [/^Fo?r?midable Battle/i, 'formidable'],
  [/^Raid Battle/i, 'raid'],
  [/^Domain Investigation Event/i, 'domain'],
  [/^All-Out Battle/i, 'allout'],
  [/^Exploration Event/i, 'exploration'],
  [/^Memory Quest/i, 'memory'],
  [/^Grand Exorcism/i, 'exorcism'],
  [/^Chiki Chiki/i, 'corpse'],
];
export const EVENT_CATEGORIES = CATEGORY.map(([, c]) => c);
const categoryOf = (title: string) => CATEGORY.find(([re]) => re.test(title))?.[1];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const toEvent = (server: 'jp' | 'global') => (b: (typeof JP_BANNERS)[number]): Content[] => {
  const category = categoryOf(b.name);
  if (b.kind !== 'event' || !category) return [];
  return [{
    id: `${server}-${b.start.slice(0, 10)}-${slug(b.name).slice(0, 60)}`,
    kind: 'event',
    name: b.name.replace(/\s+/g, ' ').replace(/^Fomidable/, 'Formidable').trim(), // errata de la wiki
    category,
    server,
    start: b.start,
    end: b.end,
    source: { label: b.source.label, url: b.source.url ?? WIKI_GUIDE.url },
  }];
};

export const EVENTS: Content[] = [...new Map(
  [...GLOBAL_BANNERS.flatMap(toEvent('global')), ...JP_BANNERS.flatMap(toEvent('jp'))].map((e) => [e.id, e]),
).values()].sort((a, b) => (b.start ?? '').localeCompare(a.start ?? ''));
export const CONTENT: Content[] = [...MODES, ...EVENTS];
export const getContent = (id: string) => CONTENT.find((c) => c.id === id) ?? null;

/** Datos de un contenido: la entrada propia y, en la torre, una por piso ("illusory-tower/12"). */
export const affinityEntries = (id: string): Record<string, AffinityData> =>
  Object.fromEntries(Object.entries(M.affinity).filter(([k]) => k === id || k.startsWith(`${id}/`)));
