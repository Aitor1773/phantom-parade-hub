import { useEffect, useMemo, useState, useDeferredValue } from 'react';

export interface BrowserItem {
  id: string;
  name: string;
  epithet: string | null;
  rarity: string;
  element: string;
  role: string | null;
  focus: string | null;
  availability: string | null;
  date: string | null;
  img: string | null;
  srcset?: string;
}

interface Option { value: string; label: string }

interface Props {
  items: BrowserItem[];
  basePath: string; // p. ej. "/es/characters"
  labels: Record<string, string>;
  options: { rarity: Option[]; element: Option[]; role: Option[]; focus: Option[]; availability: Option[] };
}

type FilterKey = 'rarity' | 'element' | 'role' | 'focus' | 'availability';
type Sort = 'newest' | 'oldest' | 'name' | 'rarity';
const FILTER_KEYS: FilterKey[] = ['rarity', 'element', 'role', 'focus', 'availability'];
const RARITY_RANK: Record<string, number> = { SSR: 0, SR: 1, R: 2 };

export const ELEMENT_COLOR: Record<string, string> = {
  red: '#ff5a5f',
  blue: '#4da3ff',
  green: '#3fcf8e',
  yellow: '#ffd23f',
  purple: '#b77dff',
};

const RARITY_CLASS: Record<string, string> = { SSR: 'badge-ssr', SR: 'badge-sr', R: 'badge-r' };

/** Marcador de posición sin arte: degradado del elemento (--el), iniciales y tajo diagonal. */
export function Placeholder({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: 'radial-gradient(120% 80% at 70% 15%, color-mix(in srgb, var(--el) 38%, transparent), transparent 60%), linear-gradient(160deg, #22130e, #0b0605)' }}
      aria-hidden="true"
    >
      <div
        className="absolute -inset-1/2 rotate-[-24deg]"
        style={{ background: 'linear-gradient(90deg, transparent 49.2%, color-mix(in srgb, var(--el) 80%, white) 50%, transparent 50.8%)', opacity: 0.55 }}
      />
      <span
        className={`absolute inset-0 grid place-items-center font-display font-black tracking-tight ${size === 'lg' ? 'text-[9rem]' : 'text-6xl'}`}
        style={{ color: 'color-mix(in srgb, var(--el) 30%, #f5e9e0)', opacity: 0.22 }}
      >
        {ini}
      </span>
    </div>
  );
}

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const emptyFilters = () => Object.fromEntries(FILTER_KEYS.map((k) => [k, []])) as unknown as Record<FilterKey, string[]>;

function readURL() {
  const q = new URLSearchParams(location.search);
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, q.get(k)?.split(',').filter(Boolean) ?? []])) as Record<FilterKey, string[]>;
  return { filters, query: q.get('q') ?? '', sort: (q.get('sort') as Sort) || 'newest' };
}

