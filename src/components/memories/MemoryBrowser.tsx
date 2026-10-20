import { useDeferredValue, useEffect, useMemo, useState } from 'react';

export interface MemoryItem {
  id: string;
  name: string;
  rarity: string;
  orientation: string;
  availability: string;
  tags: string[];
  date: string | null;
  img: string | null;
  srcset?: string;
  search: string; // nombre + texto de efectos, en minúsculas y sin tildes
}

interface Option { value: string; label: string }
interface Props {
  items: MemoryItem[];
  basePath: string;
  labels: Record<string, string>;
  tagLabels: Record<string, string>;
  options: { rarity: Option[]; orientation: Option[]; tags: Option[]; availability: Option[] };
}

type FilterKey = 'rarity' | 'orientation' | 'tags' | 'availability';
type Sort = 'newest' | 'oldest' | 'name' | 'rarity';
const KEYS: FilterKey[] = ['rarity', 'orientation', 'tags', 'availability'];
const RARITY_RANK: Record<string, number> = { SSR: 0, SR: 1, R: 2 };
const RARITY_CLASS: Record<string, string> = { SSR: 'badge-ssr', SR: 'badge-sr', R: 'badge-r' };

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const empty = () => Object.fromEntries(KEYS.map((k) => [k, []])) as unknown as Record<FilterKey, string[]>;

export default function MemoryBrowser({ items, basePath, labels, tagLabels, options }: Props) {
  const [filters, setFilters] = useState(empty);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [ready, setReady] = useState(false);
  const q = useDeferredValue(query);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setFilters(Object.fromEntries(KEYS.map((k) => [k, p.get(k)?.split(',').filter(Boolean) ?? []])) as Record<FilterKey, string[]>);
    setQuery(p.get('q') ?? '');
    setSort((p.get('sort') as Sort) || 'newest');
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const p = new URLSearchParams();
    if (query) p.set('q', query);
    if (sort !== 'newest') p.set('sort', sort);
    KEYS.forEach((k) => filters[k].length && p.set(k, filters[k].join(',')));
    history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
  }, [filters, query, sort, ready]);

  const toggle = (k: FilterKey, v: string) =>
    setFilters((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));
  const active = KEYS.reduce((n, k) => n + filters[k].length, 0);

  const results = useMemo(() => {
    const terms = normalize(q.trim()).split(/\s+/).filter(Boolean);
    const list = items.filter((m) => {
      if (filters.rarity.length && !filters.rarity.includes(m.rarity)) return false;
      if (filters.orientation.length && !filters.orientation.includes(m.orientation)) return false;
      if (filters.availability.length && !filters.availability.includes(m.availability)) return false;
      // Etiquetas: debe tener todas las elegidas
      if (filters.tags.length && !filters.tags.every((t) => m.tags.includes(t))) return false;
      return terms.every((t) => m.search.includes(t));
    });
    const by: Record<Sort, (a: MemoryItem, b: MemoryItem) => number> = {
      newest: (a, b) => (b.date ?? '').localeCompare(a.date ?? ''),
      oldest: (a, b) => (a.date ?? '9').localeCompare(b.date ?? '9'),
      name: (a, b) => a.name.localeCompare(b.name),
      rarity: (a, b) => (RARITY_RANK[a.rarity] ?? 9) - (RARITY_RANK[b.rarity] ?? 9) || (b.date ?? '').localeCompare(a.date ?? ''),
    };
    return list.sort(by[sort]);
  }, [items, filters, q, sort]);

  const groups: { key: FilterKey; label: string; opts: Option[] }[] = [
    { key: 'rarity', label: labels['db.rarity'], opts: options.rarity },
    { key: 'orientation', label: labels['mem.orientation'], opts: options.orientation },
    { key: 'tags', label: labels['mem.effect'], opts: options.tags },
    { key: 'availability', label: labels['db.availability'], opts: options.availability },
  ];

  return (
    <div>
      <div className="sticky top-[var(--nav-h)] z-30 -mx-4 border-b border-line/60 bg-ash/85 px-4 py-3 backdrop-blur-xl lg:mx-0 lg:rounded-xl lg:border lg:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1 basis-60">
            <svg className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-smoke" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7.5" /><path d="m20.5 20.5-4.2-4.2" /></svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels['mem.search']}
              aria-label={labels['mem.search']}
              className="h-10 w-full rounded-lg border border-line bg-coal pr-3 pl-9 text-sm text-bone placeholder:text-smoke focus:border-ember/60 focus:outline-none"
            />
          </label>
          <button type="button" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} className="btn-secondary h-10 lg:hidden">
            {labels['db.filters']}
            {active > 0 && <span className="grid size-5 place-items-center rounded-full bg-ember text-[11px] text-ash">{active}</span>}
          </button>
          <label className="flex h-10 items-center gap-2 rounded-lg border border-line bg-coal pl-3 text-sm text-dust">
            <span className="hidden sm:inline">{labels['db.sort']}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-full cursor-pointer rounded-r-lg bg-coal pr-3 text-bone focus:outline-none">
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
                  className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition ${
                    on ? 'border-ember/70 bg-ember/15 text-bone' : 'border-line bg-coal text-dust hover:border-line-strong hover:text-bone'
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between text-sm text-dust">
        <span aria-live="polite">{labels['mem.count'].replace('{n}', String(results.length))}</span>
        {(active > 0 || query) && (
          <button type="button" onClick={() => { setFilters(empty()); setQuery(''); }} className="text-ember hover:text-flame">
            {labels['db.clear']}
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <p className="card mt-6 p-10 text-center text-dust">{labels['db.empty']}</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((m) => (
            <li key={m.id}>
              <a href={`${basePath}/${m.id}`} className="group block overflow-hidden rounded-xl border border-line bg-coal transition duration-300 hover:-translate-y-1 hover:border-line-strong">
                <div className="relative aspect-[2/1] overflow-hidden bg-cinder">
                  {m.img ? (
                    <img src={m.img} srcSet={m.srcset} sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full place-items-center bg-gradient-to-br from-blood/40 to-coal text-xs text-smoke">{labels['mem.noimage']}</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-coal via-transparent to-transparent" />
                  <span className={`${RARITY_CLASS[m.rarity] ?? 'badge'} absolute top-2 left-2 backdrop-blur-sm`}>{m.rarity}</span>
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-semibold text-bone">{m.name}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded-md border border-line bg-cinder px-1.5 py-0.5 text-[10px] font-medium text-dust">{tagLabels[t] ?? t}</span>
                    ))}
                    {m.tags.length > 3 && <span className="px-1 text-[10px] text-smoke">+{m.tags.length - 3}</span>}
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
