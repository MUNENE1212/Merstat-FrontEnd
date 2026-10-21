import { ui, defaultLang, showDefaultLang, languages } from './ui';

export type Locale = (typeof languages)[number];

export function getLangFromUrl(url: URL): Locale {
  const [, lang] = url.pathname.split('/');
  if (lang && (languages as readonly string[]).includes(lang)) {
    return lang as Locale;
  }
  return defaultLang;
}

export function useTranslations(lang: Locale) {
  return function t(key: keyof (typeof ui)[typeof defaultLang] | string, ...args: any[]): string {
    const dict = ui[lang] ?? ui[defaultLang];
    let value: any = dict[key as string];
    if (value === undefined) {
      // Fallback to default language string.
      value = ui[defaultLang][key as string];
    }
    if (value === undefined) {
      return key as string;
    }
    // Simple placeholder interpolation: "Hello {name}"
    if (typeof value === 'string' && args.length > 0) {
      return value.replace(/\{(\d+)\}/g, (_m: string, idx: string) => {
        return String(args[Number(idx)] ?? '');
      });
    }
    return value as string;
  };
}

export function useTranslatedPath(lang: Locale) {
  return function translatePath(path: string, targetLang: Locale = lang) {
    if (targetLang === defaultLang && !showDefaultLang) {
      return path;
    }
    return `/${targetLang}${path.startsWith('/') ? path : `/${path}`}`;
  };
}

export function getLocaleConfig(lang: Locale) {
  switch (lang) {
    case 'sw':
      return { dir: 'ltr', ogLocale: 'sw_KE', htmlLang: 'sw-KE' };
    case 'fr':
      return { dir: 'ltr', ogLocale: 'fr_FR', htmlLang: 'fr-FR' };
    default:
      return { dir: 'ltr', ogLocale: 'en_US', htmlLang: 'en' };
  }
}
