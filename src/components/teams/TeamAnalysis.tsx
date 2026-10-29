// Análisis de TU equipo frente a una fase: ¿te lo pasas?, hasta dónde llegas en el contenido,
// qué cambiar (con lo que tienes y lo que te falta) y el plan de combate. Lo usan el creador de
// equipos y los equipos por contenido. El poder del equipo se guarda en el navegador ("pp-power").
import { useEffect, useMemo, useState } from 'react';
import type { Stage, StageNeeds } from '@/lib/stage';
import { checkPhase, compFactor, reach, stagePlan, suggestSwaps, type PlanStep, type Swap, type Verdict } from '@/lib/team-analysis';
import type { Account, Team, TeamChar } from '@/lib/team-recs';
import { fill, type Labels } from './shared';

const POWER_KEY = 'pp-power';
const V_CLS: Record<Verdict, string> = {
  easy: 'border-[#3fcf8e]/60 bg-[#3fcf8e]/10 text-[#3fcf8e]',
  ok: 'border-[#3fcf8e]/40 bg-[#3fcf8e]/5 text-[#8ee6bd]',
  tight: 'border-flame/50 bg-flame/10 text-flame',
  hard: 'border-[#ff6b7f]/60 bg-[#ff6b7f]/10 text-[#ff8a9a]',
};
const TURN_ORDER: PlanStep['turn'][] = ['t1', 'mid', 'ult', 'break', 'end'];

