// Contenido del juego para la sección de equipos: modos permanentes (Beginner's Guide de la wiki),
// pisos de la Torre ilusoria y eventos de combate (cronología JP de la wiki + eventos Global curados).
// Las debilidades/resistencias vienen de data/manual/content.json (a mano, desde el juego).
import manual from '../../data/manual/content.json';
import community from '../../data/community.json';
import stagesFile from '../../data/manual/stages.json';
import eventGuides from '../../data/normalized/event-guides.json';
import type { Stage } from '@/lib/stage';
import { GLOBAL_BANNERS, JP_BANNERS } from './banners';
import type { ElementKey } from '@/lib/team-recs';

export type ContentKind = 'mode' | 'event';
export type EventCategory = 'story' | 'map' | 'formidable' | 'raid' | 'domain' | 'allout' | 'exploration' | 'memory' | 'exorcism' | 'corpse'
  | 'imaginary' | 'side' | 'marathon' | 'main';
export interface AffinityData { weak?: ElementKey[]; resist?: ElementKey[]; note?: string; checked?: string; /** usuarios del foro que lo confirman */ community?: number }

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

// Modos con combates (la wiki describe también Dispatch, que no tiene combates).
// Los últimos salen de la cronología JP de la wiki ("New Content", "New Feature"…), con su fecha.
const TIMELINE = { label: 'JJK Phantom Parade Wiki · Timeline Of Events (JP)', url: 'https://jjk-phantom-parade.fandom.com/wiki/Timeline_Of_Events_(JP)' };
const MODE_DEFS: { id: string; since?: string; floors?: number }[] = [
  { id: 'illusory-tower' },
  // Global: «Anomalous Form» · JP: 夢幻廻楼・異相 (20 pisos por temporada)
  { id: 'illusory-tower-diverse', since: '2026-07-27', floors: 20 },
  { id: 'formidable-foe-back', since: '2026-07-07' },
  { id: 'sp-battle', since: '2025-09-12' },
  { id: 'main-quest' },
];
export const MODE_IDS = MODE_DEFS.map((m) => m.id);
export const MODES: Content[] = MODE_DEFS.map(({ id, since, floors }) => ({
  id,
  kind: 'mode',
  name: id,
  ...(id === 'illusory-tower' ? { floors: M.towerFloors } : floors ? { floors } : {}),
  ...(since ? { start: `${since}T15:00:00+09:00`, server: 'jp' as const } : {}),
  source: since ? TIMELINE : WIKI_GUIDE,
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
  [/^Imaginary Realm/i, 'imaginary'],
  [/^Side Story/i, 'side'],
  [/^Event Marathon/i, 'marathon'],
  [/^Main Story(?: Update)?:/i, 'main'],
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

// ── Fichas de fases (transcritas de capturas del juego) ──
const STAGES = (stagesFile as unknown as { stages: Record<string, Stage> }).stages;
/**
 * Fichas de un contenido: la propia ("<id>") y las de sus fases ("<id>/<fase>").
 * Sin fuente ni enlace: la web no nombra ni enlaza otras webs (las fuentes están en Créditos).
 */
export const stagesOf = (id: string): Record<string, Stage> => {
  const own = Object.fromEntries(Object.entries(STAGES).filter(([k]) => k === id || k.startsWith(`${id}/`)).map(([k, s]) => {
    const { source: _s, url: _u, cleared, guide, ...rest } = s;
    return [k, {
      ...rest,
      ...(cleared ? { cleared: { ...cleared, source: undefined, url: undefined } } : {}),
      ...(guide ? { guide: { ...guide, source: undefined, url: undefined } } : {}),
    }];
  }));
  const ev = eventStage(id);
  return ev && !own[id] ? { [id]: ev, ...own } : own;
};

// ── Eventos en curso (npm run data:events, a diario): equipo recomendado y elemento ──
type EventGuide = {
  start: string | null; end: string | null;
  parties: { chars: { id: string | null }[]; memories: { id: string | null; jp: string }[]; elements: ElementKey[]; auto: boolean }[];
  bonusMemories: { id: string | null }[];
};
const EVENT_GUIDES = (eventGuides as unknown as { fetchedAt: string | null; events: EventGuide[] });
/** Ficha generada para un evento JP que coincide (por fecha de inicio) con uno de la lista diaria. */
function eventStage(id: string): Stage | null {
  const c = EVENTS.find((e) => e.id === id);
  if (!c || c.server !== 'jp' || !c.start) return null;
  const day = (iso: string) => new Date(Date.parse(iso) + 9 * 3600e3).toISOString().slice(0, 10); // fecha en Japón
  const g = EVENT_GUIDES.events.find((x) => x.start && day(x.start) === day(c.start!));
  const p = g?.parties.find((x) => x.chars.filter((ch) => ch.id).length >= 2);
  if (!g || !p) return null;
  return {
    server: 'jp',
    checked: EVENT_GUIDES.fetchedAt?.slice(0, 10),
    ...(p.elements.length ? { recommended: p.elements } : {}),
    picks: [...new Set(g.parties.flatMap((x) => x.chars.map((ch) => ch.id).filter((v): v is string => !!v)))],
    cleared: {
      kind: p.auto ? 'farm' : 'recommended',
      chars: p.chars.map((ch) => ({ id: ch.id, name: '' })),
      mems: p.memories.map((m) => ({ id: m.id, name: m.id ? '' : m.jp })),
    },
  } as Stage;
}

// ── Comunidad (foro con Giscus, leído a diario por npm run data:community) ──
export interface CommunityTeam { main: (string | null)[]; sub: string | null; helper: string | null; mems: (string | null)[]; floor: number | null; votes: number; author: string; url: string; date: string }
type Thread = { url: string; comments: number; teams: CommunityTeam[]; affinity: Record<string, { weak: ElementKey[]; resist: ElementKey[]; reports: number }> };
const C = community as unknown as { updatedAt: string | null; threads: Record<string, Thread> };
export const COMMUNITY_UPDATED = C.updatedAt;
export const communityThread = (id: string): Thread | null => C.threads[id] ?? null;

/**
 * Datos de un contenido: la entrada propia y, en la torre, una por piso ("illusory-tower/12").
 * Lo que guardas a mano manda; si no hay, se usa lo que confirma la comunidad.
 */
export const affinityEntries = (id: string): Record<string, AffinityData> => {
  const fromCommunity = Object.fromEntries(Object.entries(communityThread(id)?.affinity ?? {})
    .map(([k, v]) => [k, { weak: v.weak, resist: v.resist, community: v.reports } as AffinityData]));
  const manual = Object.fromEntries(Object.entries(M.affinity).filter(([k]) => k === id || k.startsWith(`${id}/`)));
  return { ...fromCommunity, ...manual };
};
