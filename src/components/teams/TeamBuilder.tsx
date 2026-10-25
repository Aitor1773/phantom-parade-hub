// Creador de equipos: 4 titulares, suplente y apoyo. Elige a mano o rellena con lo mejor
// de tu cuenta / lo mejor en general. Los equipos se guardan en localStorage ("pp-teams").
import { useEffect, useMemo, useState } from 'react';
import { ELEMENT_COLOR } from '@/components/characters/CharacterBrowser';
import { assignMemories, effectiveRank, recommendTeam, slotScore, type Account, type ElementKey, type Role, type Team, type TeamChar, type TeamSlot } from '@/lib/team-recs';
import { Readiness, Recommendations } from './ContentTeams';
import { TeamPlan } from './TeamPlan';
import { AffinityPicker, CharPicker, CopyTeamButton, SlotCard, fill, roleOf, teamPost, useAccount, useTeamData, type AffinityMap, type Labels } from './shared';

const KEY = 'pp-teams';
const SLOTS = 6; // 0–3 titulares, 4 suplente, 5 apoyo
interface Saved { name: string; slots: (string | null)[]; roles?: (Role | null)[]; affinity: AffinityMap }
const RP: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
const RANKS = ['D', 'C', 'B', 'A', 'S'];

function loadSaved(): Saved[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((t) => t && Array.isArray(t.slots)).slice(0, 50) : [];
  } catch { return []; }
}
const teamToSlots = (t: Team) => [...t.main.map((s) => s?.c.id ?? null), t.sub?.c.id ?? null, t.helper?.c.id ?? null];

