"use client";

import { useMemo } from "react";
import styles from "./IdleDaysHeatmap.module.css";
import type { DayIdle } from "./idleDaysShared";
import { ymd } from "./idleDaysShared";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const RAMP = ["#dcfce7", "#bbf7d0", "#86efac", "#4ade80", "#16a34a"];

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first    = new Date(year, month, 1);
  const last     = new Date(year, month + 1, 0);
  const padStart = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = Array(padStart).fill(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/** Ramp index for a day's idle count, relative to the busiest-idle day currently visible. -1 = no fill (0 idle). */
function rampIndex(idleCount: number, maxIdle: number): number {
  if (maxIdle <= 0 || idleCount <= 0) return -1;
  const ratio = idleCount / maxIdle;
  return Math.min(RAMP.length - 1, Math.floor(ratio * RAMP.length));
}

interface Props {
  year: number;
  month: number;
  days: DayIdle[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export default function IdleDaysHeatmap({ year, month, days, selectedDate, onSelectDate, onPrevMonth, onNextMonth }: Props) {
  const byDate = useMemo(() => new Map(days.map(d => [d.date, d])), [days]);
  const maxIdle = useMemo(() => Math.max(...days.map(d => d.idleCount), 1), [days]);

  const cells      = useMemo(() => getMonthGrid(year, month), [year, month]);
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const today      = new Date();

  return (
    <div>
      <div className={styles.calNav}>
        <button className={styles.navBtn} onClick={onPrevMonth} aria-label="Previous month">‹</button>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <button className={styles.navBtn} onClick={onNextMonth} aria-label="Next month">›</button>
      </div>

      <div className={styles.calGrid}>
        {DAYS.map(d => <span key={d} className={styles.dayHeader}>{d}</span>)}
        {cells.map((date, i) => {
          if (!date) return <span key={i} className={styles.day} style={{ visibility: "hidden" }} />;

          const dateStr = ymd(date);
          const stat    = byDate.get(dateStr);
          const isToday = isSameDay(date, today);
          const isSel   = selectedDate === dateStr;

          if (!stat) {
            return (
              <span key={i} className={[styles.day, isToday ? styles.dayToday : ""].filter(Boolean).join(" ")}>
                {date.getDate()}
              </span>
            );
          }

          const idx      = rampIndex(stat.idleCount, maxIdle);
          const bg        = idx === -1 ? "#f8fafc" : RAMP[idx];
          const textColor = idx === RAMP.length - 1 ? "#fff" : "#001829";

          return (
            <button
              key={i}
              type="button"
              className={[
                styles.day,
                styles.dayFilled,
                isToday ? styles.dayToday : "",
                isSel   ? styles.daySelected : "",
              ].filter(Boolean).join(" ")}
              style={{ background: bg, color: textColor }}
              onClick={() => onSelectDate(dateStr)}
              title={`${stat.idleCount} idle car${stat.idleCount !== 1 ? "s" : ""}`}
            >
              <span className={styles.dayNum}>{date.getDate()}</span>
              <span className={styles.dayCount}>{stat.idleCount}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.legend}>
        <span>Fewer idle</span>
        <span className={styles.legendSwatch} style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }} />
        {RAMP.map(c => <span key={c} className={styles.legendSwatch} style={{ background: c }} />)}
        <span>More idle</span>
      </div>
    </div>
  );
}
