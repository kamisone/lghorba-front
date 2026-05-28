"use client";

import { useState, useEffect } from "react";
import type { BookingSource, CalendarBooking, Car, GpsStopMode } from "../fleet/data";
import GuestAutocomplete, { type GuestUser } from "./GuestAutocomplete";
import { useBusinessTz } from "@/contexts/TzContext";
import { isoToLocalDT } from "@/lib/dateUtils";
import { X, Ruler, Star, ArrowRight } from "lucide-react";
import styles from "./RentScheduleModal.module.css";

interface Props {
  car: Car;
  booking?: CalendarBooking;
  existingBookings?: CalendarBooking[];
  sessionStarted?: boolean;
  onClose: () => void;
  onSaved: (b: CalendarBooking) => void;
  onDelete?: () => void;
}

interface FormValues {
  source: BookingSource;
  from: string;
  to: string;
  // Turo/Getaround guest
  guestName: string;
  guestNumber: string;
  guestEmail: string;
  turoJoinDate: string;
  getaroundJoinDate: string;
  // Private customer
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  // Metadata
  reservationNumber: string;
  totalEarning: string;
  autoStartTracking: boolean;
  gpsStopMode: GpsStopMode;
  color: string;
}

const COLORS = [
  "#ef4444", "#8DC220", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  "#64748b", "#1e293b",
];

function getOverlaps(from: string, to: string, bookings: CalendarBooking[], excludeId?: string): CalendarBooking[] {
  if (!from || !to) return [];
  const newFrom = new Date(from).getTime();
  const newTo   = new Date(to).getTime();
  if (newTo <= newFrom) return [];
  return bookings.filter(b => {
    if (excludeId && b.id === excludeId) return false;
    if (b.status === "cancelled") return false;
    const bFrom = new Date(b.startDateTime).getTime();
    const bTo   = new Date(b.endDateTime).getTime();
    return newFrom < bTo && bFrom < newTo;
  });
}

function fmtCompact(iso: string, tz: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: tz, day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function computeForfaitKm(from: string, to: string): number {
  if (!from || !to) return 0;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24))) * 200;
}

const EMPTY: FormValues = {
  source: "turo", from: "", to: "",
  guestName: "", guestNumber: "", guestEmail: "",
  turoJoinDate: "", getaroundJoinDate: "",
  customerName: "", customerPhone: "", customerEmail: "",
  reservationNumber: "", totalEarning: "", autoStartTracking: false, gpsStopMode: "auto", color: "",
};

