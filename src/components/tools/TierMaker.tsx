// Creador de tier list: coloca personajes en S/A/B/C/D tocando o arrastrando. Se guarda en el
// navegador ("pp-tiermaker"), se comparte con un enlace (#t=…) y se descarga como imagen PNG.
import { useEffect, useMemo, useState } from 'react';
import ElementIcon from '@/components/ElementIcon';

export interface TmChar { id: string; name: string; ep: string | null; el: string; img: string | null }
type Rank = 'S' | 'A' | 'B' | 'C' | 'D';
const RANKS: Rank[] = ['S', 'A', 'B', 'C', 'D'];
const RANK_COLOR: Record<Rank, string> = { S: '#ff5a1f', A: '#f4a63a', B: '#e7d26a', C: '#7fc77a', D: '#7ab8ff' };
const EL_COLOR: Record<string, string> = { red: '#ff4d5e', blue: '#4d8dff', green: '#3fcf8e', yellow: '#f4c34d' };
const KEY = 'pp-tiermaker';
type Rows = Record<Rank, string[]>;
const emptyRows = (): Rows => ({ S: [], A: [], B: [], C: [], D: [] });

/** Código corto y estable de cada personaje para el enlace (4 caracteres base36) */
const code = (id: string) => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1679616).toString(36).padStart(4, '0');
};