export function TeamAnalysis({ team, stage, needs, phases, chars, account, labels: L, basePath, noHelper, onApply }: {
  team: Team; stage: Stage | null; needs: StageNeeds | null;
  /** Fases que van en serie con esta (pisos, dificultades del mismo jefe), para «hasta dónde llegas» */
  phases: [string, Stage][];
  chars: TeamChar[]; account: Account | null | undefined; labels: Labels; basePath: string;
  /** El contenido no deja llevar apoyo de otro jugador */
  noHelper?: boolean;
  onApply?: (slot: number, id: string) => void;
}) {
  const [power, setPower] = useState<number | null>(null);
  useEffect(() => {
    try { const v = Number(localStorage.getItem(POWER_KEY)); if (v > 0) setPower(v); } catch { /* sin almacenamiento */ }
    // Varios análisis en la misma página comparten el poder
    const on = (e: Event) => setPower((e as CustomEvent<number | null>).detail);
    window.addEventListener(POWER_KEY, on);
    return () => window.removeEventListener(POWER_KEY, on);
  }, []);
  const savePower = (v: number | null) => {
    try { if (v) localStorage.setItem(POWER_KEY, String(v)); else localStorage.removeItem(POWER_KEY); } catch { /* sin almacenamiento */ }
    window.dispatchEvent(new CustomEvent(POWER_KEY, { detail: v }));
  };
  const fmt = (n: number) => n.toLocaleString();
  const t = useMemo<Team>(() => (noHelper ? { ...team, helper: null } : team), [team, noHelper]);
  const acc = account ?? null;

  const check = useMemo(() => (stage ? checkPhase(t, '', stage, power) : null), [t, stage, power]);
  const factor = useMemo(() => compFactor(t, needs), [t, needs]);
  const far = useMemo(() => (phases.length > 1 ? reach(t, phases, power) : null), [t, phases, power]);
  const swapsOwn = useMemo(() => (acc ? suggestSwaps(t, chars, needs, acc, { owned: true, max: 4 }) : []), [t, chars, needs, acc]);
  const swapsPull = useMemo(() => suggestSwaps(t, chars, needs, acc, { owned: false, max: acc ? 3 : 4 }), [t, chars, needs, acc]);
  const plan = useMemo(() => stagePlan(t, stage, needs), [t, stage, needs]);
  if (!t.main.some(Boolean)) return null;

  const stepText = (s: PlanStep) => {
    const vars = { ...s.vars };
    if (s.key === 'pl.immune') vars.list = String(vars.list).split(', ').map((x) => L[`sh.st.${x}`] ?? x).join(', ');
    return fill(L[s.key] ?? s.key, vars);
  };

  return (
    <div className="mt-4 rounded-xl border border-ember/40 bg-ember/[0.04] p-3 text-xs sm:p-4">
      <p className="text-sm font-bold text-bone">{L['an.title']}{stage?.name ? <span className="font-normal text-smoke"> · {stage.name}</span> : null}</p>

      {/* Poder del equipo */}
      <label className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-semibold text-bone">{L['an.power']}</span>
        <input type="number" inputMode="numeric" min={0} step={100} value={power ?? ''} placeholder="120000"
          onChange={(e) => savePower(e.target.value ? Math.max(0, Math.round(Number(e.target.value))) : null)}
          className="h-9 w-36 rounded-lg border border-line bg-ash px-2 text-sm text-bone tabular-nums focus:border-ember/60 focus:outline-none" />
        {stage?.power ? <span className="text-smoke">{L['sh.power']}: <b className="text-bone tabular-nums">{fmt(stage.power)}</b></span> : null}
      </label>
      <p className="mt-1 text-smoke">{L['an.power.hint']}</p>
      {noHelper && <p className="mt-1 text-flame">◆ {L['an.nohelper']}</p>}

      {/* Veredicto */}
      <div className="mt-3">
        {!stage?.power ? <p className="text-dust">{L['an.v.nodata']}</p> : check?.verdict && check.ratio != null && power ? (
          <div className={`rounded-lg border p-2.5 ${V_CLS[check.verdict]}`}>
            <p className="text-sm font-black">{L[`an.v.${check.verdict}`]}</p>
            <p className="mt-0.5 text-dust">{fill(L['an.ratio'], { pct: Math.round(check.ratio * 100), eff: fmt(Math.round(power * factor)), rec: fmt(stage.power) })}</p>
          </div>
        ) : <p className="text-flame">{L['an.v.nopower']}</p>}
        {needs && <p className="mt-1 text-smoke">{fill(L['an.factor'], { f: factor.toFixed(2) })}</p>}
      </div>

      {/* Hasta dónde llegas */}
      {far && (
        <div className="mt-4">
          <p className="font-bold text-bone">{L['an.reach']}</p>
          <p className="mt-1 text-dust">
            {far.last ? fill(L[far.wall ? 'an.reach.last' : 'an.reach.all'], { name: far.last.name }) : fill(L['an.reach.none'], { name: far.checks[0].name })}
          </p>
          {far.wall && <p className="mt-1 text-flame">{fill(L['an.reach.wall'], { name: far.wall.name, rec: fmt(far.wall.power ?? 0), need: fmt(far.need ?? 0) })}</p>}
          {far.wall && <p className="mt-1 text-dust">{fill(L['an.reach.gaps'], { n: far.cleared, total: far.checks.length })}</p>}
          <details className="mt-2">
            <summary className="cursor-pointer text-smoke hover:text-dust">{L['an.phases']}</summary>
            <ul className="mt-2 flex flex-wrap gap-1">
              {far.checks.map((c) => (
                <li key={c.key} title={`${c.name} · ${c.ratio != null ? Math.round(c.ratio * 100) : '—'} %`}
                  className={`rounded border px-1.5 py-0.5 tabular-nums ${c.verdict ? V_CLS[c.verdict] : 'border-line text-smoke'}`}>
                  {c.name}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {/* Cambios recomendados */}
      <div className="mt-4">
        <p className="font-bold text-bone">{L['an.swaps']}</p>
        {acc && (swapsOwn.length ? <SwapList title={L['an.swaps.own']} swaps={swapsOwn} labels={L} basePath={basePath} onApply={onApply} /> : <p className="mt-1 text-dust">{L['an.swaps.none']}</p>)}
        {swapsPull.length > 0 ? <SwapList title={L[acc ? 'an.swaps.pull' : 'an.swaps.general']} swaps={swapsPull} labels={L} basePath={basePath} onApply={onApply} />
          : !acc && <p className="mt-1 text-dust">{L['an.swaps.none']}</p>}
      </div>

      {/* Plan de combate */}
      <div className="mt-4">
        <p className="font-bold text-bone">{L['an.plan']}</p>
        {TURN_ORDER.map((turn) => {
          const steps = plan.filter((s) => s.turn === turn);
          return steps.length ? (
            <div key={turn} className="mt-2">
              <p className="text-[10px] font-black tracking-[0.15em] text-ember uppercase">{L[`an.turn.${turn}`]}</p>
              <ul className="mt-1 space-y-1">
                {steps.map((s, i) => <li key={i} className="flex gap-1.5 leading-relaxed text-dust"><span className="text-ember">◆</span><span>{stepText(s)}</span></li>)}
              </ul>
            </div>
          ) : null;
        })}
        {stage?.rules?.notes?.map((n, i) => <p key={i} className="mt-1 text-flame">◆ {n}</p>)}
      </div>

      <details className="mt-3 text-smoke">
        <summary className="cursor-pointer hover:text-dust">{L['tm.why']}</summary>
        <p className="mt-1 leading-relaxed">{L['an.why']}</p>
      </details>
    </div>
  );
}

function SwapList({ title, swaps, labels: L, basePath, onApply }: { title: string; swaps: Swap[]; labels: Labels; basePath: string; onApply?: (slot: number, id: string) => void }) {
  return (
    <div className="mt-2">
      <p className="font-semibold text-dust">{title}</p>
      <ul className="mt-1 space-y-1.5">
        {swaps.map((s) => (
          <li key={`${s.slot}-${s.to.id}`} className="flex items-center gap-2 rounded-lg border border-line bg-coal/60 p-1.5">
            {s.to.img ? <img src={s.to.img} alt="" loading="lazy" className="size-9 shrink-0 rounded-md object-cover object-top" /> : <span className="size-9 shrink-0 rounded-md bg-cinder" />}
            <span className="min-w-0 flex-1">
              <a href={`${basePath}/characters/${s.to.id}`} className="block font-semibold text-bone hover:text-flame">
                {fill(L[s.from ? 'an.swap' : 'an.swap.empty'], { to: `${s.to.name}${s.to.epithet ? ` (${s.to.epithet})` : ''}`, from: s.from?.name ?? '' })}
                <span className="font-normal text-smoke"> · {L[s.slot === 4 ? 'tm.sub' : 'tm.main']} · {L[s.as === 'dmg' ? 'tm.dmg' : 'tm.sup']}</span>
              </a>
              <span className="text-[#8ee6bd]">{s.reasons.map((r) => L[`an.r.${r}`]).join(' · ')}</span>
            </span>
            {onApply && <button type="button" onClick={() => onApply(s.slot, s.to.id)} className="btn-secondary h-7 shrink-0 px-2 text-[11px]">{L['an.apply']}</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Fases de un contenido en orden (pisos y fases numeradas en orden numérico). */
export function orderedPhases(stages: Record<string, Stage>, contentId: string): [string, Stage][] {
  const ks = Object.keys(stages).filter((k) => k.startsWith(`${contentId}/`));
  const sorted = ks.every((k) => /\d+$/.test(k)) ? ks.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) : ks;
  return sorted.map((k) => [k, stages[k]]);
}

/** Fases que van en serie con la elegida: los pisos de una torre, o el mismo jefe en otras dificultades. */
export function seriesOf(phases: [string, Stage][], key: string): [string, Stage][] {
  const diff = /-(normal|hard|very-hard|extreme)$/;
  if (diff.test(key)) return phases.filter(([k]) => k.replace(diff, '') === key.replace(diff, ''));
  return phases.every(([k]) => /\d+$/.test(k)) ? phases : [];
}
