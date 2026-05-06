"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PricingModal, { type CarPricing } from "./PricingModal";
import { useModalUrl } from "@/hooks/useModalUrl";
import styles from "./PricingCalendar.module.css";

// ── Constants ─────────────────────────────────────────────────────────────────

const CELL_W           = 44;   // px — day column width
const CAR_COL_EXPANDED  = 240;  // px — sticky car-name column (expanded)
const CAR_COL_COLLAPSED =  52;  // px — sticky car-name column (collapsed)

// ── Types ─────────────────────────────────────────────────────────────────────

interface Car {
  id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  immatriculation?: string | null;
  photo?: string | null;
  basePricePerDay?: number | string | null;
  basePricePerWeekendDay?: number | string | null;
}

interface DayInfo {
  date: string;       // YYYY-MM-DD
  dayOfMonth: number;
  weekday: string;    // "Mon", "Tue", …
  isWeekend: boolean;
  isToday: boolean;
}

interface MonthGroup {
  key: string;   // YYYY-MM
  label: string; // "May 2026"
  days: number;
}

type ModalState =
  | { mode: "create"; carId: string; startDate: string; endDate: string }
  | { mode: "edit";   carId: string; pricing: CarPricing };

interface CalendarBooking {
  id: string;
  carId: string;
  startDate: string;      // YYYY-MM-DD  (calendar range logic)
  endDate: string;        // YYYY-MM-DD
  startDateTime: string;  // full ISO (popover display)
  endDateTime: string;
  status: "pending_payment" | "pending" | "confirmed" | "cancelled";
  user?: { id: string; name: string } | null;
  source: "private" | "turo" | "getaround";
}

interface BookingBarInfo {
  booking: CalendarBooking;
  spanDays: number;
  stackIndex: number;
  isRealStart: boolean; // bar begins at the true booking start (not clamped)
  isRealEnd: boolean;   // bar ends at the true booking end
}

interface BookingPopoverState {
  booking: CalendarBooking;
  anchorX: number;
  anchorY: number;
}

// ── Colors ────────────────────────────────────────────────────────────────────

const PALETTE = [
  { bg: "rgba(59,130,246,0.28)",  border: "#3b82f6", label: "#1d4ed8"  },
  { bg: "rgba(139,92,246,0.28)",  border: "#8b5cf6", label: "#6d28d9"  },
  { bg: "rgba(236,72,153,0.28)",  border: "#ec4899", label: "#be185d"  },
  { bg: "rgba(245,158,11,0.28)",  border: "#f59e0b", label: "#92400e"  },
  { bg: "rgba(16,185,129,0.28)",  border: "#10b981", label: "#065f46"  },
  { bg: "rgba(6,182,212,0.28)",   border: "#06b6d4", label: "#0e7490"  },
  { bg: "rgba(249,115,22,0.28)",  border: "#f97316", label: "#9a3412"  },
  { bg: "rgba(132,204,22,0.28)",  border: "#84cc16", label: "#3f6212"  },
];

function colorForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function bookingBgColor(status: CalendarBooking["status"]): string {
  if (status === "confirmed")        return "rgba(16, 185, 129, 0.82)";
  if (status === "pending")          return "rgba(245, 158, 11, 0.82)";
  if (status === "pending_payment")  return "rgba(249, 115, 22, 0.82)";
  return "rgba(107, 114, 128, 0.68)";
}

function bookingSolidColor(status: CalendarBooking["status"]): string {
  if (status === "confirmed")        return "#10b981";
  if (status === "pending")          return "#f59e0b";
  if (status === "pending_payment")  return "#f97316";
  return "#6b7280";
}