export default function TierMaker({ chars, preset, labels: L, colors, siteName }: {
  chars: TmChar[]; preset: Record<string, Rank>; labels: Record<string, string>; colors: Record<string, string>; siteName: string;
}) {
  const byId = useMemo(() => new Map(chars.map((c) => [c.id, c])), [chars]);
  const byCode = useMemo(() => new Map(chars.map((c) => [code(c.id), c.id])), [chars]);
  const [rows, setRows] = useState<Rows>(emptyRows);
  const [title, setTitle] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [el, setEl] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState(false);

  // Al abrir: el enlace compartido manda; si no, lo guardado en el navegador
  useEffect(() => {
    const m = location.hash.match(/t=([^&]*)/);
    if (m) {
      const r = emptyRows();
      for (const part of decodeURIComponent(m[1]).split('~')) {
        const [rank, ...codes] = part.split('.');
        if (RANKS.includes(rank as Rank)) r[rank as Rank] = codes.map((c) => byCode.get(c)).filter((x): x is string => !!x);
      }
      setRows(r);
      const n = location.hash.match(/n=([^&]*)/);
      if (n) setTitle(decodeURIComponent(n[1]).slice(0, 60));
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (saved?.rows) { setRows({ ...emptyRows(), ...saved.rows }); setTitle(saved.title ?? ''); }
    } catch { /* sin almacenamiento */ }
  }, [byCode]);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ rows, title })); } catch { /* sin almacenamiento */ }
  }, [rows, title]);

  const placed = new Set(RANKS.flatMap((r) => rows[r]));
  const pool = chars.filter((c) => !placed.has(c.id) && (!el || c.el === el) && (!q || `${c.name} ${c.ep ?? ''}`.toLowerCase().includes(q.toLowerCase())));

  const move = (id: string, to: Rank | null) => {
    if (!byId.has(id)) return;
    setRows((r) => {
      const next = Object.fromEntries(RANKS.map((k) => [k, r[k].filter((x) => x !== id)])) as Rows;
      if (to) next[to] = [...next[to], id];
      return next;
    });
    setSel(null);
  };
  const fillPreset = () => {
    const r = emptyRows();
    for (const c of chars) if (preset[c.id]) r[preset[c.id]].push(c.id);
    setRows(r);
  };
  const share = async () => {
    const t = RANKS.map((r) => [r, ...rows[r].map(code)].join('.')).join('~');
    const url = `${location.origin}${location.pathname}#t=${encodeURIComponent(t)}${title ? `&n=${encodeURIComponent(title)}` : ''}`;
    history.replaceState(null, '', url);
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* el enlace ya está en la barra */ }
  };
  const download = () => renderPng(rows, title || L['tk.default'], byId, siteName);

  const chip = (c: TmChar, onClick: () => void) => (
    <button key={c.id} type="button" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)} onClick={(e) => { e.stopPropagation(); onClick(); }} title={`${c.name}${c.ep ? ` · ${c.ep}` : ''}`}
      className={`relative size-14 shrink-0 overflow-hidden rounded-md border-2 bg-cinder transition sm:size-16 ${sel === c.id ? 'scale-105 ring-2 ring-flame' : ''}`}
      style={{ borderColor: `${EL_COLOR[c.el] ?? '#555'}aa` }}>
      {c.img ? <img src={c.img} alt={c.name} loading="lazy" decoding="async" className="size-full object-cover object-top" /> : <span className="text-[9px] text-dust">{c.name}</span>}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 60))} placeholder={L['tk.default']} aria-label={L['tk.name']}
          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-coal px-3 text-sm text-bone placeholder:text-smoke focus:border-ember/60 focus:outline-none" />
        <button type="button" className="btn-primary h-9 px-3 text-xs" onClick={download}>⤓ {L['tk.download']}</button>
        <button type="button" className="btn-secondary h-9 px-3 text-xs" onClick={share}>{copied ? L['tk.copied'] : `🔗 ${L['tk.share']}`}</button>
        <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={fillPreset}>{L['tk.fill']}</button>
        <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => setRows(emptyRows())}>{L['tk.reset']}</button>
      </div>
      <p className="text-xs text-smoke">{L['tk.hint']}</p>

      <div className="overflow-hidden rounded-xl border border-line">
        {RANKS.map((r) => (
          <div key={r} onClick={() => sel && move(sel, r)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); move(e.dataTransfer.getData('text/plain'), r); }}
            className={`flex min-h-[4.5rem] border-b border-line last:border-0 ${sel ? 'cursor-pointer hover:bg-ember/5' : ''}`}>
            <span className="grid w-14 shrink-0 place-items-center text-2xl font-black text-ash sm:w-16" style={{ background: RANK_COLOR[r] }}>{r}</span>
            <div className="flex flex-1 flex-wrap gap-1.5 bg-coal/60 p-1.5">
              {rows[r].map((id) => byId.get(id)).filter((c): c is TmChar => !!c).map((c) => chip(c, () => (sel ? move(sel, r) : move(c.id, null))))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-coal/40 p-3" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); move(e.dataTransfer.getData('text/plain'), null); }}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm font-bold text-bone">{L['tk.pool']} <span className="font-normal text-smoke">({pool.length})</span></p>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L['tk.search']} aria-label={L['tk.search']}
            className="h-8 w-36 rounded-lg border border-line bg-coal px-2 text-xs text-bone placeholder:text-smoke focus:outline-none" />
          {[null, 'red', 'blue', 'green', 'yellow'].map((k) => (
            <button key={k ?? 'all'} type="button" onClick={() => setEl(k)} aria-pressed={el === k}
              className={`flex h-8 items-center gap-1 rounded-lg border px-2 text-xs ${el === k ? 'border-ember/60 bg-ember/10 text-bone' : 'border-line text-dust'}`}>
              {k && <ElementIcon el={k} size={16} />}{k ? colors[k] : L['tk.all']}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {pool.map((c) => chip(c, () => setSel(sel === c.id ? null : c.id)))}
        </div>
      </div>
    </div>
  );
}

/** Dibuja la tier list en un PNG y lo descarga */
async function renderPng(rows: Rows, title: string, byId: Map<string, TmChar>, siteName: string) {
  const W = 1200, CELL = 84, GAP = 6, LABEL = 96, PAD = 24, HEAD = 70, FOOT = 36;
  const perRow = Math.floor((W - LABEL - PAD * 2 - GAP) / (CELL + GAP));
  const heights = RANKS.map((r) => Math.max(1, Math.ceil(rows[r].length / perRow)) * (CELL + GAP) + GAP);
  const H = HEAD + heights.reduce((a, b) => a + b, 0) + FOOT + PAD;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#0b0605'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f5e9e0'; ctx.font = 'bold 30px system-ui, sans-serif'; ctx.textBaseline = 'middle';
  ctx.fillText(title, PAD, HEAD / 2 + 4);
  const load = (src: string) => new Promise<HTMLImageElement | null>((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  let y = HEAD;
  for (const [ri, r] of RANKS.entries()) {
    const h = heights[ri];
    ctx.fillStyle = RANK_COLOR[r]; ctx.fillRect(PAD, y, LABEL, h - 2);
    ctx.fillStyle = '#0b0605'; ctx.font = 'bold 40px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(r, PAD + LABEL / 2, y + h / 2); ctx.textAlign = 'left';
    ctx.fillStyle = '#1a1110'; ctx.fillRect(PAD + LABEL, y, W - PAD * 2 - LABEL, h - 2);
    const list = rows[r].map((id) => byId.get(id)).filter((c): c is TmChar => !!c);
    const imgs = await Promise.all(list.map((c) => (c.img ? load(c.img) : Promise.resolve(null))));
    list.forEach((c, i) => {
      const x = PAD + LABEL + GAP + (i % perRow) * (CELL + GAP), yy = y + GAP + Math.floor(i / perRow) * (CELL + GAP);
      ctx.fillStyle = EL_COLOR[c.el] ?? '#555'; ctx.fillRect(x - 2, yy - 2, CELL + 4, CELL + 4);
      const img = imgs[i];
      if (img) {
        // Recorte cuadrado de la parte superior (la cara)
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, 0, s, s, x, yy, CELL, CELL);
      } else { ctx.fillStyle = '#2a1d1b'; ctx.fillRect(x, yy, CELL, CELL); }
    });
    y += h;
  }
  ctx.fillStyle = '#9b8a83'; ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`${siteName} · ${location.host}`, PAD, H - FOOT / 2 - 4);
  const a = document.createElement('a');
  a.download = 'tier-list.png';
  a.href = cv.toDataURL('image/png');
  a.click();
}
