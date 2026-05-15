"use client";

import { useEffect, useReducer, useCallback, useId } from "react";
import styles from "./AvailabilityCalendar.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BlockedRange {
  start: string; // YYYY-MM-DD
  end:   string; // YYYY-MM-DD
  kind:  "booking" | "admin_block";
}

interface CalendarData {
  isHealthBlocked: boolean;
  blockedRanges:   BlockedRange[];
}

export interface CalendarLabels {
  title:        string;
  available:    string;
  booked:       string;
  adminBlock:   string;
  today:        string;
  healthBlocked: string;
  prevMonth:    string;
  nextMonth:    string;
  loading:      string;
  months:       string[];
  weekdays:     string[];
}

interface Props {
  carId:  string;
  labels: CalendarLabels;
  dark?:  boolean;
}

// ── State ─────────────────────────────────────────────────────────────────────

type DayStatus = "available" | "booked" | "admin_block" | "health_block" | "past";

interface State {
  year:    number;
  month:   number; // 1-based
  data:    CalendarData | null;
  loading: boolean;
}

type Action =
  | { type: "NAV"; delta: -1 | 1 }
  | { type: "LOADING" }
  | { type: "LOADED"; data: CalendarData };

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayLocal(): { year: number; month: number; day: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ISO weekday: Monday=1 … Sunday=7; grid offset for Monday-first grid
function firstDayOffset(year: number, month: number): number {
  const jsDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "NAV": {
      let { year, month } = state;
      month += action.delta;
      if (month > 12) { month = 1;  year += 1; }
      if (month < 1)  { month = 12; year -= 1; }
      return { year, month, data: null, loading: true };
    }
    case "LOADING": return { ...state, loading: true };
    case "LOADED":  return { ...state, data: action.data, loading: false };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AvailabilityCalendar({ carId, labels, dark = false }: Props) {
  const headingId = useId();

  const init = (): State => {
    const { year, month } = todayLocal();
    return { year, month, data: null, loading: true };
  };

  const [state, dispatch] = useReducer(reducer, undefined, init);
  const { year, month, data, loading } = state;

  const load = useCallback(async (y: number, m: number) => {
    dispatch({ type: "LOADING" });
    try {
      const res = await fetch(
        `/next-api/public/cars/${carId}/calendar?year=${y}&month=${m}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error();
      const json: CalendarData = await res.json();
      dispatch({ type: "LOADED", data: json });
    } catch {
      dispatch({ type: "LOADED", data: { isHealthBlocked: false, blockedRanges: [] } });
    }
  }, [carId]);

  useEffect(() => { load(year, month); }, [load, year, month]);

  // Build blocked-date lookup: "YYYY-MM-DD" → kind
  const blockedMap = new Map<string, "booking" | "admin_block">();
  if (data) {
    for (const range of data.blockedRanges) {
      const start = new Date(range.start + "T00:00:00Z");
      const end   = new Date(range.end   + "T00:00:00Z");
      for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        blockedMap.set(d.toISOString().slice(0, 10), range.kind);
      }
    }
  }

  const today      = todayLocal();
  const offset     = firstDayOffset(year, month);
  const totalDays  = daysInMonth(year, month);
  const cells      = offset + totalDays;
  const rows       = Math.ceil(cells / 7);

  const getStatus = (day: number): DayStatus => {
    if (data?.isHealthBlocked) return "health_block";
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isToday  = year === today.year && month === today.month && day === today.day;
    const isPast   = year < today.year || (year === today.year && month < today.month) ||
                     (year === today.year && month === today.month && day < today.day);
    if (isPast && !isToday) return "past";
    const kind = blockedMap.get(iso);
    if (kind === "booking")     return "booked";
    if (kind === "admin_block") return "admin_block";
    return "available";
  };

  const canGoPrev = !(year === today.year && month === today.month);

  return (
    <section
      className={`${styles.section} ${dark ? styles.dark : ""}`}
      aria-labelledby={headingId}
    >
      <div className={styles.header}>
        <h2 id={headingId} className={styles.title}>{labels.title}</h2>
        <div className={styles.legend} aria-label="Legend">
          <span className={`${styles.legendDot} ${styles.dotAvailable}`} aria-hidden="true" />
          <span className={styles.legendLabel}>{labels.available}</span>
          <span className={`${styles.legendDot} ${styles.dotBooked}`}    aria-hidden="true" />
          <span className={styles.legendLabel}>{labels.booked}</span>
          <span className={`${styles.legendDot} ${styles.dotAdmin}`}     aria-hidden="true" />
          <span className={styles.legendLabel}>{labels.adminBlock}</span>
        </div>
      </div>

      {data?.isHealthBlocked && (
        <p className={styles.healthBanner} role="alert">{labels.healthBlocked}</p>
      )}

      <div className={styles.calendarBox} aria-live="polite" aria-busy={loading}>

        {/* Month navigation bar */}
        <div className={styles.navBar}>
          <button
            className={styles.navBtn}
            onClick={() => dispatch({ type: "NAV", delta: -1 })}
            disabled={!canGoPrev}
            aria-label={labels.prevMonth}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <span className={styles.monthLabel} aria-live="polite">
            {labels.months[month - 1]} {year}
          </span>
          <button
            className={styles.navBtn}
            onClick={() => dispatch({ type: "NAV", delta: 1 })}
            aria-label={labels.nextMonth}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className={styles.grid} role="grid" aria-label={`${labels.months[month - 1]} ${year}`}>
          {labels.weekdays.map(wd => (
            <div key={wd} className={styles.weekdayHeader} role="columnheader" aria-label={wd}>
              {wd}
            </div>
          ))}

          {/* Grid cells */}
          {Array.from({ length: rows * 7 }, (_, i) => {
            const day = i - offset + 1;
            const isEmpty = day < 1 || day > totalDays;

            if (isEmpty) {
              return <div key={i} className={styles.emptyCell} role="gridcell" aria-hidden="true" />;
            }

            const status  = loading ? "loading" : getStatus(day);
            const isToday = year === today.year && month === today.month && day === today.day;
            const iso     = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

            let ariaLabel = `${day} ${labels.months[month - 1]}`;
            if (isToday)                ariaLabel += `, ${labels.today}`;
            if (status === "available") ariaLabel += `, ${labels.available}`;
            if (status === "booked")    ariaLabel += `, ${labels.booked}`;
            if (status === "admin_block" || status === "health_block") ariaLabel += `, ${labels.adminBlock}`;

            return (
              <div
                key={iso}
                className={[
                  styles.dayCell,
                  styles[`status_${status}`],
                  isToday ? styles.today : "",
                ].filter(Boolean).join(" ")}
                role="gridcell"
                aria-label={ariaLabel}
                tabIndex={0}
              >
                <span className={styles.dayNum} aria-hidden="true">{day}</span>
                {isToday && <span className={styles.todayDot} aria-hidden="true" />}
              </div>
            );
          })}
        </div>

        {/* Skeleton overlay */}
        {loading && (
          <div className={styles.skeletonOverlay} aria-hidden="true">
            <span className={styles.loadingText}>{labels.loading}</span>
          </div>
        )}
      </div>
    </section>
  );
}
