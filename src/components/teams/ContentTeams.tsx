// Equipos recomendados para un contenido: lo mejor para tu cuenta (con tu inversión y tus memorias)
// y lo mejor en general, según las debilidades/resistencias (guardadas o marcadas por ti) y la tier list.
// Para tu cuenta también dice qué te falta para pasarlo.
import { useEffect, useMemo, useState } from 'react';
import { readiness, recommendTeam, teamAdvice, type Account, type Advice, type ElementKey, type Team, type TeamChar, type TeamMemory } from '@/lib/team-recs';
import { stageNeeds, type DamageType, type Stage, type StageNeeds } from '@/lib/stage';
import { strategyTips, type Tip } from '@/lib/strategy';
import { ELEMENT_COLOR } from '@/components/characters/CharacterBrowser';
import { AffinityPicker, CopyTeamButton, TeamView, fill, teamPost, useAccount, useTeamData, type AffinityMap, type Labels } from './shared';

export interface AffinityRecord { weak?: ElementKey[]; resist?: ElementKey[]; note?: string; checked?: string; community?: number }

const toMap = (r?: AffinityRecord | null): AffinityMap => {
  const m: AffinityMap = {};
  r?.weak?.forEach((e) => (m[e] = 'weak'));
  r?.resist?.forEach((e) => (m[e] = 'resist'));
  return m;
};

const who = (c: TeamChar) => `${c.name}${c.epithet ? ` (${c.epithet})` : ''}`;
function adviceText(a: Advice, L: Labels) {
  switch (a.kind) {
    case 'level': return fill(L['ta.level'], { c: who(a.c), now: a.now, target: a.target });
    case 'skills': return fill(L['ta.skills'], { c: who(a.c), low: a.low });
    case 'sp': return fill(L['ta.sp'], { c: who(a.c) });
    case 'dupes': return fill(L['ta.dupes'], { c: who(a.c), min: a.min, rank: a.rank, now: a.now });
    case 'memory': return fill(L['ta.memory'], { c: who(a.c), m: a.mem.name });
    case 'missing': return fill(L['ta.missing'], { c: who(a.c), rank: a.rank, role: L[a.as === 'dmg' ? 'tm.dmg' : 'tm.sup'] });
  }
}

/** Preparación y lista de mejoras de tu equipo frente al mejor posible. */
export function Readiness({ mine, best, account, memories, labels: L, basePath }: {
  mine: ReturnType<typeof recommendTeam>; best: ReturnType<typeof recommendTeam>; account: Account; memories: TeamMemory[]; labels: Labels; basePath: string;
}) {
  const pct = readiness(mine, best);
  const advice = teamAdvice(mine, best, account, memories);
  const upgrades = advice.filter((a) => a.kind !== 'missing');
  const missing = advice.filter((a) => a.kind === 'missing');
  const noInvestment = Object.values(account.chars).every((o) => !o.level && !o.dupes && !o.skills && !o.sp);
  const link = (a: Advice) => `${basePath}/${a.kind === 'memory' ? `memories/${a.mem.id}` : `characters/${a.c.id}`}`;
  return (
    <div className="mt-4 rounded-xl border border-line bg-ash/40 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-bone">{L['ta.ready']}</p>
        <p className="text-lg font-black text-fire tabular-nums">{pct} %</p>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cinder"><div className="h-full rounded-full bg-gradient-to-r from-ember to-flame" style={{ width: `${pct}%` }} /></div>
      <p className="mt-1 text-smoke">{L['ta.ready.hint']}</p>

      <p className="mt-3 font-bold text-bone">{L['ta.todo']}</p>
      {advice.length === 0 ? <p className="mt-1 text-dust">{L['ta.todo.none']}</p> : (
        <>
          {upgrades.length > 0 && (
            <ul className="mt-1 space-y-1">
              {upgrades.map((a, i) => <li key={i} className="text-dust">• <a href={link(a)} className="hover:text-bone">{adviceText(a, L)}</a></li>)}
            </ul>
          )}
          {missing.length > 0 && (
            <>
              <p className="mt-2 font-semibold text-bone">{L['ta.pulls']}</p>
              <ul className="mt-1 space-y-1">
                {missing.map((a, i) => <li key={i} className="text-dust">• <a href={link(a)} className="hover:text-bone">{adviceText(a, L)}</a></li>)}
              </ul>
            </>
          )}
        </>
      )}
      {noInvestment && <p className="mt-2 text-flame">{L['ta.hint.data']}</p>}
    </div>
  );
}