export default function TeamBuilder({ labels: L, basePath, accountPath, teamsPath }: { labels: Labels; basePath: string; accountPath: string; teamsPath: string }) {
  const data = useTeamData();
  const chars = data?.chars ?? null;
  const memories = data?.memories ?? [];
  const account = useAccount();
  const owned = useMemo(() => (account ? new Set(Object.keys(account.chars)) : account), [account]);
  const [slots, setSlots] = useState<(string | null)[]>(Array(SLOTS).fill(null));
  const [roleSet, setRoleSet] = useState<(Role | null)[]>(Array(SLOTS).fill(null));
  const [affinity, setAffinity] = useState<AffinityMap>({});
  const [picking, setPicking] = useState<number | null>(null);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [name, setName] = useState('');
  useEffect(() => setSaved(loadSaved()), []);
  const persist = (list: Saved[]) => {
    setSaved(list);
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* sin almacenamiento */ }
  };

  const byId = useMemo(() => new Map((chars ?? []).map((c) => [c.id, c])), [chars]);
  const team = slots.map((id) => (id ? byId.get(id) ?? null : null));
  const slotLabel = (i: number) => L[i < 4 ? 'tm.main' : i === 4 ? 'tm.sub' : 'tm.helper'];

  // El equipo montado, con tu inversión y el reparto de memorias
  const ownOf = (c: TeamChar) => account?.chars[c.id] ?? null;
  // Rol de cada hueco: el que le dio la recomendación o, si lo eliges tú, el de su mejor rango
  const mk = (c: TeamChar | null, i: number): TeamSlot | null => {
    if (!c) return null;
    const as = roleSet[i] ?? roleOf(c, affinity) ?? 'sup';
    return { c, as, rank: effectiveRank(c, as, ownOf(c)) ?? 'D', score: slotScore(c, as, affinity, ownOf(c)) ?? 0 };
  };
  const built: Team = { main: team.slice(0, 4).map(mk), sub: mk(team[4], 4), helper: mk(team[5], 5) };
  // Memorias: las tuyas si todo el equipo es tuyo; si no, las mejores en general
  const allMine = !!account && [...built.main, built.sub].every((s) => !s || account.chars[s.c.id]);
  assignMemories([...built.main, built.sub], memories, allMine ? account : null);
  const builtSlots = [...built.main, built.sub, built.helper];
  const best = useMemo(() => (chars ? recommendTeam(chars, { affinity, memories }) : null), [chars, affinity, memories]);

  const fillWith = (useOwnedOnly: boolean) => {
    if (!chars) return;
    const t = recommendTeam(chars, { affinity, account: useOwnedOnly ? account : null });
    setSlots(teamToSlots(t));
    setRoleSet([...t.main.map((s) => s?.as ?? null), t.sub?.as ?? null, t.helper?.as ?? null]);
  };
  const setSlot = (i: number, id: string | null) => {
    setSlots((s) => s.map((x, j) => (j === i ? id : x)));
    setRoleSet((r) => r.map((x, j) => (j === i ? null : x)));
  };
  /** Coloca a los titulares de apoyo a la izquierda (actúan antes y sus mejoras llegan al ataque) */
  const supportsFirst = () => {
    const order = [0, 1, 2, 3].sort((a, b) => Number(builtSlots[a]?.as === 'dmg') - Number(builtSlots[b]?.as === 'dmg') || a - b);
    setSlots((s) => [...order.map((i) => s[i]), ...s.slice(4)]);
    setRoleSet((r) => [...order.map((i) => builtSlots[i]?.as ?? r[i]), ...r.slice(4)]);
  };
  /** Cambia el rol de un hueco entre daño y apoyo (si el personaje tiene rango en ambos) */
  const toggleRole = (i: number) => setRoleSet((r) => r.map((x, j) => (j === i ? ((builtSlots[i]?.as ?? 'sup') === 'dmg' ? 'sup' : 'dmg') : x)));

  // Análisis de los titulares
  const mainSlots = built.main.filter((s): s is TeamSlot => !!s);
  const main = mainSlots.map((s) => s.c);
  const nDmg = mainSlots.filter((s) => s.as === 'dmg').length, nSup = mainSlots.filter((s) => s.as === 'sup').length;
  const ranks = mainSlots.filter((s) => (s.as === 'dmg' ? s.c.dmg : s.c.sup)).map((s) => s.rank) as string[];
  const avg = ranks.length ? RANKS[Math.round(ranks.reduce((a, r) => a + RP[r], 0) / ranks.length) - 1] : null;
  const names = team.filter(Boolean).map((c) => c!.name);
  const dup = names.length !== new Set(names).size;
  const resisted = main.filter((c) => affinity[c.element as ElementKey] === 'resist').length;
  const warnings = [
    main.length === 4 && nSup < 2 ? L['tb.warn.sup'] : null,
    dup ? L['tb.warn.dup'] : null,
    resisted ? fill(L['tb.warn.resist'], { n: resisted }) : null,
  ].filter(Boolean) as string[];

  if (!chars) return <p className="text-sm text-smoke">{L['tm.loading']}</p>;

  return (
    <div className="space-y-8">
      <section className="card space-y-5 p-4 sm:p-6">
        <div>
          <p className="text-sm font-bold text-bone">{L['tm.affinity']}</p>
          <p className="mt-0.5 mb-2 text-xs text-smoke">{L['tm.affinity.hint']}</p>
          <AffinityPicker value={affinity} onChange={setAffinity} labels={L} />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {team.map((c, i) => (
            <div key={i} className="min-w-0">
              <SlotCard slot={c ? builtSlots[i] : null} label={slotLabel(i)} labels={L} affinity={affinity}
                onClick={() => setPicking(i)} onRemove={() => setSlot(i, null)} />
              {c && c.dmg && c.sup && i < 5 && (
                <button type="button" onClick={() => toggleRole(i)} className="mt-1 w-full rounded-md border border-line px-1 py-0.5 text-[10px] text-dust hover:text-bone">
                  ⇄ {L[builtSlots[i]?.as === 'dmg' ? 'tm.sup' : 'tm.dmg']}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary h-9 px-3 text-xs" onClick={() => fillWith(true)} disabled={!owned} title={owned ? undefined : L['tm.noinv']}>{L['tb.fillAccount']}</button>
          <button type="button" className="btn-secondary h-9 px-3 text-xs" onClick={() => fillWith(false)}>{L['tb.fillGeneral']}</button>
          <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => setSlots(Array(SLOTS).fill(null))}>{L['tb.clear']}</button>
        </div>
        {!owned && owned !== undefined && <p className="text-xs text-smoke">{L['tm.noinv']} <a href={accountPath} className="text-flame underline underline-offset-2">{L['tm.goaccount']}</a></p>}

        {main.length > 0 && (
          <div className="rounded-xl border border-line bg-ash/40 p-3 text-xs">
            <p className="font-bold text-bone">{L['tb.analysis']}</p>
            <p className="mt-1 text-dust">{fill(L['tb.roles'], { d: nDmg, s: nSup })}{avg ? ` · ${L['tb.avg']}: ${avg}` : ''}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(['red', 'blue', 'green', 'yellow'] as const).map((el) => {
                const n = main.filter((c) => c.element === el).length;
                return n ? <span key={el} className="flex items-center gap-1 text-dust"><span className="size-2 rounded-full" style={{ background: ELEMENT_COLOR[el] }} />{L[`el.${el}`]} ×{n}</span> : null;
              })}
            </div>
            {warnings.map((w) => <p key={w} className="mt-1 text-flame">⚠ {w}</p>)}
          </div>
        )}
        {mainSlots.length > 0 && <TeamPlan slots={mainSlots} account={account} labels={L} basePath={basePath} onReorder={supportsFirst} />}
        {allMine && account && best && main.length > 0 && (
          <Readiness mine={built} best={best} account={account as Account} memories={memories} labels={L} basePath={basePath} />
        )}

        <form className="flex flex-wrap gap-2" onSubmit={(e) => {
          e.preventDefault();
          if (!slots.some(Boolean)) return;
          const n = name.trim().slice(0, 40) || `${L['tb.team']} ${saved.length + 1}`;
          persist([{ name: n, slots, roles: roleSet, affinity }, ...saved.filter((t) => t.name !== n)]);
          setName('');
        }}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={L['tb.name']} aria-label={L['tb.name']}
            className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-coal px-3 text-sm text-bone placeholder:text-smoke focus:border-ember/60 focus:outline-none" />
          <button type="submit" className="btn-secondary h-9 px-3 text-xs" disabled={!slots.some(Boolean)}>{L['tb.save']}</button>
        </form>
        {main.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-smoke">
            <CopyTeamButton text={teamPost(built, affinity, L)} labels={L} />
            <span>{L['tb.copy.hint']} <a href={teamsPath} className="text-flame underline underline-offset-2">{L['tb.copy.where']}</a></span>
          </div>
        )}
        {saved.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold text-bone">{L['tb.saved']}</p>
            <ul className="space-y-1.5">
              {saved.map((t) => (
                <li key={t.name} className="flex items-center gap-2 rounded-lg border border-line bg-coal/60 px-3 py-2 text-xs">
                  <span className="min-w-0 flex-1 truncate font-semibold text-bone">{t.name}</span>
                  <span className="hidden gap-1 sm:flex">
                    {t.slots.slice(0, 4).map((id, i) => {
                      const c = id ? byId.get(id) : null;
                      return c?.img ? <img key={i} src={c.img} alt="" className="size-7 rounded object-cover object-top" /> : <span key={i} className="size-7 rounded bg-cinder" />;
                    })}
                  </span>
                  <button type="button" className="btn-ghost h-7 px-2 text-xs" onClick={() => { setSlots([...t.slots, ...Array(SLOTS).fill(null)].slice(0, SLOTS)); setRoleSet([...(t.roles ?? []), ...Array(SLOTS).fill(null)].slice(0, SLOTS)); setAffinity(t.affinity ?? {}); }}>{L['tb.load']}</button>
                  <button type="button" className="btn-ghost h-7 px-2 text-xs text-[#ff6b7f]" onClick={() => persist(saved.filter((x) => x !== t))}>{L['tb.delete']}</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-2xl font-bold text-bone">{L['tb.recs']}</h2>
        <p className="mb-4 text-sm text-dust">{L['tb.recs.desc']}</p>
        <Recommendations chars={chars} memories={memories} affinity={affinity} labels={L} basePath={basePath} accountPath={accountPath} />
      </section>

      {picking != null && (
        <CharPicker chars={chars} owned={owned} affinity={affinity} title={slotLabel(picking)} labels={L}
          onPick={(id) => { setSlot(picking, id); setPicking(null); }} onClose={() => setPicking(null)} />
      )}
    </div>
  );
}