export default function BookingAdminModal({ car, booking, existingBookings, sessionStarted, onClose, onSaved, onDelete }: Props) {
  const tz     = useBusinessTz();
  const isEdit = !!booking;
  // Lock the auto-start tracking toggle when a rent session already exists for
  // this booking (active or ended). Callers are responsible for passing
  // sessionStarted={true} when they have that information.
  const trackingLocked = !!sessionStarted;

  const [form, setForm] = useState<FormValues>(EMPTY);
  const [selectedUser, setSelectedUser] = useState<GuestUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (booking) {
      const u = booking.user ?? null;
      if (u) setSelectedUser({
        id: u.id,
        name: u.name,
        phone: u.phone ?? "",
        email: u.email ?? undefined,
        score: u.score ?? undefined,
        turoJoinDate: u.turoJoinDate ?? undefined,
        getaroundJoinDate: u.getaroundJoinDate ?? undefined,
      });
      setForm({
        source: booking.source,
        from: isoToLocalDT(booking.startDateTime, tz),
        to: isoToLocalDT(booking.endDateTime, tz),
        guestName: u?.name ?? "",
        guestNumber: u?.phone ?? "",
        guestEmail: u?.email ?? "",
        turoJoinDate: u?.turoJoinDate?.slice(0, 10) ?? "",
        getaroundJoinDate: u?.getaroundJoinDate?.slice(0, 10) ?? "",
        customerName:  booking.user?.name  ?? "",
        customerPhone: booking.user?.phone ?? "",
        customerEmail: booking.user?.email ?? "",
        reservationNumber: booking.reservationNumber ?? "",
        totalEarning: booking.totalEarning != null ? String(booking.totalEarning) : "",
        autoStartTracking: booking.autoStartTracking ?? false,
        gpsStopMode: booking.gpsStopMode ?? "auto",
        color: booking.color ?? "",
      });
    }
  }, [booking, tz]);

  const set = (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const setSelect = (field: keyof FormValues) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const forfaitKm = computeForfaitKm(form.from, form.to);
  const isPlatform = form.source === "turo" || form.source === "getaround";

  const isNewGuest = isPlatform && !selectedUser && form.guestName.trim() !== "";
  const phoneMissing = isNewGuest && form.guestNumber.trim() === "";

  // When editing, only flag overlap if the admin actually changed the dates.
  // If dates are unchanged there cannot be a NEW overlap introduced, and pre-existing
  // overlaps in the data should not block saving unrelated metadata changes.
  const datesChanged = !isEdit || !booking || (
    form.from !== isoToLocalDT(booking.startDateTime, tz) ||
    form.to   !== isoToLocalDT(booking.endDateTime, tz)
  );
  const overlaps = datesChanged && existingBookings
    ? getOverlaps(form.from, form.to, existingBookings, booking?.id)
    : [];
  const overlapDetected = overlaps.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.from || !form.to || phoneMissing || overlapDetected) return;
    setApiError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        startDateTime: new Date(form.from).toISOString(),
        endDateTime: new Date(form.to).toISOString(),
        source: form.source,
        reservationNumber: form.reservationNumber.trim() || null,
        totalEarning: form.totalEarning !== "" ? Number(form.totalEarning) : null,
        autoStartTracking: form.autoStartTracking,
        gpsStopMode: form.gpsStopMode,
        color: form.color || null,
      };

      if (isPlatform) {
        body.userId = selectedUser?.id ?? null;
        body.guestName = (selectedUser?.name ?? form.guestName).trim() || null;
        body.guestNumber = (selectedUser?.phone ?? form.guestNumber).trim() || null;
        body.guestEmail = (selectedUser?.email ?? form.guestEmail).trim() || null;
        body.turoJoinDate = form.turoJoinDate || null;
        body.getaroundJoinDate = form.getaroundJoinDate || null;
      } else {
        body.customerName = form.customerName.trim() || null;
        body.customerPhone = form.customerPhone.trim() || null;
        body.customerEmail = form.customerEmail.trim() || null;
      }

      if (!isEdit) {
        body.carId = car.id;
        body.status = "confirmed";
      }

      const url = isEdit ? `/next-api/bookings/${booking.id}` : "/next-api/bookings";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
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

  const score = selectedUser?.score ?? null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{isEdit ? "Edit booking" : "Add booking"}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={16} strokeWidth={1.75} /></button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>

          {/* ── Source ── */}
          <div className={styles.field}>
            <label className={styles.label}>Source</label>
            <select
              className={styles.input}
              value={form.source}
              onChange={setSelect("source")}
              style={{ cursor: "pointer" }}
            >
              <option value="turo">Turo</option>
              <option value="getaround">Getaround</option>
              <option value="private">Private</option>
            </select>
          </div>

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
              <Ruler size={14} strokeWidth={1.75} /> Forfait: <strong>{forfaitKm.toLocaleString()} km</strong>
            </div>
          )}

          {overlapDetected && (
            <div className={styles.overlapBanner}>
              <span className={styles.overlapBannerTitle}>
                Overlaps with {overlaps.length} existing booking{overlaps.length > 1 ? "s" : ""}
              </span>
              <div className={styles.overlapList}>
                {overlaps.map(b => (
                  <div key={b.id} className={styles.overlapItem}>
                    <span className={`${styles.overlapSource} ${styles[`overlapSource_${b.source}`]}`}>
                      {b.source}
                    </span>
                    <span className={styles.overlapName}>{b.user?.name ?? "—"}</span>
                    {b.reservationNumber && (
                      <span className={styles.overlapRef}>#{b.reservationNumber}</span>
                    )}
                    <span className={styles.overlapDates}>
                      {fmtCompact(b.startDateTime, tz)} <ArrowRight size={14} strokeWidth={1.75} /> {fmtCompact(b.endDateTime, tz)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {apiError && !overlapDetected && (
            <div className={styles.errorBanner}>{apiError}</div>
          )}

          {/* ── Platform guest (turo / getaround) ── */}
          {isPlatform && (
            <div className={styles.guestSection}>
              <p className={styles.guestSectionLabel}>Guest</p>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Name</label>
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
                    Phone {isNewGuest && <span className={styles.required}>*</span>}
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
              {score != null && (
                <div className={styles.userInfoRow}>
                  <span className={`${styles.infoBadge} ${score >= 8 ? styles.infoHigh : score >= 5 ? styles.infoMid : styles.infoLow}`}>
                    <Star size={14} strokeWidth={1.75} /> {score}/10
                  </span>
                </div>
              )}
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Turo join date <span className={styles.optional}>optional</span></label>
                  <input type="date" className={styles.input} value={form.turoJoinDate} onChange={set("turoJoinDate")} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Getaround join date <span className={styles.optional}>optional</span></label>
                  <input type="date" className={styles.input} value={form.getaroundJoinDate} onChange={set("getaroundJoinDate")} />
                </div>
              </div>
            </div>
          )}

          {/* ── Private customer ── */}
          {!isPlatform && (
            <div className={styles.guestSection}>
              <p className={styles.guestSectionLabel}>Customer</p>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Name</label>
                  <input type="text" className={styles.input} value={form.customerName} onChange={set("customerName")} placeholder="Customer name" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Phone</label>
                  <input type="tel" className={styles.input} value={form.customerPhone} onChange={set("customerPhone")} placeholder="+33 6xx" />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Email <span className={styles.optional}>optional</span></label>
                <input type="email" className={styles.input} value={form.customerEmail} onChange={set("customerEmail")} placeholder="customer@example.com" />
              </div>
            </div>
          )}

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
                  ><X size={14} strokeWidth={1.75} /></button>
                )}
              </div>
            </div>
          )}

          <div className={styles.toggleRow}>
            <div className={styles.toggleLabelWrap}>
              <span className={styles.toggleLabel}>Auto-start tracking when rent begins</span>
              {trackingLocked && <span className={styles.toggleHint}>Session already started</span>}
            </div>
            <button
              type="button"
              className={`${styles.toggle} ${form.autoStartTracking ? styles.toggleOn : ""} ${trackingLocked ? styles.toggleDisabled : ""}`}
              onClick={() => !trackingLocked && setForm(prev => ({ ...prev, autoStartTracking: !prev.autoStartTracking }))}
              disabled={trackingLocked}
              aria-label="Toggle auto-start tracking"
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>

          <div className={styles.toggleRow}>
            <div className={styles.toggleLabelWrap}>
              <span className={styles.toggleLabel}>GPS stop at rental end</span>
              <span className={styles.toggleHint}>
                {form.gpsStopMode === "auto"
                  ? "Automatic — tracking stops when rental ends"
                  : "Manual — tracking stays active until explicitly disabled"}
              </span>
            </div>
            <button
              type="button"
              className={`${styles.toggle} ${form.gpsStopMode === "manual" ? styles.toggleOn : ""}`}
              onClick={() => setForm(prev => ({ ...prev, gpsStopMode: prev.gpsStopMode === "auto" ? "manual" : "auto" }))}
              aria-label="Toggle GPS stop mode"
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
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