/** Consejos de estrategia para un equipo en esta fase. */
function StrategyPanel({ team, needs, stage, labels: L }: { team: Team; needs: StageNeeds | null; stage: Stage | null; labels: Labels }) {
  const tips = strategyTips(team, needs, stage, (e) => L[`el.${e}`]);
  const TONE: Record<Tip['tone'], string> = { rule: 'text-flame', good: 'text-[#3fcf8e]', warn: 'text-[#ff8a9a]', info: 'text-dust' };
  const ICON: Record<Tip['tone'], string> = { rule: '◆', good: '✓', warn: '⚠', info: '•' };
  const typeName = (t: string | number | undefined) => L[`st.type.${t}`] ?? String(t);
  return (
    <div className="mt-4 rounded-xl border border-line bg-ash/40 p-3 text-xs">
      <p className="font-bold text-bone">{L['st.title']}</p>
      {stage?.strategy && <p className="mt-1 leading-relaxed whitespace-pre-line text-bone">{stage.strategy}</p>}
      <ul className="mt-1 space-y-1">
        {tips.map((t, i) => (
          <li key={i} className={`flex gap-1.5 leading-relaxed ${TONE[t.tone]}`}>
            <span aria-hidden="true">{ICON[t.tone]}</span>
            <span className={t.tone === 'info' ? 'text-dust' : ''}>{fill(L[t.key] ?? t.key, { ...t.vars, type: typeName(t.vars?.type) })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Los dos equipos (cuenta y general) para unas debilidades y una fase dadas. */
export function Recommendations({ chars, memories, affinity, labels: L, basePath, accountPath, post, needs, stage }: {
  chars: TeamChar[]; memories: TeamMemory[]; affinity: AffinityMap; labels: Labels; basePath: string; accountPath: string;
  /** Para el texto del foro: nombre del contenido y piso */
  post?: { content: string; floor?: number };
  /** Lo que exige la fase (reglas, tipo de daño, número de enemigos…) y su ficha */
  needs?: StageNeeds | null;
  stage?: Stage | null;
}) {
  const account = useAccount();
  const [dealers, setDealers] = useState<1 | 2>(2);
  const general = useMemo(() => recommendTeam(chars, { affinity, dealers, memories, needs }), [chars, affinity, dealers, memories, needs]);
  const mine = useMemo(() => (account ? recommendTeam(chars, { affinity, dealers, account, memories, needs }) : null), [chars, affinity, dealers, account, memories, needs]);
  const gaps = mine ? mine.main.filter((s) => !s).length + (mine.sub ? 0 : 1) : 0;
  const showStrategy = needs !== undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-smoke">{L['tm.dealers']}:</span>
        {([2, 1] as const).map((n) => (
          <button key={n} type="button" onClick={() => setDealers(n)} aria-pressed={dealers === n}
            className={`rounded-full border px-3 py-1 font-semibold transition ${dealers === n ? 'border-ember/70 bg-ember/15 text-bone' : 'border-line text-dust hover:text-bone'}`}>
            {L[n === 2 ? 'tm.dealers2' : 'tm.dealers1']}
          </button>
        ))}
      </div>

      <section className="card p-4 sm:p-5">
        <h3 className="mb-3 font-sans text-sm font-bold text-bone">{L['tm.account']}</h3>
        {account === undefined ? <p className="text-xs text-smoke">{L['tm.loading']}</p> : mine && account ? (
          <>
            <TeamView team={mine} labels={L} affinity={affinity} basePath={basePath} />
            {gaps > 0 && <p className="mt-3 text-xs text-flame">{L['tm.missing']}</p>}
            {showStrategy && <StrategyPanel team={mine} needs={needs ?? null} stage={stage ?? null} labels={L} />}
            {post && <div className="mt-3"><CopyTeamButton text={teamPost(mine, affinity, L, post)} labels={L} /></div>}
            <Readiness mine={mine} best={general} account={account} memories={memories} labels={L} basePath={basePath} />
          </>
        ) : (
          <p className="text-sm text-dust">{L['tm.noinv']} <a href={accountPath} className="text-flame underline underline-offset-2">{L['tm.goaccount']}</a></p>
        )}
      </section>

      <section className="card p-4 sm:p-5">
        <h3 className="mb-3 font-sans text-sm font-bold text-bone">{L['tm.general']}</h3>
        <TeamView team={general} labels={L} affinity={affinity} basePath={basePath} />
        {showStrategy && <StrategyPanel team={general} needs={needs ?? null} stage={stage ?? null} labels={L} />}
      </section>

      <details className="text-xs text-smoke">
        <summary className="cursor-pointer font-semibold text-dust hover:text-bone">{L['tm.why']}</summary>
        <p className="mt-2 max-w-3xl leading-relaxed">{L['tm.why.text']}</p>
        <p className="mt-2 max-w-3xl leading-relaxed">{L['ta.why']}</p>
        <p className="mt-2 max-w-3xl leading-relaxed">{L['st.why']}</p>
      </details>
    </div>
  );
}

// ── Ficha del enemigo ──────────────────────────────────────────
const KIND_CLS: Record<string, string> = {
  aoe: 'border-[#ff6b7f]/60 text-[#ff8a9a]', debuff: 'border-[#b06cff]/60 text-[#d3b0ff]', taunt: 'border-flame/60 text-flame',
  counter: 'border-[#ff6b7f]/60 text-[#ff8a9a]', enrage: 'border-[#ff6b7f]/60 text-[#ff8a9a]', heal: 'border-[#3fcf8e]/60 text-[#3fcf8e]',
  buff: 'border-[#4da3ff]/60 text-[#8cc4ff]', summon: 'border-line-strong text-dust', single: 'border-line-strong text-dust', other: 'border-line text-smoke',
};
const ElChips = ({ els, kind, L }: { els?: ElementKey[]; kind: 'weak' | 'resist'; L: Labels }) =>
  els?.length ? (
    <span className="flex flex-wrap items-center gap-1">
      <span className="text-smoke">{L[kind === 'weak' ? 'sh.weak' : 'sh.resist']}:</span>
      {els.map((e) => (
        <span key={e} className="flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-bone">
          <span className="size-2 rounded-full" style={{ background: ELEMENT_COLOR[e] }} />{L[`el.${e}`]} {kind === 'weak' ? '▲' : '▼'}
        </span>
      ))}
    </span>
  ) : null;

function StageSheet({ stage, labels: L, fmt }: { stage: Stage; labels: Labels; fmt: (iso: string) => string }) {
  const r = stage.rules;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {stage.name && <span className="text-sm font-bold text-bone">{stage.name}</span>}
        {stage.power ? <span className="text-dust">{L['sh.power']}: <b className="text-bone tabular-nums">{stage.power.toLocaleString()}</b></span> : null}
        <ElChips els={stage.recommended} kind="weak" L={L} />
        <ElChips els={stage.unfavorable} kind="resist" L={L} />
      </div>
      {(r?.only?.length || r?.banned?.length || r?.notes?.length) ? (
        <div className="rounded-lg border border-flame/40 bg-flame/5 p-2.5 text-xs">
          <p className="font-bold text-flame">{L['sh.rules']}</p>
          <ul className="mt-1 space-y-0.5 text-bone">
            {r?.only?.length ? <li>◆ {fill(L['st.only'], { els: r.only.map((e) => L[`el.${e}`]).join(', ') })}</li> : null}
            {r?.banned?.length ? <li>◆ {fill(L['st.banned'], { els: r.banned.map((e) => L[`el.${e}`]).join(', ') })}</li> : null}
            {r?.notes?.map((n, i) => <li key={i}>◆ {n}</li>)}
          </ul>
        </div>
      ) : null}
      <ul className="grid gap-3 lg:grid-cols-2">
        {(stage.enemies ?? []).map((e, i) => (
          <li key={i} className="rounded-xl border border-line bg-ash/40 p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-bone">{e.name}{e.count && e.count > 1 ? ` ×${e.count}` : ''}</span>
              {e.boss && <span className="badge-limited">{L['sh.boss']}</span>}
              {e.wave ? <span className="badge">{L['sh.wave']} {e.wave}</span> : null}
              {e.level ? <span className="text-smoke">Lv {e.level}</span> : null}
              {e.hp ? <span className="text-smoke">HP {e.hp.toLocaleString()}</span> : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
              <ElChips els={e.weak} kind="weak" L={L} />
              <ElChips els={e.resist} kind="resist" L={L} />
              {(['taijutsu', 'jujutsu', 'mixed'] as const).filter((t) => e.cut?.[t]).map((t) => (
                <span key={t} className="rounded-full border border-[#ff6b7f]/50 px-2 py-0.5 text-[#ff8a9a]">{fill(L['sh.cut'], { type: L[`st.type.${t}`], pct: e.cut![t]! })}</span>
              ))}
              {e.taunt && <span className="rounded-full border border-flame/50 px-2 py-0.5 text-flame">{L['sh.taunt']}</span>}
              {e.actions && e.actions > 1 ? <span className="rounded-full border border-[#ff6b7f]/50 px-2 py-0.5 text-[#ff8a9a]">{fill(L['sh.actions'], { n: e.actions })}</span> : null}
              {e.ultCount ? <span className="rounded-full border border-line px-2 py-0.5 text-dust">{fill(L['sh.ult'], { n: e.ultCount })}</span> : null}
            </div>
            {e.immune?.length ? <p className="mt-2 text-smoke">{L['sh.immune']}: {e.immune.map((x) => L[`sh.st.${x}`] ?? x).join(', ')}</p> : null}
            {e.skills?.length ? (
              <ul className="mt-2 space-y-1.5">
                {e.skills.map((k, j) => (
                  <li key={j}>
                    <span className="font-semibold text-bone">{k.name}</span>
                    {k.kind && <span className={`ml-1.5 rounded border px-1 text-[10px] ${KIND_CLS[k.kind] ?? KIND_CLS.other}`}>{L[`sh.kind.${k.kind}`] ?? k.kind}</span>}
                    {k.text && <p className="mt-0.5 leading-relaxed whitespace-pre-line text-dust">{k.text}</p>}
                  </li>
                ))}
              </ul>
            ) : null}
            {e.note && <p className="mt-2 text-smoke">{e.note}</p>}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-smoke">
        {stage.checked ? fill(L[stage.url ? 'sh.updated' : 'tm.affinity.saved'], { d: fmt(stage.checked) }) : L['tm.affinity.saved.nodate']}
        {stage.server ? ` · ${stage.server === 'jp' ? 'JP' : 'Global'}` : ''}
        {stage.source ? ` · ${L['ct.source']}: ` : ''}{stage.url ? <a href={stage.url} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-dust">{stage.source ?? stage.url}</a> : stage.source}
      </p>
    </div>
  );
}

/** Marca a mano qué tipo de daño reduce el enemigo (cuando no hay ficha). */
function CutPicker({ value, onChange, labels: L }: { value: Partial<Record<DamageType, number>>; onChange: (v: Partial<Record<DamageType, number>>) => void; labels: Labels }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={L['sh.cutpick']}>
      {(['taijutsu', 'jujutsu', 'mixed'] as const).map((t) => {
        const on = !!value[t];
        return (
          <button key={t} type="button" aria-pressed={on} onClick={() => onChange({ ...value, [t]: on ? 0 : 90 })}
            className={`h-9 rounded-lg border px-3 text-sm font-semibold transition ${on ? 'border-[#ff6b7f]/70 bg-[#ff6b7f]/10 text-bone' : 'border-line bg-coal text-dust hover:text-bone'}`}>
            {on ? '▼ ' : ''}{L[`st.type.${t}`]}
          </button>
        );
      })}
    </div>
  );
}

export interface ContentTeamsProps {
  labels: Labels;
  /** Nombre del contenido (para el texto del foro) */
  contentName: string;
  basePath: string;
  accountPath: string;
  /** Debilidades guardadas: clave = id del contenido o "id/piso" */
  data: Record<string, AffinityRecord>;
  /** Fichas de fases: clave = id del contenido o "id/fase" */
  stages: Record<string, Stage>;
  contentId: string;
  floors?: number;
  locale: string;
}

export default function ContentTeams({ labels: L, contentName, basePath, accountPath, data, stages, contentId, floors, locale }: ContentTeamsProps) {
  const team = useTeamData();
  // Fases: pisos numerados (torre) o las fases con ficha ("id/hard-3"…)
  const phaseKeys = useMemo(() => Object.keys(stages).filter((k) => k.startsWith(`${contentId}/`)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [stages, contentId]);
  // La torre abre en el primer piso con ficha (los primeros pisos no tienen datos)
  const [phase, setPhase] = useState<string>(phaseKeys[0] ?? (floors ? `${contentId}/1` : contentId));
  const key = phase;
  const stage = stages[key] ?? null;
  const saved = data[key] ?? null;
  const fromStage = useMemo<AffinityRecord | null>(() => {
    const n = stageNeeds(stage);
    return n && (n.weak.length || n.resist.length) ? { weak: n.weak, resist: n.resist } : null;
  }, [stage]);
  const [affinity, setAffinity] = useState<AffinityMap>(() => toMap(saved ?? fromStage));
  const [cut, setCut] = useState<Partial<Record<DamageType, number>>>({});
  useEffect(() => { setAffinity(toMap(data[key] ?? fromStage)); setCut({}); }, [key, data, fromStage]);
  const fmt = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

  // Lo que exige la fase: la ficha, con las debilidades y reducciones que marques tú encima
  const needs = useMemo<StageNeeds>(() => {
    const base = stageNeeds(stage) ?? { weak: [], resist: [], cut: { taijutsu: 0, jujutsu: 0, mixed: 0 }, enemies: 1, taunt: false, debuffs: false, aoeDamage: false };
    const els = Object.entries(affinity) as [ElementKey, 'weak' | 'resist'][];
    return {
      ...base,
      weak: els.filter(([, v]) => v === 'weak').map(([e]) => e),
      resist: els.filter(([, v]) => v === 'resist').map(([e]) => e),
      cut: { taijutsu: Math.max(base.cut.taijutsu, cut.taijutsu ?? 0), jujutsu: Math.max(base.cut.jujutsu, cut.jujutsu ?? 0), mixed: Math.max(base.cut.mixed, cut.mixed ?? 0) },
    };
  }, [stage, affinity, cut]);

  const options = floors
    ? Array.from({ length: floors }, (_, i) => ({ k: `${contentId}/${i + 1}`, label: `${L['tm.floor']} ${i + 1}` }))
    : phaseKeys.map((k) => ({ k, label: stages[k]?.name ?? k.slice(contentId.length + 1) }));

  return (
    <div className="space-y-5">
      <section className="card space-y-4 p-4 sm:p-5">
        {options.length > 0 && (
          <label className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-bone">{floors ? L['tm.floor'] : L['sh.phase']}</span>
            <select value={phase} onChange={(e) => setPhase(e.target.value)}
              className="h-9 rounded-lg border border-line bg-ash px-2 text-sm text-bone focus:border-ember/60 focus:outline-none">
              {options.map((o) => <option key={o.k} value={o.k}>{o.label}{stages[o.k] || data[o.k] ? ' ✓' : ''}</option>)}
            </select>
          </label>
        )}

        <div>
          <p className="text-sm font-bold text-bone">{L['sh.title']}</p>
          {stage ? <div className="mt-2"><StageSheet stage={stage} labels={L} fmt={fmt} /></div> : <p className="mt-1 text-xs text-smoke">{L['sh.none']}</p>}
        </div>

        <div className="border-t border-line pt-4">
          <p className="text-sm font-bold text-bone">{L['tm.affinity']}</p>
          <p className="mt-0.5 mb-2 text-xs text-smoke">{L['tm.affinity.hint']}</p>
          <AffinityPicker value={affinity} onChange={setAffinity} labels={L} />
          <p className="mt-2 text-xs text-dust">
            {saved ? (saved.community ? fill(L['tm.affinity.community'], { n: saved.community }) : saved.checked ? fill(L['tm.affinity.saved'], { d: fmt(saved.checked) }) : L['tm.affinity.saved.nodate']) : stage ? '' : L['tm.affinity.none']}
            {saved?.note ? ` · ${saved.note}` : ''}
          </p>
          <p className="mt-3 text-sm font-bold text-bone">{L['sh.cutpick']}</p>
          <p className="mt-0.5 mb-2 text-xs text-smoke">{L['sh.cutpick.hint']}</p>
          <CutPicker value={{ ...(stage ? stageNeeds(stage)?.cut : {}), ...cut }} onChange={setCut} labels={L} />
        </div>
      </section>
      {team ? <Recommendations chars={team.chars} memories={team.memories} affinity={affinity} labels={L} basePath={basePath} accountPath={accountPath}
        post={{ content: contentName, floor: floors ? Number(phase.split('/')[1]) : undefined }} needs={needs} stage={stage} /> : <p className="text-sm text-smoke">{L['tm.loading']}</p>}
    </div>
  );
}
