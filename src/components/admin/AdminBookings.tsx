"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import styles from "./AdminBookings.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookingCar {
  id: string;
  name: string;
  photo: string | null;
  immatriculation: string;
}

export interface AdminBooking {
  id: string;
  carId: string;
  car: BookingCar | null;
  startDate: string;
  endDate: string;
  totalPrice: number | string;
  status: "pending" | "confirmed" | "cancelled";
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = "all" | "pending" | "confirmed" | "cancelled";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysDiff(start: string, end: string): number {
  const ms = new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

function fmtDate(d: string): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtPrice(p: number | string): string {
  return `€${Number(p).toFixed(2)}`;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AdminBooking["status"] }) {
  return (
    <span className={`${styles.badge} ${styles[`badge_${status}`]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
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
  const duration = daysDiff(booking.startDate, booking.endDate);
  const pricePerDay = Number(booking.totalPrice) / duration;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
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
          {/* Car */}
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

          {/* Price summary */}
          <div className={styles.priceSummary}>
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Pick-up</span>
              <span className={styles.priceValue}>{fmtDate(booking.startDate)}</span>
            </div>
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Return</span>
              <span className={styles.priceValue}>{fmtDate(booking.endDate)}</span>
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

          {/* Customer info */}
          {(booking.customerName || booking.customerEmail || booking.customerPhone) && (
            <div className={styles.customerSection}>
              <p className={styles.sectionLabel}>Customer</p>
              {booking.customerName  && <p className={styles.customerRow}><span>Name</span>{booking.customerName}</p>}
              {booking.customerEmail && <p className={styles.customerRow}><span>Email</span>{booking.customerEmail}</p>}
              {booking.customerPhone && <p className={styles.customerRow}><span>Phone</span>{booking.customerPhone}</p>}
            </div>
          )}

          {/* Timestamps */}
          <div className={styles.timestamps}>
            <p>Created {fmtDateTime(booking.createdAt)}</p>
            {booking.updatedAt !== booking.createdAt && (
              <p>Updated {fmtDateTime(booking.updatedAt)}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.modalActions}>
          {booking.status === "pending" && (
            <button
              className={styles.actionConfirm}
              onClick={() => onConfirm(booking.id)}
              disabled={actionLoading}
            >
              Confirm booking
            </button>
          )}
          {booking.status !== "cancelled" && (
            <button
              className={styles.actionCancel}
              onClick={() => onCancel(booking.id)}
              disabled={actionLoading}
            >
              Cancel
            </button>
          )}
          <button
            className={styles.actionDelete}
            onClick={() => onDelete(booking.id)}
            disabled={actionLoading}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminBookings() {
  const [bookings,      setBookings]      = useState<AdminBooking[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>("all");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [selected,      setSelected]      = useState<AdminBooking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFrom) params.set("startDate", dateFrom);
      if (dateTo)   params.set("endDate",   dateTo);
      const qs  = params.toString();
      const res = await fetch(`/next-api/bookings${qs ? `?${qs}` : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setBookings(await res.json());
    } catch {
      setError("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // ── Client-side search ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return bookings;
    return bookings.filter((b) =>
      b.car?.name?.toLowerCase().includes(q) ||
      b.car?.immatriculation?.toLowerCase().includes(q) ||
      b.customerName?.toLowerCase().includes(q) ||
      b.customerEmail?.toLowerCase().includes(q),
    );
  }, [bookings, search]);

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
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: updated.status } : b));
      setSelected((prev) => prev?.id === id ? { ...prev, status: updated.status } : prev);
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
        setBookings((prev) => prev.filter((b) => b.id !== id));
        setSelected((prev) => prev?.id === id ? null : prev);
      }
    } finally {
      setActionLoading(false);
    }
  }, []);

  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setDateFrom(""); setDateTo("");
  };
  const hasFilters = search || statusFilter !== "all" || dateFrom || dateTo;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Bookings</h1>
        {!loading && (
          <span className={styles.count}>
            {filtered.length} / {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Car, plate or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <label className={styles.dateField}>
          <span className={styles.dateFieldLabel}>From</span>
          <input
            type="date"
            className={styles.dateInput}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className={styles.dateField}>
          <span className={styles.dateFieldLabel}>To</span>
          <input
            type="date"
            className={styles.dateInput}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>

        {hasFilters && (
          <button className={styles.clearBtn} onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {/* States */}
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

      {!loading && !error && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📅</span>
          <p className={styles.emptyMsg}>No bookings found</p>
          {hasFilters && (
            <p className={styles.emptyHint}>Try adjusting your filters</p>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
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
                <th>Status</th>
                <th className={styles.center}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  className={styles.row}
                  onClick={() => setSelected(b)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setSelected(b)}
                >
                  {/* Vehicle */}
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
                  <td className={styles.dateCell}>{fmtDate(b.startDate)}</td>
                  <td className={styles.dateCell}>{fmtDate(b.endDate)}</td>
                  <td className={styles.center}>{daysDiff(b.startDate, b.endDate)}</td>
                  <td className={styles.priceCell}>{fmtPrice(b.totalPrice)}</td>

                  <td><StatusBadge status={b.status} /></td>

                  {/* Row actions */}
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className={styles.rowActions}>
                      {b.status === "pending" && (
                        <button
                          className={styles.iconConfirm}
                          title="Confirm"
                          disabled={actionLoading}
                          onClick={() => updateStatus(b.id, "confirmed")}
                        >✓</button>
                      )}
                      {b.status !== "cancelled" && (
                        <button
                          className={styles.iconCancel}
                          title="Cancel"
                          disabled={actionLoading}
                          onClick={() => updateStatus(b.id, "cancelled")}
                        >✗</button>
                      )}
                      <button
                        className={styles.iconDelete}
                        title="Delete"
                        disabled={actionLoading}
                        onClick={() => deleteBooking(b.id)}
                      >⊗</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <BookingModal
          booking={selected}
          actionLoading={actionLoading}
          onClose={() => setSelected(null)}
          onConfirm={(id) => updateStatus(id, "confirmed")}
          onCancel={(id)  => updateStatus(id, "cancelled")}
          onDelete={deleteBooking}
        />
      )}
    </div>
  );
}
