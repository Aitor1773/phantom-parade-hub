// Plan por turnos del equipo montado: qué habilidad usa cada titular en los primeros turnos,
// cómo seguir y cuándo lanzar los especiales (y en qué parejas para el especial combinado).
// Sale de la rotación de «Cómo jugarlo» de cada personaje (/data/team-guides-<es|en>.json).
import { useEffect, useState } from 'react';
import type { Account, TeamSlot } from '@/lib/team-recs';
import type { PlanGuide, PlanSkill } from '@/pages/data/team-guides-[lang].json';
import { fill, type Labels } from './shared';

type Step = PlanGuide['r'][number];
const SKILL_KEY: Record<PlanSkill, string> = { skill1: 'ch.normal', skill2: 'ch.s1', skill3: 'ch.s2', special: 'ch.ult', combo: 'ch.combo' };

let cache: Promise<Record<string, PlanGuide>> | null = null;
const loadGuides = () => {
  const lang = document.documentElement.lang.startsWith('es') ? 'es' : 'en';
  cache ??= fetch(`/data/team-guides-${lang}.json`).then((r) => r.json()).catch(() => ({}));
  return cache;
};

export function TeamPlan({ slots, account, labels: L, basePath, onReorder }: { slots: TeamSlot[]; account: Account | null | undefined; labels: Labels; basePath: string; onReorder?: () => void }) {
  const [guides, setGuides] = useState<Record<string, PlanGuide> | null>(null);
  useEffect(() => { loadGuides().then(setGuides); }, []);
  if (!guides || !slots.length) return null;

  const members = slots.map((s) => {
    const g = guides[s.c.id];
    return {
      s,
      g,
      moves: g?.r.filter((x) => x.s !== 'special' && x.s !== 'combo') ?? [],
      special: g?.r.find((x) => x.s === 'special') ?? null,
      sp: account?.chars[s.c.id]?.sp && g?.sp ? g.sp : null,
    };
  });
  type Member = (typeof members)[number];
  // Fases: turno 1, turno 2 y, a partir del 3, el resto de su rotación
  const phases = [
    { title: fill(L['tp.turn'], { n: 1 }), pick: (m: Member) => m.moves.slice(0, 1) },
    { title: fill(L['tp.turn'], { n: 2 }), pick: (m: Member) => (m.moves.length > 1 ? m.moves.slice(1, 2) : m.moves.slice(0, 1)) },
    { title: fill(L['tp.turnplus'], { n: 3 }), pick: (m: Member) => (m.moves.length > 2 ? m.moves.slice(2) : m.moves.slice(-1)) },
  ];
  // Especiales: primero los apoyos, luego el daño; parejas apoyo + daño para el especial combinado
  const sups = members.filter((m) => m.s.as === 'sup'), dmgs = members.filter((m) => m.s.as === 'dmg');
  const pairs: [string, string][] = [];
  const restS = [...sups], restD = [...dmgs];
  while (restS.length && restD.length) pairs.push([restS.shift()!.s.c.name, restD.shift()!.s.c.name]);
  const rest = [...restS, ...restD];
  for (let i = 0; i + 1 < rest.length; i += 2) pairs.push([rest[i].s.c.name, rest[i + 1].s.c.name]);
  // ¿Algún apoyo actúa después de un atacante? Los apoyos deberían ir a la izquierda
  const firstDmg = members.findIndex((m) => m.s.as === 'dmg');
  const lateSup = firstDmg >= 0 && sups.some((m) => members.indexOf(m) > firstDmg);

  return (
    <div className="rounded-xl border border-line bg-ash/40 p-3 sm:p-4">
      <p className="text-sm font-bold text-bone">{L['tp.title']}</p>
      <p className="mt-0.5 text-xs text-smoke">{L['tp.desc']}</p>
      {lateSup && (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-flame">
          <span>⚠ {fill(L['st.order'], { names: sups.map((m) => m.s.c.name).join(', ') })}</span>
          {onReorder && <button type="button" onClick={onReorder} className="btn-secondary h-7 px-2 text-[11px]">{L['tp.reorder']}</button>}
        </p>
      )}

      {phases.map((ph) => (
        <div key={ph.title} className="mt-4">
          <p className="mb-2 text-[11px] font-black tracking-[0.15em] text-ember uppercase">{ph.title}</p>
          <ol className="grid gap-2 sm:grid-cols-2">
            {members.map((m, i) => <Move key={m.s.c.id} n={i + 1} m={m} steps={ph.pick(m)} labels={L} basePath={basePath} />)}
          </ol>
        </div>
      ))}

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-black tracking-[0.15em] text-ember uppercase">{L['tp.special']}</p>
        <p className="mb-2 text-xs text-dust">{L['tp.special.order']}</p>
        <ol className="grid gap-2 sm:grid-cols-2">
          {[...sups, ...dmgs].map((m, i) => <Move key={m.s.c.id} n={i + 1} m={m} steps={m.special ? [m.special] : []} labels={L} basePath={basePath} />)}
        </ol>
        {pairs.map(([a, b]) => <p key={a + b} className="mt-2 text-xs text-flame">✦ {fill(L['tp.combo'], { a, b })}</p>)}
      </div>

      {members.some((m) => m.sp) && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-black tracking-[0.15em] text-ember uppercase">{L['tp.sp']}</p>
          <ol className="grid gap-2 sm:grid-cols-2">
            {members.filter((m) => m.sp).map((m, i) => <Move key={m.s.c.id} n={i + 1} m={m} steps={m.sp!} labels={L} basePath={basePath} />)}
          </ol>
        </div>
      )}
    </div>
  );
}

/** Lo que hace un personaje en una fase: su retrato, la habilidad (icono y nombre) y la explicación */
function Move({ n, m, steps, labels: L, basePath }: { n: number; m: { s: TeamSlot; g?: PlanGuide }; steps: Step[]; labels: Labels; basePath: string }) {
  const [open, setOpen] = useState(false);
  const c = m.s.c;
  return (
    <li className="flex gap-2.5 rounded-lg border border-line bg-cinder/50 p-2">
      <a href={`${basePath}/characters/${c.id}`} className="relative shrink-0" title={L['tp.guide']}>
        {c.img ? <img src={c.img} alt="" loading="lazy" className="size-10 rounded-md object-cover object-top" /> : <span className="block size-10 rounded-md bg-coal" />}
        <span className="absolute -top-1 -left-1 grid size-4 place-items-center rounded-full bg-ember text-[9px] font-black text-ash">{n}</span>
      </a>
      <div className="min-w-0 flex-1 text-xs">
        <p className="truncate font-semibold text-bone">{c.name}{c.epithet ? <span className="font-normal text-smoke"> · {c.epithet}</span> : null}</p>
        {!steps.length && <p className="text-smoke">{L['tp.noguide']}</p>}
        {steps.map((st, i) => {
          const sk = st.s !== 'other' ? m.g?.sk[st.s] : null;
          return (
            <div key={i} className="mt-1">
              {st.s !== 'other' && (
                <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-ember uppercase">
                  {sk?.i && <img src={sk.i} alt="" loading="lazy" className="size-4 rounded-sm" />}
                  {L[SKILL_KEY[st.s]]}{sk?.n ? <span className="truncate normal-case text-dust"> · {sk.n}</span> : null}
                </p>
              )}
              <button type="button" onClick={() => setOpen(!open)} className={`text-left leading-snug text-dust ${open ? '' : 'line-clamp-2'}`}>{st.t}</button>
            </div>
          );
        })}
      </div>
    </li>
  );
}
