import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ELEMENT_COLOR, Placeholder } from '@/components/characters/CharacterBrowser';
import Advice, { type AdvBanner, type AdvChar, type AdvEstimate } from './Advice';
import {
  emptyInventory, exportInventory, loadInventory, sanitize, saveInventory,
  type Inventory, type OwnedCharacter, type SkillKey,
} from '@/lib/inventory';

export interface AccChar { id: string; name: string; epithet: string | null; rarity: string; element: string; img: string | null; hasSP: boolean }
export interface AccMem { id: string; name: string; rarity: string; img: string | null }

interface Props {
  characters: AccChar[];
  memories: AccMem[];
  labels: Record<string, string>;
  advice: {
    chars: AdvChar[];
    banners: AdvBanner[];
    estimates: AdvEstimate[];
    gacha: { cubesPerPull: number; pity: number; sourceUrl: string };
    tierSource: { name: string; url: string; updated: string | null };
    basePath: string;
  };
}

type Tab = 'advice' | 'characters' | 'memories' | 'resources' | 'data';
type OwnFilter = 'all' | 'owned' | 'missing';
const TABS: Tab[] = ['characters', 'memories', 'resources', 'advice', 'data'];
const RARITIES = ['SSR', 'SR', 'R'];
const RARITY_CLASS: Record<string, string> = { SSR: 'badge-ssr', SR: 'badge-sr', R: 'badge-r' };
const SKILLS: SkillKey[] = ['normal', 's1', 's2', 'ult'];
const BASE_RESOURCES = ['cubes', 'tickets', 'featured'] as const;
const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const fill = (s: string, vars: Record<string, string | number>) => Object.entries(vars).reduce((t, [k, v]) => t.replace(`{${k}}`, String(v)), s);

// ── Piezas pequeñas ─────────────────────────────────────────────

function Stepper({ value, min = 0, max = 999, onChange, label }: { value: number; min?: number; max?: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-line bg-coal" role="group" aria-label={label}>
      <button type="button" className="grid size-8 place-items-center text-dust hover:bg-cinder hover:text-bone disabled:opacity-30" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="−">−</button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
        className="h-8 w-12 bg-transparent text-center text-sm font-semibold text-bone tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label={label}
      />
      <button type="button" className="grid size-8 place-items-center text-dust hover:bg-cinder hover:text-bone disabled:opacity-30" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="+">+</button>
    </div>
  );
}

