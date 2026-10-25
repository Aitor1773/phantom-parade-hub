// Cómo jugar cada personaje (data/manual/char-guides.json): resumen, rotación paso a paso,
// consejos, compañeros que combinan y, si lo tiene, qué cambia con el desbloqueo SP.
// Español e inglés; el resto de idiomas usa el inglés.
// En el juego no hay «ataque normal»: Habilidad 1, 2 y 3, el especial (必殺) y el especial combinado (連携必殺).
import file from '../../data/manual/char-guides.json';
import type { Locale } from '@/i18n/utils';

type Text = { es: string; en: string };
export type GuideSkill = 'skill1' | 'skill2' | 'skill3' | 'special' | 'combo' | 'other';
export type GuideStep = Text & { skill: GuideSkill };
export interface CharGuide {
  checked?: string;
  summary?: Text;
  rotation: GuideStep[];
  tips: Text[];
  partners: string[];
  /** Qué cambia tras el desbloqueo SP (SP解放) */
  sp?: { summary?: Text; rotation: GuideStep[]; tips: Text[]; priority?: SpPriority };
}
/** Las 2 casillas de desbloqueo SP y cuál conviene primero ('both': las dos; 'awakening': llega con los despertares) */
export type SpSlot = 'skill1' | 'skill2' | 'skill3' | 'special' | 'auto';
export interface SpPriority extends Text {
  /** Valoración de 1 a 5 de la mejora SP, si la hay */
  rating: number | null;
  first: SpSlot | 'both' | 'awakening';
  nodes: { slot: SpSlot; name: string }[];
}

const GUIDES = (file as unknown as { characters: Record<string, CharGuide> }).characters;

/** Casilla del kit (datos de la wiki) que corresponde a cada habilidad del juego */
export const KIT_SLOT = { skill1: 'normal', skill2: 's1', skill3: 's2', special: 'ult' } as const;
/** Clave de texto de cada habilidad */
export const SKILL_LABEL = { skill1: 'ch.normal', skill2: 'ch.s1', skill3: 'ch.s2', special: 'ch.ult', combo: 'ch.combo', auto: 'ch.passive' } as const;

/** Guía de un personaje, o null si aún no la hay. */
export const guideOf = (id: string): CharGuide | null => GUIDES[id] ?? null;

/** Texto en el idioma de la página (español o, si no, inglés). */
export const guideText = (t: Text | undefined, lang: Locale) => (t ? (lang === 'es' ? t.es : t.en) || t.en || t.es : '');
