"use client";

import { useState } from "react";
import type { Car } from "../data";
import RentScheduleModal from "./RentScheduleModal";
import styles from "./RentCalendar.module.css";

export interface RentScheduleUser {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  score?: number | null;
  turoJoinDate?: string | null;
  getaroundJoinDate?: string | null;
}

export interface RentSchedule {
  id: string;
  carId: string;
  fromDate: string;
  toDate: string;
  reservationNumber?: string | null;
  totalEarning?: number | null;
  autoStartTracking: boolean;
  color?: string | null;
  user?: RentScheduleUser | null;
}

interface Props {
  car: Car;
  schedules: RentSchedule[];
  excludeScheduleIds?: string[];
  onAdd: (saved: RentSchedule) => void;
  onUpdate: (updated: RentSchedule) => void;
  onDelete: (id: string) => void;
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

const DEFAULT_BG = "linear-gradient(135deg, #211951 0%, #407bff 100%)";
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function RentCalendar({ car, schedules, excludeScheduleIds, onAdd, onUpdate, onDelete }: Props) {
  const [viewDate,         setViewDate]         = useState(() => new Date());
  const [showAddModal,     setShowAddModal]     = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<RentSchedule | null>(null);
  const [showEditModal,    setShowEditModal]    = useState(false);
  const [deletingId,       setDeletingId]       = useState<string | null>(null);

  const today = startOfDay(new Date());

  const handleNewSaved = (saved: RentSchedule) => {
    onAdd(saved);
    setShowAddModal(false);
  };

  const handleEditSaved = (updated: RentSchedule) => {
    onUpdate(updated);
    setSelectedSchedule(null);
    setShowEditModal(false);
  };

  const handleDelete = async () => {
    if (!selectedSchedule) return;
    setDeletingId(selectedSchedule.id);
    try {
      const res = await fetch(`/next-api/cars/${car.id}/rent-schedules/${selectedSchedule.id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete(selectedSchedule.id);
        setSelectedSchedule(null);
        setShowEditModal(false);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const visibleSchedules = excludeScheduleIds?.length
    ? schedules.filter(s => !excludeScheduleIds.includes(s.id))
    : schedules;

  const getSchedulesForDay = (date: Date): RentSchedule[] => {
    const d = date.getTime();
    return visibleSchedules.filter(s => {
      const from = startOfDay(new Date(s.fromDate)).getTime();
      const to   = startOfDay(new Date(s.toDate)).getTime();
      return d >= from && d <= to;
    });
  };

  const isEdge = (date: Date, s: RentSchedule, which: "from" | "to") =>
    isSameDay(date, startOfDay(new Date(which === "from" ? s.fromDate : s.toDate)));

  const openSchedule = (s: RentSchedule) => {
    setSelectedSchedule(s);
    setShowEditModal(true);
  };

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
            const daySchedules = getSchedulesForDay(date);
            const isT          = isSameDay(date, today);

            if (daySchedules.length === 0) {
              return (
                <span key={i} className={[styles.day, isT ? styles.dayToday : ""].filter(Boolean).join(" ")}>
                  {date.getDate()}
                </span>
              );
            }

            if (daySchedules.length === 1) {
              const s       = daySchedules[0];
              const isStart = isEdge(date, s, "from");
              const isEnd   = isEdge(date, s, "to");
              return (
                <span
                  key={i}
                  className={[
                    styles.day,
                    styles.dayRented,
                    isStart ? styles.dayStart : "",
                    isEnd   ? styles.dayEnd   : "",
                    isT     ? styles.dayToday : "",
                    styles.dayClickable,
                  ].filter(Boolean).join(" ")}
                  style={s.color ? { background: s.color } : undefined}
                  onClick={() => openSchedule(s)}
                >
                  {date.getDate()}
                </span>
              );
            }

            // Multiple overlapping schedules — split cell vertically
            return (
              <span key={i} className={[styles.day, styles.dayMulti, isT ? styles.dayToday : ""].filter(Boolean).join(" ")}>
                {daySchedules.map(s => (
                  <span
                    key={s.id}
                    className={`${styles.daySlice} ${styles.dayClickable}`}
                    style={{ background: s.color ?? DEFAULT_BG }}
                    onClick={() => openSchedule(s)}
                  />
                ))}
                <span className={styles.dayNum}>{date.getDate()}</span>
              </span>
            );
          })}
        </div>
      </div>

      <button className={styles.addBtn} onClick={() => setShowAddModal(true)}>+ Add rent period</button>

      {/* ── Add modal ── */}
      {showAddModal && (
        <RentScheduleModal
          car={car}
          existingSchedules={schedules}
          onClose={() => setShowAddModal(false)}
          onSaved={handleNewSaved}
        />
      )}

      {/* ── Edit modal ── */}
      {showEditModal && selectedSchedule && (
        <RentScheduleModal
          car={car}
          schedule={selectedSchedule}
          existingSchedules={schedules}
          onClose={() => { setShowEditModal(false); setSelectedSchedule(null); }}
          onSaved={handleEditSaved}
          onDelete={deletingId === selectedSchedule.id ? undefined : handleDelete}
        />
      )}
    </div>
  );
}
