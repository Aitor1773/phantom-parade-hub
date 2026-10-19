// Fuente única de idiomas: la usan astro.config.mjs y el código de la web.
export const LOCALES = ['en', 'es', 'pt', 'fr', 'de', 'ja', 'ko', 'zh'];
export const DEFAULT_LOCALE = 'en';

export const LOCALE_META = {
  en: { label: 'English', short: 'EN', htmlLang: 'en' },
  es: { label: 'Español', short: 'ES', htmlLang: 'es' },
  pt: { label: 'Português (BR)', short: 'PT', htmlLang: 'pt-BR' },
  fr: { label: 'Français', short: 'FR', htmlLang: 'fr' },
  de: { label: 'Deutsch', short: 'DE', htmlLang: 'de' },
  ja: { label: '日本語', short: 'JA', htmlLang: 'ja' },
  ko: { label: '한국어', short: 'KO', htmlLang: 'ko' },
  zh: { label: '简体中文', short: 'ZH', htmlLang: 'zh-Hans' },
};