function bookingLabel(status: CalendarBooking["status"]): string {
  if (status === "confirmed")        return "Confirmed";
  if (status === "pending")          return "Pending";
  if (status === "pending_payment")  return "Awaiting payment";
  return status;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function addDay(date: string, n = 1): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

function buildCalendar(base: Date, numMonths: number): { days: DayInfo[]; months: MonthGroup[] } {
  const today  = todayStr();
  const days: DayInfo[]      = [];
  const months: MonthGroup[] = [];

  const start = new Date(Date.UTC(base.getFullYear(), base.getMonth(), 1));
  const end   = new Date(Date.UTC(base.getFullYear(), base.getMonth() + numMonths, 1));

  let cur      = new Date(start);
  let curMonth: MonthGroup | null = null;

  while (cur < end) {
    const date     = cur.toISOString().slice(0, 10);
    const monthKey = date.slice(0, 7);

    if (!curMonth || curMonth.key !== monthKey) {
      if (curMonth) months.push(curMonth);
      curMonth = {
        key:   monthKey,
        label: cur.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
        days:  0,
      };
    }

    curMonth.days++;
    const dow = cur.getUTCDay();
    days.push({
      date,
      dayOfMonth: cur.getUTCDate(),
      weekday:    ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dow],
      isWeekend:  dow === 0 || dow === 6,
      isToday:    date === today,
    });

    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  if (curMonth) months.push(curMonth);

  return { days, months };
}

// ── Cell component (memoised) ─────────────────────────────────────────────────

interface CellProps {
  date: string;
  carId: string;
  pricing: CarPricing | null;
  fallbackPrice: number | null; // base or weekend rate when no specific pricing rule
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  isWeekend: boolean;
  isToday: boolean;
  bookingBars: BookingBarInfo[];
  onDown: (carId: string, date: string, pricing: CarPricing | null, e: React.MouseEvent) => void;
  onEnter: (carId: string, date: string) => void;
  onBookingClick: (booking: CalendarBooking, e: React.MouseEvent) => void;
}

const Cell = React.memo(function Cell({
  date, carId, pricing, fallbackPrice, isFirst, isLast, isSelected,
  isWeekend, isToday, bookingBars, onDown, onEnter, onBookingClick,
}: CellProps) {
  const color = pricing ? colorForId(pricing.id) : null;
  const title = pricing
    ? `€${Number(pricing.pricePerDay).toFixed(2)}/day${pricing.label ? ` · ${pricing.label}` : ""}\n${pricing.startDate} → ${pricing.endDate}`
    : fallbackPrice !== null
      ? `${isWeekend ? "Weekend rate" : "Base rate"}: €${fallbackPrice.toFixed(2)}/day`
      : date;

  return (
    <div
      className={[
        styles.cell,
        isSelected                          ? styles.cellSel      : "",
        isWeekend                           ? styles.cellWeekend  : "",
        isToday                             ? styles.cellToday    : "",
        pricing                             ? styles.cellPriced   : "",
        !pricing && fallbackPrice !== null  ? styles.cellFallback : "",
      ].filter(Boolean).join(" ")}
      style={!isSelected && color ? {
        background:  color.bg,
        borderLeft:  isFirst ? `2px solid ${color.border}` : undefined,
        borderRight: isLast  ? `2px solid ${color.border}` : undefined,
      } : undefined}
      title={title}
      onMouseDown={(e) => onDown(carId, date, pricing, e)}
      onMouseEnter={() => onEnter(carId, date)}
    >
      {isFirst && pricing && color && (
        <span className={styles.cellBadge} style={{ color: color.label }}>
          €{Number(pricing.pricePerDay).toFixed(2)}
          {pricing.label ? <span className={styles.cellBadgeLabel}> {pricing.label}</span> : null}
        </span>
      )}
      {!pricing && fallbackPrice !== null && (
        <span className={styles.cellBadgeFallback}>
          €{fallbackPrice.toFixed(2)}
        </span>
      )}

      {bookingBars.map(({ booking, spanDays, stackIndex, isRealStart, isRealEnd }) => {
        const bg    = bookingBgColor(booking.status);
        const solid = bookingSolidColor(booking.status);
        return (
          <div
            key={booking.id}
            className={styles.bookingBarWrap}
            style={{
              width:  `${spanDays * CELL_W - 2}px`,
              bottom: `${6 + stackIndex * 12}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => onBookingClick(booking, e)}
          >
            <div className={styles.bookingBar} style={{ background: bg }} />
            {isRealStart && (
              <span className={styles.bookingDotStart} style={{ background: solid }} />
            )}
            {isRealEnd && (
              <span className={styles.bookingDotEnd} style={{ background: solid }} />
            )}
          </div>
        );
      })}
    </div>
  );
});

// ── Car row (memoised) ────────────────────────────────────────────────────────

interface CarRowProps {
  car:                    Car;
  days:                   DayInfo[];
  dayMap:                 Record<string, CarPricing>;
  basePricePerDay:        number | string | null;
  basePricePerWeekendDay: number | string | null;
  selCarId:               string | null;
  selStart:               string | null;
  selEnd:                 string | null;
  carBookings:            CalendarBooking[];
  collapsed:              boolean;
  onDown:                 CellProps["onDown"];
  onEnter:                CellProps["onEnter"];
  onBookingClick:         CellProps["onBookingClick"];
}

const CarRow = React.memo(function CarRow({
  car, days, dayMap, basePricePerDay, basePricePerWeekendDay,
  selCarId, selStart, selEnd,
  carBookings, collapsed, onDown, onEnter, onBookingClick,
}: CarRowProps) {
  const label    = [car.brand, car.model].filter(Boolean).join(" ") || car.name;
  const firstDay = days[0]?.date ?? "";
  const lastDay  = days[days.length - 1]?.date ?? "";

  const bookingBarStarts = useMemo<Record<string, BookingBarInfo[]>>(() => {
    const map: Record<string, BookingBarInfo[]> = {};
    const sorted   = [...carBookings].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const assigned: Array<{ start: string; end: string; level: number }> = [];

    for (const booking of sorted) {
      if (booking.endDate < firstDay || booking.startDate > lastDay) continue;

      const usedLevels = new Set(
        assigned
          .filter(a => a.start <= booking.endDate && a.end >= booking.startDate)
          .map(a => a.level),
      );
      let level = 0;
      while (usedLevels.has(level)) level++;
      assigned.push({ start: booking.startDate, end: booking.endDate, level });

      const visibleStart = booking.startDate >= firstDay ? booking.startDate : firstDay;
      const visibleEnd   = booking.endDate   <= lastDay  ? booking.endDate   : lastDay;
      let spanDays = 0;
      let d = visibleStart;
      while (d <= visibleEnd) { spanDays++; d = addDay(d); }

      (map[visibleStart] ??= []).push({
        booking,
        spanDays,
        stackIndex: level,
        isRealStart: booking.startDate >= firstDay,
        isRealEnd:   booking.endDate   <= lastDay,
      });
    }
    return map;
  }, [carBookings, firstDay, lastDay]);

  return (
    <>
      <div
        className={`${styles.carName} ${collapsed ? styles.carNameCollapsed : ""}`}
        title={`${label}${car.immatriculation ? ` · ${car.immatriculation}` : ""}`}
      >
        <div className={styles.carThumb}>
          {car.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/next-api/cars/${car.id}/photo`}
              alt=""
              className={styles.carThumbImg}
              loading="lazy"
            />
          ) : (
            <span className={styles.carThumbPlaceholder}>🚗</span>
          )}
        </div>
        <div className={`${styles.carInfo} ${collapsed ? styles.carInfoHidden : ""}`}>
          <span className={styles.carInfoName}>{label}</span>
          {car.immatriculation && (
            <span className={styles.carInfoImmat}>{car.immatriculation}</span>
          )}
        </div>
      </div>
      {days.map((d) => {
        const pricing    = dayMap[d.date] ?? null;
        const isFirst    = pricing?.startDate === d.date;
        const isLast     = pricing?.endDate   === d.date;
        const [lo, hi]   = selStart && selEnd && selStart <= selEnd
          ? [selStart, selEnd] : [selEnd ?? "", selStart ?? ""];
        const isSelected = selCarId === car.id && d.date >= lo && d.date <= hi;

        // Fallback: weekend base price → weekday base price → null (no display)
        // Coerce to Number — the API may return these as strings.
        const rawFallback = pricing ? null
          : d.isWeekend && basePricePerWeekendDay != null ? basePricePerWeekendDay
          : basePricePerDay ?? null;
        const fallbackPrice = rawFallback != null ? Number(rawFallback) : null;

        return (
          <Cell
            key={d.date}
            date={d.date}
            carId={car.id}
            pricing={pricing}
            fallbackPrice={fallbackPrice}
            isFirst={isFirst}
            isLast={isLast}
            isSelected={isSelected}
            isWeekend={d.isWeekend}
            isToday={d.isToday}
            bookingBars={bookingBarStarts[d.date] ?? []}
            onDown={onDown}
            onEnter={onEnter}
            onBookingClick={onBookingClick}
          />
        );
      })}
    </>
  );
});

// ── Main component ────────────────────────────────────────────────────────────

const NUM_MONTHS = 3;

export default function PricingCalendar() {
  // ─ Data
  const [cars,     setCars]     = useState<Car[]>([]);
  const [pricings, setPricings] = useState<Record<string, CarPricing[]>>({});
  const [bookings, setBookings] = useState<Record<string, CalendarBooking[]>>({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // ─ View
  const [baseDate, setBaseDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // ─ Drag selection
  const [dragging,  setDragging]  = useState(false);
  const [dragCarId, setDragCarId] = useState<string | null>(null);
  const [selStart,  setSelStart]  = useState<string | null>(null);
  const [selEnd,    setSelEnd]    = useState<string | null>(null);

  // ─ Pricing modal
  const [modal, setModal] = useState<ModalState | null>(null);
  const { openModal, closeModal } = useModalUrl();

  // ─ Booking popover
  const [bookingPopover, setBookingPopover] = useState<BookingPopoverState | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // ─ Sidebar collapse (persisted in localStorage)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ─ Derived
  const { days, months } = useMemo(() => buildCalendar(baseDate, NUM_MONTHS), [baseDate]);

  const pricingMaps = useMemo(() => {
    const out: Record<string, Record<string, CarPricing>> = {};
    for (const carId of Object.keys(pricings)) {
      const map: Record<string, CarPricing> = {};
      for (const p of pricings[carId] ?? []) {
        let d = p.startDate;
        while (d <= p.endDate) { map[d] = p; d = addDay(d); }
      }
      out[carId] = map;
    }
    return out;
  }, [pricings]);

  // ─ Fetch
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const carsRes = await fetch("/next-api/cars", { cache: "no-store" });
        if (!carsRes.ok) throw new Error("Failed to load cars");
        const carsData: Car[] = await carsRes.json();
        if (cancelled) return;
        setCars(carsData);

        const [pricingResults, rawBookings] = await Promise.all([
          Promise.all(
            carsData.map(async (c) => {
              try {
                const r = await fetch(`/next-api/cars/${c.id}/pricings`, { cache: "no-store" });
                return [c.id, r.ok ? await r.json() : []] as [string, CarPricing[]];
              } catch {
                return [c.id, []] as [string, CarPricing[]];
              }
            }),
          ),
          fetch("/next-api/bookings", { cache: "no-store" })
            .then(r => r.ok ? r.json() : [])
            .catch(() => []),
        ]);
        if (cancelled) return;
        setPricings(Object.fromEntries(pricingResults));

        const grouped: Record<string, CalendarBooking[]> = {};
        for (const b of rawBookings as Array<{
          id: string; carId: string; startDateTime: string; endDateTime: string;
          status: string; source: string;
          user?: { id: string; name: string } | null;
        }>) {
          const cb: CalendarBooking = {
            id:            b.id,
            carId:         b.carId,
            startDate:     b.startDateTime.slice(0, 10),
            endDate:       b.endDateTime.slice(0, 10),
            startDateTime: b.startDateTime,
            endDateTime:   b.endDateTime,
            status:        b.status as CalendarBooking["status"],
            user:          b.user ?? null,
            source:        b.source as CalendarBooking["source"],
          };
          (grouped[cb.carId] ??= []).push(cb);
        }
        setBookings(grouped);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const pendingPricingEditRef = useRef<{ carId: string; pricingId: string } | null>(null);

  useEffect(() => {
    const sp    = new URLSearchParams(window.location.search);
    const mName = sp.get("modal");
    if (mName === "pricing-create") {
      const carId     = sp.get("carId");
      const startDate = sp.get("from");
      const endDate   = sp.get("to");
      if (carId && startDate && endDate) setModal({ mode: "create", carId, startDate, endDate });
    } else if (mName === "pricing-edit") {
      const carId     = sp.get("carId");
      const pricingId = sp.get("pricingId");
      if (carId && pricingId) pendingPricingEditRef.current = { carId, pricingId };
    }
  }, []);

  // Load sidebar collapse preference (client-only to avoid hydration mismatch)
  useEffect(() => {
    try {
      if (localStorage.getItem("pricing-sidebar-collapsed") === "1") setSidebarCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (loading || !pendingPricingEditRef.current) return;
    const { carId, pricingId } = pendingPricingEditRef.current;
    const pricing = (pricings[carId] ?? []).find(p => p.id === pricingId);
    if (pricing) {
      setModal({ mode: "edit", carId, pricing });
      pendingPricingEditRef.current = null;
    }
  }, [loading, pricings]);

  // ─ Close booking popover on outside click or Escape
  useEffect(() => {
    if (!bookingPopover) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setBookingPopover(null); };
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setBookingPopover(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [bookingPopover]);

  // ─ Mouse up (drag release → open pricing create modal)
  useEffect(() => {
    if (!dragging) return;
    const up = () => {
      if (dragCarId && selStart && selEnd) {
        const [s, e] = selStart <= selEnd ? [selStart, selEnd] : [selEnd, selStart];
        setModal({ mode: "create", carId: dragCarId, startDate: s, endDate: e });
        openModal("pricing-create", { carId: dragCarId, from: s, to: e });
      }
      setDragging(false);
      setDragCarId(null);
      setSelStart(null);
      setSelEnd(null);
    };
    document.addEventListener("mouseup", up);
    return () => document.removeEventListener("mouseup", up);
  }, [dragging, dragCarId, selStart, selEnd, openModal]);

  // ─ Callbacks
  const handleCellDown = useCallback((
    carId: string, date: string, pricing: CarPricing | null, e: React.MouseEvent,
  ) => {
    e.preventDefault();
    if (pricing) {
      setModal({ mode: "edit", carId, pricing });
      openModal("pricing-edit", { carId, pricingId: pricing.id });
      return;
    }
    setDragging(true);
    setDragCarId(carId);
    setSelStart(date);
    setSelEnd(date);
  }, [openModal]);

  const handleCellEnter = useCallback((carId: string, date: string) => {
    if (!dragging || dragCarId !== carId) return;
    setSelEnd(date);
  }, [dragging, dragCarId]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("pricing-sidebar-collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);

  const handleBookingClick = useCallback((booking: CalendarBooking, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookingPopover(prev =>
      prev?.booking.id === booking.id ? null : { booking, anchorX: e.clientX, anchorY: e.clientY },
    );
  }, []);

  const getOverlaps = useCallback((
    carId: string, startDate: string, endDate: string, excludeId?: string,
  ) => {
    return (pricings[carId] ?? []).filter(
      (p) => p.id !== excludeId && p.startDate <= endDate && p.endDate >= startDate,
    );
  }, [pricings]);

  // ─ CRUD
  const handleSave = useCallback(async (data: {
    startDate: string; endDate: string; pricePerDay: number; label: string | null;
  }) => {
    if (!modal) return;
    if (modal.mode === "create") {
      const res = await fetch(`/next-api/cars/${modal.carId}/pricings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, carId: modal.carId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d?.message ?? "Save failed"); }
      const created: CarPricing = await res.json();
      setPricings((prev) => ({
        ...prev,
        [modal.carId]: [...(prev[modal.carId] ?? []), created],
      }));
    } else {
      const res = await fetch(
        `/next-api/cars/${modal.carId}/pricings/${modal.pricing.id}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) },
      );
      if (!res.ok) { const d = await res.json(); throw new Error(d?.message ?? "Save failed"); }
      const updated: CarPricing = await res.json();
      setPricings((prev) => ({
        ...prev,
        [modal.carId]: (prev[modal.carId] ?? []).map((p) => p.id === updated.id ? updated : p),
      }));
    }
    setModal(null);
    closeModal();
  }, [modal, closeModal]);

  const handleDelete = useCallback(async () => {
    if (!modal || modal.mode !== "edit") return;
    const res = await fetch(
      `/next-api/cars/${modal.carId}/pricings/${modal.pricing.id}`,
      { method: "DELETE" },
    );
    if (!res.ok && res.status !== 204) throw new Error("Delete failed");
    setPricings((prev) => ({
      ...prev,
      [modal.carId]: (prev[modal.carId] ?? []).filter((p) => p.id !== modal.pricing.id),
    }));
    setModal(null);
    closeModal();
  }, [modal, closeModal]);

  // ─ Navigation
  const shift     = (n: number) =>
    setBaseDate((d) => new Date(Date.UTC(d.getFullYear(), d.getMonth() + n, 1)));
  const jumpToday = () => {
    const d = new Date();
    setBaseDate(new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)));
  };

  // ─ Render
  const numDays  = days.length;
  const carColW  = sidebarCollapsed ? CAR_COL_COLLAPSED : CAR_COL_EXPANDED;
  const gridCols = `var(--car-col-w) repeat(${numDays}, ${CELL_W}px)`;

  // Popover position: above cursor, clamped so it doesn't bleed off-screen
  const popoverStyle = bookingPopover ? (() => {
    const GAP     = 12;
    const W       = 260;
    const x       = Math.min(bookingPopover.anchorX + GAP, (typeof window !== "undefined" ? window.innerWidth : 800) - W - 8);
    const y       = bookingPopover.anchorY;
    return { left: x, top: y } as React.CSSProperties;
  })() : undefined;

  return (
    <div className={styles.root}>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h1 className={styles.pageTitle}>Pricing calendar</h1>
          <span className={styles.hint}>Drag to create a pricing rule · Click a range to edit · Click a booking to inspect</span>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.navBtn} onClick={() => shift(-1)} title="Previous period">‹</button>
          <button className={styles.todayBtn} onClick={jumpToday}>Today</button>
          <button className={styles.navBtn} onClick={() => shift(1)}  title="Next period">›</button>
          <span className={styles.periodLabel}>
            {months[0]?.label.split(" ")[1]} · {months[0]?.label.split(" ")[0]}
            {months.length > 1 ? ` → ${months[months.length - 1]?.label.split(" ")[0]}` : ""}
          </span>
        </div>
      </div>

      {/* Loading / error */}
      {loading && (
        <div className={styles.state}>
          <span className={styles.spinner} />
          <span>Loading…</span>
        </div>
      )}
      {error && !loading && (
        <div className={styles.stateError}>
          <span>⚠ {error}</span>
          <button onClick={() => window.location.reload()} className={styles.retryBtn}>Retry</button>
        </div>
      )}

      {/* Calendar grid */}
      {!loading && !error && (
        <div className={`${styles.scrollWrap} ${dragging ? styles.dragging : ""}`}>
          <div
            className={styles.grid}
            style={{ '--car-col-w': `${carColW}px`, gridTemplateColumns: gridCols } as React.CSSProperties}
          >

            {/* ── Row 0: Month headers ── */}
            <div className={`${styles.cornerA} ${sidebarCollapsed ? styles.cornerACollapsed : ""}`}>
              <span className={`${styles.cornerALabel} ${sidebarCollapsed ? styles.cornerALabelHidden : ""}`}>
                Cars
              </span>
              <button
                className={styles.collapseBtn}
                onClick={toggleSidebar}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <span className={`${styles.chevron} ${sidebarCollapsed ? styles.chevronCollapsed : ""}`}>‹</span>
              </button>
            </div>
            {months.map((m) => (
              <div key={m.key} className={styles.monthHeader} style={{ gridColumn: `span ${m.days}` }}>
                {m.label}
              </div>
            ))}

            {/* ── Row 1: Day headers ── */}
            <div className={styles.cornerB} />
            {days.map((d) => (
              <div
                key={d.date}
                className={[
                  styles.dayHeader,
                  d.isWeekend ? styles.dayWeekend : "",
                  d.isToday   ? styles.dayToday   : "",
                ].filter(Boolean).join(" ")}
                title={d.date}
              >
                <span className={styles.dayWkd}>{d.weekday}</span>
                <span className={styles.dayNum}>{d.dayOfMonth}</span>
              </div>
            ))}

            {/* ── Car rows ── */}
            {cars.length === 0 && !loading && (
              <div className={styles.emptyMsg} style={{ gridColumn: `span ${numDays + 1}` }}>
                No cars found. Add cars in the Fleet section first.
              </div>
            )}
            {cars.map((car) => (
              <CarRow
                key={car.id}
                car={car}
                days={days}
                dayMap={pricingMaps[car.id] ?? {}}
                basePricePerDay={car.basePricePerDay ?? null}
                basePricePerWeekendDay={car.basePricePerWeekendDay ?? null}
                selCarId={dragCarId}
                selStart={selStart}
                selEnd={selEnd}
                carBookings={bookings[car.id] ?? []}
                collapsed={sidebarCollapsed}
                onDown={handleCellDown}
                onEnter={handleCellEnter}
                onBookingClick={handleBookingClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      {!loading && !error && cars.length > 0 && (
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: "rgba(141,194,32,0.3)", border: "2px solid #84cc16" }} />
            Pricing rule
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: "rgba(var(--rgb-brand-accent),0.18)", outline: "1.5px solid var(--color-brand-accent)" }} />
            Selection
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: "rgba(var(--rgb-brand-primary),0.12)", border: "1px solid var(--color-brand-primary)" }} />
            Today
          </span>
          <span className={styles.legendDivider} />
          <span className={styles.legendItem}>
            <span className={styles.legendBar} style={{ background: "rgba(16,185,129,0.82)" }} />
            Confirmed
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendBar} style={{ background: "rgba(245,158,11,0.82)" }} />
            Pending
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendBar} style={{ background: "rgba(249,115,22,0.82)" }} />
            Awaiting payment
          </span>
        </div>
      )}

      {/* Booking popover */}
      {bookingPopover && (
        <div
          ref={popoverRef}
          className={styles.bookingPopover}
          style={popoverStyle}
        >
          <div className={styles.popoverHeader}>
            <span
              className={styles.popoverStatus}
              style={{
                background: `${bookingSolidColor(bookingPopover.booking.status)}22`,
                color:       bookingSolidColor(bookingPopover.booking.status),
                borderColor: `${bookingSolidColor(bookingPopover.booking.status)}44`,
              }}
            >
              {bookingLabel(bookingPopover.booking.status)}
            </span>
            <button
              className={styles.popoverClose}
              onClick={() => setBookingPopover(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <p className={styles.popoverCustomer}>
            {bookingPopover.booking.user?.name ?? "Unknown guest"}
          </p>

          <div className={styles.popoverDates}>
            <div className={styles.popoverDateRow}>
              <span className={styles.popoverDateLabel}>Start</span>
              <span className={styles.popoverDateVal}>{formatDateTime(bookingPopover.booking.startDateTime)}</span>
            </div>
            <div className={styles.popoverDateRow}>
              <span className={styles.popoverDateLabel}>End</span>
              <span className={styles.popoverDateVal}>{formatDateTime(bookingPopover.booking.endDateTime)}</span>
            </div>
          </div>

          <div className={styles.popoverSource}>
            via {bookingPopover.booking.source}
          </div>
        </div>
      )}

      {/* Pricing modal */}
      {modal && (
        <PricingModal
          mode={modal.mode}
          carName={cars.find((c) => c.id === modal.carId)?.name ?? ""}
          carId={modal.carId}
          startDate={modal.mode === "create" ? modal.startDate : modal.pricing.startDate}
          endDate={modal.mode === "create"   ? modal.endDate   : modal.pricing.endDate}
          pricing={modal.mode === "edit"     ? modal.pricing   : undefined}
          overlaps={getOverlaps(
            modal.carId,
            modal.mode === "create" ? modal.startDate : modal.pricing.startDate,
            modal.mode === "create" ? modal.endDate   : modal.pricing.endDate,
            modal.mode === "edit"   ? modal.pricing.id : undefined,
          )}
          onSave={handleSave}
          onDelete={modal.mode === "edit" ? handleDelete : undefined}
          onClose={() => { setModal(null); closeModal(); }}
        />
      )}
    </div>
  );
}
