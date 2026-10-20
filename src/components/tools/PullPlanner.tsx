// Planificador de tiradas: cuántas tienes, cuántas tendrás en una fecha, el pity y la probabilidad.
// Todo se calcula en el navegador; los valores se recuerdan en localStorage ("pp-planner").
import { useEffect, useMemo, useState } from 'react';
import { atLeastOne, pullsForChance, pullsFrom } from '@/lib/gacha-math';

export interface PlannerTarget { id: string; label: string; date: string; group: 'global' | 'estimate' }
export interface PlannerProps {
  gacha: { cubesPerPull: number; pity: number; ssrCharRate: number; maxCards: number; sourceLabel: string; sourceUrl: string };
  targets: PlannerTarget[];
  labels: Record<string, string>;
  locale: string;
}

interface State { cubes: number; tickets: number; points: number; cards: number; daily: number; featured: string; date: string }
const KEY = 'pp-planner';
const DAY = 864e5;
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: State = { cubes: 0, tickets: 0, points: 0, cards: 0, daily: 0, featured: '', date: '' };
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

function load(): State {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw && typeof raw === 'object') return { ...EMPTY, ...raw };
  } catch { /* sin almacenamiento */ }
  return EMPTY;
}

const inputCls = 'h-9 w-32 rounded-lg border border-line bg-ash px-3 text-right text-sm font-semibold text-bone tabular-nums focus:border-ember/60 focus:outline-none';

function NumField({ label, hint, value, onChange, max }: { label: string; hint?: string; value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <label className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-bone">{label}</span>
        {hint && <span className="block text-[11px] leading-snug text-smoke">{hint}</span>}
      </span>
      <input type="number" inputMode="numeric" min={0} max={max} value={value || ''} placeholder="0"
        onChange={(e) => onChange(Math.min(max ?? 1e9, Math.max(0, Math.round(Number(e.target.value) || 0))))} className={inputCls} />
    </label>
  );
}

function Pct({ value }: { value: number }) {
  const pct = Math.round(value * 1000) / 10;
  return (
    <div className="mt-2">
      <div className="h-2 overflow-hidden rounded-full bg-cinder">
        <div className="h-full rounded-full bg-gradient-to-r from-ember to-flame transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="mt-1 text-2xl font-black text-bone tabular-nums">{pct.toLocaleString(undefined, { maximumFractionDigits: 1 })} %</p>
    </div>
  );
}

