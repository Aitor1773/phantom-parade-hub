// Piezas comunes del creador de equipos y de los equipos por contenido.
import { useEffect, useState } from 'react';
import { ELEMENT_COLOR, Placeholder } from '@/components/characters/CharacterBrowser';
import type { Account, Affinity, ElementKey, Team, TeamChar, TeamMemory, TeamSlot } from '@/lib/team-recs';

export const ELEMENTS: ElementKey[] = ['red', 'blue', 'green', 'yellow'];
export type Labels = Record<string, string>;
export type AffinityMap = Partial<Record<ElementKey, Affinity>>;
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

/** Personajes con rangos y memorias (archivos estáticos compartidos). */
export function useTeamData() {
  const [data, setData] = useState<{ chars: TeamChar[]; memories: TeamMemory[] } | null>(null);
  useEffect(() => {
    let alive = true;
    const get = (u: string) => fetch(u).then((r) => r.json()).catch(() => []);
    Promise.all([get('/data/team-chars.json'), get('/data/team-memories.json')]).then(([chars, memories]) => alive && setData({ chars, memories }));
    return () => { alive = false; };
  }, []);
  return data;
}

/** Tu cuenta (localStorage "pp-inventory"): personajes con su inversión y memorias. null si no hay personajes. */
export function useAccount() {
  const [acc, setAcc] = useState<Account | null | undefined>(undefined);
  useEffect(() => {
    const read = () => {
      try {
        const inv = JSON.parse(localStorage.getItem('pp-inventory') ?? 'null');
        const chars = inv?.characters ?? {};
        setAcc(Object.keys(chars).length ? { chars, mems: inv?.memories ?? {} } : null);
      } catch { setAcc(null); }
    };
    read();
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);
  return acc; // undefined = aún leyendo
}

/** Marca por elemento: normal → débil → resiste → normal. */
export function AffinityPicker({ value, onChange, labels: L }: { value: AffinityMap; onChange: (v: AffinityMap) => void; labels: Labels }) {
  const cycle = (el: ElementKey) => {
    const next: Affinity | undefined = !value[el] ? 'weak' : value[el] === 'weak' ? 'resist' : undefined;
    const out = { ...value };
    if (next) out[el] = next; else delete out[el];
    onChange(out);
  };
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={L['tm.affinity']}>
      {ELEMENTS.map((el) => {
        const a = value[el];
        return (
          <button key={el} type="button" onClick={() => cycle(el)} aria-pressed={!!a}
            className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${a === 'weak' ? 'border-[#3fcf8e]/70 bg-[#3fcf8e]/10 text-bone' : a === 'resist' ? 'border-[#ff6b7f]/70 bg-[#ff6b7f]/10 text-bone' : 'border-line bg-coal text-dust hover:text-bone'}`}>
            <span className="size-2.5 rounded-full" style={{ background: ELEMENT_COLOR[el] }} />
            {L[`el.${el}`]}
            <span className="text-xs">{a === 'weak' ? `▲ ${L['tm.weak']}` : a === 'resist' ? `▼ ${L['tm.resist']}` : ''}</span>
          </button>
        );
      })}
    </div>
  );
}

const RANK_CLS: Record<string, string> = { S: 'bg-flame text-ash', A: 'bg-ember text-ash', B: 'bg-crimson text-bone', C: 'bg-cinder text-bone', D: 'bg-coal text-dust' };

/** Un hueco del equipo. */
export function SlotCard({ slot, label, labels: L, affinity, basePath, onClick, onRemove }: {
  slot: TeamSlot | { c: TeamChar; as?: 'dmg' | 'sup'; mem?: TeamMemory | null } | null; label: string; labels: Labels; affinity?: AffinityMap; basePath?: string;
  onClick?: () => void; onRemove?: () => void;
}) {
  const c = slot?.c;
  const as = slot && 'as' in slot ? slot.as : undefined;
  const rank = slot && 'rank' in slot ? slot.rank : c && as ? (as === 'dmg' ? c.dmg : c.sup) : null;
  const mem = slot && 'mem' in slot ? slot.mem : undefined;
  const a = c ? affinity?.[c.element as ElementKey] : undefined;
  const body = (
    <>
      <span className="relative block aspect-square overflow-hidden rounded-lg border-2 border-line bg-cinder" style={{ ['--el' as string]: c ? ELEMENT_COLOR[c.element] : undefined, borderColor: c ? `${ELEMENT_COLOR[c.element]}80` : undefined }}>
        {c ? (c.img ? <img src={c.img} srcSet={c.srcset} sizes="120px" alt="" loading="lazy" decoding="async" className="size-full object-cover object-top" /> : <Placeholder name={c.name} />) : (
          <span className="grid size-full place-items-center text-2xl text-smoke">+</span>
        )}
        {rank && <span className={`absolute top-1 left-1 rounded px-1 text-[10px] font-black ${RANK_CLS[rank]}`}>{rank}</span>}
        {a && <span className={`absolute top-1 right-1 rounded px-1 text-[10px] font-bold ${a === 'weak' ? 'bg-[#3fcf8e] text-ash' : 'bg-[#ff6b7f] text-ash'}`}>{a === 'weak' ? '▲' : '▼'}</span>}
      </span>
      <span className="mt-1 block truncate text-[11px] font-semibold text-bone">{c ? c.name : L['tm.empty']}</span>
      <span className="block truncate text-[10px] text-smoke">{c ? (c.epithet ?? '') : label}</span>
      {c && <span className="block truncate text-[10px] text-dust">{label}{as ? ` · ${L[as === 'dmg' ? 'tm.dmg' : 'tm.sup']}` : ''}</span>}
      {mem !== undefined && c && (
        <span className="mt-1 flex items-center gap-1 rounded-md border border-line bg-ash/50 p-0.5 pr-1" title={mem ? `${L['tm.memory']}: ${mem.name}` : L['tm.nomem']}>
          {mem?.img ? <img src={mem.img} alt="" loading="lazy" className="size-6 shrink-0 rounded object-cover" /> : <span className="grid size-6 shrink-0 place-items-center rounded bg-cinder text-[9px] text-smoke">—</span>}
          <span className="min-w-0 truncate text-[9px] leading-tight text-dust">{mem ? mem.name : L['tm.nomem']}</span>
        </span>
      )}
    </>
  );
  return (
    <div className="relative min-w-0">
      {onClick ? (
        <button type="button" onClick={onClick} className="block w-full text-left transition hover:-translate-y-0.5" aria-label={`${label}: ${c ? c.name : L['tb.pick']}`}>{body}</button>
      ) : c && basePath ? (
        <a href={`${basePath}/characters/${c.id}`} className="block transition hover:-translate-y-0.5">{body}</a>
      ) : <div>{body}</div>}
      {onRemove && c && (
        <button type="button" onClick={onRemove} className="absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full border border-line bg-coal text-xs text-dust hover:text-bone" aria-label={`${L['tb.remove']}: ${c.name}`}>✕</button>
      )}
    </div>
  );
}

/**
 * Texto para publicar un equipo en el foro. Las líneas "pp-…" las lee el proceso diario
 * (scripts/data/fetch-community.mjs) para mostrar los equipos más votados y las debilidades.
 */
export function teamPost(team: Team, affinity: AffinityMap, L: Labels, opts: { content?: string; floor?: number } = {}) {
  const line = (s: TeamSlot | null) => (s ? `${s.c.name}${s.c.epithet ? ` (${s.c.epithet})` : ''} · ${L[s.as === 'dmg' ? 'tm.dmg' : 'tm.sup']}${s.mem ? ` · ${s.mem.name}` : ''}` : '—');
  const aff = ELEMENTS.filter((e) => affinity[e]).map((e) => `${L[`el.${e}`]} ${affinity[e] === 'weak' ? '▲' : '▼'}`).join(', ');
  const ids = (xs: (TeamSlot | null)[]) => xs.map((s) => s?.c.id ?? '-').join(',');
  return [
    opts.content ? `**${opts.content}${opts.floor ? ` · ${L['tm.floor']} ${opts.floor}` : ''}**` : '',
    ...team.main.map((s) => `- ${L['tm.main']}: ${line(s)}`),
    `- ${L['tm.sub']}: ${line(team.sub)}`,
    `- ${L['tm.helper']}: ${line(team.helper)}`,
    aff ? `${L['tm.affinity']}: ${aff}` : '',
    '',
    `${L['tb.strategy']}: `,
    '',
    '```',
    `pp-team: main=${ids(team.main)} sub=${team.sub?.c.id ?? '-'} helper=${team.helper?.c.id ?? '-'} mem=${[...team.main, team.sub].map((s) => s?.mem?.id ?? '-').join(',')}`,
    ...(aff ? [`pp-affinity: ${ELEMENTS.filter((e) => affinity[e]).map((e) => `${e}=${affinity[e]}`).join(' ')}`] : []),
    ...(opts.floor ? [`pp-floor: ${opts.floor}`] : []),
    '```',
  ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n').trim();
}

/** Copia el equipo al portapapeles y lleva al hilo del foro de la página (si lo hay). */
export function CopyTeamButton({ text, labels: L }: { text: string; labels: Labels }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn-secondary h-8 px-3 text-xs" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2500); } catch { window.prompt(L['tb.copy'], text); }
      document.getElementById('community')?.scrollIntoView({ behavior: 'smooth' });
    }}>
      {done ? L['tb.copied'] : L['tb.copy']}
    </button>
  );
}

/** Equipo completo: 4 titulares, suplente y apoyo. */
export function TeamView({ team, labels: L, affinity, basePath }: { team: Team; labels: Labels; affinity?: AffinityMap; basePath?: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
      {team.main.map((s, i) => <SlotCard key={i} slot={s} label={L['tm.main']} labels={L} affinity={affinity} basePath={basePath} />)}
      <SlotCard slot={team.sub} label={L['tm.sub']} labels={L} affinity={affinity} basePath={basePath} />
      <SlotCard slot={team.helper} label={L['tm.helper']} labels={L} affinity={affinity} basePath={basePath} />
    </div>
  );
}
