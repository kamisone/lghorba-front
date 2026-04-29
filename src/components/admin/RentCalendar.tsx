"use client";

import { useState } from "react";
import type { CalendarBooking, Car } from "./data";
import BookingAdminModal from "./BookingAdminModal";
import styles from "./RentCalendar.module.css";

// Re-export so RentTracker can still import without changes to its type alias
export type { CalendarBooking };

interface Props {
  car: Car;
  bookings: CalendarBooking[];
  excludeBookingIds?: string[];
  endedBookingIds?: string[];
  onUpdate: (updated: CalendarBooking) => void;
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

const DEFAULT_BG = "linear-gradient(135deg, #001829 0%, #005C8F 100%)";
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function RentCalendar({ car, bookings, excludeBookingIds, endedBookingIds, onUpdate, onDelete }: Props) {
  const [viewDate,        setViewDate]        = useState(() => new Date());
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [deletingId,      setDeletingId]      = useState<string | null>(null);

  const today = startOfDay(new Date());

  const handleEditSaved = (updated: CalendarBooking) => {
    onUpdate(updated);
    setSelectedBooking(null);
    setShowEditModal(false);
  };

  const handleDelete = async () => {
    if (!selectedBooking) return;
    setDeletingId(selectedBooking.id);
    try {
      const res = await fetch(`/next-api/bookings/${selectedBooking.id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        onDelete(selectedBooking.id);
        setSelectedBooking(null);
        setShowEditModal(false);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const visibleBookings = excludeBookingIds?.length
    ? bookings.filter(b => !excludeBookingIds.includes(b.id))
    : bookings;

  const getBookingsForDay = (date: Date): CalendarBooking[] => {
    const d = date.getTime();
    return visibleBookings.filter(b => {
      const from = startOfDay(new Date(b.startDateTime)).getTime();
      const to   = startOfDay(new Date(b.endDateTime)).getTime();
      return d >= from && d <= to;
    });
  };

  const isEdge = (date: Date, b: CalendarBooking, which: "start" | "end") =>
    isSameDay(date, startOfDay(new Date(which === "start" ? b.startDateTime : b.endDateTime)));

  const openBooking = (b: CalendarBooking) => {
    setSelectedBooking(b);
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
            const dayBookings = getBookingsForDay(date);
            const isT         = isSameDay(date, today);

            if (dayBookings.length === 0) {
              return (
                <span key={i} className={[styles.day, isT ? styles.dayToday : ""].filter(Boolean).join(" ")}>
                  {date.getDate()}
                </span>
              );
            }

            if (dayBookings.length === 1) {
              const b       = dayBookings[0];
              const isStart = isEdge(date, b, "start");
              const isEnd   = isEdge(date, b, "end");
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
                  style={b.color ? { background: b.color } : undefined}
                  onClick={() => openBooking(b)}
                >
                  {date.getDate()}
                </span>
              );
            }

            // Multiple overlapping bookings — split cell vertically
            return (
              <span key={i} className={[styles.day, styles.dayMulti, isT ? styles.dayToday : ""].filter(Boolean).join(" ")}>
                {dayBookings.map(b => (
                  <span
                    key={b.id}
                    className={`${styles.daySlice} ${styles.dayClickable}`}
                    style={{ background: b.color ?? DEFAULT_BG }}
                    onClick={() => openBooking(b)}
                  />
                ))}
                <span className={styles.dayNum}>{date.getDate()}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Edit modal ── */}
      {showEditModal && selectedBooking && (
        <BookingAdminModal
          car={car}
          booking={selectedBooking}
          existingBookings={endedBookingIds?.length ? bookings.filter(b => !endedBookingIds.includes(b.id)) : bookings}
          onClose={() => { setShowEditModal(false); setSelectedBooking(null); }}
          onSaved={handleEditSaved}
          onDelete={deletingId === selectedBooking.id ? undefined : handleDelete}
        />
      )}
    </div>
  );
}
