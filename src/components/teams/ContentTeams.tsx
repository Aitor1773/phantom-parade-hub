// Equipos recomendados para un contenido: lo mejor para tu cuenta (con tu inversión y tus memorias)
// y lo mejor en general, según las debilidades/resistencias (guardadas o marcadas por ti) y la tier list.
// Para tu cuenta también dice qué te falta para pasarlo.
import { useEffect, useMemo, useState } from 'react';
import { readiness, recommendTeam, teamAdvice, type Account, type Advice, type ElementKey, type TeamChar, type TeamMemory } from '@/lib/team-recs';
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

/** Los dos equipos (cuenta y general) para unas debilidades dadas. */
export function Recommendations({ chars, memories, affinity, labels: L, basePath, accountPath, post }: {
  chars: TeamChar[]; memories: TeamMemory[]; affinity: AffinityMap; labels: Labels; basePath: string; accountPath: string;
  /** Para el texto del foro: nombre del contenido y piso */
  post?: { content: string; floor?: number };
}) {
  const account = useAccount();
  const [dealers, setDealers] = useState<1 | 2>(2);
  const general = useMemo(() => recommendTeam(chars, { affinity, dealers, memories }), [chars, affinity, dealers, memories]);
  const mine = useMemo(() => (account ? recommendTeam(chars, { affinity, dealers, account, memories }) : null), [chars, affinity, dealers, account, memories]);
  const gaps = mine ? mine.main.filter((s) => !s).length + (mine.sub ? 0 : 1) : 0;

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
      </section>

      <details className="text-xs text-smoke">
        <summary className="cursor-pointer font-semibold text-dust hover:text-bone">{L['tm.why']}</summary>
        <p className="mt-2 max-w-3xl leading-relaxed">{L['tm.why.text']}</p>
        <p className="mt-2 max-w-3xl leading-relaxed">{L['ta.why']}</p>
      </details>
    </div>
  );
}

export interface ContentTeamsProps {
  labels: Labels;
  /** Nombre del contenido (para el texto del foro) */
  contentName: string;
  basePath: string;
  accountPath: string;
  /** Datos guardados: clave = id del contenido o "id/piso" */
  data: Record<string, AffinityRecord>;
  contentId: string;
  floors?: number;
  locale: string;
}

export default function ContentTeams({ labels: L, contentName, basePath, accountPath, data, contentId, floors, locale }: ContentTeamsProps) {
  const team = useTeamData();
  const [floor, setFloor] = useState(1);
  const key = floors ? `${contentId}/${floor}` : contentId;
  const saved = data[key] ?? null;
  const [affinity, setAffinity] = useState<AffinityMap>(() => toMap(saved));
  useEffect(() => { setAffinity(toMap(data[key])); }, [key, data]);
  const fmt = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

  return (
    <div className="space-y-5">
      <section className="card space-y-3 p-4 sm:p-5">
        {floors ? (
          <label className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-bone">{L['tm.floor']}</span>
            <select value={floor} onChange={(e) => setFloor(Number(e.target.value))}
              className="h-9 rounded-lg border border-line bg-ash px-2 text-sm text-bone focus:border-ember/60 focus:outline-none">
              {Array.from({ length: floors }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{L['tm.floor']} {n}{data[`${contentId}/${n}`] ? ' ✓' : ''}</option>
              ))}
            </select>
          </label>
        ) : null}
        <div>
          <p className="text-sm font-bold text-bone">{L['tm.affinity']}</p>
          <p className="mt-0.5 mb-2 text-xs text-smoke">{L['tm.affinity.hint']}</p>
          <AffinityPicker value={affinity} onChange={setAffinity} labels={L} />
          <p className="mt-2 text-xs text-dust">
            {saved ? (saved.community ? fill(L['tm.affinity.community'], { n: saved.community }) : saved.checked ? fill(L['tm.affinity.saved'], { d: fmt(saved.checked) }) : L['tm.affinity.saved.nodate']) : L['tm.affinity.none']}
            {saved?.note ? ` · ${saved.note}` : ''}
          </p>
        </div>
      </section>
      {team ? <Recommendations chars={team.chars} memories={team.memories} affinity={affinity} labels={L} basePath={basePath} accountPath={accountPath} post={{ content: contentName, floor: floors ? floor : undefined }} /> : <p className="text-sm text-smoke">{L['tm.loading']}</p>}
    </div>
  );
}
