"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { Car } from "./data";
import BookingAdminModal from "./BookingAdminModal";
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
  status: "pending_payment" | "pending" | "confirmed" | "cancelled";
  source: "private" | "turo" | "getaround";
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  reservationNumber: string | null;
  totalEarning: number | string | null;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysDiff(start: string, end: string): number {
  return Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtPrice(p: number | string): string {
  return `€${Number(p).toFixed(2)}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayLabel(dateISO: string): string {
  const date  = new Date(dateISO);
  const today = startOfDay(new Date());
  const diff  = Math.round((startOfDay(date).getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isToday(iso: string): boolean {
  return dayKey(iso) === dayKey(new Date().toISOString());
}

function matchesSearch(b: AdminBooking, q: string): boolean {
  const s = q.toLowerCase();
  return (
    (b.car?.name?.toLowerCase().includes(s)           ?? false) ||
    (b.car?.immatriculation?.toLowerCase().includes(s) ?? false) ||
    (b.customerName?.toLowerCase().includes(s)         ?? false) ||
    (b.customerEmail?.toLowerCase().includes(s)        ?? false) ||
    (b.user?.name?.toLowerCase().includes(s)           ?? false) ||
    (b.user?.email?.toLowerCase().includes(s)          ?? false) ||
    (b.reservationNumber?.toLowerCase().includes(s)    ?? false)
  );
}

// ── Badges ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AdminBooking["status"] }) {
  const label =
    status === "pending_payment" ? "Awaiting payment"
    : status.charAt(0).toUpperCase() + status.slice(1);
  const cls = status === "pending_payment" ? "pending" : status;
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
  onClose: () => void;
  onConfirm: (id: string) => void;
  onCancel:  (id: string) => void;
  onDelete:  (id: string) => void;
}

function BookingModal({ booking, actionLoading, onClose, onConfirm, onCancel, onDelete }: ModalProps) {
  const duration    = daysDiff(booking.startDateTime, booking.endDateTime);
  const pricePerDay = Number(booking.totalPrice) / duration;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

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
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.modalRow}>
            <span className={styles.modalRowLabel}>Source</span>
            <SourceBadge source={booking.source} />
          </div>

          <div className={styles.modalCar}>
            <div className={styles.modalCarThumb}>
              {booking.car?.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/next-api/cars/${booking.car.id}/photo`} alt="" className={styles.modalCarImg} />
              ) : (
                <span className={styles.modalCarFallback}>🚗</span>
              )}
            </div>
            <div>
              <p className={styles.modalCarName}>{booking.car?.name ?? "—"}</p>
              <p className={styles.modalCarPlate}>{booking.car?.immatriculation ?? "—"}</p>
            </div>
          </div>

          <div className={styles.priceSummary}>
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Pick-up</span>
              <span className={styles.priceValue}>{fmtDate(booking.startDateTime)}</span>
            </div>
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Return</span>
              <span className={styles.priceValue}>{fmtDate(booking.endDateTime)}</span>
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
          </div>

          {/* For platform bookings, guest info lives on booking.user.
              For private bookings, it's on customerName/Email/Phone. */}
          {(() => {
            const isPrivate = booking.source === "private";
            const name  = isPrivate ? booking.customerName  : (booking.user?.name  ?? booking.customerName);
            const email = isPrivate ? booking.customerEmail : (booking.user?.email ?? booking.customerEmail);
            const phone = isPrivate ? booking.customerPhone : (booking.user?.phone ?? booking.customerPhone);
            if (!name && !email && !phone && !booking.reservationNumber && booking.totalEarning == null) return null;
            return (
              <div className={styles.customerSection}>
                <div className={styles.customerSectionHead}>
                  <span className={styles.customerSectionIcon} aria-hidden="true">
                    {isPrivate ? "👤" : "✈️"}
                  </span>
                  <span className={styles.sectionLabel}>
                    {isPrivate ? "Customer" : "Guest"}
                  </span>
                </div>
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
                  {booking.totalEarning != null && (
                    <div className={`${styles.customerRow} ${styles.customerRowEarning}`}>
                      <span className={styles.customerRowLabel}>Earning</span>
                      <span className={`${styles.customerRowValue} ${styles.customerRowEarningValue}`}>
                        {fmtPrice(booking.totalEarning)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <div className={styles.timestamps}>
            <p>Created {fmtDateTime(booking.createdAt)}</p>
            {booking.updatedAt !== booking.createdAt && <p>Updated {fmtDateTime(booking.updatedAt)}</p>}
          </div>
        </div>

        <div className={styles.modalActions}>
          {booking.status === "pending" && (
            <button className={styles.actionConfirm} onClick={() => onConfirm(booking.id)} disabled={actionLoading}>
              Confirm booking
            </button>
          )}
          {booking.status !== "cancelled" && (
            <button className={styles.actionCancel} onClick={() => onCancel(booking.id)} disabled={actionLoading}>
              Cancel
            </button>
          )}
          <button className={styles.actionDelete} onClick={() => onDelete(booking.id)} disabled={actionLoading}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Timeline event card ───────────────────────────────────────────────────────

function EventCard({ event, onOpen }: { event: TimelineEvent; onOpen: (b: AdminBooking) => void }) {
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

      <div className={styles.eventBody}>
        <div className={styles.eventTop}>
          <span className={`${styles.eventTypeLabel} ${isPickup ? styles.eventTypeLabelPickup : styles.eventTypeLabelReturn}`}>
            {isPickup ? "Pick-up" : "Return"}
          </span>
          <span className={styles.eventTimeSep} aria-hidden="true">·</span>
          <span className={styles.eventTime}>{fmtTime(event.dateTime)}</span>
          <SourceBadge source={booking.source} />
        </div>
        <div className={styles.eventMeta}>
          <span className={styles.eventCar}>{booking.car?.name ?? "—"}</span>
          {booking.car?.immatriculation && (
            <span className={styles.eventPlate}>{booking.car.immatriculation}</span>
          )}
          {(booking.customerName ?? booking.user?.name) && (
            <span className={styles.eventCustomer}>
              · {booking.customerName ?? booking.user?.name}
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
  const [bookings,      setBookings]      = useState<AdminBooking[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [tab,           setTab]           = useState<Tab>("active");
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>("all");
  const [sourceFilter,  setSourceFilter]  = useState<SourceFilter>("all");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [selected,      setSelected]      = useState<AdminBooking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCarPicker, setShowCarPicker] = useState(false);
  const [pickerCars,    setPickerCars]    = useState<Car[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [createCar,     setCreateCar]     = useState<Car | null>(null);

  // ── Fetch all bookings (client-side split between tabs) ───────────────────

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/next-api/bookings", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setBookings(await res.json());
    } catch {
      setError("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // ── Active tab: build timeline grouped by day ─────────────────────────────

  const timeline = useMemo(() => {
    const now    = new Date();
    const events: TimelineEvent[] = [];

    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      const end   = new Date(b.endDateTime);
      if (end <= now) continue;

      if (search && !matchesSearch(b, search)) continue;
      if (sourceFilter !== "all" && b.source !== sourceFilter) continue;

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
      const k = dayKey(ev.dateTime);
      let g = groups.find(g => g.key === k);
      if (!g) {
        g = { key: k, label: dayLabel(ev.dateTime), today: isToday(ev.dateTime), events: [] };
        groups.push(g);
      }
      g.events.push(ev);
    }
    return groups;
  }, [bookings, search, sourceFilter]);

  // ── History tab: filter past + cancelled ──────────────────────────────────

  const history = useMemo(() => {
    const now = new Date();
    return bookings.filter(b => {
      const isPast      = new Date(b.endDateTime) <= now;
      const isCancelled = b.status === "cancelled";
      if (!isPast && !isCancelled) return false;

      if (search && !matchesSearch(b, search)) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (sourceFilter !== "all" && b.source !== sourceFilter) return false;
      if (dateFrom && b.startDateTime < `${dateFrom}T00:00:00`) return false;
      if (dateTo   && b.startDateTime > `${dateTo}T23:59:59`)   return false;
      return true;
    });
  }, [bookings, search, statusFilter, sourceFilter, dateFrom, dateTo]);

  // ── Counts for tab badges ─────────────────────────────────────────────────

  const activeCount = useMemo(() => {
    const now = new Date();
    return bookings.filter(b => b.status !== "cancelled" && new Date(b.endDateTime) > now).length;
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
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: updated.status } : b));
      setSelected(prev => prev?.id === id ? { ...prev, status: updated.status } : prev);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const deleteBooking = useCallback(async (id: string) => {
    if (!window.confirm("Delete this booking? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/next-api/bookings/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setBookings(prev => prev.filter(b => b.id !== id));
        setSelected(prev => prev?.id === id ? null : prev);
      }
    } finally {
      setActionLoading(false);
    }
  }, []);

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
    setSearch(""); setStatusFilter("all"); setSourceFilter("all"); setDateFrom(""); setDateTo("");
  };
  const hasHistoryFilters = search || statusFilter !== "all" || sourceFilter !== "all" || dateFrom || dateTo;

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
          {!loading && activeCount > 0 && (
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
          {!loading && history.length > 0 && tab === "history" && (
            <span className={`${styles.tabBadge} ${styles.tabBadgeActive}`}>{history.length}</span>
          )}
        </button>
      </div>

      {/* ── Loading / error ── */}
      {loading && (
        <div className={styles.stateCenter}>
          <span className={styles.spinner} />
          <span>Loading bookings…</span>
        </div>
      )}
      {error && !loading && (
        <div className={styles.stateError}>
          ⚠ {error}
          <button className={styles.retryBtn} onClick={fetchBookings}>Retry</button>
        </div>
      )}

      {/* ══ ACTIVE TAB ══════════════════════════════════════════════════════ */}
      {!loading && !error && tab === "active" && (
        <>
          {/* Search + source filter */}
          <div className={styles.filters}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}>🔍</span>
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
            {(search || sourceFilter !== "all") && (
              <button className={styles.clearBtn} onClick={() => { setSearch(""); setSourceFilter("all"); }}>Clear</button>
            )}
          </div>

          {timeline.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🗓</span>
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
                      <EventCard key={`${ev.booking.id}-${i}`} event={ev} onOpen={setSelected} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══ HISTORY TAB ═════════════════════════════════════════════════════ */}
      {!loading && !error && tab === "history" && (
        <>
          {/* Full filter bar */}
          <div className={styles.filters}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}>🔍</span>
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
            <label className={styles.dateField}>
              <span className={styles.dateFieldLabel}>From</span>
              <input type="date" className={styles.dateInput} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </label>
            <label className={styles.dateField}>
              <span className={styles.dateFieldLabel}>To</span>
              <input type="date" className={styles.dateInput} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </label>
            {hasHistoryFilters && <button className={styles.clearBtn} onClick={clearHistoryFilters}>Clear filters</button>}
          </div>

          {history.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📅</span>
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
                      onClick={() => setSelected(b)}
                      tabIndex={0}
                      onKeyDown={e => e.key === "Enter" && setSelected(b)}
                    >
                      <td>
                        <div className={styles.carCell}>
                          <div className={styles.carThumb}>
                            {b.car?.photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`/next-api/cars/${b.car.id}/photo`} alt="" className={styles.carImg} loading="lazy" />
                            ) : (
                              <span className={styles.carFallback}>🚗</span>
                            )}
                          </div>
                          <span className={styles.carName}>{b.car?.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className={styles.mono}>{b.car?.immatriculation ?? "—"}</td>
                      <td className={styles.dateCell}>{fmtDate(b.startDateTime)}</td>
                      <td className={styles.dateCell}>{fmtDate(b.endDateTime)}</td>
                      <td className={styles.center}>{daysDiff(b.startDateTime, b.endDateTime)}</td>
                      <td className={styles.priceCell}>{fmtPrice(b.totalPrice)}</td>
                      <td><SourceBadge source={b.source} /></td>
                      <td><StatusBadge status={b.status} /></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className={styles.rowActions}>
                          {b.status === "pending" && (
                            <button className={styles.iconConfirm} title="Confirm" disabled={actionLoading} onClick={() => updateStatus(b.id, "confirmed")}>✓</button>
                          )}
                          {b.status !== "cancelled" && (
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
          onClose={() => setSelected(null)}
          onConfirm={id => updateStatus(id, "confirmed")}
          onCancel={id  => updateStatus(id, "cancelled")}
          onDelete={deleteBooking}
        />
      )}

      {/* ── Car picker ── */}
      {showCarPicker && (
        <div className={styles.backdrop} onMouseDown={() => setShowCarPicker(false)}>
          <div className={styles.modal} onMouseDown={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Select a vehicle</h2>
              <button className={styles.closeBtn} onClick={() => setShowCarPicker(false)} aria-label="Close">✕</button>
            </div>
            <div className={styles.modalBody}>
              {pickerLoading ? (
                <div className={styles.stateCenter}><span className={styles.spinner} /><span>Loading…</span></div>
              ) : pickerCars.length === 0 ? (
                <p className={styles.pickerEmpty}>No vehicles found.</p>
              ) : (
                <div className={styles.pickerList}>
                  {pickerCars.map(car => (
                    <button key={car.id} className={styles.pickerItem} onClick={() => { setCreateCar(car); setShowCarPicker(false); }}>
                      <div className={styles.pickerCarThumb}>
                        {car.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/next-api/cars/${car.id}/photo`} alt="" className={styles.carImg} />
                        ) : (
                          <span className={styles.carFallback}>🚗</span>
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
          onClose={() => setCreateCar(null)}
          onSaved={() => { setCreateCar(null); fetchBookings(); }}
        />
      )}
    </div>
  );
}
