import type { OverlayLang } from "@/hooks/useEntityTranslations";

/** The overlay languages an AI "Generate" action fills — every overlay language
 *  except English, which is the admin-written source for these flows. */
export const AI_TARGET_LANGS: Exclude<OverlayLang, "en">[] = ["es", "it", "de", "nl", "pl"];

/** Shape returned by every backend section-translate endpoint: French (base) + the 5 AI target languages. */
export type SectionTranslationResult<T> = Record<"fr" | Exclude<OverlayLang, "en">, T>;

/** Full response from a section-translate endpoint: per-language content, plus a
 *  human-readable failure reason for any language that didn't come back (network
 *  daily quota, rate limit, etc.) — never just a silent empty field. */
export interface SectionTranslationOutcome<T> {
  result: SectionTranslationResult<T>;
  errors: Partial<SectionTranslationResult<string>>;
}

/** Turns a per-language error map into one short line for display next to a
 *  Generate button, e.g. "ES, IT, DE, NL, PL: AI daily free-tier quota reached — try again in 8 min". */
export function summarizeGenerateErrors(errors: Partial<SectionTranslationResult<string>>): string | null {
  const entries = Object.entries(errors).filter((e): e is [string, string] => !!e[1]);
  if (!entries.length) return null;
  const langs = entries.map(([lang]) => lang.toUpperCase()).join(", ");
  const uniqueMessages = Array.from(new Set(entries.map(([, msg]) => msg)));
  return uniqueMessages.length === 1
    ? `${langs}: ${uniqueMessages[0]}`
    : `${langs}: some languages failed to generate.`;
}
