import { en, fr, type Translations } from "./translations";

export const LOCALES = ["en", "fr"] as const;
export const DEFAULT_LOCALE = "en" as const;
export type Locale = typeof LOCALES[number];

const dict: Record<Locale, Translations> = { en, fr };

export function getTranslations(locale: string): Translations {
  return dict[(locale as Locale) in dict ? (locale as Locale) : DEFAULT_LOCALE];
}

export function isValidLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale);
}
