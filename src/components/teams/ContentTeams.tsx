// Equipos recomendados para un contenido: lo mejor para tu cuenta (con tu inversión y tus memorias)
// y lo mejor en general, según las debilidades/resistencias (guardadas o marcadas por ti) y la tier list.
// Para tu cuenta también dice qué te falta para pasarlo.
import { useEffect, useMemo, useState } from 'react';
import ElementIcon from '@/components/ElementIcon';
import { assignMemories, effectiveRank, readiness, recommendTeam, slotScore, teamAdvice, type Account, type Advice, type ElementKey, type Team, type TeamChar, type TeamMemory, type TeamSlot } from '@/lib/team-recs';
import { stageNeeds, type DamageType, type Stage, type StageNeeds } from '@/lib/stage';
import { strategyTips, type Tip } from '@/lib/strategy';
import { ELEMENT_COLOR } from '@/components/characters/CharacterBrowser';
import { TeamAnalysis, orderedPhases, seriesOf } from './TeamAnalysis';
import { AffinityPicker, CharPicker, CopyTeamButton, SlotCard, fill, roleOf, teamPost, useAccount, useTeamData, type AffinityMap, type Labels } from './shared';

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

// ── Equipos modificables y alternativas ─────────────────────────
const slotIds = (t: Team) => [...t.main.map((s) => s?.c.id ?? null), t.sub?.c.id ?? null, t.helper?.c.id ?? null];

/**
 * Equipo recomendado que el jugador puede cambiar hueco a hueco. Sin cambios devuelve el recomendado;
 * con cambios, recalcula puntuación, rango y memorias con la cuenta (si es «para tu cuenta»).
 */
function useEditableTeam(base: Team, chars: TeamChar[], memories: TeamMemory[], affinity: AffinityMap, needs: StageNeeds | null | undefined, account: Account | null) {
  const [ids, setIds] = useState<(string | null)[] | null>(null);
  // Si cambia la recomendación (otra fase, otras debilidades), se vuelve a ella
  useEffect(() => setIds(null), [base]);
  const team = useMemo<Team>(() => {
    if (!ids) return base;
    const byId = new Map(chars.map((c) => [c.id, c]));
    const baseSlots = [...base.main, base.sub, base.helper];
    const maxLevel = Math.max(0, ...Object.values(account?.chars ?? {}).map((o) => o.level ?? 0));
    const mk = (id: string | null, i: number): TeamSlot | null => {
      const c = id ? byId.get(id) : undefined;
      if (!c) return null;
      const own = i < 5 && account ? account.chars[c.id] ?? null : null; // el apoyo es de otro jugador
      const as = baseSlots[i]?.c.id === c.id ? baseSlots[i]!.as : roleOf(c, affinity, needs) ?? 'sup';
      return { c, as, score: slotScore(c, as, affinity, own, maxLevel, needs) ?? 0, rank: effectiveRank(c, as, own) ?? 'D' };
    };
    const t: Team = { main: ids.slice(0, 4).map(mk), sub: mk(ids[4], 4), helper: mk(ids[5], 5) };
    assignMemories([...t.main, t.sub], memories, account);
    return t;
  }, [ids, base, chars, memories, affinity, needs, account]);
  const setSlot = (i: number, id: string | null) => setIds((prev) => (prev ?? slotIds(base)).map((x, j) => (j === i ? id : x)));
  return { team, edited: !!ids, setSlot, reset: () => setIds(null) };
}

