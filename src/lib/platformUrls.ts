/**
 * Platform booking URL builders.
 *
 * Each builder accepts a clean base URL (no query params) and an optional
 * date/time context.  Returns the base URL unchanged when the context is
 * absent or contains unparseable dates — never throws.
 *
 * Formatting per platform (from official URL inspection):
 *   Turo       → startDate=MM/DD/YYYY  startTime=HH:MM  endDate=…  endTime=…
 *   Getaround  → start_date=YYYY-MM-DD start_time=HH:MM end_date=… end_time=…
 *
 * URLSearchParams handles all percent-encoding automatically, so colons and
 * slashes come out as %3A and %2F respectively — matching the examples exactly.
 */

export interface PlatformDateContext {
  startISO: string; // UTC ISO-8601, e.g. "2026-06-19T08:00:00.000Z"
  endISO:   string;
  tz:       string; // IANA timezone used to interpret local intent, e.g. "Europe/Paris"
}

/** Extract { date: "YYYY-MM-DD", time: "HH:MM" } in `tz` from a UTC ISO string. */
function extractParts(iso: string, tz: string): { date: string; time: string } | null {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;

    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year:    "numeric",
      month:   "2-digit",
      day:     "2-digit",
      hour:    "2-digit",
      minute:  "2-digit",
      hourCycle: "h23",
    }).formatToParts(d);

    const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
    const date = `${get("year")}-${get("month")}-${get("day")}`;
    const time = `${get("hour")}:${get("minute")}`;
    if (date === "--" || time === ":") return null;
    return { date, time };
  } catch {
    return null;
  }
}

/** "YYYY-MM-DD" → "MM/DD/YYYY" */
function toTuroDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${m}/${d}/${y}`;
}

function appendParams(baseUrl: string, params: URLSearchParams): string {
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}${params.toString()}`;
}

/**
 * Build a Turo URL with search-context dates injected.
 *
 * Turo parameter format:
 *   startDate=MM/DD/YYYY  startTime=HH:MM  endDate=MM/DD/YYYY  endTime=HH:MM
 */
export function buildTuroUrl(baseUrl: string, ctx: PlatformDateContext | null): string {
  if (!ctx) return baseUrl;
  const start = extractParts(ctx.startISO, ctx.tz);
  const end   = extractParts(ctx.endISO,   ctx.tz);
  if (!start || !end) return baseUrl;

  return appendParams(baseUrl, new URLSearchParams({
    startDate: toTuroDate(start.date),
    startTime: start.time,
    endDate:   toTuroDate(end.date),
    endTime:   end.time,
  }));
}

/**
 * Build a Getaround URL with search-context dates injected.
 *
 * Getaround parameter format:
 *   start_date=YYYY-MM-DD  start_time=HH:MM  end_date=YYYY-MM-DD  end_time=HH:MM
 */
export function buildGetaroundUrl(baseUrl: string, ctx: PlatformDateContext | null): string {
  if (!ctx) return baseUrl;
  const start = extractParts(ctx.startISO, ctx.tz);
  const end   = extractParts(ctx.endISO,   ctx.tz);
  if (!start || !end) return baseUrl;

  return appendParams(baseUrl, new URLSearchParams({
    start_date: start.date,
    start_time: start.time,
    end_date:   end.date,
    end_time:   end.time,
  }));
}