function Chips<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-coal p-1">
      {options.map((o) => (
        <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${value === o.v ? 'bg-cinder text-bone' : 'text-dust hover:text-bone'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Progress({ label, a, b, tpl }: { label: string; a: number; b: number; tpl: string }) {
  const pct = b ? Math.round((a / b) * 100) : 0;
  return (
    <div className="min-w-0 flex-1 basis-40">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-dust">{label}</span>
        <span className="font-semibold text-bone tabular-nums">{fill(tpl, { a, b })}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cinder">
        <div className="h-full rounded-full bg-gradient-to-r from-ember to-flame transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Panel de edición de un personaje ────────────────────────────

function EditPanel({ char, owned, labels, onChange, onToggle, onClose }: {
  char: AccChar; owned: OwnedCharacter | undefined; labels: Record<string, string>;
  onChange: (patch: Partial<OwnedCharacter>) => void; onToggle: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  const c = owned ?? {};
  const set = (patch: Partial<OwnedCharacter>) => onChange(patch);
  const skillLabel: Record<SkillKey, string> = { normal: labels['ch.normal'], s1: labels['ch.s1'], s2: labels['ch.s2'], ult: labels['ch.ult'] };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ash/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${char.epithet ?? ''} ${char.name}`}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-line-strong bg-coal shadow-2xl shadow-black/70 focus:outline-none sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ ['--el' as string]: ELEMENT_COLOR[char.element] ?? '#ff5a1f' }}
      >
        <header className="flex items-center gap-3 border-b border-line p-4">
          <span className="size-14 shrink-0 overflow-hidden rounded-lg bg-cinder">
            {char.img ? <img src={char.img} alt="" className="size-full object-cover object-top" /> : <Placeholder name={char.name} />}
          </span>
          <div className="min-w-0 flex-1">
            {char.epithet && <p className="truncate text-xs text-flame">{char.epithet}</p>}
            <p className="truncate font-semibold text-bone">{char.name}</p>
            <span className={RARITY_CLASS[char.rarity] ?? 'badge'}>{char.rarity}</span>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost size-9 p-0" aria-label="✕">✕</button>
        </header>

        {!owned ? (
          <div className="p-5">
            <button type="button" className="btn-primary w-full py-3" onClick={onToggle}>{labels['acc.add']}</button>
          </div>
        ) : (
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-dust">{labels['acc.level']}</span>
                <Stepper value={c.level ?? 1} min={1} onChange={(v) => set({ level: v })} label={labels['acc.level']} />
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-dust">{labels['acc.dupes']}</span>
                <Stepper value={c.dupes ?? 0} max={5} onChange={(v) => set({ dupes: v })} label={labels['acc.dupes']} />
              </div>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-dust">{labels['acc.skills']}</legend>
              <div className="space-y-2.5">
                {SKILLS.map((k) => {
                  const v = c.skills?.[k] ?? 1;
                  return (
                    <label key={k} className="flex items-center gap-3 text-xs text-dust">
                      <span className="w-24 shrink-0 truncate">{skillLabel[k]}</span>
                      <input type="range" min={1} max={10} step={1} value={v} className="fuga-range flex-1"
                        onChange={(e) => set({ skills: { ...c.skills, [k]: Number(e.target.value) } })} />
                      <span className="w-6 text-right font-semibold text-bone tabular-nums">{v}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {char.hasSP && (
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-cinder/50 px-3 py-2.5 text-sm text-bone">
                <input type="checkbox" checked={!!c.sp} onChange={(e) => set({ sp: e.target.checked || undefined })} className="size-4 accent-[#ff5a1f]" />
                {labels['acc.sp']}
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-dust">{labels['acc.note']}</span>
              <textarea value={c.note ?? ''} maxLength={280} rows={2} onChange={(e) => set({ note: e.target.value || undefined })}
                className="w-full rounded-lg border border-line bg-ash px-3 py-2 text-sm text-bone focus:border-ember/60 focus:outline-none" />
            </label>

            <button type="button" onClick={onToggle} className="w-full rounded-lg border border-crimson/40 py-2.5 text-sm text-[#ff6b7f] hover:bg-crimson/10">
              {labels['acc.remove']}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Aplicación ──────────────────────────────────────────────────

export default function AccountApp({ characters, memories, labels, advice }: Props) {
  const valid = useMemo(() => ({ characters: new Set(characters.map((c) => c.id)), memories: new Set(memories.map((m) => m.id)) }), [characters, memories]);
  const [inv, setInv] = useState<Inventory>(emptyInventory);
  const [ready, setReady] = useState(false);
  const [saveOk, setSaveOk] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const undoStack = useRef<Inventory[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [tab, setTab] = useState<Tab>('characters');
  const [own, setOwn] = useState<OwnFilter>('all');
  const [rarity, setRarity] = useState('all');
  const [element, setElement] = useState('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [newRes, setNewRes] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Carga inicial + pestaña desde la URL (#memories…)
  useEffect(() => {
    setInv(loadInventory(valid));
    const h = location.hash.slice(1) as Tab;
    if (TABS.includes(h)) setTab(h);
    setReady(true);
  }, [valid]);

  // Guardado automático (con un pequeño retardo)
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      const ok = saveInventory(inv);
      setSaveOk(ok);
      if (ok) setSavedAt(Date.now());
    }, 300);
    return () => clearTimeout(t);
  }, [inv, ready]);

  const update = useCallback((fn: (prev: Inventory) => Inventory) => {
    setInv((prev) => {
      undoStack.current = [...undoStack.current.slice(-29), prev];
      setCanUndo(true);
      return { ...fn(prev), updatedAt: new Date().toISOString() };
    });
  }, []);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (prev) setInv(prev);
    setCanUndo(undoStack.current.length > 0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/input|textarea/i.test(t.tagName)) {
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undo]);

  const closeEdit = useCallback(() => setEditing(null), []);

  const changeTab = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, '', `#${t}`);
  };

  // ── Personajes ──
  const toggleChar = (id: string) =>
    update((p) => {
      const chars = { ...p.characters };
      if (chars[id]) delete chars[id];
      else chars[id] = {};
      return { ...p, characters: chars };
    });
  // Se fusiona con el estado más reciente (no con el que vio el panel al pintarse)
  const patchChar = (id: string, patch: Partial<OwnedCharacter>) =>
    update((p) => ({ ...p, characters: { ...p.characters, [id]: { ...p.characters[id], ...patch } } }));

  // ── Memorias ──
  const toggleMem = (id: string) =>
    update((p) => {
      const mems = { ...p.memories };
      if (mems[id]) delete mems[id];
      else mems[id] = { copies: 1 };
      return { ...p, memories: mems };
    });
  const setCopies = (id: string, copies: number) =>
    update((p) => {
      const mems = { ...p.memories };
      if (copies <= 0) delete mems[id];
      else mems[id] = { ...mems[id], copies };
      return { ...p, memories: mems };
    });

  // ── Filtros ──
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
  const matchText = (s: string) => terms.every((t) => normalize(s).includes(t));
  const shownChars = characters.filter((c) =>
    (own === 'all' || (own === 'owned') === !!inv.characters[c.id]) &&
    (rarity === 'all' || c.rarity === rarity) &&
    (element === 'all' || c.element === element) &&
    matchText(`${c.name} ${c.epithet ?? ''}`));
  const shownMems = memories.filter((m) =>
    (own === 'all' || (own === 'owned') === !!inv.memories[m.id]) &&
    (rarity === 'all' || m.rarity === rarity) &&
    matchText(m.name));

  const markShown = (value: boolean) =>
    update((p) => {
      if (tab === 'characters') {
        const chars = { ...p.characters };
        for (const c of shownChars) value ? (chars[c.id] ??= {}) : delete chars[c.id];
        return { ...p, characters: chars };
      }
      const mems = { ...p.memories };
      for (const m of shownMems) value ? (mems[m.id] ??= { copies: 1 }) : delete mems[m.id];
      return { ...p, memories: mems };
    });

  // ── Recursos ──
  const setRes = (id: string, v: number) => update((p) => ({ ...p, resources: { ...p.resources, [id]: v } }));
  const addRes = () => {
    const name = newRes.trim();
    if (!name) return;
    const id = `custom-${normalize(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || Date.now().toString(36)}`;
    update((p) => ({ ...p, customResources: { ...p.customResources, [id]: name.slice(0, 60) }, resources: { ...p.resources, [id]: p.resources[id] ?? 0 } }));
    setNewRes('');
  };
  const delRes = (id: string) =>
    update((p) => {
      const customResources = { ...p.customResources };
      const resources = { ...p.resources };
      delete customResources[id];
      delete resources[id];
      return { ...p, customResources, resources };
    });

  // ── Copia de seguridad ──
  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = sanitize(JSON.parse(await file.text()), valid);
      const c = Object.keys(data.characters).length, m = Object.keys(data.memories).length;
      if (!c && !m && !Object.keys(data.resources).length) throw new Error('empty');
      update(() => data);
      setMessage({ text: fill(labels['acc.import.ok'], { c, m }), ok: true });
    } catch {
      setMessage({ text: labels['acc.import.bad'], ok: false });
    }
    if (fileRef.current) fileRef.current.value = '';
  };
  const reset = () => {
    if (confirm(labels['acc.reset.confirm'])) update(() => emptyInventory());
  };

  // ── Resumen ──
  const ownedChars = Object.keys(inv.characters).length;
  const ownedMems = Object.keys(inv.memories).length;
  const ssrTotal = characters.filter((c) => c.rarity === 'SSR').length;
  const ssrOwned = characters.filter((c) => c.rarity === 'SSR' && inv.characters[c.id]).length;
  const editingChar = editing ? characters.find((c) => c.id === editing) : null;
  const elements = [...new Set(characters.map((c) => c.element))];

  const tabLabel: Record<Tab, string> = {
    characters: labels['acc.tab.characters'], memories: labels['acc.tab.memories'], resources: labels['acc.tab.resources'], advice: labels['adv.tab'], data: labels['acc.tab.data'],
  };

  // Función (no componente) para no perder el foco del buscador al teclear
  const toolbar = (extra?: ReactNode) => (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={labels['acc.search']} aria-label={labels['acc.search']}
        className="h-9 min-w-0 flex-1 basis-44 rounded-lg border border-line bg-coal px-3 text-sm text-bone placeholder:text-smoke focus:border-ember/60 focus:outline-none" />
      <Chips value={own} onChange={setOwn} options={[{ v: 'all', label: labels['acc.all'] }, { v: 'owned', label: labels['acc.owned'] }, { v: 'missing', label: labels['acc.missing'] }]} />
      <Chips value={rarity} onChange={setRarity} options={[{ v: 'all', label: labels['acc.all'] }, ...RARITIES.map((r) => ({ v: r, label: r }))]} />
      {extra}
    </div>
  );
  const bulk = (
    <div className="flex gap-2">
      <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={() => markShown(true)}>{labels['acc.markall']}</button>
      <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={() => markShown(false)}>{labels['acc.unmarkall']}</button>
    </div>
  );

  return (
    <div>
      {/* Resumen y estado de guardado */}
      <div className="card mb-6 flex flex-wrap items-center gap-x-6 gap-y-4 p-5">
        <Progress label={labels['acc.tab.characters']} a={ownedChars} b={characters.length} tpl={labels['acc.progress']} />
        <Progress label="SSR" a={ssrOwned} b={ssrTotal} tpl={labels['acc.progress']} />
        <Progress label={labels['acc.tab.memories']} a={ownedMems} b={memories.length} tpl={labels['acc.progress']} />
        <div className="flex w-full items-center justify-between gap-3 border-t border-line pt-3 text-xs">
          <span aria-live="polite" className={saveOk ? 'text-smoke' : 'text-[#ff6b7f]'}>
            {!ready ? '…' : saveOk ? (savedAt ? `✓ ${labels['acc.saved']} · ${labels['acc.privacy']}` : labels['acc.privacy']) : labels['acc.notsaved']}
          </span>
          <button type="button" onClick={undo} disabled={!canUndo} className="btn-secondary h-8 px-3 text-xs disabled:opacity-40">↶ {labels['acc.undo']}</button>
        </div>
      </div>

      {/* Pestañas */}
      <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => changeTab(t)}
            className={`relative shrink-0 px-4 py-2.5 text-sm font-semibold transition ${tab === t ? 'text-bone' : 'text-dust hover:text-bone'}`}>
            {tabLabel[t]}
            {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-ember to-flame" />}
          </button>
        ))}
      </div>

      {tab === 'characters' && (
        <section>
          {toolbar(<Chips value={element} onChange={setElement} options={[{ v: 'all', label: labels['acc.all'] }, ...elements.map((e) => ({ v: e, label: labels[`el.${e}`] ?? e }))]} />)}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-smoke">
            <p>{labels['acc.quick']}</p>
            {bulk}
          </div>
          {shownChars.length === 0 ? (
            <p className="card p-8 text-center text-sm text-dust">{labels['acc.empty']}</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {shownChars.map((c) => {
                const o = inv.characters[c.id];
                return (
                  <li key={c.id} className="relative" style={{ ['--el' as string]: ELEMENT_COLOR[c.element] ?? '#ff5a1f' }}>
                    <button type="button" aria-pressed={!!o} onClick={() => toggleChar(c.id)} title={`${c.epithet ?? ''} ${c.name}`}
                      className={`group block w-full overflow-hidden rounded-xl border-2 text-left transition duration-200 ${o ? 'border-[color:var(--el)] shadow-[0_0_18px_-6px_var(--el)]' : 'border-line opacity-50 grayscale hover:opacity-80 hover:grayscale-0'}`}>
                      <span className="relative block aspect-[3/4] bg-cinder">
                        {c.img ? <img src={c.img} alt="" loading="lazy" className="size-full object-cover object-top" /> : <Placeholder name={c.name} />}
                        <span className="absolute inset-0 bg-gradient-to-t from-ash via-transparent to-transparent" />
                        <span className={`${RARITY_CLASS[c.rarity] ?? 'badge'} absolute top-1.5 left-1.5 px-1.5 text-[9px]`}>{c.rarity}</span>
                        {o && <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-[color:var(--el)] text-[11px] font-bold text-ash">✓</span>}
                        <span className="absolute inset-x-0 bottom-0 p-1.5 pr-9">
                          <span className="block truncate text-[10px] text-flame/90">{c.epithet}</span>
                          <span className="block truncate text-[11px] font-semibold text-bone">{c.name}</span>
                          {o && (o.level || o.dupes || o.sp) ? (
                            <span className="mt-0.5 block text-[10px] text-dust tabular-nums">
                              {[o.level ? `Lv ${o.level}` : '', o.dupes ? `+${o.dupes}` : '', o.sp ? 'SP' : ''].filter(Boolean).join(' · ')}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                    <button type="button" onClick={() => setEditing(c.id)} aria-label={`${labels['acc.edit']}: ${c.name}`}
                      className="absolute right-1.5 bottom-1.5 grid size-7 place-items-center rounded-md border border-line-strong bg-ash/85 text-xs text-bone backdrop-blur-sm transition hover:border-ember hover:text-ember">
                      ✎
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {tab === 'memories' && (
        <section>
          {toolbar()}
          <div className="mb-4 flex justify-end">{bulk}</div>
          {shownMems.length === 0 ? (
            <p className="card p-8 text-center text-sm text-dust">{labels['acc.empty']}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {shownMems.map((m) => {
                const o = inv.memories[m.id];
                return (
                  <li key={m.id} className={`overflow-hidden rounded-xl border-2 transition ${o ? 'border-ember/70' : 'border-line'}`}>
                    <button type="button" aria-pressed={!!o} onClick={() => toggleMem(m.id)} title={m.name}
                      className={`relative block aspect-[2/1] w-full bg-cinder transition ${o ? '' : 'opacity-50 grayscale hover:opacity-80 hover:grayscale-0'}`}>
                      {m.img ? <img src={m.img} alt="" loading="lazy" className="size-full object-cover" /> : <span className="grid size-full place-items-center px-2 text-center text-[10px] text-smoke">{m.name}</span>}
                      <span className={`${RARITY_CLASS[m.rarity] ?? 'badge'} absolute top-1.5 left-1.5 px-1.5 text-[9px]`}>{m.rarity}</span>
                      {o && <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-ember text-[11px] font-bold text-ash">✓</span>}
                    </button>
                    <div className="flex items-center justify-between gap-2 bg-coal p-2">
                      <span className="min-w-0 truncate text-[11px] font-medium text-bone">{m.name}</span>
                      {o && <Stepper value={o.copies ?? 1} min={0} onChange={(v) => setCopies(m.id, v)} label={labels['acc.copies']} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {tab === 'resources' && (
        <section className="max-w-xl space-y-3">
          {BASE_RESOURCES.map((id) => (
            <label key={id} className="card flex items-center justify-between gap-4 px-4 py-3">
              <span className="text-sm font-medium text-bone">{labels[`acc.res.${id}`]}</span>
              <input type="number" inputMode="numeric" min={0} value={inv.resources[id] ?? 0}
                onChange={(e) => setRes(id, Math.max(0, Math.round(Number(e.target.value) || 0)))}
                className="h-9 w-32 rounded-lg border border-line bg-ash px-3 text-right text-sm font-semibold text-bone tabular-nums focus:border-ember/60 focus:outline-none" />
            </label>
          ))}
          {Object.entries(inv.customResources).map(([id, name]) => (
            <div key={id} className="card flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-bone">{name}</span>
              <input type="number" inputMode="numeric" min={0} value={inv.resources[id] ?? 0} aria-label={name}
                onChange={(e) => setRes(id, Math.max(0, Math.round(Number(e.target.value) || 0)))}
                className="h-9 w-28 rounded-lg border border-line bg-ash px-3 text-right text-sm font-semibold text-bone tabular-nums focus:border-ember/60 focus:outline-none" />
              <button type="button" onClick={() => delRes(id)} className="btn-ghost size-9 p-0 text-[#ff6b7f]" aria-label={`${labels['acc.delete']}: ${name}`}>✕</button>
            </div>
          ))}
          <form className="flex gap-2 pt-2" onSubmit={(e) => { e.preventDefault(); addRes(); }}>
            <input value={newRes} onChange={(e) => setNewRes(e.target.value)} maxLength={60} placeholder={labels['acc.res.name']} aria-label={labels['acc.res.name']}
              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-coal px-3 text-sm text-bone placeholder:text-smoke focus:border-ember/60 focus:outline-none" />
            <button type="submit" className="btn-secondary h-10" disabled={!newRes.trim()}>+ {labels['acc.res.add']}</button>
          </form>
          <p className="text-xs text-smoke">{labels['acc.res.hint']}</p>
        </section>
      )}

      {tab === 'advice' && <Advice inv={inv} labels={labels} {...advice} />}

      {tab === 'data' && (
        <section className="card max-w-xl space-y-4 p-5">
          <p className="text-sm text-dust">{labels['acc.data.desc']}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => exportInventory(inv)}>⤓ {labels['acc.export']}</button>
            <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>⤒ {labels['acc.import']}</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
          </div>
          {message && <p role="status" className={`text-sm ${message.ok ? 'text-[#5fd39b]' : 'text-[#ff6b7f]'}`}>{message.text}</p>}
          <div className="border-t border-line pt-4">
            <button type="button" onClick={reset} className="rounded-lg border border-crimson/40 px-4 py-2 text-sm text-[#ff6b7f] hover:bg-crimson/10">{labels['acc.reset']}</button>
          </div>
          <p className="text-xs text-smoke">{labels['acc.privacy']}</p>
        </section>
      )}

      {editingChar && (
        <EditPanel
          char={editingChar}
          owned={inv.characters[editingChar.id]}
          labels={labels}
          onChange={(patch) => patchChar(editingChar.id, patch)}
          onToggle={() => toggleChar(editingChar.id)}
          onClose={closeEdit}
        />
      )}
    </div>
  );
}
