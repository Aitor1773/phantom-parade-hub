// Recomendaciones calculadas en el navegador a partir del inventario del usuario.
// Cada consejo dice en qué se basa; nada se envía fuera del dispositivo.
import { useMemo, type ReactNode } from 'react';
import { ELEMENT_COLOR, Placeholder } from '@/components/characters/CharacterBrowser';
import type { Inventory } from '@/lib/inventory';

export interface AdvChar {
  id: string; name: string; epithet: string | null; rarity: string; element: string; img: string | null;
  rank: string | null; score: number | null;
  memories: { id: string; name: string; img: string | null }[];
}
export interface AdvBanner { id: string; name: string; end: string | null; startUnknown?: boolean; permanent?: boolean; characters: string[] }
export interface AdvEstimate { name: string; characters: string[]; from: string; to: string }

interface Props {
  inv: Inventory;
  chars: AdvChar[];
  banners: AdvBanner[];
  estimates: AdvEstimate[];
  gacha: { cubesPerPull: number; pity: number; sourceUrl: string };
  tierSource: { name: string; url: string; updated: string | null };
  basePath: string; // "/es"
  labels: Record<string, string>;
}

// Rangos de la tier list propia: S y A cuentan como "alto"
const HIGH = new Set(['S', 'A']);
const RANK_CLASS: Record<string, string> = {
  S: 'border-flame/60 bg-flame/15 text-flame',
  A: 'border-ember/60 bg-ember/10 text-ember',
  B: 'border-line-strong bg-cinder text-bone',
  C: 'border-line bg-cinder text-dust',
  D: 'border-line bg-cinder text-smoke',
};
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((t, [k, x]) => t.replace(`{${k}}`, String(x)), s);

