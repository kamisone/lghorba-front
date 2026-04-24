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
  color?: string | null;
}

interface Props {
  car: Car;
  onScheduleChange?: (schedules: RentSchedule[]) => void;
  activeScheduleId?: string | null;
  excludeScheduleIds?: string[];
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

const DEFAULT_BG = "linear-gradient(135deg, #211951 0%, #407bff 100%)";
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function RentCalendar({ car, onScheduleChange, activeScheduleId, excludeScheduleIds }: Props) {
  const [schedules,        setSchedules]        = useState<RentSchedule[]>([]);
  const [viewDate,         setViewDate]         = useState(() => new Date());
  const [showAddModal,     setShowAddModal]     = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<RentSchedule | null>(null);
  const [showEditModal,    setShowEditModal]    = useState(false);
  const [deletingId,       setDeletingId]       = useState<string | null>(null);
  const [confirmDelete,    setConfirmDelete]    = useState(false);

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

  const handleNewSaved = (saved: RentSchedule) => {
    notify([...schedules, saved]);
    setShowAddModal(false);
  };

  const handleEditSaved = (updated: RentSchedule) => {
    notify(schedules.map(s => s.id === updated.id ? updated : s));
    setSelectedSchedule(updated);
    setShowEditModal(false);
  };

  const handleDelete = async () => {
    if (!selectedSchedule) return;
    setDeletingId(selectedSchedule.id);
    try {
      const res = await fetch(`/next-api/cars/${car.id}/rent-schedules/${selectedSchedule.id}`, { method: "DELETE" });
      if (res.ok) {
        notify(schedules.filter(s => s.id !== selectedSchedule.id));
        setSelectedSchedule(null);
        setConfirmDelete(false);
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

  const fmtDT = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const openSchedule = (s: RentSchedule) => {
    if (s.id === activeScheduleId) return;
    setConfirmDelete(false);
    setSelectedSchedule(prev => prev?.id === s.id ? null : s);
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
                    s.id !== activeScheduleId ? styles.dayClickable : "",
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
                    className={[styles.daySlice, s.id !== activeScheduleId ? styles.dayClickable : ""].filter(Boolean).join(" ")}
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
          onClose={() => setShowAddModal(false)}
          onSaved={handleNewSaved}
        />
      )}

      {/* ── Edit modal ── */}
      {showEditModal && selectedSchedule && (
        <RentScheduleModal
          car={car}
          schedule={selectedSchedule}
          onClose={() => setShowEditModal(false)}
          onSaved={handleEditSaved}
        />
      )}

      {/* ── Info modal ── */}
      {selectedSchedule && !showEditModal && (
        <div className={styles.infoOverlay} onClick={() => { setSelectedSchedule(null); setConfirmDelete(false); }}>
          <div className={styles.infoModal} onClick={e => e.stopPropagation()}>

            <div className={styles.infoHeader} style={selectedSchedule.color ? { borderTop: `4px solid ${selectedSchedule.color}` } : undefined}>
              <div className={styles.infoHeaderDates}>
                <span>{fmtDT(selectedSchedule.fromDate)}</span>
                <span className={styles.infoArrow}>→</span>
                <span>{fmtDT(selectedSchedule.toDate)}</span>
              </div>
              <button className={styles.infoClose} onClick={() => { setSelectedSchedule(null); setConfirmDelete(false); }}>✕</button>
            </div>

            <div className={styles.infoBody}>
              <div className={styles.infoKm}>
                📏 {computeForfaitKm(selectedSchedule.fromDate, selectedSchedule.toDate).toLocaleString()} km forfait
              </div>

              <div className={styles.infoPills}>
                {selectedSchedule.guestName && (
                  <span className={styles.infoPill}>👤 {selectedSchedule.guestName}</span>
                )}
                {selectedSchedule.guestNumber && (
                  <span className={styles.infoPill}>📞 {selectedSchedule.guestNumber}</span>
                )}
                {selectedSchedule.reservationNumber && (
                  <span className={styles.infoPill}>📋 #{selectedSchedule.reservationNumber}</span>
                )}
                {selectedSchedule.totalEarning != null && (
                  <span className={`${styles.infoPill} ${styles.infoPillEarning}`}>
                    💶 {selectedSchedule.totalEarning.toLocaleString()} €
                  </span>
                )}
                {selectedSchedule.autoStartTracking && (
                  <span className={`${styles.infoPill} ${styles.infoPillTracking}`}>🔄 Auto-track</span>
                )}
              </div>
            </div>

            <div className={styles.infoActions}>
              <button className={styles.infoEditBtn} onClick={() => setShowEditModal(true)}>
                ✏ Edit
              </button>

              {confirmDelete ? (
                <div className={styles.infoConfirmRow}>
                  <span className={styles.infoConfirmLabel}>Sure?</span>
                  <button className={styles.infoConfirmYes} onClick={handleDelete} disabled={!!deletingId}>
                    {deletingId ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button className={styles.infoConfirmNo} onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button className={styles.infoDeleteBtn} onClick={() => setConfirmDelete(true)}>
                  🗑 Delete
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
