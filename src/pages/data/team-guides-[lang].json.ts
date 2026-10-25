// Rotación de cada personaje (de «Cómo jugarlo»), para el plan por turnos del creador de equipos.
// Un archivo por idioma de texto: /data/team-guides-es.json y /data/team-guides-en.json.
import type { APIRoute } from 'astro';
import { CHARACTERS, kitVersions, resolveKit } from '@/data/characters';
import { KIT_SLOT, guideOf, type GuideSkill } from '@/data/char-guides';

export type PlanSkill = Exclude<GuideSkill, 'other'>;
export interface PlanGuide {
  /** Nombre e icono de cada habilidad en el kit vigente */
  sk: Partial<Record<PlanSkill, { n: string | null; i: string | null }>>;
  /** Pasos de la rotación: habilidad y texto */
  r: { s: GuideSkill; t: string }[];
  /** Pasos con el desbloqueo SP */
  sp?: { s: GuideSkill; t: string }[];
}

export const getStaticPaths = () => [{ params: { lang: 'es' } }, { params: { lang: 'en' } }];

export const GET: APIRoute = ({ params }) => {
  const lang = params.lang as 'es' | 'en';
  const out: Record<string, PlanGuide> = {};
  for (const c of CHARACTERS) {
    const g = guideOf(c.id);
    if (!g) continue;
    const kit = resolveKit(c, kitVersions(c).filter((v) => v !== 'sp' && v !== 'altered').at(-1)!);
    const sk: PlanGuide['sk'] = {};
    for (const [slot, key] of Object.entries(KIT_SLOT)) {
      const s = kit[key];
      if (s) sk[slot as PlanSkill] = { n: s.name ?? null, i: s.img ?? null };
    }
    const steps = (list: { skill: GuideSkill; es: string; en: string }[]) => list.map((x) => ({ s: x.skill, t: x[lang] || x.en }));
    out[c.id] = { sk, r: steps(g.rotation), ...(g.sp?.rotation.length ? { sp: steps(g.sp.rotation) } : {}) };
  }
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
};