export default function CharacterBrowser({ items, basePath, labels, options }: Props) {
  const [filters, setFilters] = useState(emptyFilters);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [ready, setReady] = useState(false);
  const deferredQuery = useDeferredValue(query);

  // Restaura el estado desde la URL (enlaces compartibles)
  useEffect(() => {
    const s = readURL();
    setFilters(s.filters);
    setQuery(s.query);
    setSort(s.sort);
    setReady(true);
  }, []);

  // Guarda el estado en la URL sin recargar
  useEffect(() => {
    if (!ready) return;
    const q = new URLSearchParams();
    if (query) q.set('q', query);
    if (sort !== 'newest') q.set('sort', sort);
    FILTER_KEYS.forEach((k) => filters[k].length && q.set(k, filters[k].join(',')));
    const qs = q.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }, [filters, query, sort, ready]);

  const toggle = (key: FilterKey, value: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));

  const activeCount = FILTER_KEYS.reduce((n, k) => n + filters[k].length, 0);
  const clear = () => {
    setFilters(emptyFilters());
    setQuery('');
  };

  const results = useMemo(() => {
    const terms = normalize(deferredQuery.trim()).split(/\s+/).filter(Boolean);
    const list = items.filter((it) => {
      if (FILTER_KEYS.some((k) => filters[k].length && !filters[k].includes(String(it[k])))) return false;
      if (!terms.length) return true;
      const hay = normalize(`${it.name} ${it.epithet ?? ''}`);
      return terms.every((t) => hay.includes(t));
    });
    const by: Record<Sort, (a: BrowserItem, b: BrowserItem) => number> = {
      newest: (a, b) => (b.date ?? '').localeCompare(a.date ?? ''),
      oldest: (a, b) => (a.date ?? '').localeCompare(b.date ?? ''),
      name: (a, b) => a.name.localeCompare(b.name) || (a.epithet ?? '').localeCompare(b.epithet ?? ''),
      rarity: (a, b) => (RARITY_RANK[a.rarity] ?? 9) - (RARITY_RANK[b.rarity] ?? 9) || (b.date ?? '').localeCompare(a.date ?? ''),
    };
    return list.sort(by[sort]);
  }, [items, filters, deferredQuery, sort]);

  const groups: { key: FilterKey; label: string; opts: Option[] }[] = [
    { key: 'rarity', label: labels['db.rarity'], opts: options.rarity },
    { key: 'element', label: labels['db.element'], opts: options.element },
    { key: 'role', label: labels['db.role'], opts: options.role },
    { key: 'focus', label: labels['db.focus'], opts: options.focus },
    { key: 'availability', label: labels['db.availability'], opts: options.availability },
  ];

  return (
    <div>
      {/* Barra de búsqueda, orden y filtros */}
      <div className="sticky top-[var(--nav-h)] z-30 -mx-4 border-b border-line/60 bg-ash/85 px-4 py-3 backdrop-blur-xl lg:mx-0 lg:rounded-xl lg:border lg:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1 basis-60">
            <svg className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-smoke" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7.5" /><path d="m20.5 20.5-4.2-4.2" /></svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels['db.search']}
              aria-label={labels['db.search']}
              className="h-10 w-full rounded-lg border border-line bg-coal pr-3 pl-9 text-sm text-bone placeholder:text-smoke focus:border-ember/60 focus:outline-none"
            />
          </label>
          <button type="button" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} className="btn-secondary h-10 lg:hidden">
            {labels['db.filters']}
            {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-ember text-[11px] text-ash">{activeCount}</span>}
          </button>
          <label className="flex h-10 items-center gap-2 rounded-lg border border-line bg-coal pl-3 text-sm text-dust">
            <span className="hidden sm:inline">{labels['db.sort']}</span>
            <select value={sort} aria-label={labels['db.sort']} onChange={(e) => setSort(e.target.value as Sort)} className="h-full cursor-pointer rounded-r-lg bg-coal pr-3 text-bone focus:outline-none">
              <option value="newest">{labels['db.sort.newest']}</option>
              <option value="oldest">{labels['db.sort.oldest']}</option>
              <option value="name">{labels['db.sort.name']}</option>
              <option value="rarity">{labels['db.sort.rarity']}</option>
            </select>
          </label>
        </div>
      </div>

      <div className={`${showFilters ? 'grid' : 'hidden'} card mt-3 gap-2.5 p-4 lg:grid`}>
          {groups.map((g) => (
            <div key={g.key} className="flex flex-wrap items-center gap-1.5">
              <span className="w-full shrink-0 text-[11px] font-bold tracking-[0.15em] text-smoke uppercase sm:w-28">{g.label}</span>
              {g.opts.map((o) => {
                const on = filters[g.key].includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(g.key, o.value)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                      on ? 'border-ember/70 bg-ember/15 text-bone' : 'border-line bg-coal text-dust hover:border-line-strong hover:text-bone'
                    }`}
                  >
                    {g.key === 'element' && <span className="size-2.5 rounded-full" style={{ background: ELEMENT_COLOR[o.value] }} />}
                    {o.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

      <div className="mt-5 flex items-center justify-between text-sm text-dust">
        <span aria-live="polite">{labels['db.count'].replace('{n}', String(results.length))}</span>
        {(activeCount > 0 || query) && (
          <button type="button" onClick={clear} className="text-ember hover:text-flame">
            {labels['db.clear']}
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <p className="card mt-6 p-10 text-center text-dust">{labels['db.empty']}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {results.map((c) => (
            <li key={c.id}>
              <a
                href={`${basePath}/${c.id}`}
                className="group relative block overflow-hidden rounded-xl border border-line bg-coal transition duration-300 hover:-translate-y-1 hover:border-line-strong"
                style={{ ['--el' as string]: ELEMENT_COLOR[c.element] ?? '#ff5a1f' }}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-cinder">
                  {c.img ? (
                    <img
                      src={c.img}
                      srcSet={c.srcset}
                      sizes="(min-width: 1280px) 200px, (min-width: 640px) 25vw, 45vw"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <Placeholder name={c.name} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ash via-ash/10 to-transparent" />
                  <div
                    className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
                    style={{ boxShadow: 'inset 0 0 0 1px var(--el), inset 0 -60px 60px -40px color-mix(in srgb, var(--el) 45%, transparent)' }}
                  />
                  <span className={`${RARITY_CLASS[c.rarity] ?? 'badge'} absolute top-2 left-2 backdrop-blur-sm`}>{c.rarity}</span>
                  <span className="absolute top-2.5 right-2.5 size-3 rounded-full ring-2 ring-ash/80" style={{ background: 'var(--el)' }} />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3">
                  {c.epithet && <p className="line-clamp-1 text-[11px] font-medium text-flame/90">{c.epithet}</p>}
                  <p className="line-clamp-1 text-sm font-semibold text-bone">{c.name}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
