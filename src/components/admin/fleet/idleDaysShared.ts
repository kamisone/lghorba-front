export interface DayIdle {
  date: string;
  idleCount: number;
  busyCount: number;
  idleCarIds: string[];
}

/** Parses a "YYYY-MM-DD" string as a local calendar date (avoids UTC-parsing day-shift). */
export function parseYmd(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtDayLabel(dateStr: string): string {
  return parseYmd(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
