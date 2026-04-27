"use client";

import { usePathname } from "next/navigation";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./index";

export function useLocale(): Locale {
  const pathname = usePathname();
  const segment = pathname?.split("/")[1] ?? "";
  return LOCALES.includes(segment as Locale) ? (segment as Locale) : DEFAULT_LOCALE;
}
