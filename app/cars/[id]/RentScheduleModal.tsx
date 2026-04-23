"use client";

import { useState, useEffect } from "react";
import type { Car } from "../data";
import type { RentSchedule } from "./RentCalendar";
import styles from "./RentScheduleModal.module.css";

interface Props {
  car: Car;
  schedule?: RentSchedule;
  onClose: () => void;
  onSaved: (s: RentSchedule) => void;
}

interface FormValues {
  from: string;
  to: string;
  guestName: string;
  guestNumber: string;
  reservationNumber: string;
  totalEarning: string;
  autoStartTracking: boolean;
}

function computeForfaitKm(from: string, to: string): number {
  if (!from || !to) return 0;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24))) * 200;
}

function toDateTimeInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function RentScheduleModal({ car, schedule, onClose, onSaved }: Props) {
  const isEdit = !!schedule;
  const [form, setForm] = useState<FormValues>({
    from: "", to: "", guestName: "", guestNumber: "", reservationNumber: "", totalEarning: "", autoStartTracking: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (schedule) {
      setForm({
        from: toDateTimeInput(schedule.fromDate),
        to: toDateTimeInput(schedule.toDate),
        guestName: schedule.guestName ?? "",
        guestNumber: schedule.guestNumber ?? "",
        reservationNumber: schedule.reservationNumber ?? "",
        totalEarning: schedule.totalEarning != null ? String(schedule.totalEarning) : "",
        autoStartTracking: schedule.autoStartTracking ?? false,
      });
    }
  }, [schedule]);

  const set = (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const forfaitKm = computeForfaitKm(form.from, form.to);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.from || !form.to) return;
    setSaving(true);
    try {
      const body = {
        fromDate: new Date(form.from).toISOString(),
        toDate: new Date(form.to).toISOString(),
        guestName: form.guestName.trim() || null,
        guestNumber: form.guestNumber.trim() || null,
        reservationNumber: form.reservationNumber.trim() || null,
        totalEarning: form.totalEarning !== "" ? Number(form.totalEarning) : null,
        autoStartTracking: form.autoStartTracking,
      };
      const url = isEdit
        ? `/next-api/cars/${car.id}/rent-schedules/${schedule.id}`
        : `/next-api/cars/${car.id}/rent-schedules`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) onSaved(await res.json());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{isEdit ? "Edit rent period" : "Add rent period"}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>From</label>
              <input type="datetime-local" className={styles.input} value={form.from} onChange={set("from")} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>To</label>
              <input type="datetime-local" className={styles.input} value={form.to} onChange={set("to")} required />
            </div>
          </div>

          {forfaitKm > 0 && (
            <div className={styles.forfaitBadge}>
              📏 Forfait: <strong>{forfaitKm.toLocaleString()} km</strong>
            </div>
          )}

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Guest name</label>
              <input type="text" className={styles.input} placeholder="e.g. John Doe"
                value={form.guestName} onChange={set("guestName")} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Guest number</label>
              <input type="text" className={styles.input} placeholder="e.g. +212 6xx"
                value={form.guestNumber} onChange={set("guestNumber")} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Reservation #</label>
              <input type="text" className={styles.input} placeholder="e.g. RES-1234"
                value={form.reservationNumber} onChange={set("reservationNumber")} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Total earning (€)</label>
              <input type="number" min="0" step="0.01" className={styles.input} placeholder="e.g. 500"
                value={form.totalEarning} onChange={set("totalEarning")} />
            </div>
          </div>

          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Auto-start tracking when rent begins</span>
            <button
              type="button"
              className={`${styles.toggle} ${form.autoStartTracking ? styles.toggleOn : ""}`}
              onClick={() => setForm(prev => ({ ...prev, autoStartTracking: !prev.autoStartTracking }))}
              aria-label="Toggle auto-start tracking"
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={saving || !form.from || !form.to}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add period"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
