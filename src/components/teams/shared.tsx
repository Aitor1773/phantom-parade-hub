// Piezas comunes del creador de equipos y de los equipos por contenido.
import { useEffect, useMemo, useState } from 'react';
import { ELEMENT_COLOR, Placeholder } from '@/components/characters/CharacterBrowser';
import { slotScore, type Account, type Affinity, type ElementKey, type Team, type TeamChar, type TeamMemory, type TeamSlot } from '@/lib/team-recs';
import type { StageNeeds } from '@/lib/stage';

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

const MEM_RARITY: Record<string, string> = { SSR: '#f4c34d', SR: '#b58cff', R: '#7ab8ff' };

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
        // Memoria equipada: su ilustración a lo ancho, con rareza y nombre encima
        <span className="relative mt-1.5 block aspect-[16/10] overflow-hidden rounded-md border border-line bg-cinder" style={{ borderColor: mem ? MEM_RARITY[mem.rarity] : undefined }}
          title={mem ? `${L['tm.memory']}: ${mem.name}` : L['tm.nomem']}>
          {mem?.art || mem?.img ? (
            <img src={mem.art ?? mem.img!} srcSet={mem.artSet} sizes="160px" alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center text-[10px] text-smoke">—</span>
          )}
          {mem && <span className="absolute top-0.5 left-0.5 rounded px-1 text-[9px] font-black text-ash" style={{ background: MEM_RARITY[mem.rarity] }}>{mem.rarity}</span>}
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ash via-ash/80 to-transparent px-1 pt-3 pb-0.5 text-[10px] leading-tight text-bone">
            <span className="line-clamp-2">{mem ? mem.name : L['tm.nomem']}</span>
          </span>
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

/** Rol con el que cuenta un personaje: el de su mejor rango (con las debilidades y la fase). */
export const roleOf = (c: TeamChar, a: AffinityMap, needs?: StageNeeds | null): 'dmg' | 'sup' | undefined => {
  const d = slotScore(c, 'dmg', a, null, 0, needs), s = slotScore(c, 'sup', a, null, 0, needs);
  if (d == null && s == null) return undefined;
  return (d ?? -99) >= (s ?? -99) ? 'dmg' : 'sup';
};

/**
 * Ventana para elegir personaje: búsqueda, «solo los míos» y filtro por color.
 * La usan el creador de equipos y los equipos por contenido (para cambiar un hueco).
 */
export function CharPicker({ chars, owned, affinity, needs, title, labels: L, onPick, onClose, defaultOwned = false }: {
  chars: TeamChar[]; owned: Set<string> | null | undefined; affinity: AffinityMap; needs?: StageNeeds | null;
  title: string; labels: Labels; onPick: (id: string) => void; onClose: () => void; defaultOwned?: boolean;
}) {
  const [q, setQ] = useState('');
  const [onlyOwned, setOnlyOwned] = useState(defaultOwned && !!owned?.size);
  const [color, setColor] = useState<ElementKey | null>(null);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return chars
      .filter((c) => (!onlyOwned || owned?.has(c.id)) && (!color || c.element === color) && (!s || `${c.name} ${c.epithet ?? ''}`.toLowerCase().includes(s)))
      .map((c) => ({ c, score: Math.max(slotScore(c, 'dmg', affinity, null, 0, needs) ?? -99, slotScore(c, 'sup', affinity, null, 0, needs) ?? -99) }))
      .sort((a, b) => b.score - a.score);
  }, [chars, q, onlyOwned, color, owned, affinity, needs]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={L['tb.pick']}
      onClick={(e) => e.target === e.currentTarget && onClose()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-t-2xl border border-line-strong bg-coal sm:rounded-2xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <p className="mr-auto text-sm font-bold text-bone">{L['tb.pick']} · {title}</p>
          <label className="flex items-center gap-1.5 text-xs text-dust">
            <input type="checkbox" checked={onlyOwned} disabled={!owned} onChange={(e) => setOnlyOwned(e.target.checked)} className="size-4 accent-[#ff5a1f]" />
            {L['tb.onlyowned']}
          </label>
          <button type="button" className="btn-ghost size-8 p-0" onClick={onClose} aria-label={L['tb.close']}>✕</button>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={L['tb.search']} aria-label={L['tb.search']}
            className="h-9 w-full rounded-lg border border-line bg-ash px-3 text-sm text-bone placeholder:text-smoke focus:border-ember/60 focus:outline-none" />
          {/* Filtro por color */}
          <div className="flex w-full flex-wrap gap-1.5" role="group" aria-label={L['tb.allcolors']}>
            {[null, ...ELEMENTS].map((el) => (
              <button key={el ?? 'all'} type="button" aria-pressed={color === el} onClick={() => setColor(el)}
                className="flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold text-dust transition aria-pressed:border-ember/70 aria-pressed:bg-ember/15 aria-pressed:text-bone">
                {el && <span className="size-2.5 rounded-full" style={{ background: ELEMENT_COLOR[el] }} />}
                {el ? L[`el.${el}`] : L['tb.allcolors']}
              </button>
            ))}
          </div>
        </div>
        <ul className="grid grid-cols-4 gap-2 overflow-y-auto p-3 sm:grid-cols-6">
          {list.map(({ c }) => (
            <li key={c.id}>
              <SlotCard slot={{ c, as: roleOf(c, affinity, needs) }} label={c.dmg || c.sup ? '' : L['tb.unranked']} labels={L} affinity={affinity}
                onClick={() => onPick(c.id)} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
