// Simulador de gacha: tiradas x1 / x10 con las tasas habituales de la wiki. No guarda nada.
import { useState } from 'react';
import { drawOne, drawTen, type PullResult, type Rate } from '@/lib/gacha-math';

export interface SimulatorProps {
  gacha: { cubesPerPull: number; cubesPer10: number; pity: number; rates: Rate[]; sourceLabel: string; sourceUrl: string };
  labels: Record<string, string>;
}

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
const CARD: Record<string, string> = {
  SSR: 'border-flame bg-gradient-to-b from-flame/30 to-ember/10 text-flame shadow-[0_0_18px_-4px] shadow-flame/60',
  SR: 'border-[#b06cff]/70 bg-[#b06cff]/10 text-[#d3b0ff]',
  R: 'border-line bg-cinder/60 text-dust',
};
const KINDS = ['SSR-character', 'SSR-memory', 'SR-character', 'SR-memory', 'R-character', 'R-memory'] as const;
const pct = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const AUTO_LIMIT = 2000; // tope de seguridad para "tirar hasta un SSR"

interface Stats { pulls: number; counts: Record<string, number>; since: number; firstSsrAt: number | null }
const EMPTY: Stats = { pulls: 0, counts: {}, since: 0, firstSsrAt: null };

export default function GachaSimulator({ gacha, labels: L }: SimulatorProps) {
  const [last, setLast] = useState<PullResult[]>([]);
  const [st, setSt] = useState<Stats>(EMPTY);
  const [round, setRound] = useState(0); // fuerza la animación de entrada en cada tirada

  const apply = (res: PullResult[]) => {
    setSt((o) => {
      const counts = { ...o.counts };
      let since = o.since, firstSsrAt = o.firstSsrAt;
      res.forEach((p, i) => {
        const k = `${p.rarity}-${p.type}`;
        counts[k] = (counts[k] ?? 0) + 1;
        if (k === 'SSR-character') { since = 0; firstSsrAt ??= o.pulls + i + 1; } else since++;
      });
      return { pulls: o.pulls + res.length, counts, since, firstSsrAt };
    });
    setLast(res.slice(-10));
    setRound((r) => r + 1);
  };

  const untilSsr = () => {
    const out: PullResult[] = [];
    while (out.length < AUTO_LIMIT) {
      const ten = drawTen(gacha.rates);
      out.push(...ten);
      if (ten.some((p) => p.rarity === 'SSR' && p.type === 'character')) break;
    }
    apply(out);
  };

  const spent = st.pulls * gacha.cubesPerPull;
  const typeLabel = (p: PullResult) => L[p.type === 'character' ? 'sim.char' : 'sim.mem'];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="card min-w-0 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary h-10 px-4 text-sm" onClick={() => apply([drawOne(gacha.rates)])}>
            {fill(L['sim.x1'], { c: gacha.cubesPerPull.toLocaleString() })}
          </button>
          <button type="button" className="btn-primary h-10 px-4 text-sm" onClick={() => apply(drawTen(gacha.rates))}>
            {fill(L['sim.x10'], { c: gacha.cubesPer10.toLocaleString() })}
          </button>
          <button type="button" className="btn-secondary h-10 px-4 text-sm" onClick={untilSsr}>{L['sim.auto']}</button>
          <button type="button" className="btn-ghost h-10 px-3 text-sm" onClick={() => { setSt(EMPTY); setLast([]); }}>{L['sim.reset']}</button>
        </div>

        <h2 className="mt-6 mb-3 font-sans text-sm font-bold text-bone">{L['sim.last']}</h2>
        {last.length ? (
          <ul key={round} className="grid grid-cols-5 gap-2 sm:gap-3" aria-live="polite">
            {last.map((p, i) => (
              <li key={i} className={`sim-card grid aspect-[3/4] place-items-center rounded-xl border-2 text-center ${CARD[p.rarity]}`} style={{ animationDelay: `${i * 45}ms` }}>
                <span>
                  <span className="block font-display text-xl font-black sm:text-2xl">{p.rarity}</span>
                  <span className="block text-[10px] font-semibold tracking-wide text-bone/80 uppercase sm:text-xs">{typeLabel(p)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-smoke">{L['sim.empty']}</p>
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-smoke">
          {L['sim.disclaimer']}{' '}
          <a href={gacha.sourceUrl} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-dust">{gacha.sourceLabel}</a>
        </p>
      </section>

      <aside className="card self-start p-5" aria-live="polite">
        <h2 className="font-sans text-sm font-bold text-bone">{L['sim.stats']}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-smoke">{L['sim.pulls']}</dt><dd className="text-xl font-black text-bone tabular-nums">{st.pulls.toLocaleString()}</dd></div>
          <div><dt className="text-xs text-smoke">{L['sim.spent']}</dt><dd className="text-xl font-black text-bone tabular-nums">{spent.toLocaleString()}</dd></div>
          <div><dt className="text-xs text-smoke">{L['sim.since']}</dt><dd className="text-xl font-black text-bone tabular-nums">{st.since}</dd></div>
          <div><dt className="text-xs text-smoke">{L['sim.first']}</dt><dd className="text-xl font-black text-bone tabular-nums">{st.firstSsrAt ?? '—'}</dd></div>
        </dl>

        <div className="mt-4">
          <p className="text-xs text-smoke">{fill(L['sim.points'], { n: gacha.pity })}</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-cinder">
            <div className="h-full rounded-full bg-gradient-to-r from-ember to-flame" style={{ width: `${Math.min(100, (st.pulls / gacha.pity) * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs text-dust tabular-nums">{Math.min(st.pulls, gacha.pity)} / {gacha.pity}</p>
          {st.pulls >= gacha.pity && <p className="mt-1 text-xs font-semibold text-flame">{L['sim.pity.ok']}</p>}
        </div>

        <table className="mt-4 w-full text-left text-xs">
          <thead className="text-smoke">
            <tr><th className="py-1 font-medium"></th><th className="py-1 text-right font-medium">{L['sim.got']}</th><th className="py-1 text-right font-medium">{L['sim.rate']}</th></tr>
          </thead>
          <tbody>
            {KINDS.map((k) => {
              const [rarity, type] = k.split('-');
              const rate = gacha.rates.find((r) => r.rarity === rarity && r.type === type);
              const n = st.counts[k] ?? 0;
              return (
                <tr key={k} className="border-t border-line">
                  <td className="py-1.5 text-bone"><b className={rarity === 'SSR' ? 'text-flame' : rarity === 'SR' ? 'text-[#d3b0ff]' : 'text-dust'}>{rarity}</b> {L[type === 'character' ? 'sim.char' : 'sim.mem']}</td>
                  <td className="py-1.5 text-right text-bone tabular-nums">{n}{st.pulls ? <span className="text-smoke"> ({pct((n / st.pulls) * 100)} %)</span> : null}</td>
                  <td className="py-1.5 text-right text-dust tabular-nums">{pct(rate?.rate ?? 0)} %</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-smoke">{L['sim.tenth']}</p>
      </aside>
      <style>{`.sim-card{animation:sim-in .35s cubic-bezier(.2,.8,.2,1) both}@keyframes sim-in{from{opacity:0;transform:translateY(8px) scale(.92)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.sim-card{animation:none}}`}</style>
    </div>
  );
}
