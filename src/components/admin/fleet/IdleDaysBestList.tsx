"use client";

import { useMemo } from "react";
import styles from "./IdleDaysBestList.module.css";
import type { DayIdle } from "./idleDaysShared";
import { fmtDayLabel } from "./idleDaysShared";

interface Props {
  days: DayIdle[];
  fleetSize: number;
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

export default function IdleDaysBestList({ days, fleetSize, selectedDate, onSelect }: Props) {
  const best = useMemo(
    () => [...days].filter(d => d.idleCount > 0).sort((a, b) => b.idleCount - a.idleCount).slice(0, 8),
    [days],
  );

  if (best.length === 0) {
    return <div className={styles.emptyState}>No idle capacity in the next 30 days</div>;
  }

  return (
    <div className={styles.list}>
      {best.map((d, i) => (
        <button
          key={d.date}
          type="button"
          className={`${styles.row} ${selectedDate === d.date ? styles.rowActive : ""}`}
          onClick={() => onSelect(d.date)}
        >
          <span className={styles.rank}>{i + 1}</span>
          <span className={styles.date}>{fmtDayLabel(d.date)}</span>
          <span className={styles.count}>
            {d.idleCount} idle
            {fleetSize > 0 && <span className={styles.countSub}>/{fleetSize}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
