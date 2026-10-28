// Comparador: hasta 3 personajes lado a lado (perfil, rango, estadísticas, habilidades y memorias).
// La selección va en el enlace (#c=id1,id2,id3) para poder compartirla.
import { useEffect, useState, type ReactNode } from 'react';

export interface CmpSkill { label: string; name: string | null; cost: number | null; img: string | null }
export interface CmpChar {
  id: string; name: string; ep: string | null; el: string; img: string | null; href: string;
  rarity: string; elLabel: string; role: string | null; focus: string | null; av: string | null; tier: string | null;
  bf: boolean | null; released: string;
  stats: { hp: number | null; attack: number | null; jujutsu: number | null; gauge: number | null; ce: string | null };
  skills: CmpSkill[];
  memories: { name: string; img: string | null; href: string | null }[];
}

const EL_COLOR: Record<string, string> = { red: '#ff4d5e', blue: '#4d8dff', green: '#3fcf8e', yellow: '#f4c34d' };
const TIER_ORDER = ['SS', 'S', 'A', 'B', 'C', 'D'];
const MAX = 3;
const COLS = 'grid grid-cols-[minmax(0,6rem)_repeat(3,minmax(0,1fr))] gap-2 sm:grid-cols-[10rem_repeat(3,minmax(0,1fr))] sm:gap-3';