function Rank({ rank }: { rank: string | null }) {
  if (!rank) return <span className="rounded border border-line px-1.5 text-[10px] text-smoke">—</span>;
  return <span className={`rounded border px-1.5 text-[10px] font-bold ${RANK_CLASS[rank] ?? RANK_CLASS.C}`}>{rank}</span>;
}

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h3 className="font-sans text-base font-bold text-bone">{title}</h3>
      {hint && <p className="mt-1 text-xs text-smoke">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Mini({ c, base, owned, extra }: { c: AdvChar; base: string; owned?: boolean; extra?: ReactNode }) {
  return (
    <a href={`${base}/characters/${c.id}`} className="group flex items-center gap-3 rounded-lg border border-line bg-cinder/40 p-2 transition hover:border-line-strong"
      style={{ ['--el' as string]: ELEMENT_COLOR[c.element] ?? '#ff5a1f' }}>
      <span className={`size-11 shrink-0 overflow-hidden rounded-md bg-cinder ${owned === false ? 'opacity-60 grayscale' : ''}`}>
        {c.img ? <img src={c.img} alt="" loading="lazy" className="size-full object-cover object-top" /> : <Placeholder name={c.name} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] text-flame/90">{c.epithet}</span>
        <span className="block truncate text-sm font-medium text-bone">{c.name}</span>
      </span>
      <Rank rank={c.rank} />
      {extra}
    </a>
  );
}

export default function Advice({ inv, chars, banners, estimates, gacha, tierSource, basePath, labels }: Props) {
  const byId = useMemo(() => new Map(chars.map((c) => [c.id, c])), [chars]);
  const owns = (id: string) => !!inv.characters[id];
  const ownedChars = chars.filter((c) => owns(c.id));
  const now = Date.now();

  // 1. Tiradas disponibles y pity
  const cubes = inv.resources.cubes ?? 0;
  const tickets = (inv.resources.tickets ?? 0) + (inv.resources.featured ?? 0);
  const pulls = Math.floor(cubes / gacha.cubesPerPull) + tickets;
  const pityPct = Math.min(100, Math.round((pulls / gacha.pity) * 100));
  const cubesToPity = Math.max(0, (gacha.pity - pulls) * gacha.cubesPerPull);

  // 2. Mejor equipo por elemento (4 titulares + 1 suplente, por puntuación del tier)
  const elements = [...new Set(chars.map((c) => c.element))];
  const teams = elements.map((el) => ({
    el,
    members: ownedChars.filter((c) => c.element === el).sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).slice(0, 5),
  }));
  const weakElements = teams.filter((t) => !t.members.some((c) => c.rank && HIGH.has(c.rank))).map((t) => t.el);

  // 3. Banners Global activos con personajes conocidos
  const activeBanners = banners.filter((b) => b.permanent || !b.end || +new Date(b.end) > now);
  const bannerAdvice = activeBanners.map((b) => {
    const feat = b.characters.map((id) => byId.get(id)).filter((c): c is AdvChar => !!c);
    const missingTop = feat.filter((c) => !owns(c.id) && c.rank && HIGH.has(c.rank));
    const verdict = !feat.length ? 'unknown' : missingTop.length ? 'pull' : feat.every((c) => owns(c.id)) ? 'owned' : 'optional';
    return { b, feat, verdict };
  });

  // 4. Para quién ahorrar: top de JP que te falta, con su ventana estimada en Global
  const saveFor = estimates
    .flatMap((e) => e.characters.map((id) => ({ e, c: byId.get(id) })))
    .filter((x): x is { e: AdvEstimate; c: AdvChar } => !!x.c && !owns(x.c.id) && !!x.c.rank && HIGH.has(x.c.rank))
    .sort((a, b) => a.e.from.localeCompare(b.e.from))
    .filter((x, i, arr) => arr.findIndex((y) => y.c.id === x.c.id) === i)
    .slice(0, 8);

  // 5. Memorias recomendadas que faltan para tus mejores personajes
  const topOwned = ownedChars.filter((c) => c.rank && HIGH.has(c.rank)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 10);
  const memoryGaps = topOwned
    .map((c) => ({ c, missing: c.memories.filter((m) => !inv.memories[m.id]) }))
    .filter((x) => x.missing.length);

  const fmtDay = (iso: string) => new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'medium' }).format(new Date(iso));
  const elLabel = (el: string) => labels[`el.${el}`] ?? el;

  if (!ownedChars.length) {
    return <p className="card p-8 text-center text-sm text-dust">{labels['adv.empty']}</p>;
  }

  return (
    <div className="space-y-5">
      <p className="flex flex-wrap items-center gap-x-2 rounded-lg border border-line bg-coal/70 px-3 py-2 text-xs text-smoke">
        {fill(labels['adv.basis'], { src: tierSource.name })}
        <a href={tierSource.url} className="underline underline-offset-2 hover:text-dust">{tierSource.name}</a>
        {tierSource.updated && <span>· {fmtDay(tierSource.updated)}</span>}
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={labels['adv.pulls']} hint={labels['adv.pulls.hint']}>
          <div className="flex items-end justify-between gap-4">
            <p className="text-4xl font-black text-bone tabular-nums">{pulls}</p>
            <p className="text-right text-xs text-dust">{fill(labels['adv.pulls.detail'], { c: cubes.toLocaleString(), t: tickets })}</p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-cinder">
            <div className="h-full rounded-full bg-gradient-to-r from-ember to-flame" style={{ width: `${pityPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-dust">
            {pulls >= gacha.pity ? labels['adv.pity.ok'] : fill(labels['adv.pity.missing'], { p: pityPct, c: cubesToPity.toLocaleString(), n: gacha.pity })}
          </p>
          <a href={gacha.sourceUrl} target="_blank" rel="noopener" className="mt-2 inline-block text-[11px] text-smoke underline underline-offset-2">{labels['adv.pulls.source']}</a>
        </Card>

        <Card title={labels['adv.banners']} hint={labels['adv.banners.hint']}>
          <ul className="space-y-2">
            {bannerAdvice.map(({ b, feat, verdict }) => (
              <li key={b.id} className="rounded-lg border border-line bg-cinder/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-bone">{b.name}</p>
                  <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                    verdict === 'pull' ? 'border-[#3fb27f]/50 bg-[#3fb27f]/10 text-[#5fd39b]' : verdict === 'owned' ? 'border-line text-smoke' : 'border-line text-dust'
                  }`}>{labels[`adv.v.${verdict}`]}</span>
                </div>
                {feat.length > 0 && <div className="mt-2 grid gap-1.5">{feat.map((c) => <Mini key={c.id} c={c} base={basePath} owned={owns(c.id)} />)}</div>}
                {b.end && !b.permanent && <p className="mt-2 text-[11px] text-smoke">{labels['bn.ends']} {fmtDay(b.end)}</p>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title={labels['adv.teams']} hint={labels['adv.teams.hint']}>
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((t) => (
            <div key={t.el}>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-dust uppercase">
                <span className="size-2.5 rounded-full" style={{ background: ELEMENT_COLOR[t.el] }} /> {elLabel(t.el)}
              </p>
              {t.members.length ? (
                <div className="grid gap-1.5">
                  {t.members.map((c, i) => (
                    <Mini key={c.id} c={c} base={basePath} extra={i === 4 ? <span className="text-[10px] text-smoke">{labels['adv.sub']}</span> : undefined} />
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-line p-3 text-xs text-smoke">{labels['adv.none']}</p>
              )}
            </div>
          ))}
        </div>
        {weakElements.length > 0 && (
          <p className="mt-4 rounded-lg border border-flame/40 bg-flame/[0.06] px-3 py-2 text-xs text-flame">
            {fill(labels['adv.gaps'], { e: weakElements.map(elLabel).join(', ') })}
          </p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={labels['adv.save']} hint={labels['adv.save.hint']}>
          {saveFor.length ? (
            <ul className="grid gap-1.5">
              {saveFor.map(({ e, c }) => (
                <li key={c.id}>
                  <Mini c={c} base={basePath} owned={false}
                    extra={<span className="shrink-0 rounded border border-dashed border-flame/60 px-1.5 py-0.5 text-[10px] text-flame">≈ {fmtDay(e.from)} – {fmtDay(e.to)}</span>} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-smoke">{labels['adv.save.none']}</p>
          )}
        </Card>

        <Card title={labels['adv.mem']} hint={labels['adv.mem.hint']}>
          {memoryGaps.length ? (
            <ul className="space-y-3">
              {memoryGaps.map(({ c, missing }) => (
                <li key={c.id}>
                  <p className="mb-1.5 text-xs font-semibold text-bone">{c.epithet ? `${c.epithet} · ` : ''}{c.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {missing.map((m) => (
                      <a key={m.id} href={`${basePath}/memories/${m.id}`} className="flex items-center gap-1.5 rounded-md border border-line bg-cinder/50 py-1 pr-2 pl-1 text-[11px] text-dust hover:border-line-strong hover:text-bone">
                        {m.img && <img src={m.img} alt="" loading="lazy" className="size-6 rounded object-cover" />}
                        {m.name}
                      </a>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-smoke">{labels['adv.mem.none']}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
