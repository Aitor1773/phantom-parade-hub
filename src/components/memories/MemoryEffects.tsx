import { useState } from 'react';
import { Effect } from '@/components/characters/KitViewer';
import type { MemoryEffect } from '@/data/memories';

interface Props {
  effects: MemoryEffect[];
  labels: Record<string, string>;
  textLangNote?: string | null;
}

/** Efectos de una memoria, con selector base / mejorado cuando hay mejora. */
export default function MemoryEffects({ effects, labels, textLangNote }: Props) {
  const hasLv2 = effects.some((e) => e.textLv2);
  const [lv2, setLv2] = useState(hasLv2);

  return (
    <div>
      {hasLv2 && (
        <div role="tablist" className="mb-4 inline-flex gap-1 rounded-xl border border-line bg-coal p-1">
          {[false, true].map((v) => (
            <button
              key={String(v)}
              role="tab"
              type="button"
              aria-selected={lv2 === v}
              onClick={() => setLv2(v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                lv2 === v ? 'bg-gradient-to-br from-ember to-ember-deep text-ash' : 'text-dust hover:bg-cinder hover:text-bone'
              }`}
            >
              {labels[v ? 'mem.lv2' : 'mem.lv1']}
            </button>
          ))}
        </div>
      )}
      {textLangNote && <p className="mb-3 text-xs text-smoke">{textLangNote}</p>}
      <div className="grid gap-3">
        {effects.map((e, i) => {
          const text = lv2 && e.textLv2 ? e.textLv2 : e.text;
          const cd = lv2 && e.cdLv2 != null ? e.cdLv2 : e.cd;
          const changed = lv2 && !!e.textLv2 && e.textLv2 !== e.text;
          return (
            <article key={i} className={`rounded-xl border p-4 sm:p-5 ${changed ? 'border-flame/40 bg-flame/[0.04]' : 'border-line bg-coal/70'}`}>
              <header className="mb-3 flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-bold tracking-[0.15em] text-smoke uppercase">{labels[i === 0 ? 'mem.effect1' : 'mem.effect2']}</p>
                {cd != null && (
                  <span className="rounded-md border border-ember/40 bg-ember/10 px-2 py-0.5 text-[11px] font-semibold text-ember">
                    {labels['mem.cd'].replace('{n}', String(cd))}
                  </span>
                )}
              </header>
              <Effect text={text} />
            </article>
          );
        })}
      </div>
    </div>
  );
}
