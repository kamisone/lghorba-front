"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import type { Car, CalendarBooking } from "../fleet/data";
import BookingAdminModal from "./BookingAdminModal";
import { useModalUrl } from "@/hooks/useModalUrl";
import { useBusinessTz } from "@/contexts/TzContext";
import {
  fmtDateTime as fmtDT,
  fmtTime as fmtTimeUtil,
  dayKey as dayKeyUtil,
  isToday as isTodayUtil,
  dayLabel as dayLabelUtil,
  localDTToISO,
  nowLocalDT,
} from "@/lib/dateUtils";
import { Car as CarIcon, User, Plane, Pencil, Search, CalendarDays, AlertTriangle, Check, X, RotateCcw } from "lucide-react";
import styles from "./AdminBookings.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookingCar {
  id: string;
  name: string;
  photo: string | null;
  immatriculation: string;
}

interface BookingGuest {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface AdminBooking {
  id: string;
  carId: string;
  car: BookingCar | null;
  user: BookingGuest | null;
  startDateTime: string;
  endDateTime: string;
  totalPrice: number | string;
  status: "pending_payment" | "pending" | "confirmed" | "cancelled" | "cancelled_payment_timeout";
  source: "private" | "turo" | "getaround";
  reservationNumber: string | null;
  totalEarning: number | string | null;
  autoStartTracking: boolean;
  gpsStopMode: "auto" | "manual";
  hasSession: boolean;
  cancellationReason: string | null;
  cancelledAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type Tab          = "active" | "history";
type StatusFilter = "all" | "pending" | "confirmed" | "cancelled";
type SourceFilter = "all" | "private" | "turo" | "getaround";

interface TimelineEvent {
  type:     "pickup" | "return";
  booking:  AdminBooking;
  dateTime: string;
}

// Half-hour slots for the "renting at" time picker, e.g. "00:00", "00:30", … "23:30".
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchBookingsList(): Promise<AdminBooking[]> {
  const res = await fetch("/next-api/bookings", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load bookings.");
  return res.json();
}

function daysDiff(start: string, end: string): number {
  return Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));
}

function fmtPrice(p: number | string): string {
  return `€${Number(p).toFixed(2)}`;
}

function matchesSearch(b: AdminBooking, q: string): boolean {
  const s = q.toLowerCase();
  return (
    (b.car?.name?.toLowerCase().includes(s)           ?? false) ||
    (b.car?.immatriculation?.toLowerCase().includes(s) ?? false) ||
    (b.user?.name?.toLowerCase().includes(s)           ?? false) ||
    (b.user?.email?.toLowerCase().includes(s)          ?? false) ||
    (b.user?.phone?.toLowerCase().includes(s)          ?? false) ||
    (b.reservationNumber?.toLowerCase().includes(s)    ?? false)
  );
}

// ── Edit guards + adapters ────────────────────────────────────────────────────

function isCancelledStatus(status: AdminBooking["status"]): boolean {
  return status === "cancelled" || status === "cancelled_payment_timeout";
}

function isModifiableBooking(b: AdminBooking): boolean {
  if (isCancelledStatus(b.status) || b.status === "pending_payment") return false;
  return new Date(b.endDateTime) > new Date();
}

function toCalendarBooking(b: AdminBooking): CalendarBooking {
  return {
    id: b.id,
    carId: b.carId,
    startDateTime: b.startDateTime,
    endDateTime: b.endDateTime,
    source: b.source,
    status: b.status === "pending_payment" ? "pending"
      : isCancelledStatus(b.status) ? "cancelled"
      : (b.status as "pending" | "confirmed" | "cancelled"),
    reservationNumber: b.reservationNumber,
    totalEarning: b.totalEarning != null ? Number(b.totalEarning) : null,
    autoStartTracking: b.autoStartTracking ?? false,
    gpsStopMode: b.gpsStopMode ?? "auto",
    color: null,
    hasSession: b.hasSession,
    user: b.user
      ? { id: b.user.id, name: b.user.name, phone: b.user.phone, email: b.user.email }
      : null,
  };
}

function toAdminCar(b: AdminBooking): Car {
  return {
    id: b.carId,
    name: b.car?.name ?? "Unknown",
    immatriculation: b.car?.immatriculation ?? "",
    phoneNumber: "",
    photo: b.car?.photo,
  };
}

// ── Badges ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AdminBooking["status"] }) {
  const label =
    status === "pending_payment"           ? "Awaiting payment"
    : status === "cancelled_payment_timeout" ? "Expired (unpaid)"
    : status.charAt(0).toUpperCase() + status.slice(1);
  const cls =
    status === "pending_payment" ? "pending"
    : status === "cancelled_payment_timeout" ? "cancelled_payment_timeout"
    : status;
  return <span className={`${styles.badge} ${styles[`badge_${cls}`]}`}>{label}</span>;
}

const SOURCE_LABELS: Record<AdminBooking["source"], string> = {
  private: "Private", turo: "Turo", getaround: "Getaround",
};