export default function Compare({ chars, labels: L, locale }: { chars: CmpChar[]; labels: Record<string, string>; locale: string }) {
  const [ids, setIds] = useState<(string | null)[]>([null, null, null]);
  const byId = new Map(chars.map((c) => [c.id, c]));
  const fmt = new Intl.NumberFormat(locale);

  // Al abrir: la selección del enlace compartido
  useEffect(() => {
    const m = location.hash.match(/c=([^&]*)/);
    if (!m) return;
    const got = decodeURIComponent(m[1]).split(',').filter((id) => byId.has(id)).slice(0, MAX);
    setIds([...got, null, null, null].slice(0, MAX));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const sel = ids.filter(Boolean).join(',');
    history.replaceState(null, '', sel ? `#c=${sel}` : location.pathname);
  }, [ids]);

  const set = (i: number, id: string | null) => setIds((prev) => prev.map((x, j) => (j === i ? id : x)));
  const picked = ids.map((id) => (id ? byId.get(id) ?? null : null));
  const shown = picked.filter((c): c is CmpChar => !!c);
  const sorted = [...chars].sort((a, b) => a.name.localeCompare(b.name) || (a.ep ?? '').localeCompare(b.ep ?? ''));

  // Fila numérica: resalta el valor más alto
  const numRow = (label: string, get: (c: CmpChar) => number | null) => {
    const vals = picked.map((c) => (c ? get(c) : null));
    const best = Math.max(...vals.map((v) => v ?? -Infinity));
    return (
      <Row label={label} key={label}>
        {vals.map((v, i) => (
          <Cell key={i}>
            {picked[i] && (v == null ? <span className="text-smoke">—</span> : (
              <span className={`tabular-nums ${shown.length > 1 && v === best ? 'font-black text-flame' : 'text-bone'}`}>{fmt.format(v)}</span>
            ))}
          </Cell>
        ))}
      </Row>
    );
  };
  const textRow = (label: string, get: (c: CmpChar) => ReactNode) => (
    <Row label={label} key={label}>
      {picked.map((c, i) => <Cell key={i}>{c ? get(c) || <span className="text-smoke">—</span> : null}</Cell>)}
    </Row>
  );
  const tierBest = TIER_ORDER.find((t) => shown.some((c) => c.tier === t));

  return (
    <div>
      {/* Selectores */}
      <div className={`${COLS} px-3`}>
        <span />
        {picked.map((c, i) => (
          <div key={i} className="card flex min-w-0 flex-col items-center gap-2 p-2 text-center sm:p-3" style={c ? { boxShadow: `inset 0 0 0 1px ${EL_COLOR[c.el]}66` } : undefined}>
            {c?.img ? (
              <a href={c.href} title={L['cmp.open']} className="w-full max-w-[110px]"><img src={c.img} alt="" className="aspect-square w-full rounded-lg bg-coal object-cover object-top" /></a>
            ) : (
              <div className="grid aspect-square w-full max-w-[110px] place-items-center rounded-lg border border-dashed border-line text-2xl text-smoke">+</div>
            )}
            {c && (
              <div className="w-full min-w-0">
                <a href={c.href} className="block truncate text-xs font-bold text-bone hover:text-flame sm:text-sm">{c.name}</a>
                <span className="block truncate text-[10px] text-smoke sm:text-xs">{c.ep}</span>
              </div>
            )}
            <select
              value={ids[i] ?? ''}
              onChange={(e) => set(i, e.target.value || null)}
              aria-label={`${L['cmp.pick']} ${i + 1}`}
              className="w-full min-w-0 rounded-md border border-line bg-coal px-1.5 py-1 text-[11px] text-bone sm:text-xs"
            >
              <option value="">{c ? L['cmp.remove'] : L['cmp.pick']}</option>
              {sorted.map((o) => (
                <option key={o.id} value={o.id} disabled={ids.includes(o.id) && ids[i] !== o.id}>
                  {o.name}{o.ep ? ` · ${o.ep}` : ''} ({o.rarity})
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {!shown.length ? (
        <p className="mt-8 text-center text-dust">{L['cmp.empty']}</p>
      ) : (
        <div className="mt-6 space-y-6">
          <Section title={L['cmp.profile']}>
            {textRow(L['cmp.rarity'], (c) => c.rarity)}
            {textRow(L['cmp.element'], (c) => <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: EL_COLOR[c.el] }} />{c.elLabel}</span>)}
            {textRow(L['cmp.role'], (c) => [c.role, c.focus].filter(Boolean).join(' · '))}
            {textRow(L['cmp.tier'], (c) => c.tier && <span className={`font-black ${c.tier === tierBest && shown.length > 1 ? 'text-flame' : 'text-bone'}`}>{c.tier}</span>)}
            {textRow(L['cmp.avail'], (c) => c.av)}
            {textRow(L['ch.bf'], (c) => (c.bf == null ? null : c.bf ? L['cmp.yes'] : L['cmp.no']))}
            {textRow(L['ch.released'], (c) => c.released)}
          </Section>

          <Section title={L['ch.stats']}>
            {numRow(L['ch.hp'], (c) => c.stats.hp)}
            {numRow(L['ch.attack'], (c) => c.stats.attack)}
            {numRow(L['ch.jujutsu'], (c) => c.stats.jujutsu)}
            {numRow(L['ch.gauge'], (c) => c.stats.gauge)}
            {textRow(L['ch.ce'], (c) => c.stats.ce)}
          </Section>

          <Section title={L['ch.skills']}>
            {[0, 1, 2, 3].map((k) => textRow(shown[0].skills[k]?.label ?? '', (c) => {
              const s = c.skills[k];
              if (!s?.name) return null;
              return (
                <span className="flex items-start gap-2">
                  {s.img && <img src={s.img} alt="" loading="lazy" className="hidden size-7 shrink-0 rounded bg-coal object-cover sm:block" />}
                  <span className="min-w-0">
                    <span className="block text-bone">{s.name}</span>
                    {s.cost != null && <span className="text-[11px] text-smoke">{L['ch.cost'].replace('{n}', String(s.cost))}</span>}
                  </span>
                </span>
              );
            }))}
          </Section>

          <Section title={L['ch.memories']}>
            {[0, 1, 2, 3].map((k) => textRow(`${k + 1}`, (c) => {
              const m = c.memories[k];
              if (!m) return null;
              const inner = (
                <span className="flex items-center gap-2">
                  {m.img && <img src={m.img} alt="" loading="lazy" className="hidden size-8 shrink-0 rounded bg-coal object-cover sm:block" />}
                  <span className="min-w-0 text-bone">{m.name}</span>
                </span>
              );
              return m.href ? <a href={m.href} className="hover:text-flame">{inner}</a> : inner;
            }))}
          </Section>
          <p className="text-xs text-smoke">{L['cmp.best']}</p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <h2 className="border-b border-line bg-cinder/60 px-3 py-2 font-sans text-sm font-bold text-bone">{title}</h2>
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={`${COLS} px-3 py-2 text-xs sm:text-sm`}>
      <span className="text-smoke">{label}</span>
      {children}
    </div>
  );
}

function Cell({ children }: { children: ReactNode }) {
  return <div className="min-w-0 break-words">{children}</div>;
}
