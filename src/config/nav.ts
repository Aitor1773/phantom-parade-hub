import type { IconName } from '@/components/icons';
import type { UIKey } from '@/i18n/ui';

export interface NavLink {
  id: string;
  path: string; // sin prefijo de idioma, p. ej. "/characters"
  label: UIKey;
  desc: UIKey;
  icon: IconName;
  phase: number; // fase del roadmap en la que se publica
}

export interface NavGroup {
  id: string;
  label: UIKey;
  icon: IconName;
  items: NavLink[];
  feature?: { title: UIKey; desc: UIKey; path: string };
}

export type NavEntry = NavGroup | (NavLink & { items?: undefined });

export const NAV: NavEntry[] = [
  {
    id: 'database',
    label: 'nav.database',
    icon: 'database',
    items: [
      { id: 'characters', path: '/characters', label: 'nav.characters', desc: 'nav.characters.desc', icon: 'users', phase: 1 },
      { id: 'memories', path: '/memories', label: 'nav.memories', desc: 'nav.memories.desc', icon: 'layers', phase: 1 },
    ],
    feature: { title: 'nav.feature.latest', desc: 'nav.feature.latest.desc', path: '/characters' },
  },
  {
    id: 'guides',
    label: 'nav.guides',
    icon: 'book',
    items: [
      { id: 'beginner', path: '/guides/beginner', label: 'nav.beginner', desc: 'nav.beginner.desc', icon: 'book', phase: 1 },
      { id: 'tier-list', path: '/tier-list', label: 'nav.tierlist', desc: 'nav.tierlist.desc', icon: 'trophy', phase: 1 },
      { id: 'teams', path: '/teams', label: 'nav.teams', desc: 'nav.teams.desc', icon: 'swords', phase: 1 },
      { id: 'team-builder', path: '/team-builder', label: 'nav.teambuilder', desc: 'nav.teambuilder.desc', icon: 'grid', phase: 2 },
    ],
    feature: { title: 'nav.feature.recs', desc: 'nav.feature.recs.desc', path: '/account' },
  },
  { id: 'banners', path: '/banners', label: 'nav.banners', desc: 'nav.banners.desc', icon: 'calendar', phase: 1 },
  {
    id: 'tools',
    label: 'nav.tools',
    icon: 'cube',
    items: [
      { id: 'pulls', path: '/tools/pulls', label: 'nav.pulls', desc: 'nav.pulls.desc', icon: 'target', phase: 2 },
      { id: 'tier-maker', path: '/tools/tier-maker', label: 'nav.tiermaker', desc: 'nav.tiermaker.desc', icon: 'trophy', phase: 2 },
      { id: 'collection', path: '/tools/collection', label: 'nav.collection', desc: 'nav.collection.desc', icon: 'user', phase: 2 },
      { id: 'codes', path: '/codes', label: 'nav.codes', desc: 'nav.codes.desc', icon: 'gift', phase: 1 },
    ],
  },
];

export const ACCOUNT_LINK: NavLink = {
  id: 'account', path: '/account', label: 'nav.account', desc: 'nav.account.desc', icon: 'user', phase: 3,
};

/** Todas las páginas enlazadas, aplanadas (para el buscador y las rutas "próximamente"). */
export const ALL_LINKS: NavLink[] = [
  ...NAV.flatMap((e) => (e.items ? e.items : [e as NavLink])),
  ACCOUNT_LINK,
];
