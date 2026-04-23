"use client";

import { useState, useEffect, useCallback } from "react";
import type { Car } from "../data";
import RentScheduleModal from "./RentScheduleModal";
import styles from "./RentCalendar.module.css";

export interface RentSchedule {
  id: string;
  carId: string;
  fromDate: string;
  toDate: string;
  guestName?: string | null;
  guestNumber?: string | null;
  reservationNumber?: string | null;
  totalEarning?: number | null;
  autoStartTracking: boolean;
}

interface Props {
  car: Car;
  onScheduleChange?: (schedules: RentSchedule[]) => void;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first    = new Date(year, month, 1);
  const last     = new Date(year, month + 1, 0);
  const padStart = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = Array(padStart).fill(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function RentCalendar({ car, onScheduleChange }: Props) {
  const [schedules, setSchedules] = useState<RentSchedule[]>([]);
  const [viewDate,  setViewDate]  = useState(() => new Date());
  const [showModal, setShowModal] = useState(false);

  const today = startOfDay(new Date());

  const notify = useCallback((list: RentSchedule[]) => {
    setSchedules(list);
    onScheduleChange?.(list);
  }, [onScheduleChange]);

  useEffect(() => {
    fetch(`/next-api/cars/${car.id}/rent-schedules`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(notify)
      .catch(() => {});
  }, [car.id, notify]);

  const handleSaved = (saved: RentSchedule) => {
    notify([...schedules, saved]);
    setShowModal(false);
  };

  const getScheduleForDay = (date: Date): RentSchedule | undefined => {
    const d = date.getTime();
    return schedules.find(s => {
      const from = startOfDay(new Date(s.fromDate)).getTime();
      const to   = startOfDay(new Date(s.toDate)).getTime();
      return d >= from && d <= to;
    });
  };

  const isRangeEdge = (date: Date, which: "from" | "to") =>
    schedules.some(s => isSameDay(date, startOfDay(new Date(s[which === "from" ? "fromDate" : "toDate"]))));

  const year       = viewDate.getFullYear();
  const month      = viewDate.getMonth();
  const cells      = getMonthGrid(year, month);
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>📅</span>
        <span className={styles.sectionLabel}>Rent Schedule</span>
      </div>

      <div className={styles.calWrap}>
        <div className={styles.calNav}>
          <button className={styles.navBtn} onClick={() => setViewDate(new Date(year, month - 1, 1))}>‹</button>
          <span className={styles.monthLabel}>{monthLabel}</span>
          <button className={styles.navBtn} onClick={() => setViewDate(new Date(year, month + 1, 1))}>›</button>
        </div>
        <div className={styles.calGrid}>
          {DAYS.map(d => <span key={d} className={styles.dayHeader}>{d}</span>)}
          {cells.map((date, i) => {
            if (!date) return <span key={i} />;
            const inRange = !!getScheduleForDay(date);
            const isStart = isRangeEdge(date, "from");
            const isEnd   = isRangeEdge(date, "to");
            const isT     = isSameDay(date, today);
            return (
              <span
                key={i}
                className={[
                  styles.day,
                  inRange ? styles.dayRented  : "",
                  isStart ? styles.dayStart   : "",
                  isEnd   ? styles.dayEnd     : "",
                  isT     ? styles.dayToday   : "",
                ].filter(Boolean).join(" ")}
              >
                {date.getDate()}
              </span>
            );
          })}
        </div>
      </div>

      <button className={styles.addBtn} onClick={() => setShowModal(true)}>+ Add rent period</button>

      {showModal && (
        <RentScheduleModal
          car={car}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