function SourceBadge({ source }: { source: AdminBooking["source"] }) {
  return (
    <span className={`${styles.badge} ${styles[`badge_source_${source}`]}`}>
      {SOURCE_LABELS[source]}
    </span>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────

interface ModalProps {
  booking: AdminBooking;
  actionLoading: boolean;
  tz: string;
  onClose: () => void;
  onConfirm:    (id: string) => void;
  onCancel:     (id: string) => void;
  onDelete:     (id: string) => void;
  onEdit:       (b: AdminBooking) => void;
  onReactivated: (b: AdminBooking) => void;
  onRestored:   (b: AdminBooking) => void;
}

type PendingAction = "cancel" | "delete" | null;

function BookingModal({ booking, actionLoading, tz, onClose, onConfirm, onCancel, onDelete, onEdit, onReactivated, onRestored }: ModalProps) {
  const duration    = daysDiff(booking.startDateTime, booking.endDateTime);
  const pricePerDay = Number(booking.totalPrice) / duration;

  // Cancel / Delete are two-step: the first click opens an inline confirm
  // layer, the second click (inside that layer) fires the action.
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [restoring,     setRestoring]     = useState(false);
  const [restoreError,  setRestoreError]  = useState<string | null>(null);

  const [reactivating,    setReactivating]    = useState(false);
  const [reactivateEnd,   setReactivateEnd]   = useState("");
  const [reactivateError, setReactivateError] = useState<string | null>(null);
  const [reactivateSaving, setReactivateSaving] = useState(false);

  const isPastBooking = new Date(booking.endDateTime) <= new Date();
  const canReactivate = isPastBooking && !isCancelledStatus(booking.status) && booking.status !== "pending_payment";

  const handleReactivate = async () => {
    if (!reactivateEnd) return;
    setReactivateError(null);
    setReactivateSaving(true);
    try {
      const res = await fetch(`/next-api/bookings/${booking.id}/reactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDateTime: localDTToISO(reactivateEnd, tz) }),
      });
      if (res.ok) {
        onReactivated(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        setReactivateError(err?.message ?? "Failed to reactivate booking.");
      }
    } finally {
      setReactivateSaving(false);
    }
  };

  const handleRestore = async () => {
    setRestoreError(null);
    setRestoring(true);
    try {
      const res = await fetch(`/next-api/bookings/${booking.id}/restore`, { method: "POST" });
      if (res.ok) {
        onRestored(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        setRestoreError(err?.message ?? "Failed to restore booking.");
      }
    } finally {
      setRestoring(false);
    }
  };

  // Reset the confirm layer whenever the booking changes (e.g. after cancel)
  useEffect(() => { setPendingAction(null); }, [booking.id, booking.status]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (pendingAction) setPendingAction(null); // Esc first dismisses the confirm layer
      else onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, pendingAction]);

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Booking details</h2>
            <p className={styles.modalId}>#{booking.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className={styles.modalHeaderRight}>
            <StatusBadge status={booking.status} />
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={16} strokeWidth={1.75} /></button>
          </div>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.modalRow}>
            <span className={styles.modalRowLabel}>Source</span>
            <SourceBadge source={booking.source} />
          </div>

          <Link
            href={`/admin/fleet/${booking.carId}`}
            className={`${styles.modalCar} ${styles.modalCarLink}`}
            title="Vehicle details"
            onClick={onClose}
          >
            <div className={styles.modalCarThumb}>
              {booking.car?.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/next-api/cars/${booking.car.id}/photo`} alt="" className={styles.modalCarImg} />
              ) : (
                <span className={styles.modalCarFallback}><CarIcon size={20} strokeWidth={1.75} /></span>
              )}
            </div>
            <div>
              <p className={styles.modalCarName}>{booking.car?.name ?? "—"}</p>
              <p className={styles.modalCarPlate}>{booking.car?.immatriculation ?? "—"}</p>
            </div>
          </Link>

          <div className={styles.priceSummary}>
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Pick-up</span>
              <span className={styles.priceValue}>{fmtDT(booking.startDateTime, tz)}</span>
            </div>
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Return</span>
              <span className={styles.priceValue}>{fmtDT(booking.endDateTime, tz)}</span>
            </div>
            <div className={styles.priceDivider} />
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Duration</span>
              <span className={styles.priceValue}>{duration} day{duration !== 1 ? "s" : ""}</span>
            </div>
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Rate (avg.)</span>
              <span className={styles.priceValue}>{fmtPrice(pricePerDay)}/day</span>
            </div>
            <div className={styles.priceDivider} />
            <div className={`${styles.priceRow} ${styles.priceRowTotal}`}>
              <span className={styles.priceLabel}>Total</span>
              <span className={styles.priceTotalValue}>{fmtPrice(booking.totalPrice)}</span>
            </div>
            {booking.totalEarning != null && (
              <>
                <div className={styles.priceDivider} />
                <div className={styles.priceRow}>
                  <span className={styles.priceLabel}>Earning</span>
                  <span className={`${styles.priceValue} ${styles.priceEarningValue}`}>
                    {fmtPrice(booking.totalEarning)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Customer / guest info lives on booking.user for all booking sources. */}
          {(() => {
            const isPrivate = booking.source === "private";
            const name  = booking.user?.name  ?? null;
            const email = booking.user?.email ?? null;
            const phone = booking.user?.phone ?? null;
            if (!name && !email && !phone && !booking.reservationNumber) return null;
            return (
              <div className={styles.customerSection}>
                {booking.user?.id ? (
                  <Link
                    href={`/admin/users/${booking.user.id}`}
                    className={`${styles.customerSectionHead} ${styles.customerSectionHeadLink}`}
                    onClick={onClose}
                  >
                    <span className={styles.customerSectionIcon} aria-hidden="true">
                      {isPrivate ? <User size={16} strokeWidth={1.75} /> : <Plane size={16} strokeWidth={1.75} />}
                    </span>
                    <span className={styles.sectionLabel}>
                      {isPrivate ? "Customer" : "Guest"}
                    </span>
                    <span className={styles.customerSectionChevron} aria-hidden="true">›</span>
                  </Link>
                ) : (
                  <div className={styles.customerSectionHead}>
                    <span className={styles.customerSectionIcon} aria-hidden="true">
                      {isPrivate ? <User size={16} strokeWidth={1.75} /> : <Plane size={16} strokeWidth={1.75} />}
                    </span>
                    <span className={styles.sectionLabel}>
                      {isPrivate ? "Customer" : "Guest"}
                    </span>
                  </div>
                )}
                <div className={styles.customerRows}>
                  {name && (
                    <div className={styles.customerRow}>
                      <span className={styles.customerRowLabel}>Name</span>
                      <span className={styles.customerRowValue}>{name}</span>
                    </div>
                  )}
                  {email && (
                    <div className={styles.customerRow}>
                      <span className={styles.customerRowLabel}>Email</span>
                      <span className={`${styles.customerRowValue} ${styles.customerRowMono}`}>{email}</span>
                    </div>
                  )}
                  {phone && (
                    <div className={styles.customerRow}>
                      <span className={styles.customerRowLabel}>Phone</span>
                      <span className={`${styles.customerRowValue} ${styles.customerRowMono}`}>{phone}</span>
                    </div>
                  )}
                  {booking.reservationNumber && (
                    <div className={styles.customerRow}>
                      <span className={styles.customerRowLabel}>Ref #</span>
                      <span className={`${styles.customerRowValue} ${styles.customerRowMono}`}>
                        {booking.reservationNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {booking.status === "cancelled_payment_timeout" && (
            <div className={styles.expirationNotice}>
              <span className={styles.expirationIcon}>⏱</span>
              <span>Auto-cancelled — payment not received within 15 minutes</span>
              {booking.cancelledAt && (
                <span className={styles.expirationTime}>at {fmtDT(booking.cancelledAt, tz)}</span>
              )}
            </div>
          )}

          <div className={styles.timestamps}>
            <p>Created {fmtDT(booking.createdAt, tz)}</p>
            {booking.expiresAt && booking.status === "pending_payment" && (
              <p>Expires {fmtDT(booking.expiresAt, tz)}</p>
            )}
            {booking.cancelledAt && <p>Cancelled {fmtDT(booking.cancelledAt, tz)}</p>}
            {booking.updatedAt !== booking.createdAt && <p>Updated {fmtDT(booking.updatedAt, tz)}</p>}
          </div>
        </div>

        {canReactivate && (
          reactivating ? (
            <div className={styles.reactivateSection}>
              <span className={styles.reactivateLabel}>Set new return time</span>
              <div className={styles.reactivateRow}>
                <input
                  type="datetime-local"
                  className={styles.reactivateDtInput}
                  value={reactivateEnd}
                  min={nowLocalDT(tz)}
                  onChange={e => setReactivateEnd(e.target.value)}
                  autoFocus
                />
                <button
                  className={styles.actionReactivate}
                  onClick={handleReactivate}
                  disabled={!reactivateEnd || reactivateSaving}
                >
                  {reactivateSaving ? "Saving…" : "Confirm"}
                </button>
                <button
                  className={styles.actionEdit}
                  onClick={() => { setReactivating(false); setReactivateEnd(""); setReactivateError(null); }}
                  disabled={reactivateSaving}
                >
                  Cancel
                </button>
              </div>
              {reactivateError && <span className={styles.reactivateError}>{reactivateError}</span>}
            </div>
          ) : null
        )}

        {pendingAction && (
          <div className={styles.confirmSection} role="alertdialog" aria-live="assertive">
            <span className={styles.confirmLabel}>
              {pendingAction === "cancel" ? "Cancel this booking?" : "Delete this booking?"}
            </span>
            <p className={styles.confirmText}>
              {pendingAction === "cancel"
                ? "The car will be released for this period and any active rent session will be stopped. You can restore it later."
                : "This permanently removes the booking and cannot be undone."}
            </p>
            <div className={styles.reactivateRow}>
              <button
                className={styles.confirmDanger}
                onClick={() => pendingAction === "cancel" ? onCancel(booking.id) : onDelete(booking.id)}
                disabled={actionLoading}
                autoFocus
              >
                {actionLoading ? "Working…" : pendingAction === "cancel" ? "Yes, cancel booking" : "Yes, delete"}
              </button>
              <button
                className={styles.actionEdit}
                onClick={() => setPendingAction(null)}
                disabled={actionLoading}
              >
                Keep booking
              </button>
            </div>
          </div>
        )}

        {restoreError && (
          <div className={styles.confirmSection}>
            <span className={styles.reactivateError}>{restoreError}</span>
          </div>
        )}

        <div className={styles.modalActions}>
          <Link
            href={`/admin/fleet/${booking.carId}/rent`}
            className={styles.actionRent}
            onClick={onClose}
          >
            Rent sessions
          </Link>
          {isModifiableBooking(booking) && (
            <button
              className={styles.actionEdit}
              onClick={() => { onClose(); onEdit(booking); }}
              disabled={actionLoading}
            >
              <Pencil size={14} strokeWidth={1.75} /> Edit
            </button>
          )}
          {canReactivate && !reactivating && (
            <button
              className={styles.actionReactivateTrigger}
              onClick={() => setReactivating(true)}
              disabled={actionLoading}
            >
              Reactivate
            </button>
          )}
          {booking.status === "pending" && (
            <button className={styles.actionConfirm} onClick={() => onConfirm(booking.id)} disabled={actionLoading}>
              Confirm booking
            </button>
          )}
          {booking.status === "cancelled" && (
            <button
              className={styles.actionRestore}
              onClick={handleRestore}
              disabled={actionLoading || restoring || !!pendingAction}
            >
              <RotateCcw size={14} strokeWidth={1.75} /> {restoring ? "Restoring…" : "Restore booking"}
            </button>
          )}
          {!isCancelledStatus(booking.status) && (
            <button
              className={styles.actionCancel}
              onClick={() => setPendingAction("cancel")}
              disabled={actionLoading || pendingAction === "cancel"}
            >
              Cancel
            </button>
          )}
          <button
            className={styles.actionDelete}
            onClick={() => setPendingAction("delete")}
            disabled={actionLoading || pendingAction === "delete"}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Timeline event card ───────────────────────────────────────────────────────

function EventCard({ event, onOpen, tz }: { event: TimelineEvent; onOpen: (b: AdminBooking) => void; tz: string }) {
  const { type, booking } = event;
  const isPickup = type === "pickup";

  return (
    <button
      className={`${styles.eventCard} ${isPickup ? styles.eventCardPickup : styles.eventCardReturn}`}
      onClick={() => onOpen(booking)}
    >
      <span className={`${styles.eventIcon} ${isPickup ? styles.eventIconPickup : styles.eventIconReturn}`}>
        {isPickup ? "↑" : "↓"}
      </span>

      <div className={styles.carThumb} aria-hidden="true">
        {booking.car?.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/next-api/cars/${booking.car.id}/photo`} alt="" className={styles.carImg} loading="lazy" />
        ) : (
          <span className={styles.carFallback}><CarIcon size={18} strokeWidth={1.75} /></span>
        )}
      </div>

      <div className={styles.eventBody}>
        <div className={styles.eventTop}>
          <span className={`${styles.eventTypeLabel} ${isPickup ? styles.eventTypeLabelPickup : styles.eventTypeLabelReturn}`}>
            {isPickup ? "Pick-up" : "Return"}
          </span>
          <span className={styles.eventTimeSep} aria-hidden="true">·</span>
          <span className={styles.eventTime}>{fmtTimeUtil(event.dateTime, tz)}</span>
          <SourceBadge source={booking.source} />
        </div>
        <div className={styles.eventMeta}>
          <span className={styles.eventCar}>{booking.car?.name ?? "—"}</span>
          {booking.car?.immatriculation && (
            <span className={styles.eventPlate}>{booking.car.immatriculation}</span>
          )}
          {booking.user?.name && (
            <span className={styles.eventCustomer}>
              · {booking.user.name}
            </span>
          )}
        </div>
      </div>

      <StatusBadge status={booking.status} />
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminBookings() {
  const tz = useBusinessTz();
  // SWR: revisiting /admin/bookings shows the cached list instantly instead
  // of re-fetching and blanking to a spinner every time.
  const { data: bookingsData, error: bookingsError, isLoading, mutate } =
    useSWR<AdminBooking[]>("admin:bookings", fetchBookingsList);
  const bookings = useMemo(() => bookingsData ?? [], [bookingsData]);
  const [tab,           setTab]           = useState<Tab>("active");
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>("all");
  const [sourceFilter,  setSourceFilter]  = useState<SourceFilter>("all");
  const [carFilter,     setCarFilter]     = useState<string>("all");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [atDate,        setAtDate]        = useState("");
  const [atHour,        setAtHour]        = useState("");
  const [selected,      setSelected]      = useState<AdminBooking | null>(null);
  const [editBooking,   setEditBooking]   = useState<AdminBooking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCarPicker, setShowCarPicker] = useState(false);
  const [pickerCars,    setPickerCars]    = useState<Car[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [createCar,     setCreateCar]     = useState<Car | null>(null);

  const { openModal, closeModal } = useModalUrl();

  // ── URL modal restore ─────────────────────────────────────────────────────

  const [restoreBookingId,   setRestoreBookingId]   = useState<string | null>(null);
  const [restoreCreateCarId, setRestoreCreateCarId] = useState<string | null>(null);
  const [restoreEditId,      setRestoreEditId]      = useState<string | null>(null);

  useEffect(() => {
    const sp    = new URLSearchParams(window.location.search);
    const modal = sp.get("modal");
    if (modal === "booking")             setRestoreBookingId(sp.get("id"));
    else if (modal === "booking-create") setRestoreCreateCarId(sp.get("carId"));
    else if (modal === "booking-edit")   setRestoreEditId(sp.get("id"));
  }, []);

  // Restore booking detail modal once bookings are loaded
  useEffect(() => {
    if (isLoading || !restoreBookingId) return;
    const b = bookings.find(b => b.id === restoreBookingId);
    if (b) setSelected(b);
    setRestoreBookingId(null);
  }, [isLoading, restoreBookingId, bookings]);

  // Restore edit booking modal once bookings are loaded
  useEffect(() => {
    if (isLoading || !restoreEditId) return;
    const b = bookings.find(b => b.id === restoreEditId);
    if (b && isModifiableBooking(b)) setEditBooking(b);
    setRestoreEditId(null);
  }, [isLoading, restoreEditId, bookings]);

  // Restore create booking modal by fetching cars
  useEffect(() => {
    if (!restoreCreateCarId) return;
    let cancelled = false;
    setPickerLoading(true);
    fetch("/next-api/cars", { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then((cars: Car[]) => {
        if (cancelled) return;
        setPickerCars(cars);
        const car = cars.find(c => c.id === restoreCreateCarId);
        if (car) setCreateCar(car);
        setRestoreCreateCarId(null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPickerLoading(false); });
    return () => { cancelled = true; };
  }, [restoreCreateCarId]);

  const openBookingDetail = useCallback((b: AdminBooking) => {
    setSelected(b);
    openModal("booking", { id: b.id });
  }, [openModal]);

  const closeBookingDetail = useCallback(() => {
    setSelected(null);
    closeModal();
  }, [closeModal]);

  const openBookingCreate = useCallback((car: Car) => {
    setCreateCar(car);
    openModal("booking-create", { carId: car.id });
  }, [openModal]);

  const closeBookingCreate = useCallback(() => {
    setCreateCar(null);
    closeModal();
  }, [closeModal]);

  const openBookingEdit = useCallback((b: AdminBooking) => {
    setEditBooking(b);
    openModal("booking-edit", { id: b.id });
  }, [openModal]);

  const closeBookingEdit = useCallback(() => {
    setEditBooking(null);
    closeModal();
  }, [closeModal]);


  // ── Unique cars for filter dropdown ──────────────────────────────────────

  const carOptions = useMemo(() => {
    const seen = new Map<string, { id: string; label: string }>();
    for (const b of bookings) {
      if (b.car && !seen.has(b.car.id)) {
        const label = [b.car.name, b.car.immatriculation].filter(Boolean).join(" · ");
        seen.set(b.car.id, { id: b.car.id, label });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [bookings]);

  // ── Active tab: build timeline grouped by day ─────────────────────────────

  const timeline = useMemo(() => {
    const now    = new Date();
    const events: TimelineEvent[] = [];

    for (const b of bookings) {
      if (isCancelledStatus(b.status)) continue;
      const end   = new Date(b.endDateTime);
      if (end <= now) continue;

      if (search && !matchesSearch(b, search)) continue;
      if (sourceFilter !== "all" && b.source !== sourceFilter) continue;
      if (carFilter !== "all" && b.carId !== carFilter) continue;

      const start = new Date(b.startDateTime);
      if (start > now) {
        events.push({ type: "pickup",  booking: b, dateTime: b.startDateTime });
      } else {
        events.push({ type: "return",  booking: b, dateTime: b.endDateTime });
      }
    }

    events.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    // Group by day
    const groups: { key: string; label: string; today: boolean; events: TimelineEvent[] }[] = [];
    for (const ev of events) {
      const k = dayKeyUtil(ev.dateTime, tz);
      let g = groups.find(g => g.key === k);
      if (!g) {
        g = { key: k, label: dayLabelUtil(ev.dateTime, tz), today: isTodayUtil(ev.dateTime, tz), events: [] };
        groups.push(g);
      }
      g.events.push(ev);
    }
    return groups;
  }, [bookings, search, sourceFilter, carFilter, tz]);

  // ── History tab: filter past + cancelled ──────────────────────────────────

  // Instant the admin is probing for "which car was being rented then" — null when
  // either half of the picker is empty.
  const atMs = useMemo(() => {
    if (!atDate || atHour === "") return null;
    return new Date(localDTToISO(`${atDate}T${atHour}`, tz)).getTime();
  }, [atDate, atHour, tz]);

  const history = useMemo(() => {
    const now = new Date();
    return bookings.filter(b => {
      const isPast      = new Date(b.endDateTime) <= now;
      if (!isPast && !isCancelledStatus(b.status)) return false;

      if (search && !matchesSearch(b, search)) return false;
      // "cancelled" filter matches both cancelled variants
      if (statusFilter !== "all") {
        if (statusFilter === "cancelled") {
          if (!isCancelledStatus(b.status)) return false;
        } else {
          if (b.status !== statusFilter) return false;
        }
      }
      if (sourceFilter !== "all" && b.source !== sourceFilter) return false;
      if (carFilter !== "all" && b.carId !== carFilter) return false;
      if (dateFrom && b.startDateTime < `${dateFrom}T00:00:00`) return false;
      if (dateTo   && b.startDateTime > `${dateTo}T23:59:59`)   return false;
      // A cancelled booking never actually had the car out, so it can't match
      // "which car was being rented at this instant" regardless of its dates.
      if (atMs !== null) {
        if (isCancelledStatus(b.status)) return false;
        const startMs = new Date(b.startDateTime).getTime();
        const endMs   = new Date(b.endDateTime).getTime();
        if (atMs < startMs || atMs > endMs) return false;
      }
      return true;
    });
  }, [bookings, search, statusFilter, sourceFilter, carFilter, dateFrom, dateTo, atMs]);

  // ── Counts for tab badges ─────────────────────────────────────────────────

  const activeCount = useMemo(() => {
    const now = new Date();
    return bookings.filter(b => !isCancelledStatus(b.status) && new Date(b.endDateTime) > now).length;
  }, [bookings]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const updateStatus = useCallback(async (id: string, status: "confirmed" | "cancelled") => {
    setActionLoading(true);
    try {
      const res = await fetch(`/next-api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      const updated: AdminBooking = await res.json();
      const patch = { status: updated.status, cancelledAt: updated.cancelledAt ?? null };
      mutate(prev => (prev ?? []).map(b => b.id === id ? { ...b, ...patch } : b), { revalidate: false });
      setSelected(prev => prev?.id === id ? { ...prev, ...patch } : prev);
    } finally {
      setActionLoading(false);
    }
  }, [mutate]);

  // Confirmation happens in BookingModal's inline confirm layer.
  const deleteBooking = useCallback(async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/next-api/bookings/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        mutate(prev => (prev ?? []).filter(b => b.id !== id), { revalidate: false });
        setSelected(prev => {
          if (prev?.id === id) { closeModal(); return null; }
          return prev;
        });
      }
    } finally {
      setActionLoading(false);
    }
  }, [closeModal, mutate]);

  const handleReactivated = useCallback((updated: AdminBooking) => {
    mutate(prev => (prev ?? []).map(b => b.id === updated.id ? { ...b, ...updated } : b), { revalidate: false });
    setSelected(null);
    closeModal();
  }, [closeModal, mutate]);

  // Keep the modal open after a restore so the admin sees the new status.
  const handleRestored = useCallback((updated: AdminBooking) => {
    mutate(prev => (prev ?? []).map(b => b.id === updated.id ? { ...b, ...updated } : b), { revalidate: false });
    setSelected(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
  }, [mutate]);

  const openCarPicker = async () => {
    setShowCarPicker(true);
    if (pickerCars.length > 0) return;
    setPickerLoading(true);
    try {
      const res = await fetch("/next-api/cars", { cache: "no-store" });
      if (res.ok) setPickerCars(await res.json());
    } finally {
      setPickerLoading(false);
    }
  };

  const clearHistoryFilters = () => {
    setSearch(""); setStatusFilter("all"); setSourceFilter("all"); setCarFilter("all");
    setDateFrom(""); setDateTo(""); setAtDate(""); setAtHour("");
  };
  const hasHistoryFilters =
    search || statusFilter !== "all" || sourceFilter !== "all" || carFilter !== "all" ||
    dateFrom || dateTo || atDate || atHour;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Bookings</h1>
        <button className={styles.newBookingBtn} onClick={openCarPicker}>+ New booking</button>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "active" ? styles.tabActive : ""}`}
          onClick={() => setTab("active")}
        >
          Schedule
          {!isLoading && activeCount > 0 && (
            <span className={`${styles.tabBadge} ${tab === "active" ? styles.tabBadgeActive : ""}`}>
              {activeCount}
            </span>
          )}
        </button>
        <button
          className={`${styles.tab} ${tab === "history" ? styles.tabActive : ""}`}
          onClick={() => setTab("history")}
        >
          History
          {!isLoading && history.length > 0 && tab === "history" && (
            <span className={`${styles.tabBadge} ${styles.tabBadgeActive}`}>{history.length}</span>
          )}
        </button>
      </div>

      {/* ── Loading / error ── */}
      {isLoading && (
        <div className={styles.skeletonList}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.skeletonRow}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonLines}>
                <div className={styles.skeletonLine} style={{ width: "40%" }} />
                <div className={styles.skeletonLine} style={{ width: "65%" }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {bookingsError && !isLoading && (
        <div className={styles.stateError}>
          <AlertTriangle size={16} strokeWidth={1.75} /> Failed to load bookings.
          <button className={styles.retryBtn} onClick={() => mutate()}>Retry</button>
        </div>
      )}

      {/* ══ ACTIVE TAB ══════════════════════════════════════════════════════ */}
      {!isLoading && !bookingsError && tab === "active" && (
        <>
          {/* Search + source + car filter */}
          <div className={styles.filters}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}><Search size={16} strokeWidth={1.75} /></span>
              <input
                className={styles.searchInput}
                placeholder="Car, plate or customer…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className={styles.select} value={sourceFilter} onChange={e => setSourceFilter(e.target.value as SourceFilter)}>
              <option value="all">All sources</option>
              <option value="private">Private</option>
              <option value="turo">Turo</option>
              <option value="getaround">Getaround</option>
            </select>
            {carOptions.length > 1 && (
              <select className={styles.select} value={carFilter} onChange={e => setCarFilter(e.target.value)}>
                <option value="all">All cars</option>
                {carOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            )}
            {(search || sourceFilter !== "all" || carFilter !== "all") && (
              <button className={styles.clearBtn} onClick={() => { setSearch(""); setSourceFilter("all"); setCarFilter("all"); }}>Clear</button>
            )}
          </div>

          {timeline.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}><CalendarDays size={20} strokeWidth={1.75} /></span>
              <p className={styles.emptyMsg}>No upcoming activity</p>
              <p className={styles.emptyHint}>All active bookings will appear here</p>
            </div>
          ) : (
            <div className={styles.timeline}>
              {timeline.map(group => (
                <div key={group.key} className={`${styles.dayGroup} ${group.today ? styles.dayGroupToday : ""}`}>
                  <div className={styles.dayHeader}>
                    <span className={styles.dayLabel}>
                      {group.today && <span className={styles.todayDot} aria-hidden="true" />}
                      {group.label}
                    </span>
                    <span className={styles.dayCount}>
                      {group.events.length} event{group.events.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className={styles.dayEvents}>
                    {group.events.map((ev, i) => (
                      <EventCard key={`${ev.booking.id}-${i}`} event={ev} onOpen={openBookingDetail} tz={tz} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══ HISTORY TAB ═════════════════════════════════════════════════════ */}
      {!isLoading && !bookingsError && tab === "history" && (
        <>
          {/* Full filter bar */}
          <div className={styles.filters}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}><Search size={16} strokeWidth={1.75} /></span>
              <input
                className={styles.searchInput}
                placeholder="Car, plate or customer…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className={styles.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select className={styles.select} value={sourceFilter} onChange={e => setSourceFilter(e.target.value as SourceFilter)}>
              <option value="all">All sources</option>
              <option value="private">Private</option>
              <option value="turo">Turo</option>
              <option value="getaround">Getaround</option>
            </select>
            {carOptions.length > 1 && (
              <select className={styles.select} value={carFilter} onChange={e => setCarFilter(e.target.value)}>
                <option value="all">All cars</option>
                {carOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            )}
            <label className={styles.dateField}>
              <span className={styles.dateFieldLabel}>From</span>
              <input type="date" className={styles.dateInput} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </label>
            <label className={styles.dateField}>
              <span className={styles.dateFieldLabel}>To</span>
              <input type="date" className={styles.dateInput} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </label>
            <label className={styles.dateField}>
              <span className={styles.dateFieldLabel}>Renting at date</span>
              <input type="date" className={styles.dateInput} value={atDate} onChange={e => setAtDate(e.target.value)} />
            </label>
            <label className={styles.dateField}>
              <span className={styles.dateFieldLabel}>Time</span>
              <select className={styles.select} value={atHour} onChange={e => setAtHour(e.target.value)}>
                <option value="">--</option>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            {hasHistoryFilters && <button className={styles.clearBtn} onClick={clearHistoryFilters}>Clear filters</button>}
          </div>

          {history.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}><CalendarDays size={20} strokeWidth={1.75} /></span>
              <p className={styles.emptyMsg}>No bookings found</p>
              {hasHistoryFilters && <p className={styles.emptyHint}>Try adjusting your filters</p>}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Plate</th>
                    <th>Pick-up</th>
                    <th>Return</th>
                    <th className={styles.center}>Days</th>
                    <th>Total</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th className={styles.center}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(b => (
                    <tr
                      key={b.id}
                      className={styles.row}
                      onClick={() => openBookingDetail(b)}
                      tabIndex={0}
                      onKeyDown={e => e.key === "Enter" && openBookingDetail(b)}
                    >
                      <td>
                        <Link
                          href={`/admin/fleet/${b.carId}`}
                          className={`${styles.carCell} ${styles.carCellLink}`}
                          title="Vehicle details"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className={styles.carThumb}>
                            {b.car?.photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`/next-api/cars/${b.car.id}/photo`} alt="" className={styles.carImg} loading="lazy" />
                            ) : (
                              <span className={styles.carFallback}><CarIcon size={18} strokeWidth={1.75} /></span>
                            )}
                          </div>
                          <span className={styles.carName}>{b.car?.name ?? "—"}</span>
                        </Link>
                      </td>
                      <td className={styles.mono}>{b.car?.immatriculation ?? "—"}</td>
                      <td className={styles.dateCell}>{fmtDT(b.startDateTime, tz)}</td>
                      <td className={styles.dateCell}>{fmtDT(b.endDateTime, tz)}</td>
                      <td className={styles.center}>{daysDiff(b.startDateTime, b.endDateTime)}</td>
                      <td className={styles.priceCell}>{fmtPrice(b.totalPrice)}</td>
                      <td><SourceBadge source={b.source} /></td>
                      <td><StatusBadge status={b.status} /></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className={styles.rowActions}>
                          {b.status === "pending" && (
                            <button className={styles.iconConfirm} title="Confirm" disabled={actionLoading} onClick={() => updateStatus(b.id, "confirmed")}><Check size={14} strokeWidth={1.75} /></button>
                          )}
                          {!isCancelledStatus(b.status) && (
                            <button className={styles.iconCancel} title="Cancel" disabled={actionLoading} onClick={() => updateStatus(b.id, "cancelled")}>✗</button>
                          )}
                          <button className={styles.iconDelete} title="Delete" disabled={actionLoading} onClick={() => deleteBooking(b.id)}>⊗</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Detail modal ── */}
      {selected && (
        <BookingModal
          booking={selected}
          actionLoading={actionLoading}
          tz={tz}
          onClose={closeBookingDetail}
          onConfirm={id => updateStatus(id, "confirmed")}
          onCancel={id  => updateStatus(id, "cancelled")}
          onDelete={deleteBooking}
          onEdit={openBookingEdit}
          onReactivated={handleReactivated}
          onRestored={handleRestored}
        />
      )}

      {/* ── Car picker ── */}
      {showCarPicker && (
        <div className={styles.backdrop} onMouseDown={() => setShowCarPicker(false)}>
          <div className={styles.modal} onMouseDown={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Select a vehicle</h2>
              <button className={styles.closeBtn} onClick={() => setShowCarPicker(false)} aria-label="Close"><X size={16} strokeWidth={1.75} /></button>
            </div>
            <div className={styles.modalBody}>
              {pickerLoading ? (
                <div className={styles.stateCenter}><span className={styles.spinner} /><span>Loading…</span></div>
              ) : pickerCars.length === 0 ? (
                <p className={styles.pickerEmpty}>No vehicles found.</p>
              ) : (
                <div className={styles.pickerList}>
                  {pickerCars.map(car => (
                    <button key={car.id} className={styles.pickerItem} onClick={() => { openBookingCreate(car); setShowCarPicker(false); }}>
                      <div className={styles.pickerCarThumb}>
                        {car.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/next-api/cars/${car.id}/photo`} alt="" className={styles.carImg} />
                        ) : (
                          <span className={styles.carFallback}><CarIcon size={18} strokeWidth={1.75} /></span>
                        )}
                      </div>
                      <div>
                        <p className={styles.pickerCarName}>{car.name}</p>
                        <p className={styles.pickerCarPlate}>{car.immatriculation}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create booking modal ── */}
      {createCar && (
        <BookingAdminModal
          car={createCar}
          onClose={closeBookingCreate}
          onSaved={() => { closeBookingCreate(); mutate(); }}
        />
      )}

      {/* ── Edit booking modal ── */}
      {editBooking && (
        <BookingAdminModal
          car={toAdminCar(editBooking)}
          booking={toCalendarBooking(editBooking)}
          existingBookings={bookings
            .filter(b => b.carId === editBooking.carId && b.id !== editBooking.id)
            .map(toCalendarBooking)}
          sessionStarted={editBooking.hasSession}
          onClose={closeBookingEdit}
          onSaved={(updated) => {
            mutate(prev => (prev ?? []).map(b =>
              b.id === editBooking.id
                ? {
                    ...b,
                    startDateTime:     updated.startDateTime,
                    endDateTime:       updated.endDateTime,
                    source:            updated.source,
                    reservationNumber: updated.reservationNumber ?? null,
                    totalEarning:      updated.totalEarning ?? null,
                    autoStartTracking: updated.autoStartTracking ?? b.autoStartTracking,
                    gpsStopMode:       updated.gpsStopMode ?? b.gpsStopMode,
                    user: updated.user
                      ? { id: updated.user.id, name: updated.user.name, phone: updated.user.phone, email: updated.user.email ?? null }
                      : b.user,
                  }
                : b
            ), { revalidate: false });
            closeBookingEdit();
          }}
        />
      )}
    </div>
  );
}
