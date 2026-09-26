export const locales = ["en", "ka", "tr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "zarina_locale";

export const localeNames: Record<Locale, string> = {
  en: "English",
  ka: "ქართული",
  tr: "Türkçe",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getLocaleFromSegment(segment: string | undefined): Locale {
  return segment && isLocale(segment) ? segment : defaultLocale;
}
