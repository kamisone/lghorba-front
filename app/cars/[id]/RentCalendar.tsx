"use client";

import { useState, useEffect, useCallback } from "react";
import type { Car } from "../data";
import styles from "./RentCalendar.module.css";

export interface RentSchedule {
  id: string;
  carId: string;
  fromDate: string;
  toDate: string;
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
  const first   = new Date(year, month, 1);
  const last    = new Date(year, month + 1, 0);
  const padStart = (first.getDay() + 6) % 7; // Mon=0
  const cells: (Date | null)[] = Array(padStart).fill(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function RentCalendar({ car, onScheduleChange }: Props) {
  const [schedules, setSchedules] = useState<RentSchedule[]>([]);
  const [viewDate,  setViewDate]  = useState(() => new Date());
  const [adding,    setAdding]    = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState({ from: "", to: "" });
  const [deleting,  setDeleting]  = useState<string | null>(null);

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

  const addSchedule = async () => {
    if (!form.from || !form.to) return;
    setSaving(true);
    try {
      const res = await fetch(`/next-api/cars/${car.id}/rent-schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate: new Date(form.from).toISOString(), toDate: new Date(form.to).toISOString() }),
      });
      if (res.ok) {
        const s: RentSchedule = await res.json();
        notify([...schedules, s]);
        setForm({ from: "", to: "" });
        setAdding(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteSchedule = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/next-api/cars/${car.id}/rent-schedules/${id}`, { method: "DELETE" });
      notify(schedules.filter(s => s.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  // ── Calendar helpers ─────────────────────────────────────────────────────

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

  const year   = viewDate.getFullYear();
  const month  = viewDate.getMonth();
  const cells  = getMonthGrid(year, month);

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
            const inRange  = !!getScheduleForDay(date);
            const isStart  = isRangeEdge(date, "from");
            const isEnd    = isRangeEdge(date, "to");
            const isT      = isSameDay(date, today);
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
          {sorted.map(s => (
            <div
              key={s.id}
              className={[
                styles.scheduleItem,
                isActive(s) ? styles.scheduleNow    : "",
                isFuture(s) ? styles.scheduleFuture : "",
              ].filter(Boolean).join(" ")}
            >
              <span className={styles.scheduleStatus}>
                {isActive(s) ? "🔑" : isFuture(s) ? "🗓" : "✓"}
              </span>
              <div className={styles.scheduleDates}>
                <span>{fmtDT(s.fromDate)}</span>
                <span className={styles.scheduleArrow}>⟶</span>
                <span>{fmtDT(s.toDate)}</span>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={() => deleteSchedule(s.id)}
                disabled={deleting === s.id}
                aria-label="Delete schedule"
              >
                {deleting === s.id ? "…" : "×"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Add form ── */}
      {adding ? (
        <div className={styles.addForm}>
          <div className={styles.dateRow}>
            <div className={styles.dateField}>
              <label className={styles.dateLabel}>From</label>
              <input
                type="datetime-local"
                className={styles.dateInput}
                value={form.from}
                onChange={e => setForm(p => ({ ...p, from: e.target.value }))}
              />
            </div>
            <div className={styles.dateField}>
              <label className={styles.dateLabel}>To</label>
              <input
                type="datetime-local"
                className={styles.dateInput}
                value={form.to}
                onChange={e => setForm(p => ({ ...p, to: e.target.value }))}
              />
            </div>
          </div>
          <div className={styles.addActions}>
            <button
              className={styles.saveBtn}
              onClick={addSchedule}
              disabled={saving || !form.from || !form.to}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => { setAdding(false); setForm({ from: "", to: "" }); }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className={styles.addBtn} onClick={() => setAdding(true)}>
          + Add rent period
        </button>
      )}
    </div>
  );
}
