import { Fragment, useMemo, useState, type ReactNode } from 'react';
import type { ResolvedKit, KitVersion, Skill } from '@/data/characters';

interface Props {
  kits: Partial<Record<KitVersion, ResolvedKit>>;
  versions: KitVersion[];
  labels: Record<string, string>;
  textLangNote?: string | null;
}

type SkillKey = 'normal' | 's1' | 's2' | 'ult';
const SKILLS: { key: SkillKey; label: string }[] = [
  { key: 'normal', label: 'ch.normal' },
  { key: 's1', label: 'ch.s1' },
  { key: 's2', label: 'ch.s2' },
  { key: 'ult', label: 'ch.ult' },
];

/** Resalta números, porcentajes y estados entre comillas dentro del texto de habilidad. */
export function Effect({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1 text-[13.5px] leading-relaxed text-dust">
      {lines.map((line, i) =>
        line.trim() === '' ? (
          <div key={i} className="h-1.5" />
        ) : (
          <p key={i}>
            {line.split(/(\d+(?:\.\d+)?%|\d+(?:\.\d+)?(?= (?:Turns?|Hits?|Cursed Energy))|"[^"]+")/g).map((part, j) =>
              /^\d/.test(part) ? (
                <span key={j} className="font-semibold text-flame">{part}</span>
              ) : part.startsWith('"') ? (
                <span key={j} className="font-medium text-bone">{part}</span>
              ) : (
                <Fragment key={j}>{part}</Fragment>
              ),
            )}
          </p>
        ),
      )}
    </div>
  );
}

function Chip({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'ember' | 'changed' }) {
  const cls =
    tone === 'ember'
      ? 'border-ember/40 bg-ember/10 text-ember'
      : tone === 'changed'
        ? 'border-flame/50 bg-flame/10 text-flame'
        : 'border-line bg-cinder text-dust';
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>;
}

/** Nivel mostrado: el pedido o el más cercano por debajo que tenga texto. */
function levelText(s: Skill, level: number) {
  for (let i = level - 1; i >= 0; i--) if (s.levels[i]) return { text: s.levels[i]!, shown: i + 1 };
  const first = s.levels.findIndex(Boolean);
  return first >= 0 ? { text: s.levels[first]!, shown: first + 1 } : null;
}

export default function KitViewer({ kits, versions, labels, textLangNote }: Props) {
  const [version, setVersion] = useState<KitVersion>(versions.includes('adjustedV2') ? 'adjustedV2' : versions.includes('adjusted') ? 'adjusted' : 'base');
  const [level, setLevel] = useState(10);
  const kit = kits[version]!;
  const hasChanges = version !== 'base';

  const maxLevel = useMemo(() => {
    const all = SKILLS.map((s) => kit[s.key]?.levels.filter(Boolean).length ?? 0);
    return Math.max(1, ...all) > 1 ? 10 : 1;
  }, [kit]);

  return (
    <div>
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-4">
        {versions.length > 1 && (
          <div role="tablist" aria-label={labels['ch.version']} className="flex flex-wrap gap-1 rounded-xl border border-line bg-coal p-1">
            {versions.map((v) => (
              <button
                key={v}
                role="tab"
                type="button"
                aria-selected={v === version}
                onClick={() => setVersion(v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  v === version ? 'bg-gradient-to-br from-ember to-ember-deep text-ash' : 'text-dust hover:bg-cinder hover:text-bone'
                }`}
              >
                {labels[`ch.v.${v}`]}
              </button>
            ))}
          </div>
        )}
        {maxLevel > 1 && (
          <label className="flex flex-1 basis-56 items-center gap-3 text-xs text-dust">
            <span className="shrink-0 font-semibold">{labels['ch.level']}</span>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="fuga-range w-full"
              aria-valuetext={`${level}`}
            />
            <span className="grid h-7 w-9 shrink-0 place-items-center rounded-md border border-line bg-cinder font-semibold text-bone">{level}</span>
          </label>
        )}
      </div>
      {hasChanges && <p className="mt-3 text-xs text-smoke">{labels['ch.v.note']}</p>}
      {textLangNote && <p className="mt-2 text-xs text-smoke">{textLangNote}</p>}

      {/* Habilidades activas */}
      <div className="mt-5 grid gap-3">
        {SKILLS.map(({ key, label }) => {
          const s = kit[key];
          if (!s) return null;
          const lt = levelText(s, level);
          return (
            <article
              key={key}
              className={`rounded-xl border p-4 transition sm:p-5 ${hasChanges && s.changed ? 'border-flame/40 bg-flame/[0.04]' : 'border-line bg-coal/70'}`}
            >
              <header className="flex items-start gap-3.5">
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-cinder">
                  {s.img ? <img src={s.img} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" /> : <span className="text-xs text-smoke">{labels[label][0]}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold tracking-[0.15em] text-smoke uppercase">{labels[label]}</p>
                  <h3 className="mt-0.5 font-sans text-base font-semibold text-bone">{s.name ?? '—'}</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.cost != null && <Chip tone="ember">{labels['ch.cost'].replace('{n}', String(s.cost))}</Chip>}
                    {s.crit?.rate && <Chip>{labels['ch.crit']} {s.crit.rate}</Chip>}
                    {s.crit?.dmg && <Chip>{labels['ch.critdmg']} {s.crit.dmg}</Chip>}
                    {s.crit?.bfRate && <Chip>{labels['ch.bf']} {s.crit.bfRate}{s.crit.bfDmg ? ` · ${s.crit.bfDmg}` : ''}</Chip>}
                    {hasChanges && s.changed && <Chip tone="changed">{labels['ch.changed']}</Chip>}
                    {lt && lt.shown !== level && <Chip>Lv {lt.shown}</Chip>}
                  </div>
                </div>
              </header>
              {lt && <div className="mt-4 border-t border-line pt-4"><Effect text={lt.text} /></div>}
            </article>
          );
        })}
      </div>

      {/* Definitiva combinada */}
      {kit.comboUlt && (
        <article className="mt-3 rounded-xl border border-line bg-coal/70 p-4 sm:p-5">
          <p className="text-[11px] font-bold tracking-[0.15em] text-smoke uppercase">{labels['ch.combo']}</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <Effect text={kit.comboUlt} />
            {kit.comboUltBuffed && (
              <div className="rounded-lg border border-ember/25 bg-ember/[0.04] p-3">
                <p className="mb-1.5 text-[11px] font-semibold text-ember">{labels['ch.combo.buffed']}</p>
                <Effect text={kit.comboUltBuffed} />
              </div>
            )}
          </div>
        </article>
      )}

      {/* Pasivas */}
      {kit.autos.length > 0 && (
        <>
          <h3 className="mt-10 mb-4 text-xl font-bold text-bone">{labels['ch.autos']}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {kit.autos.map((a, i) => (
              <article key={i} className={`rounded-xl border p-4 ${hasChanges && a.changed ? 'border-flame/40 bg-flame/[0.04]' : 'border-line bg-coal/70'}`}>
                <header className="mb-3 flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-cinder">
                    {a.img ? <img src={a.img} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" /> : <span className="text-xs text-smoke">{i + 1}</span>}
                  </span>
                  <h4 className="min-w-0 flex-1 text-sm font-semibold text-bone">{a.name ?? `#${i + 1}`}</h4>
                  {hasChanges && a.changed && <Chip tone="changed">{labels['ch.changed']}</Chip>}
                </header>
                <Effect text={a.effect} />
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
