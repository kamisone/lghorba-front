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
  onDeleted?: (id: string) => void;
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

function computeForfaitKm(fromDate: string, toDate: string): number {
  const ms = new Date(toDate).getTime() - new Date(fromDate).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24))) * 200;
}

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function RentCalendar({ car, onScheduleChange, onDeleted }: Props) {
  const [schedules,       setSchedules]       = useState<RentSchedule[]>([]);
  const [viewDate,        setViewDate]        = useState(() => new Date());
  const [deleting,        setDeleting]        = useState<string | null>(null);
  const [showModal,       setShowModal]       = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RentSchedule | null>(null);

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

  const openAdd  = () => { setEditingSchedule(null); setShowModal(true); };
  const openEdit = (s: RentSchedule) => { setEditingSchedule(s); setShowModal(true); };

  const handleSaved = (saved: RentSchedule) => {
    notify(editingSchedule
      ? schedules.map(s => s.id === saved.id ? saved : s)
      : [...schedules, saved]
    );
    setShowModal(false);
  };

  const deleteSchedule = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/next-api/cars/${car.id}/rent-schedules/${id}`, { method: "DELETE" });
      if (res.ok) {
        notify(schedules.filter(s => s.id !== id));
        onDeleted?.(id);
      }
    } finally {
      setDeleting(null);
    }
  };

  // ── Calendar helpers ──────────────────────────────────────────────────────

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

  // ── Format helpers ────────────────────────────────────────────────────────

  const fmtDT = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const isActive = (s: RentSchedule) => {
    const now = Date.now();
    return new Date(s.fromDate).getTime() <= now && now <= new Date(s.toDate).getTime();
  };

  const isFuture = (s: RentSchedule) => new Date(s.fromDate).getTime() > Date.now();

  const sorted = [...schedules].sort((a, b) => new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime());

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>📅</span>
        <span className={styles.sectionLabel}>Rent Schedule</span>
      </div>

      {/* ── Month calendar ── */}
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

      {/* ── Schedule list ── */}
      {sorted.length > 0 && (
        <div className={styles.scheduleList}>
          {sorted.map(s => {
            const forfaitKm = computeForfaitKm(s.fromDate, s.toDate);
            return (
              <div
                key={s.id}
                className={[
                  styles.scheduleItem,
                  isActive(s) ? styles.scheduleNow    : "",
                  isFuture(s) ? styles.scheduleFuture : "",
                ].filter(Boolean).join(" ")}
              >
                <div className={styles.scheduleMain}>
                  <span className={styles.scheduleStatus}>
                    {isActive(s) ? "🔑" : isFuture(s) ? "🗓" : "✓"}
                  </span>
                  <div className={styles.scheduleDates}>
                    <span>{fmtDT(s.fromDate)}</span>
                    <span className={styles.scheduleArrow}>⟶</span>
                    <span>{fmtDT(s.toDate)}</span>
                  </div>
                  <div className={styles.scheduleItemActions}>
                    <button className={styles.editBtn} onClick={() => openEdit(s)} aria-label="Edit">✏</button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => deleteSchedule(s.id)}
                      disabled={deleting === s.id}
                      aria-label="Delete"
                    >
                      {deleting === s.id ? "…" : "×"}
                    </button>
                  </div>
                </div>
                <div className={styles.scheduleInfo}>
                  {s.guestName       && <span className={styles.infoPill}>👤 {s.guestName}</span>}
                  {s.guestNumber     && <span className={styles.infoPill}>📞 {s.guestNumber}</span>}
                  {s.reservationNumber && <span className={styles.infoPill}>📋 {s.reservationNumber}</span>}
                  <span className={styles.infoPill}>📏 {forfaitKm.toLocaleString()} km</span>
                  {s.totalEarning != null && (
                    <span className={`${styles.infoPill} ${styles.infoPillEarning}`}>💶 {s.totalEarning.toLocaleString()} €</span>
                  )}
                  {s.autoStartTracking && (
                    <span className={`${styles.infoPill} ${styles.infoPillTracking}`}>🔄 Auto-track</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className={styles.addBtn} onClick={openAdd}>+ Add rent period</button>

      {showModal && (
        <RentScheduleModal
          car={car}
          schedule={editingSchedule ?? undefined}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
