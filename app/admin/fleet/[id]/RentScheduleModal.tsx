"use client";

import { useState, useEffect } from "react";
import type { Car } from "../data";
import type { RentSchedule } from "./RentCalendar";
import GuestAutocomplete, { type GuestUser } from "./GuestAutocomplete";
import styles from "./RentScheduleModal.module.css";

interface Props {
  car: Car;
  schedule?: RentSchedule;
  existingSchedules?: RentSchedule[];
  sessionStarted?: boolean;
  onClose: () => void;
  onSaved: (s: RentSchedule) => void;
  onDelete?: () => void;
}

interface FormValues {
  from: string;
  to: string;
  guestName: string;
  guestNumber: string;
  guestEmail: string;
  turoJoinDate: string;
  getaroundJoinDate: string;
  reservationNumber: string;
  totalEarning: string;
  autoStartTracking: boolean;
  color: string;
}

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  "#64748b", "#1e293b",
];

function hasOverlap(from: string, to: string, schedules: RentSchedule[], excludeId?: string): boolean {
  if (!from || !to) return false;
  const newFrom = new Date(from).getTime();
  const newTo   = new Date(to).getTime();
  if (newTo <= newFrom) return false;
  return schedules.some(s => {
    if (excludeId && s.id === excludeId) return false;
    const sFrom = new Date(s.fromDate).getTime();
    const sTo   = new Date(s.toDate).getTime();
    return newFrom < sTo && sFrom < newTo;
  });
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


export default function RentScheduleModal({ car, schedule, existingSchedules, sessionStarted, onClose, onSaved, onDelete }: Props) {
  const isEdit = !!schedule;
  const [form, setForm] = useState<FormValues>({
    from: "", to: "", guestName: "", guestNumber: "", guestEmail: "",
    turoJoinDate: "", getaroundJoinDate: "",
    reservationNumber: "", totalEarning: "", autoStartTracking: false, color: "",
  });
  const [selectedUser, setSelectedUser] = useState<GuestUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (schedule) {
      const u = schedule.user ?? null;
      if (u) setSelectedUser({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email ?? undefined,
        score: u.score ?? undefined,
        turoJoinDate: u.turoJoinDate ?? undefined,
        getaroundJoinDate: u.getaroundJoinDate ?? undefined,
      });
      setForm({
        from: toDateTimeInput(schedule.fromDate),
        to: toDateTimeInput(schedule.toDate),
        guestName: u?.name ?? "",
        guestNumber: u?.phone ?? "",
        guestEmail: u?.email ?? "",
        turoJoinDate: u?.turoJoinDate?.slice(0, 10) ?? "",
        getaroundJoinDate: u?.getaroundJoinDate?.slice(0, 10) ?? "",
        reservationNumber: schedule.reservationNumber ?? "",
        totalEarning: schedule.totalEarning != null ? String(schedule.totalEarning) : "",
        autoStartTracking: schedule.autoStartTracking ?? false,
        color: schedule.color ?? "",
      });
    }
  }, [schedule]);

  const set = (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const forfaitKm = computeForfaitKm(form.from, form.to);

  // If typing a new user (not selected from DB), name and phone are both required
  const isNewGuest = !selectedUser && form.guestName.trim() !== "";
  const phoneMissing = isNewGuest && form.guestNumber.trim() === "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.from || !form.to) return;
    if (phoneMissing) return;
    if (overlapDetected) return;
    setApiError(null);
    setSaving(true);
    try {
      const body = {
        fromDate: new Date(form.from).toISOString(),
        toDate: new Date(form.to).toISOString(),
        userId: selectedUser?.id ?? null,
        guestName: (selectedUser?.name ?? form.guestName).trim() || null,
        guestNumber: (selectedUser?.phone ?? form.guestNumber).trim() || null,
        guestEmail: (selectedUser?.email ?? form.guestEmail).trim() || null,
        turoJoinDate: form.turoJoinDate || null,
        getaroundJoinDate: form.getaroundJoinDate || null,
        reservationNumber: form.reservationNumber.trim() || null,
        totalEarning: form.totalEarning !== "" ? Number(form.totalEarning) : null,
        autoStartTracking: form.autoStartTracking,
        color: form.color || null,
      };
      const url = isEdit
        ? `/next-api/cars/${car.id}/rent-schedules/${schedule.id}`
        : `/next-api/cars/${car.id}/rent-schedules`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        onSaved(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        setApiError(
          res.status === 409
            ? "These dates overlap with an existing rent period for this car."
            : (err?.message ?? "An error occurred. Please try again.")
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const overlapDetected = existingSchedules
    ? hasOverlap(form.from, form.to, existingSchedules, schedule?.id)
    : false;

  const score = selectedUser?.score ?? null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{isEdit ? "Edit rent period" : "Add rent period"}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>

          {/* ── Dates ── */}
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

          {overlapDetected && (
            <div className={styles.errorBanner}>
              These dates overlap with an existing rent period for this car.
            </div>
          )}

          {apiError && !overlapDetected && (
            <div className={styles.errorBanner}>{apiError}</div>
          )}

          {/* ── Guest section ── */}
          <div className={styles.guestSection}>
            <p className={styles.guestSectionLabel}>Guest</p>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Name <span className={styles.required}>*</span></label>
                <GuestAutocomplete
                  value={form.guestName}
                  onChange={name => setForm(f => ({ ...f, guestName: name }))}
                  onSelect={user => {
                    setSelectedUser(user);
                    if (user) setForm(f => ({ ...f, guestName: user.name, guestNumber: user.phone, guestEmail: user.email ?? "", turoJoinDate: user.turoJoinDate ? user.turoJoinDate.slice(0, 10) : "", getaroundJoinDate: user.getaroundJoinDate ? user.getaroundJoinDate.slice(0, 10) : "" }));
                    else setForm(f => ({ ...f, guestName: "", guestNumber: "", guestEmail: "", turoJoinDate: "", getaroundJoinDate: "" }));
                  }}
                  selectedUser={selectedUser}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  Phone <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={`${styles.input} ${phoneMissing ? styles.inputError : ""}`}
                  placeholder="e.g. +212 6xx"
                  value={selectedUser ? selectedUser.phone : form.guestNumber}
                  onChange={set("guestNumber")}
                  readOnly={!!selectedUser}
                  style={selectedUser ? { background: "#f1f5f9", color: "#64748b" } : undefined}
                />
                {phoneMissing && <span className={styles.fieldError}>Required when name is set</span>}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email <span className={styles.optional}>optional</span></label>
              <input
                type="email"
                className={styles.input}
                placeholder="e.g. guest@example.com"
                value={selectedUser ? (selectedUser.email ?? "") : form.guestEmail}
                onChange={set("guestEmail")}
                readOnly={!!selectedUser}
                style={selectedUser ? { background: "#f1f5f9", color: "#64748b" } : undefined}
              />
            </div>

            {/* Score badge (read-only) */}
            {score != null && (
              <div className={styles.userInfoRow}>
                <span className={`${styles.infoBadge} ${score >= 8 ? styles.infoHigh : score >= 5 ? styles.infoMid : styles.infoLow}`}>
                  ★ {score}/10
                </span>
              </div>
            )}

            {/* Platform join dates (editable) */}
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Turo join date <span className={styles.optional}>optional</span></label>
                <input
                  type="date"
                  className={styles.input}
                  value={form.turoJoinDate}
                  onChange={set("turoJoinDate")}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Getaround join date <span className={styles.optional}>optional</span></label>
                <input
                  type="date"
                  className={styles.input}
                  value={form.getaroundJoinDate}
                  onChange={set("getaroundJoinDate")}
                />
              </div>
            </div>
          </div>

          {/* ── Booking details ── */}
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

          {!sessionStarted && (
            <div className={styles.colorField}>
              <label className={styles.label}>Color</label>
              <div className={styles.colorPicker}>
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`${styles.colorSwatch} ${form.color === c ? styles.colorSwatchActive : ""}`}
                    style={{ background: c }}
                    onClick={() => setForm(prev => ({ ...prev, color: prev.color === c ? "" : c }))}
                    aria-label={c}
                  />
                ))}
                {form.color && (
                  <button
                    type="button"
                    className={styles.colorClear}
                    onClick={() => setForm(prev => ({ ...prev, color: "" }))}
                    title="Remove color"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          <div className={styles.toggleRow}>
            <div className={styles.toggleLabelWrap}>
              <span className={styles.toggleLabel}>Auto-start tracking when rent begins</span>
              {sessionStarted && <span className={styles.toggleHint}>Session already started</span>}
            </div>
            <button
              type="button"
              className={`${styles.toggle} ${form.autoStartTracking ? styles.toggleOn : ""} ${sessionStarted ? styles.toggleDisabled : ""}`}
              onClick={() => !sessionStarted && setForm(prev => ({ ...prev, autoStartTracking: !prev.autoStartTracking }))}
              disabled={sessionStarted}
              aria-label="Toggle auto-start tracking"
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>

          <div className={styles.actions}>
            {onDelete && (
              <button type="button" className={styles.deleteBtn} onClick={onDelete} disabled={saving}>Delete</button>
            )}
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={saving || !form.from || !form.to || phoneMissing || overlapDetected}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add period"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
