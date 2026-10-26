// Tarjeta de colección: % de personajes y memorias que tienes (de Mi cuenta), por rareza y color,
// tus personajes más invertidos y los SSR que te faltan. Se descarga como imagen para compartir.
import { useEffect, useState } from 'react';
import { loadInventory, type Inventory } from '@/lib/inventory';

export interface ClChar { id: string; name: string; ep: string | null; rarity: string; el: string; img: string | null }
export interface ClMem { id: string; rarity: string }
const EL_COLOR: Record<string, string> = { red: '#ff4d5e', blue: '#4d8dff', green: '#3fcf8e', yellow: '#f4c34d' };
const ELS = ['red', 'blue', 'green', 'yellow'];
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default function CollectionCard({ chars, memories, labels: L, colors, accountPath, siteName }: {
  chars: ClChar[]; memories: ClMem[]; labels: Record<string, string>; colors: Record<string, string>; accountPath: string; siteName: string;
}) {
  const [inv, setInv] = useState<Inventory | null>(null);
  const [player, setPlayer] = useState('');
  useEffect(() => {
    setInv(loadInventory({ characters: new Set(chars.map((c) => c.id)), memories: new Set(memories.map((m) => m.id)) }));
    try { setPlayer(localStorage.getItem('pp-player') ?? ''); } catch { /* sin almacenamiento */ }
  }, [chars, memories]);
  if (!inv) return null;

  const own = chars.filter((c) => inv.characters[c.id]);
  const ownMem = memories.filter((m) => inv.memories[m.id]);
  if (!own.length && !ownMem.length) {
    return <p className="card p-5 text-sm text-dust">{L['cl.empty']} <a href={accountPath} className="text-flame underline underline-offset-2">→</a></p>;
  }
  const ssr = chars.filter((c) => c.rarity === 'SSR');
  const ssrOwn = ssr.filter((c) => inv.characters[c.id]);
  const byEl = ELS.map((el) => ({ el, have: own.filter((c) => c.el === el).length, total: chars.filter((c) => c.el === el).length }));
  // Más invertidos: copias extra, luego nivel
  const best = [...own].sort((a, b) => {
    const A = inv.characters[a.id], B = inv.characters[b.id];
    return (B.dupes ?? 0) - (A.dupes ?? 0) || (B.level ?? 0) - (A.level ?? 0);
  }).slice(0, 8);
  const missing = ssr.filter((c) => !inv.characters[c.id]);
  const stats = {
    chars: [own.length, chars.length] as const,
    ssr: [ssrOwn.length, ssr.length] as const,
    mems: [ownMem.length, memories.length] as const,
  };

  const Bar = ({ label, have, total, color = '#ff5a1f' }: { label: string; have: number; total: number; color?: string }) => (
    <div>
      <p className="flex justify-between text-xs"><span className="text-dust">{label}</span><span className="font-semibold text-bone tabular-nums">{have}/{total} · {pct(have, total)}%</span></p>
      <span className="mt-1 block h-2 overflow-hidden rounded-full bg-cinder"><span className="block h-full rounded-full" style={{ width: `${pct(have, total)}%`, background: color }} /></span>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <input value={player} maxLength={30} onChange={(e) => { setPlayer(e.target.value); try { localStorage.setItem('pp-player', e.target.value); } catch { /* sin almacenamiento */ } }}
          placeholder={L['cl.player']} aria-label={L['cl.player']}
          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-coal px-3 text-sm text-bone placeholder:text-smoke focus:border-ember/60 focus:outline-none" />
        <button type="button" className="btn-primary h-9 px-3 text-xs" onClick={() => renderCard({ player, stats, byEl, best, inv, L, colors, siteName })}>⤓ {L['tk.download']}</button>
      </div>

      <div className="card grid gap-6 p-5 md:grid-cols-2">
        <div className="space-y-3">
          <Bar label={L['cl.chars']} have={stats.chars[0]} total={stats.chars[1]} />
          <Bar label={L['cl.ssr']} have={stats.ssr[0]} total={stats.ssr[1]} color="#f4c34d" />
          <Bar label={L['cl.mems']} have={stats.mems[0]} total={stats.mems[1]} color="#b58cff" />
          <p className="pt-2 text-xs font-bold text-bone">{L['cl.byel']}</p>
          {byEl.map((x) => <Bar key={x.el} label={colors[x.el]} have={x.have} total={x.total} color={EL_COLOR[x.el]} />)}
        </div>
        <div>
          <p className="mb-2 text-xs font-bold text-bone">{L['cl.best']}</p>
          <div className="grid grid-cols-4 gap-2">
            {best.map((c) => (
              <div key={c.id} className="relative overflow-hidden rounded-lg border-2" style={{ borderColor: `${EL_COLOR[c.el]}aa` }} title={`${c.name}${c.ep ? ` · ${c.ep}` : ''}`}>
                {c.img ? <img src={c.img} alt={c.name} loading="lazy" className="aspect-square w-full object-cover object-top" /> : <span className="block aspect-square bg-cinder" />}
                <span className="absolute inset-x-0 bottom-0 bg-ash/80 text-center text-[10px] font-bold text-bone">Lv {inv.characters[c.id].level ?? '—'} · +{inv.characters[c.id].dupes ?? 0}</span>
              </div>
            ))}
          </div>
          {missing.length > 0 && (
            <>
              <p className="mt-4 mb-2 text-xs font-bold text-bone">{L['cl.missing']} <span className="font-normal text-smoke">({missing.length})</span></p>
              <div className="flex flex-wrap gap-1">
                {missing.map((c) => (
                  <span key={c.id} title={`${c.name}${c.ep ? ` · ${c.ep}` : ''}`} className="size-9 overflow-hidden rounded-md border border-line opacity-60 grayscale">
                    {c.img && <img src={c.img} alt={c.name} loading="lazy" className="size-full object-cover object-top" />}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Imagen 1200×630 (tamaño de vista previa en redes) con el resumen de la colección */
async function renderCard({ player, stats, byEl, best, inv, L, colors, siteName }: {
  player: string; stats: Record<'chars' | 'ssr' | 'mems', readonly [number, number]>; byEl: { el: string; have: number; total: number }[];
  best: ClChar[]; inv: Inventory; L: Record<string, string>; colors: Record<string, string>; siteName: string;
}) {
  const W = 1200, H = 630;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1d0d0a'); grad.addColorStop(1, '#0b0605');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ff5a1f'; ctx.fillRect(0, 0, W, 6);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f5e9e0'; ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText(player || 'JJK Phantom Parade', 48, 80);
  ctx.fillStyle = '#9b8a83'; ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(player ? 'JJK Phantom Parade' : siteName, 48, 112);
  const bar = (label: string, [have, total]: readonly [number, number], x: number, y: number, w: number, color: string) => {
    ctx.fillStyle = '#d9c8bf'; ctx.font = '20px system-ui, sans-serif'; ctx.fillText(label, x, y);
    const txt = `${have}/${total} · ${pct(have, total)}%`;
    ctx.fillStyle = '#f5e9e0'; ctx.font = 'bold 20px system-ui, sans-serif'; ctx.fillText(txt, x + w - ctx.measureText(txt).width, y);
    ctx.fillStyle = '#2a1d1b'; ctx.fillRect(x, y + 10, w, 12);
    ctx.fillStyle = color; ctx.fillRect(x, y + 10, (w * pct(have, total)) / 100, 12);
  };
  bar(L['cl.chars'], stats.chars, 48, 180, 500, '#ff5a1f');
  bar(L['cl.ssr'], stats.ssr, 48, 240, 500, '#f4c34d');
  bar(L['cl.mems'], stats.mems, 48, 300, 500, '#b58cff');
  byEl.forEach((x, i) => bar(colors[x.el], [x.have, x.total], 48 + (i % 2) * 260, 380 + Math.floor(i / 2) * 60, 240, EL_COLOR[x.el]));
  ctx.fillStyle = '#f5e9e0'; ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillText(L['cl.best'], 620, 170);
  const load = (src: string) => new Promise<HTMLImageElement | null>((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  const imgs = await Promise.all(best.map((c) => (c.img ? load(c.img) : Promise.resolve(null))));
  best.forEach((c, i) => {
    const S = 120, x = 620 + (i % 4) * (S + 13), y = 190 + Math.floor(i / 4) * (S + 40);
    ctx.fillStyle = EL_COLOR[c.el] ?? '#555'; ctx.fillRect(x - 3, y - 3, S + 6, S + 6);
    const img = imgs[i];
    if (img) { const s = Math.min(img.width, img.height); ctx.drawImage(img, (img.width - s) / 2, 0, s, s, x, y, S, S); }
    const o = inv.characters[c.id];
    ctx.fillStyle = '#d9c8bf'; ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`Lv ${o.level ?? '—'} · +${o.dupes ?? 0}`, x, y + S + 24);
  });
  ctx.fillStyle = '#9b8a83'; ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`${siteName} · ${location.host}`, 48, H - 30);
  const a = document.createElement('a');
  a.download = 'phantom-parade-collection.png';
  a.href = cv.toDataURL('image/png');
  a.click();
}