export default function PullPlanner({ gacha, targets, labels: L, locale }: PlannerProps) {
  const [s, setS] = useState<State>(EMPTY);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { setS(load()); setReady(true); }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sin almacenamiento */ }
  }, [s, ready]);
  const set = (p: Partial<State>) => setS((o) => ({ ...o, ...p }));

  const loadAccount = () => {
    try {
      const inv = JSON.parse(localStorage.getItem('pp-inventory') ?? 'null');
      const r = inv?.resources ?? {};
      if (!inv || (!r.cubes && !r.tickets && !r.featured)) { setMsg(L['pl.noinv']); return; }
      set({ cubes: Math.max(0, Number(r.cubes) || 0), tickets: Math.max(0, (Number(r.tickets) || 0) + (Number(r.featured) || 0)) });
      setMsg(L['pl.loaded']);
    } catch { setMsg(L['pl.noinv']); }
  };

  const fmtDate = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
  const r = useMemo(() => {
    const days = s.date ? Math.max(0, Math.ceil((+new Date(`${s.date}T00:00:00Z`) - +new Date(`${today()}T00:00:00Z`)) / DAY)) : 0;
    const cards = Math.min(gacha.maxCards, s.cards);
    const pullsNow = pullsFrom(s.cubes, s.tickets, gacha.cubesPerPull);
    const cubesAt = s.cubes + s.daily * days;
    const pulls = s.date ? pullsFrom(cubesAt, s.tickets, gacha.cubesPerPull) : pullsNow;
    const points = s.points + cards + pulls;
    const missingPulls = Math.max(0, gacha.pity - points);
    // Cubos que faltan, descontando el sobrante que no llega a una tirada
    const cubesMissing = missingPulls ? Math.max(0, missingPulls * gacha.cubesPerPull - (cubesAt % gacha.cubesPerPull)) : 0;
    const daysToPity = s.daily > 0 && cubesMissing ? Math.ceil(cubesMissing / s.daily) : null;
    const f = Number(s.featured.replace(',', '.'));
    const featured = Number.isFinite(f) && f > 0 && f <= 100 ? f / 100 : null;
    return {
      days, pullsNow, pulls, points, missingPulls, cubesMissing, daysToPity,
      ssr: atLeastOne(gacha.ssrCharRate, pulls),
      ssrExpected: pulls * gacha.ssrCharRate,
      feat: featured ? (missingPulls === 0 ? 1 : atLeastOne(featured, pulls)) : null,
      need50: featured ? pullsForChance(featured, 0.5) : 0,
      need90: featured ? pullsForChance(featured, 0.9) : 0,
    };
  }, [s, gacha]);
  const pityDate = r.daysToPity != null ? new Date(+new Date(`${s.date || today()}T00:00:00Z`) + r.daysToPity * DAY).toISOString().slice(0, 10) : null;

  // La página es estática: se descartan en el navegador las fechas que ya han pasado
  const groups = (['global', 'estimate'] as const)
    .map((g) => ({ g, items: targets.filter((t) => t.group === g && t.date >= today()) }))
    .filter((x) => x.items.length);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="card min-w-0 p-5 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-sans text-base font-bold text-bone">{L['pl.inputs']}</h2>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary h-8 px-3 text-xs" onClick={loadAccount}>{L['pl.load']}</button>
            <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={() => { setS(EMPTY); setMsg(''); }}>{L['pl.reset']}</button>
          </div>
        </div>
        {msg && <p className="mb-2 text-xs text-flame" role="status">{msg}</p>}
        <NumField label={L['pl.cubes']} value={s.cubes} onChange={(v) => set({ cubes: v })} />
        <NumField label={L['pl.tickets']} value={s.tickets} onChange={(v) => set({ tickets: v })} />
        <NumField label={L['pl.points']} hint={L['pl.points.hint']} value={s.points} onChange={(v) => set({ points: v })} max={gacha.pity} />
        <NumField label={fill(L['pl.cards'], { n: gacha.maxCards })} value={s.cards} onChange={(v) => set({ cards: v })} max={gacha.maxCards} />
        <NumField label={L['pl.daily']} hint={L['pl.daily.hint']} value={s.daily} onChange={(v) => set({ daily: v })} />

        <div className="border-b border-line py-3">
          <span className="block text-sm font-medium text-bone">{L['pl.target']}</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <input type="date" min={today()} value={s.date} onChange={(e) => set({ date: e.target.value })} aria-label={L['pl.target']}
              className="h-9 rounded-lg border border-line bg-ash px-3 text-sm text-bone [color-scheme:dark] focus:border-ember/60 focus:outline-none" />
            {groups.length > 0 && (
              <select value="" onChange={(e) => e.target.value && set({ date: e.target.value })} aria-label={L['pl.target.pick']}
                className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-ash px-2 text-sm text-bone focus:border-ember/60 focus:outline-none">
                <option value="">{L['pl.target.pick']}</option>
                {groups.map(({ g, items }) => (
                  <optgroup key={g} label={L[g === 'global' ? 'pl.global' : 'pl.estimates']}>
                    {items.map((t) => <option key={t.id} value={t.date}>{t.label} · {fmtDate(t.date)}</option>)}
                  </optgroup>
                ))}
              </select>
            )}
            {s.date && <button type="button" className="btn-ghost h-9 px-2 text-xs" onClick={() => set({ date: '' })} aria-label={L['pl.reset']}>✕</button>}
          </div>
          <p className="mt-1 text-[11px] text-smoke">{L['pl.target.hint']}</p>
        </div>

        <label className="block py-3">
          <span className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-bone">{L['pl.featured']}</span>
            <input type="text" inputMode="decimal" value={s.featured} placeholder="—" onChange={(e) => set({ featured: e.target.value.slice(0, 6) })} className={inputCls} />
          </span>
          <span className="mt-1 block text-[11px] leading-snug text-smoke">{L['pl.featured.hint']}</span>
        </label>
      </section>

      <section className="min-w-0 space-y-4" aria-live="polite">
        <div className="card p-5">
          <p className="eyebrow">{L['pl.pulls']}</p>
          <p className="mt-1 text-4xl font-black text-fire tabular-nums">{r.pulls.toLocaleString()}</p>
          <p className="mt-1 text-xs text-dust">
            {s.date ? fill(L['pl.pulls.target'], { n: r.pullsNow.toLocaleString(), d: fmtDate(s.date), days: r.days }) : L['pl.pulls.now']}
          </p>
        </div>

        <div className="card p-5">
          <p className="eyebrow">{fill(L['pl.pity'], { n: gacha.pity })}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-cinder">
            <div className="h-full rounded-full bg-gradient-to-r from-ember to-flame" style={{ width: `${Math.min(100, (r.points / gacha.pity) * 100)}%` }} />
          </div>
          <p className="mt-1 text-sm text-bone tabular-nums">{Math.min(r.points, gacha.pity)} / {gacha.pity}</p>
          <p className="mt-2 text-sm text-dust">
            {r.missingPulls === 0 ? L['pl.pity.ok'] : fill(L['pl.pity.missing'], { p: r.missingPulls, c: r.cubesMissing.toLocaleString() })}
          </p>
          {r.daysToPity != null && pityDate && (
            <p className="mt-1 text-xs text-smoke">{fill(L['pl.pity.days'], { d: s.daily.toLocaleString(), n: r.daysToPity, date: fmtDate(pityDate) })}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <p className="text-sm font-semibold text-bone">{L['pl.ssr']}</p>
            <Pct value={r.ssr} />
            <p className="text-xs text-smoke">{fill(L['pl.ssr.expected'], { n: (Math.round(r.ssrExpected * 10) / 10).toLocaleString() })}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold text-bone">{L['pl.feat']}</p>
            {r.feat != null ? (
              <>
                <Pct value={r.feat} />
                <p className="text-xs text-smoke">{fill(L['pl.feat.need'], { a: r.need50, b: r.need90 })}</p>
              </>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-smoke">{L['pl.feat.none']}</p>
            )}
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-smoke">
          {L['pl.note']}{' '}
          <a href={gacha.sourceUrl} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-dust">{gacha.sourceLabel}</a>
        </p>
      </section>
    </div>
  );
}
