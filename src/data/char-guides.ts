// Cómo jugar cada personaje (data/manual/char-guides.json): resumen, rotación paso a paso,
// consejos y compañeros que combinan. Español e inglés; el resto de idiomas usa el inglés.
import file from '../../data/manual/char-guides.json';
import type { Locale } from '@/i18n/utils';

type Text = { es: string; en: string };
export type GuideSkill = 'normal' | 's1' | 's2' | 'ult' | 'other';
export interface CharGuide {
  generated?: boolean;
  checked?: string;
  summary?: Text;
  rotation: (Text & { skill: GuideSkill })[];
  tips: Text[];
  partners: string[];
}

const GUIDES = (file as unknown as { characters: Record<string, CharGuide> }).characters;

/** Guía de un personaje, o null si aún no la hay. */
export const guideOf = (id: string): CharGuide | null => GUIDES[id] ?? null;

/** Texto en el idioma de la página (español o, si no, inglés). */
export const guideText = (t: Text | undefined, lang: Locale) => (t ? (lang === 'es' ? t.es : t.en) || t.en || t.es : '');
