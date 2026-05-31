/**
 * Centralized timezone-aware date utilities.
 * All functions accept an explicit `tz` (IANA timezone string) parameter.
 * No global state — safe for SSR and browser alike.
 */

// ── Local browser date/time ↔ UTC ISO ────────────────────────────────────────

/**
 * Split a UTC ISO string into { date: "YYYY-MM-DD", time: "HH:mm" }
 * expressed in the browser's local timezone (safe to pass to <input type="date/time">).
 */
export function isoToLocalParts(iso: string): { date: string; time: string } {
  const d   = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/**
 * Convert a local date "YYYY-MM-DD" + time "HH:mm" (browser local timezone) to
 * a UTC ISO string. Uses Z suffix — no "+" in the output, proxy-safe.
 */
export function localPartsToUTC(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

// ── Core converter ────────────────────────────────────────────────────────────

/**
 * Interpret a "YYYY-MM-DDTHH:mm" string as a wall-clock time in `tz` and
 * return the equivalent UTC ISO string.  Inverse of isoToLocalDT.
 *
 * Algorithm: treat the input as UTC (utcGuess), format it in `tz` to get the
 * offset the tz adds at that instant, then subtract that offset.
 */
export function localDTToISO(localDT: string, tz: string): string {
  const [datePart, timePart = '00:00'] = localDT.split('T');
  const [year, month, day]  = datePart.split('-').map(Number);
  const [hour, minute]      = timePart.split(':').map(Number);

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcGuess));

  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0', 10);
  const gotMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));

  return new Date(utcGuess + (utcGuess - gotMs)).toISOString();
}

/**
 * Convert a UTC ISO timestamp to a "local datetime string" in `tz`.
 * Returns "YYYY-MM-DDTHH:mm" — compatible with DateTimePicker value/minValue
 * and HTML datetime-local inputs.
 */
export function isoToLocalDT(iso: string, tz: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

// ── "Now" helpers ─────────────────────────────────────────────────────────────

/** Current datetime in `tz` as "YYYY-MM-DDTHH:mm". */
export function nowLocalDT(tz: string): string {
  return isoToLocalDT(new Date().toISOString(), tz);
}

/** Current date in `tz` as "YYYY-MM-DD". */
export function todayStr(tz: string): string {
  return nowLocalDT(tz).slice(0, 10);
}

/**
 * Next 30-minute slot in `tz` as "YYYY-MM-DDTHH:mm".
 * E.g. if it is 13:22 → "…T13:30", if 13:31 → "…T14:00".
 * Use as `minValue` for DateTimePicker so users cannot select past slots.
 */
export function nowNextSlot(tz: string): string {
  const paris = nowLocalDT(tz);
  const date  = paris.slice(0, 10);
  const h     = parseInt(paris.slice(11, 13), 10);
  const m     = parseInt(paris.slice(14, 16), 10);

  let newH = h, newM: number, newDate = date;
  if (m < 30) {
    newM = 30;
  } else {
    newM = 0;
    newH = h + 1;
    if (newH >= 24) {
      newH = 0;
      const d = new Date(`${date}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      newDate = d.toISOString().slice(0, 10);
    }
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${newDate}T${pad(newH)}:${pad(newM)}`;
}

// ── Display formatters ────────────────────────────────────────────────────────

/** Format an ISO timestamp for display (date + time) in `tz`. */
export function fmtDateTime(iso: string, tz: string, locale = 'en-GB'): string {
  return new Date(iso).toLocaleString(locale, {
    timeZone: tz,
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Format the time-only portion of an ISO timestamp in `tz`. */
export function fmtTime(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit',
  });
}

// ── Day grouping helpers (for timeline / calendar) ────────────────────────────

/** Stable string key for the calendar day of an ISO timestamp in `tz`. */
export function dayKey(iso: string, tz: string): string {
  return isoToLocalDT(iso, tz).slice(0, 10);
}

/** Whether an ISO timestamp falls on today's calendar date in `tz`. */
export function isToday(iso: string, tz: string): boolean {
  return dayKey(iso, tz) === todayStr(tz);
}

/**
 * Human label for the day of an ISO timestamp relative to today in `tz`.
 * Returns "Today", "Tomorrow", "Yesterday", or a short weekday+date string.
 */
export function dayLabel(iso: string, tz: string): string {
  const dateKey = dayKey(iso, tz);
  const today   = todayStr(tz);
  const diff    = Math.round(
    (new Date(`${dateKey}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86_400_000,
  );
  if (diff === 0)  return 'Today';
  if (diff === 1)  return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  });
}