/** Equipo con huecos que se tocan para cambiarlos, botón para volver a la recomendación y alternativas. */
function EditableTeam({ base, chars, memories, affinity, needs, account, owned, labels: L, children }: {
  base: Team; chars: TeamChar[]; memories: TeamMemory[]; affinity: AffinityMap; needs?: StageNeeds | null;
  /** Con cuenta: alternativas y puntuación según lo que tienes (y la ventana abre con «solo los míos») */
  account: Account | null; owned?: Set<string> | null; labels: Labels; basePath: string;
  children?: (team: Team, setSlot: (i: number, id: string | null) => void) => React.ReactNode;
}) {
  const { team, edited, setSlot, reset } = useEditableTeam(base, chars, memories, affinity, needs, account);
  const [picking, setPicking] = useState<number | null>(null);
  const slots = [...team.main, team.sub, team.helper];
  const slotLabel = (i: number) => L[i < 4 ? 'tm.main' : i === 4 ? 'tm.sub' : 'tm.helper'];
  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
        {slots.map((s, i) => (
          <SlotCard key={i} slot={s} label={slotLabel(i)} labels={L} affinity={affinity} onClick={() => setPicking(i)} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
        <span className="text-smoke">{L['tm.edit.hint']}</span>
        {edited && <button type="button" onClick={reset} className="font-semibold text-flame underline underline-offset-2">{L['tm.reset']}</button>}
      </div>
      <TeamOptions team={team} chars={chars} affinity={affinity} needs={needs} account={account} labels={L} onPick={setSlot} />
      {children?.(team, setSlot)}
      {picking != null && (
        <CharPicker chars={chars} owned={owned} affinity={affinity} needs={needs} title={slotLabel(picking)} labels={L} defaultOwned={!!account && picking < 5}
          onPick={(id) => { setSlot(picking, id); setPicking(null); }} onClose={() => setPicking(null)} />
      )}
    </>
  );
}

/**
 * Otras opciones para cada puesto (titulares y suplente): las 3 mejores que no están en el equipo.
 * Con cuenta, solo personajes tuyos y puntuados con tu inversión, así que salen primero los que ya
 * tienes subidos: no hace falta maxear a nadie para una sola fase.
 */
function TeamOptions({ team, chars, affinity, needs, account, labels: L, onPick }: {
  team: Team; chars: TeamChar[]; affinity: AffinityMap; needs?: StageNeeds | null; account: Account | null; labels: Labels;
  onPick: (i: number, id: string) => void;
}) {
  const rows = useMemo(() => {
    const inTeam = new Set([...team.main, team.sub, team.helper].filter((s): s is TeamSlot => !!s).map((s) => s.c.name));
    const pool = account ? chars.filter((c) => account.chars[c.id]) : chars;
    const maxLevel = Math.max(0, ...Object.values(account?.chars ?? {}).map((o) => o.level ?? 0));
    // Cada puesto recibe opciones distintas (si dos huecos son de daño, no repiten las mismas tres)
    const shown = new Set<string>();
    return [...team.main, team.sub].map((s, i) => {
      const as = s?.as ?? (i < 2 ? 'dmg' : 'sup');
      const alts = pool
        .filter((c) => !inTeam.has(c.name) && !shown.has(c.name))
        .map((c) => ({ c, own: account?.chars[c.id] ?? null, score: slotScore(c, as, affinity, account?.chars[c.id] ?? null, maxLevel, needs) }))
        .filter((x): x is { c: TeamChar; own: OwnedLike; score: number } => x.score != null)
        .sort((a, b) => b.score - a.score)
        // Una sola versión de cada personaje (el juego no deja llevar dos)
        .filter((x, k, arr) => arr.findIndex((y) => y.c.name === x.c.name) === k)
        .slice(0, 3);
      alts.forEach((x) => shown.add(x.c.name));
      return { i, as, alts };
    }).filter((r) => r.alts.length);
  }, [team, chars, affinity, needs, account]);
  if (!rows.length) return null;
  return (
    <details className="mt-3 rounded-xl border border-line bg-ash/40 p-3 text-xs">
      <summary className="cursor-pointer font-bold text-bone">{L['tm.options']}</summary>
      <p className="mt-1 text-smoke">{L[account ? 'tm.options.hint' : 'tm.options.general']}</p>
      <ul className="mt-2 space-y-2">
        {rows.map(({ i, as, alts }) => (
          <li key={i}>
            <p className="mb-1 font-semibold text-dust">{L[i === 4 ? 'tm.sub' : 'tm.main']} · {L[as === 'dmg' ? 'tm.dmg' : 'tm.sup']} <span className="text-smoke">({L['tm.instead']} {[...team.main, team.sub][i]?.c.name ?? '—'})</span></p>
            <div className="flex flex-wrap gap-1.5">
              {alts.map(({ c, own }) => {
                const a = affinity[c.element as ElementKey];
                const rank = effectiveRank(c, as, own);
                const inv = own ? [own.level ? `Nv ${own.level}` : '', own.dupes ? `${own.dupes}★` : ''].filter(Boolean).join(' · ') : '';
                return (
                  <button key={c.id} type="button" onClick={() => onPick(i, c.id)} title={c.epithet ?? c.name}
                    className="flex items-center gap-1.5 rounded-full border bg-coal py-0.5 pr-2 pl-0.5 text-left text-[11px] text-bone transition hover:border-line-strong"
                    style={{ borderColor: `${ELEMENT_COLOR[c.element]}66` }}>
                    {c.img && <img src={c.img} srcSet={c.srcset} sizes="40px" alt="" loading="lazy" className="size-6 rounded-full object-cover object-top" />}
                    <span>{c.name}</span>
                    {rank && <b className="text-flame">{rank}</b>}
                    {a && <span className={a === 'weak' ? 'text-[#3fcf8e]' : 'text-[#ff6b7f]'}>{a === 'weak' ? '▲' : '▼'}</span>}
                    {inv && <span className="text-smoke">{inv}</span>}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
type OwnedLike = Account['chars'][string] | null;

/** Los dos equipos (cuenta y general) para unas debilidades y una fase dadas. */
export function Recommendations({ chars, memories, affinity, labels: L, basePath, accountPath, post, needs, stage, phases = [], noHelper, builderLink }: {
  chars: TeamChar[]; memories: TeamMemory[]; affinity: AffinityMap; labels: Labels; basePath: string; accountPath: string;
  /** Para el texto del foro: nombre del contenido y piso */
  post?: { content: string; floor?: number };
  /** Lo que exige la fase (reglas, tipo de daño, número de enemigos…) y su ficha */
  needs?: StageNeeds | null;
  stage?: Stage | null;
  /** Fases en serie con esta (para «hasta dónde llegas») y si se puede llevar apoyo de otro jugador */
  phases?: [string, Stage][];
  noHelper?: boolean;
  /** Enlace al creador de equipos con este contenido y fase ya elegidos */
  builderLink?: string;
}) {
  const account = useAccount();
  const owned = useMemo(() => (account ? new Set(Object.keys(account.chars)) : null), [account]);
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
          <EditableTeam base={mine} chars={chars} memories={memories} affinity={affinity} needs={needs} account={account} owned={owned} labels={L} basePath={basePath}>
            {(team, setSlot) => (
              <>
                {gaps > 0 && <p className="mt-3 text-xs text-flame">{L['tm.missing']}</p>}
                {showStrategy && <TeamAnalysis team={team} stage={stage ?? null} needs={needs ?? null} phases={phases} chars={chars} account={account} labels={L} basePath={basePath} noHelper={noHelper} onApply={setSlot} />}
                {showStrategy && builderLink && <p className="mt-2 text-xs"><a href={builderLink} className="font-semibold text-flame underline underline-offset-2">{L['an.open']}</a></p>}
                {post && <div className="mt-3"><CopyTeamButton text={teamPost(team, affinity, L, post)} labels={L} /></div>}
                <Readiness mine={team} best={general} account={account} memories={memories} labels={L} basePath={basePath} />
              </>
            )}
          </EditableTeam>
        ) : (
          <p className="text-sm text-dust">{L['tm.noinv']} <a href={accountPath} className="text-flame underline underline-offset-2">{L['tm.goaccount']}</a></p>
        )}
      </section>

      <section className="card p-4 sm:p-5">
        <h3 className="mb-3 font-sans text-sm font-bold text-bone">{L['tm.general']}</h3>
        <EditableTeam base={general} chars={chars} memories={memories} affinity={affinity} needs={needs} account={null} owned={owned} labels={L} basePath={basePath}>
          {(team, setSlot) => showStrategy && (account ? <StrategyPanel team={team} needs={needs ?? null} stage={stage ?? null} labels={L} />
            : <TeamAnalysis team={team} stage={stage ?? null} needs={needs ?? null} phases={phases} chars={chars} account={null} labels={L} basePath={basePath} noHelper={noHelper} onApply={setSlot} />)}
        </EditableTeam>
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
          <ElementIcon el={e} size={16} />{L[`el.${e}`]} {kind === 'weak' ? '▲' : '▼'}
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
        {stage.checked ? fill(L['sh.updated'], { d: fmt(stage.checked) }) : L['tm.affinity.saved.nodate']}
        {stage.server ? ` · ${stage.server === 'jp' ? 'JP' : 'Global'}` : ''}
      </p>
    </div>
  );
}

/** Equipo con el que se superó la fase y guía de estrategia. */
function ProvenPanels({ stage, chars, memories, labels: L, basePath }: { stage: Stage; chars: TeamChar[]; memories: TeamMemory[]; labels: Labels; basePath: string }) {
  const byId = new Map(chars.map((c) => [c.id, c]));
  const memById = new Map(memories.map((m) => [m.id, m]));
  const c = stage.cleared, g = stage.guide;
  if (!c && !g?.points.length) return null;
  const Chip = ({ id }: { id: string }) => {
    const ch = byId.get(id);
    if (!ch) return null;
    return (
      <a href={`${basePath}/characters/${id}`} className="flex items-center gap-1.5 rounded-full border border-line bg-coal py-0.5 pr-2 pl-0.5 text-[11px] text-bone hover:border-line-strong" style={{ borderColor: `${ELEMENT_COLOR[ch.element]}66` }}>
        {ch.img && <img src={ch.img} alt="" loading="lazy" className="size-5 rounded-full object-cover object-top" />}{ch.name}<span className="text-smoke">{ch.epithet ? ` · ${ch.epithet}` : ''}</span>
      </a>
    );
  };
  return (
    <div className="space-y-5">
      {c && (
        <section className="card p-4 sm:p-5">
          <h3 className="mb-3 flex flex-wrap items-baseline justify-between gap-2 font-sans text-sm font-bold text-bone">{L[c.kind === 'farm' ? 'pv.farm' : c.kind === 'recommended' ? 'pv.recommended' : 'pv.cleared']}</h3>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
            {c.chars.map((x, i) => {
              const ch = x.id ? byId.get(x.id) : undefined;
              const mem = c.mems[i];
              const m = mem?.id ? memById.get(mem.id) : undefined;
              return (
                <li key={i} className="min-w-0 text-[10px]">
                  {ch ? (
                    <a href={`${basePath}/characters/${ch.id}`} className="block">
                      <span className="relative block aspect-square overflow-hidden rounded-lg border-2 bg-cinder" style={{ borderColor: `${ELEMENT_COLOR[ch.element]}80` }}>
                        {ch.img && <img src={ch.img} srcSet={ch.srcset} sizes="120px" alt="" loading="lazy" decoding="async" className="size-full object-cover object-top" />}
                        {x.dupes != null && <span className="absolute top-1 left-1 rounded bg-ash/85 px-1 font-bold text-flame">{x.dupes}★</span>}
                      </span>
                      <span className="mt-1 block truncate text-[11px] font-semibold text-bone">{ch.name}</span>
                      <span className="block truncate text-smoke">{ch.epithet}</span>
                    </a>
                  ) : <span className="block aspect-square rounded-lg border border-dashed border-line p-1 text-smoke">{x.name}</span>}
                  <span className="block text-dust">{[x.role, x.level ? `Lv ${x.level}` : ''].filter(Boolean).join(' · ')}</span>
                  {mem && (
                    <span className="mt-1 flex items-center gap-1 rounded-md border border-line bg-ash/50 p-0.5 pr-1" title={m?.name ?? mem.name}>
                      {m?.img ? <img src={m.img} alt="" loading="lazy" className="size-6 shrink-0 rounded object-cover" /> : <span className="size-6 shrink-0 rounded bg-cinder" />}
                      <span className="min-w-0 truncate text-[9px] text-dust">{m?.name ?? mem.name}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {c.note && <p className="mt-3 text-xs leading-relaxed whitespace-pre-line text-dust">{c.note}</p>}
        </section>
      )}
      {g?.points.length ? (
        <section className="card p-4 sm:p-5">
          <h3 className="mb-3 flex flex-wrap items-baseline justify-between gap-2 font-sans text-sm font-bold text-bone">{L['pv.guide']}</h3>
          <ol className="space-y-3">
            {g.points.map((p, i) => (
              <li key={i} className="text-xs">
                <p className="font-bold text-flame">{i + 1}. {p.title}</p>
                {p.text && <p className="mt-1 leading-relaxed whitespace-pre-line text-dust">{p.text}</p>}
                {p.chars.length ? <div className="mt-1.5 flex flex-wrap gap-1.5">{p.chars.map((id) => <Chip key={id} id={id} />)}</div> : null}
              </li>
            ))}
          </ol>
          {stage.picks?.length ? (
            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-1.5 text-xs font-bold text-bone">{L['pv.picks']}</p>
              <div className="flex flex-wrap gap-1.5">{stage.picks.map((id) => <Chip key={id} id={id} />)}</div>
            </div>
          ) : null}
        </section>
      ) : null}
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
  // Pisos y fases numeradas (torre, EX1…EX22) en orden numérico; el resto (jefe y dificultad) en el orden de los datos
  const phaseKeys = useMemo(() => {
    const ks = Object.keys(stages).filter((k) => k.startsWith(`${contentId}/`));
    return ks.every((k) => /\d+$/.test(k)) ? ks.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) : ks;
  }, [stages, contentId]);
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

  // Fases que van en serie con la elegida (para «hasta dónde llegas»)
  const series = useMemo(() => seriesOf(orderedPhases(stages, contentId), key), [stages, contentId, key]);

  const options = floors
    ? Array.from({ length: floors }, (_, i) => ({ k: `${contentId}/${i + 1}`, label: `${L['tm.floor']} ${i + 1}` }))
    : phaseKeys.map((k) => ({ k, label: stages[k]?.name ?? k.slice(contentId.length + 1) }));

  return (
    <div className="space-y-5">
      <section className="card space-y-4 p-4 sm:p-5">
        {options.length > 0 && (
          <label className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-bone">{floors ? L['tm.floor'] : L['sh.phase']}</span>
            <select value={phase} aria-label={floors ? L['tm.floor'] : L['sh.phase']} onChange={(e) => setPhase(e.target.value)}
              className="h-9 w-full max-w-full min-w-0 truncate rounded-lg border border-line bg-ash px-2 text-sm text-bone focus:border-ember/60 focus:outline-none sm:w-auto sm:max-w-md">
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
      {team && stage ? <ProvenPanels stage={stage} chars={team.chars} memories={team.memories} labels={L} basePath={basePath} /> : null}
      {team ? <Recommendations chars={team.chars} memories={team.memories} affinity={affinity} labels={L} basePath={basePath} accountPath={accountPath}
        post={{ content: contentName, floor: floors ? Number(phase.split('/')[1]) : undefined }} needs={needs} stage={stage}
        phases={series} noHelper={contentId === 'illusory-tower-diverse'} builderLink={`${basePath}/team-builder/?c=${encodeURIComponent(contentId)}&p=${encodeURIComponent(key)}`} /> : <p className="text-sm text-smoke">{L['tm.loading']}</p>}
    </div>
  );
}
