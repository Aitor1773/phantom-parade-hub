// Equipos recomendados para un contenido: lo mejor para tu cuenta y lo mejor en general,
// según las debilidades/resistencias (guardadas o marcadas por ti) y la tier list.
import { useEffect, useMemo, useState } from 'react';
import { recommendTeam, type ElementKey, type TeamChar } from '@/lib/team-recs';
import { AffinityPicker, TeamView, fill, useOwned, useTeamChars, type AffinityMap, type Labels } from './shared';

export interface AffinityRecord { weak?: ElementKey[]; resist?: ElementKey[]; note?: string; checked?: string }

const toMap = (r?: AffinityRecord | null): AffinityMap => {
  const m: AffinityMap = {};
  r?.weak?.forEach((e) => (m[e] = 'weak'));
  r?.resist?.forEach((e) => (m[e] = 'resist'));
  return m;
};

/** Los dos equipos (cuenta y general) para unas debilidades dadas. */
export function Recommendations({ chars, affinity, labels: L, basePath, accountPath }: {
  chars: TeamChar[]; affinity: AffinityMap; labels: Labels; basePath: string; accountPath: string;
}) {
  const owned = useOwned();
  const [dealers, setDealers] = useState<1 | 2>(2);
  const general = useMemo(() => recommendTeam(chars, { affinity, dealers }), [chars, affinity, dealers]);
  const account = useMemo(() => (owned ? recommendTeam(chars, { affinity, dealers, owned }) : null), [chars, affinity, dealers, owned]);
  const accountGaps = account ? account.main.filter((s) => !s).length + (account.sub ? 0 : 1) : 0;

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
        {owned === undefined ? <p className="text-xs text-smoke">{L['tm.loading']}</p> : account ? (
          <>
            <TeamView team={account} labels={L} affinity={affinity} basePath={basePath} />
            {accountGaps > 0 && <p className="mt-3 text-xs text-flame">{L['tm.missing']}</p>}
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
      </details>
    </div>
  );
}

export interface ContentTeamsProps {
  labels: Labels;
  basePath: string;
  accountPath: string;
  /** Datos guardados: clave = id del contenido o "id/piso" */
  data: Record<string, AffinityRecord>;
  contentId: string;
  floors?: number;
  locale: string;
}

export default function ContentTeams({ labels: L, basePath, accountPath, data, contentId, floors, locale }: ContentTeamsProps) {
  const chars = useTeamChars();
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
            {saved ? (saved.checked ? fill(L['tm.affinity.saved'], { d: fmt(saved.checked) }) : L['tm.affinity.saved.nodate']) : L['tm.affinity.none']}
            {saved?.note ? ` · ${saved.note}` : ''}
          </p>
        </div>
      </section>
      {chars ? <Recommendations chars={chars} affinity={affinity} labels={L} basePath={basePath} accountPath={accountPath} /> : <p className="text-sm text-smoke">{L['tm.loading']}</p>}
    </div>
  );
}
