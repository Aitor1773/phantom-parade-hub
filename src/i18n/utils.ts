import { LOCALES as RAW_LOCALES, DEFAULT_LOCALE as RAW_DEFAULT, LOCALE_META as RAW_META } from './locales.mjs';
import { UI, UI_EN, type UIKey } from './ui';

// locales.mjs es JS (lo lee astro.config); aquí se le dan tipos estrictos
export type Locale = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'ja' | 'ko' | 'zh';
export const LOCALES = RAW_LOCALES as readonly Locale[];
export const DEFAULT_LOCALE = RAW_DEFAULT as Locale;
export const LOCALE_META = RAW_META as Record<Locale, { label: string; short: string; htmlLang: string }>;

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** Devuelve una función de traducción con el inglés como respaldo. */
export function useT(lang: Locale) {
  const dict = UI[lang] ?? {};
  return (key: UIKey, vars?: Record<string, string | number>) => {
    let text = dict[key] ?? UI_EN[key];
    if (vars) for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, String(v));
    return text;
  };
}

/** Ruta con prefijo de idioma: localePath('es', '/characters') → '/es/characters' */
export function localePath(lang: Locale, path = '/') {
  const clean = path === '/' ? '' : path.replace(/\/$/, '');
  return `/${lang}${clean}`;
}

/** Quita el prefijo de idioma de una ruta: '/es/characters' → '/characters' */
export function stripLocale(pathname: string) {
  const [, first, ...rest] = pathname.split('/');
  return isLocale(first) ? '/' + rest.join('/') : pathname;
}

export function staticLocalePaths() {
  return LOCALES.map((lang) => ({ params: { lang } }));
}
