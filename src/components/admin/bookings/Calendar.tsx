"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CalendarEntryModal, { type AvailabilityBlock, type CalendarEntryMode } from "./CalendarEntryModal";
import type { CarPricing } from "../fleet/PricingModal";
import { useModalUrl } from "@/hooks/useModalUrl";
import { useBusinessTz } from "@/contexts/TzContext";
import { todayStr as todayStrUtil, fmtDateTime } from "@/lib/dateUtils";
import { Car as CarIcon, X, AlertTriangle } from "lucide-react";
import styles from "./Calendar.module.css";

// ── Constants ─────────────────────────────────────────────────────────────────

const CELL_W            = 44;
const CAR_COL_EXPANDED  = 240;
const CAR_COL_COLLAPSED = 52;

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
  date: string;
  dayOfMonth: number;
  weekday: string;
  isWeekend: boolean;
  isToday: boolean;
}

interface MonthGroup {
  key: string;
  label: string;
  days: number;
}

interface CalendarBooking {
  id: string;
  carId: string;
  startDate: string;
  endDate: string;
  startDateTime: string;
  endDateTime: string;
  status: "pending_payment" | "pending" | "confirmed" | "cancelled";
  user?: { id: string; name: string } | null;
  source: "private" | "turo" | "getaround";
}

interface BookingBarInfo {
  booking: CalendarBooking;
  spanDays: number;
  stackIndex: number;
  isRealStart: boolean;
  isRealEnd: boolean;
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
  if (status === "confirmed")       return "rgba(16, 185, 129, 0.82)";
  if (status === "pending")         return "rgba(245, 158, 11, 0.82)";
  if (status === "pending_payment") return "rgba(249, 115, 22, 0.82)";
  return "rgba(107, 114, 128, 0.68)";
}

function bookingSolidColor(status: CalendarBooking["status"]): string {
  if (status === "confirmed")       return "#10b981";
  if (status === "pending")         return "#f59e0b";
  if (status === "pending_payment") return "#f97316";
  return "#6b7280";
}

function bookingLabel(status: CalendarBooking["status"]): string {
  if (status === "confirmed")       return "Confirmed";
  if (status === "pending")         return "Pending";
  if (status === "pending_payment") return "Awaiting payment";
  return status;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function addDay(date: string, n = 1): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}


function buildCalendar(base: Date, numMonths: number, tz: string): { days: DayInfo[]; months: MonthGroup[] } {
  const today  = todayStrUtil(tz);
  const days: DayInfo[]      = [];
  const months: MonthGroup[] = [];
  const start = new Date(Date.UTC(base.getFullYear(), base.getMonth(), 1));
  const end   = new Date(Date.UTC(base.getFullYear(), base.getMonth() + numMonths, 1));
  let cur = new Date(start);
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
      weekday: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dow],
      isWeekend: dow === 0 || dow === 6,
      isToday: date === today,
    });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  if (curMonth) months.push(curMonth);
  return { days, months };
}

// ── Cell component ────────────────────────────────────────────────────────────

interface CellProps {
  date: string;
  carId: string;
  pricing: CarPricing | null;
  availBlock: AvailabilityBlock | null;
  fallbackPrice: number | null;
  isFirst: boolean;
  isLast: boolean;
  isAvailFirst: boolean;
  isAvailLast: boolean;
  isSelected: boolean;
  isWeekend: boolean;
  isToday: boolean;
  bookingBars: BookingBarInfo[];
  onDown: (carId: string, date: string, pricing: CarPricing | null, availBlock: AvailabilityBlock | null, e: React.MouseEvent) => void;
  onEnter: (carId: string, date: string) => void;
  onBookingClick: (booking: CalendarBooking, e: React.MouseEvent) => void;
}

const Cell = React.memo(function Cell({
  date, carId, pricing, availBlock, fallbackPrice, isFirst, isLast,
  isAvailFirst, isAvailLast, isSelected, isWeekend, isToday, bookingBars,
  onDown, onEnter, onBookingClick,
}: CellProps) {
  const color = pricing ? colorForId(pricing.id) : null;
  const title = availBlock
    ? `Unavailable${availBlock.reason ? `: ${availBlock.reason}` : ""}`
    : pricing
      ? `€${Number(pricing.pricePerDay).toFixed(2)}/day${pricing.label ? ` · ${pricing.label}` : ""}\n${pricing.startDate} → ${pricing.endDate}`
      : fallbackPrice !== null
        ? `${isWeekend ? "Weekend rate" : "Base rate"}: €${fallbackPrice.toFixed(2)}/day`
        : date;

  return (
    <div
      className={[
        styles.cell,
        isSelected  ? styles.cellSel      : "",
        isWeekend   ? styles.cellWeekend  : "",
        isToday     ? styles.cellToday    : "",
        pricing     ? styles.cellPriced   : "",
        availBlock  ? styles.cellBlocked  : "",
        !pricing && !availBlock && fallbackPrice !== null ? styles.cellFallback : "",
      ].filter(Boolean).join(" ")}
      style={!isSelected && color && !availBlock ? {
        background:  color.bg,
        borderLeft:  isFirst ? `2px solid ${color.border}` : undefined,
        borderRight: isLast  ? `2px solid ${color.border}` : undefined,
      } : undefined}
      title={title}
      onMouseDown={(e) => onDown(carId, date, pricing, availBlock, e)}
      onMouseEnter={() => onEnter(carId, date)}
    >
      {/* Availability block overlay */}
      {availBlock && (
        <div
          className={[
            styles.availOverlay,
            isAvailFirst ? styles.availOverlayFirst : "",
            isAvailLast  ? styles.availOverlayLast  : "",
          ].filter(Boolean).join(" ")}
          title={title}
        >
          {isAvailFirst && (
            <span className={styles.availBadge}>
              {availBlock.reason ?? "Unavailable"}
            </span>
          )}
        </div>
      )}

      {/* Pricing badge */}
      {isFirst && pricing && color && !availBlock && (
        <span className={styles.cellBadge} style={{ color: color.label }}>
          €{Number(pricing.pricePerDay).toFixed(2)}
          {pricing.label ? <span className={styles.cellBadgeLabel}> {pricing.label}</span> : null}
        </span>
      )}
      {!pricing && !availBlock && fallbackPrice !== null && (
        <span className={styles.cellBadgeFallback}>€{fallbackPrice.toFixed(2)}</span>
      )}

      {/* Booking bars */}
      {bookingBars.map(({ booking, spanDays, stackIndex, isRealStart, isRealEnd }) => {
        const bg    = bookingBgColor(booking.status);
        const solid = bookingSolidColor(booking.status);
        return (
          <div
            key={booking.id}
            className={styles.bookingBarWrap}
            style={{ width: `${spanDays * CELL_W - 2}px`, bottom: `${6 + stackIndex * 12}px` }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => onBookingClick(booking, e)}
          >
            <div className={styles.bookingBar} style={{ background: bg }} />
            {isRealStart && <span className={styles.bookingDotStart} style={{ background: solid }} />}
            {isRealEnd   && <span className={styles.bookingDotEnd}   style={{ background: solid }} />}
          </div>
        );
      })}
    </div>
  );
});

// ── Car row ───────────────────────────────────────────────────────────────────

interface CarRowProps {
  car: Car;
  days: DayInfo[];
  dayMap: Record<string, CarPricing>;
  availDayMap: Record<string, AvailabilityBlock>;
  basePricePerDay: number | string | null;
  basePricePerWeekendDay: number | string | null;
  selCarId: string | null;
  selStart: string | null;
  selEnd: string | null;
  carBookings: CalendarBooking[];
  collapsed: boolean;
  onDown: CellProps["onDown"];
  onEnter: CellProps["onEnter"];
  onBookingClick: CellProps["onBookingClick"];
}

const CarRow = React.memo(function CarRow({
  car, days, dayMap, availDayMap, basePricePerDay, basePricePerWeekendDay,
  selCarId, selStart, selEnd, carBookings, collapsed, onDown, onEnter, onBookingClick,
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
        assigned.filter(a => a.start <= booking.endDate && a.end >= booking.startDate).map(a => a.level),
      );
      let level = 0;
      while (usedLevels.has(level)) level++;
      assigned.push({ start: booking.startDate, end: booking.endDate, level });
      const visibleStart = booking.startDate >= firstDay ? booking.startDate : firstDay;
      const visibleEnd   = booking.endDate   <= lastDay  ? booking.endDate   : lastDay;
      let spanDays = 0; let d = visibleStart;
      while (d <= visibleEnd) { spanDays++; d = addDay(d); }
      (map[visibleStart] ??= []).push({
        booking, spanDays, stackIndex: level,
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
            <img src={`/next-api/cars/${car.id}/photo`} alt="" className={styles.carThumbImg} loading="lazy" />
          ) : (
            <span className={styles.carThumbPlaceholder}><CarIcon size={18} strokeWidth={1.75} /></span>
          )}
        </div>
        <div className={`${styles.carInfo} ${collapsed ? styles.carInfoHidden : ""}`}>
          <span className={styles.carInfoName}>{label}</span>
          {car.immatriculation && <span className={styles.carInfoImmat}>{car.immatriculation}</span>}
        </div>
      </div>
      {days.map((d) => {
        const pricing    = dayMap[d.date]      ?? null;
        const availBlock = availDayMap[d.date] ?? null;
        const isFirst    = pricing?.startDate === d.date;
        const isLast     = pricing?.endDate   === d.date;
        const isAvailFirst = availBlock?.startDate === d.date;
        const isAvailLast  = availBlock?.endDate   === d.date;
        const [lo, hi]   = selStart && selEnd && selStart <= selEnd
          ? [selStart, selEnd] : [selEnd ?? "", selStart ?? ""];
        const isSelected = selCarId === car.id && d.date >= lo && d.date <= hi;
        const rawFallback = pricing ? null
          : d.isWeekend && basePricePerWeekendDay != null ? basePricePerWeekendDay
          : basePricePerDay ?? null;
        const fallbackPrice = rawFallback != null ? Number(rawFallback) : null;
        return (
          <Cell
            key={d.date}
            date={d.date} carId={car.id}
            pricing={pricing} availBlock={availBlock}
            fallbackPrice={fallbackPrice}
            isFirst={isFirst} isLast={isLast}
            isAvailFirst={isAvailFirst} isAvailLast={isAvailLast}
            isSelected={isSelected} isWeekend={d.isWeekend} isToday={d.isToday}
            bookingBars={bookingBarStarts[d.date] ?? []}
            onDown={onDown} onEnter={onEnter} onBookingClick={onBookingClick}
          />
        );
      })}
    </>
  );
});

// ── Main component ────────────────────────────────────────────────────────────

const NUM_MONTHS = 3;

export default function Calendar() {
  const tz = useBusinessTz();
  const [cars,        setCars]        = useState<Car[]>([]);
  const [pricings,    setPricings]    = useState<Record<string, CarPricing[]>>({});
  const [availBlocks, setAvailBlocks] = useState<Record<string, AvailabilityBlock[]>>({});
  const [bookings,    setBookings]    = useState<Record<string, CalendarBooking[]>>({});
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  const [baseDate, setBaseDate] = useState<Date>(() => {
    const d = new Date(); d.setDate(1); return d;
  });

  const [dragging,  setDragging]  = useState(false);
  const [dragCarId, setDragCarId] = useState<string | null>(null);
  const [selStart,  setSelStart]  = useState<string | null>(null);
  const [selEnd,    setSelEnd]    = useState<string | null>(null);

  const [modal, setModal] = useState<CalendarEntryMode | null>(null);
  const { openModal, closeModal } = useModalUrl();

  const [bookingPopover, setBookingPopover] = useState<BookingPopoverState | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { days, months } = useMemo(() => buildCalendar(baseDate, NUM_MONTHS, tz), [baseDate, tz]);

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

  const availMaps = useMemo(() => {
    const out: Record<string, Record<string, AvailabilityBlock>> = {};
    for (const carId of Object.keys(availBlocks)) {
      const map: Record<string, AvailabilityBlock> = {};
      for (const b of availBlocks[carId] ?? []) {
        let d = b.startDate;
        while (d <= b.endDate) { map[d] = b; d = addDay(d); }
      }
      out[carId] = map;
    }
    return out;
  }, [availBlocks]);

  // ─ Fetch
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const carsRes = await fetch("/next-api/cars", { cache: "no-store" });
        if (!carsRes.ok) throw new Error("Failed to load cars");
        const carsData: Car[] = await carsRes.json();
        if (cancelled) return;
        setCars(carsData);

        const [pricingResults, availResults, rawBookings] = await Promise.all([
          Promise.all(carsData.map(async (c) => {
            try {
              const r = await fetch(`/next-api/cars/${c.id}/pricings`, { cache: "no-store" });
              return [c.id, r.ok ? await r.json() : []] as [string, CarPricing[]];
            } catch { return [c.id, []] as [string, CarPricing[]]; }
          })),
          Promise.all(carsData.map(async (c) => {
            try {
              const r = await fetch(`/next-api/cars/${c.id}/availability`, { cache: "no-store" });
              return [c.id, r.ok ? await r.json() : []] as [string, AvailabilityBlock[]];
            } catch { return [c.id, []] as [string, AvailabilityBlock[]]; }
          })),
          fetch("/next-api/bookings", { cache: "no-store" })
            .then(r => r.ok ? r.json() : []).catch(() => []),
        ]);
        if (cancelled) return;
        setPricings(Object.fromEntries(pricingResults));
        setAvailBlocks(Object.fromEntries(availResults));

        const grouped: Record<string, CalendarBooking[]> = {};
        for (const b of rawBookings as Array<{
          id: string; carId: string; startDateTime: string; endDateTime: string;
          status: string; source: string; user?: { id: string; name: string } | null;
        }>) {
          const cb: CalendarBooking = {
            id: b.id, carId: b.carId,
            startDate: b.startDateTime.slice(0, 10), endDate: b.endDateTime.slice(0, 10),
            startDateTime: b.startDateTime, endDateTime: b.endDateTime,
            status: b.status as CalendarBooking["status"],
            user: b.user ?? null, source: b.source as CalendarBooking["source"],
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
  const pendingAvailEditRef   = useRef<{ carId: string; blockId: string } | null>(null);

  useEffect(() => {
    const sp    = new URLSearchParams(window.location.search);
    const mName = sp.get("modal");
    if (mName === "cal-create") {
      const carId = sp.get("carId"), startDate = sp.get("from"), endDate = sp.get("to");
      if (carId && startDate && endDate) setModal({ mode: "create", carId, startDate, endDate });
    } else if (mName === "cal-pricing-edit") {
      const carId = sp.get("carId"), pricingId = sp.get("pricingId");
      if (carId && pricingId) pendingPricingEditRef.current = { carId, pricingId };
    } else if (mName === "avail-edit") {
      const carId = sp.get("carId"), blockId = sp.get("blockId");
      if (carId && blockId) pendingAvailEditRef.current = { carId, blockId };
    }
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem("calendar-sidebar-collapsed") === "1") setSidebarCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (loading) return;
    if (pendingPricingEditRef.current) {
      const { carId, pricingId } = pendingPricingEditRef.current;
      const pricing = (pricings[carId] ?? []).find(p => p.id === pricingId);
      if (pricing) { setModal({ mode: "edit-pricing", carId, pricing }); pendingPricingEditRef.current = null; }
    }
    if (pendingAvailEditRef.current) {
      const { carId, blockId } = pendingAvailEditRef.current;
      const block = (availBlocks[carId] ?? []).find(b => b.id === blockId);
      if (block) { setModal({ mode: "edit-avail", carId, block }); pendingAvailEditRef.current = null; }
    }
  }, [loading, pricings, availBlocks]);

  // ─ Close popover
  useEffect(() => {
    if (!bookingPopover) return;
    const onKey  = (e: KeyboardEvent) => { if (e.key === "Escape") setBookingPopover(null); };
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setBookingPopover(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [bookingPopover]);

  // ─ Drag release
  useEffect(() => {
    if (!dragging) return;
    const up = () => {
      if (dragCarId && selStart && selEnd) {
        const [s, e] = selStart <= selEnd ? [selStart, selEnd] : [selEnd, selStart];
        setModal({ mode: "create", carId: dragCarId, startDate: s, endDate: e });
        openModal("cal-create", { carId: dragCarId, from: s, to: e });
      }
      setDragging(false); setDragCarId(null); setSelStart(null); setSelEnd(null);
    };
    document.addEventListener("mouseup", up);
    return () => document.removeEventListener("mouseup", up);
  }, [dragging, dragCarId, selStart, selEnd, openModal]);

  // ─ Callbacks
  const handleCellDown = useCallback((
    carId: string, date: string, pricing: CarPricing | null, availBlock: AvailabilityBlock | null,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    if (availBlock) {
      setModal({ mode: "edit-avail", carId, block: availBlock });
      openModal("avail-edit", { carId, blockId: availBlock.id });
      return;
    }
    if (pricing) {
      setModal({ mode: "edit-pricing", carId, pricing });
      openModal("cal-pricing-edit", { carId, pricingId: pricing.id });
      return;
    }
    setDragging(true); setDragCarId(carId); setSelStart(date); setSelEnd(date);
  }, [openModal]);

  const handleCellEnter = useCallback((carId: string, date: string) => {
    if (!dragging || dragCarId !== carId) return;
    setSelEnd(date);
  }, [dragging, dragCarId]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("calendar-sidebar-collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);

  const handleBookingClick = useCallback((booking: CalendarBooking, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookingPopover(prev => prev?.booking.id === booking.id ? null : { booking, anchorX: e.clientX, anchorY: e.clientY });
  }, []);

  const getPricingOverlaps = useCallback((carId: string, startDate: string, endDate: string, excludeId?: string) => {
    return (pricings[carId] ?? []).filter(p => p.id !== excludeId && p.startDate <= endDate && p.endDate >= startDate);
  }, [pricings]);

  // ─ Pricing CRUD
  const handleSavePricing = useCallback(async (data: {
    startDate: string; endDate: string; pricePerDay: number; label: string | null;
  }) => {
    if (!modal) return;
    const carId = modal.carId;
    if (modal.mode === "create" || modal.mode === "edit-pricing") {
      const isEdit = modal.mode === "edit-pricing";
      const url    = isEdit ? `/next-api/cars/${carId}/pricings/${modal.mode === "edit-pricing" ? modal.pricing.id : ""}` : `/next-api/cars/${carId}/pricings`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, carId }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d?.message ?? "Save failed"); }
      const saved: CarPricing = await res.json();
      setPricings(prev => ({
        ...prev,
        [carId]: isEdit
          ? (prev[carId] ?? []).map(p => p.id === saved.id ? saved : p)
          : [...(prev[carId] ?? []), saved],
      }));
    }
    setModal(null); closeModal();
  }, [modal, closeModal]);

  const handleDeletePricing = useCallback(async () => {
    if (!modal || modal.mode !== "edit-pricing") return;
    const res = await fetch(`/next-api/cars/${modal.carId}/pricings/${modal.pricing.id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error("Delete failed");
    setPricings(prev => ({ ...prev, [modal.carId]: (prev[modal.carId] ?? []).filter(p => p.id !== modal.pricing.id) }));
    setModal(null); closeModal();
  }, [modal, closeModal]);

  // ─ Availability CRUD
  const handleSaveAvail = useCallback(async (data: {
    startDate: string; endDate: string; reason: string | null; notes: string | null;
  }) => {
    if (!modal) return;
    const carId = modal.carId;
    if (modal.mode === "create") {
      const res = await fetch(`/next-api/cars/${carId}/availability`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d?.message ?? "Save failed"); }
      const created: AvailabilityBlock = await res.json();
      setAvailBlocks(prev => ({ ...prev, [carId]: [...(prev[carId] ?? []), created] }));
    } else if (modal.mode === "edit-avail") {
      const res = await fetch(`/next-api/cars/${carId}/availability/${modal.block.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d?.message ?? "Save failed"); }
      const updated: AvailabilityBlock = await res.json();
      setAvailBlocks(prev => ({ ...prev, [carId]: (prev[carId] ?? []).map(b => b.id === updated.id ? updated : b) }));
    }
    setModal(null); closeModal();
  }, [modal, closeModal]);

  const handleDeleteAvail = useCallback(async () => {
    if (!modal || modal.mode !== "edit-avail") return;
    const res = await fetch(`/next-api/cars/${modal.carId}/availability/${modal.block.id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error("Delete failed");
    setAvailBlocks(prev => ({ ...prev, [modal.carId]: (prev[modal.carId] ?? []).filter(b => b.id !== modal.block.id) }));
    setModal(null); closeModal();
  }, [modal, closeModal]);

  // ─ Navigation
  const shift     = (n: number) => setBaseDate(d => new Date(Date.UTC(d.getFullYear(), d.getMonth() + n, 1)));
  const jumpToday = () => { const d = new Date(); setBaseDate(new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1))); };

  // ─ Render
  const numDays  = days.length;
  const carColW  = sidebarCollapsed ? CAR_COL_COLLAPSED : CAR_COL_EXPANDED;
  const gridCols = `var(--car-col-w) repeat(${numDays}, ${CELL_W}px)`;

  const popoverStyle = bookingPopover ? (() => {
    const GAP = 12, W = 260;
    const x = Math.min(bookingPopover.anchorX + GAP, (typeof window !== "undefined" ? window.innerWidth : 800) - W - 8);
    return { left: x, top: bookingPopover.anchorY } as React.CSSProperties;
  })() : undefined;

  const modalCarName = modal ? (cars.find(c => c.id === modal.carId)?.name ?? "") : "";
  const pricingOverlaps = modal
    ? getPricingOverlaps(
        modal.carId,
        modal.mode === "create"       ? modal.startDate     : modal.mode === "edit-pricing" ? modal.pricing.startDate : modal.block.startDate,
        modal.mode === "create"       ? modal.endDate       : modal.mode === "edit-pricing" ? modal.pricing.endDate   : modal.block.endDate,
        modal.mode === "edit-pricing" ? modal.pricing.id    : undefined,
      )
    : [];

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h1 className={styles.pageTitle}>Calendar</h1>
          <span className={styles.hint}>Drag to create an entry · Click to edit · Click a booking to inspect</span>
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

      {loading && (
        <div className={styles.state}>
          <span className={styles.spinner} />
          <span>Loading…</span>
        </div>
      )}
      {error && !loading && (
        <div className={styles.stateError}>
          <span><AlertTriangle size={16} strokeWidth={1.75} /> {error}</span>
          <button onClick={() => window.location.reload()} className={styles.retryBtn}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <div className={`${styles.scrollWrap} ${dragging ? styles.dragging : ""}`}>
          <div
            className={styles.grid}
            style={{ '--car-col-w': `${carColW}px`, gridTemplateColumns: gridCols } as React.CSSProperties}
          >
            <div className={`${styles.cornerA} ${sidebarCollapsed ? styles.cornerACollapsed : ""}`}>
              <span className={`${styles.cornerALabel} ${sidebarCollapsed ? styles.cornerALabelHidden : ""}`}>Cars</span>
              <button
                className={styles.collapseBtn}
                onClick={toggleSidebar}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <span className={`${styles.chevron} ${sidebarCollapsed ? styles.chevronCollapsed : ""}`}>‹</span>
              </button>
            </div>
            {months.map(m => (
              <div key={m.key} className={styles.monthHeader} style={{ gridColumn: `span ${m.days}` }}>{m.label}</div>
            ))}
            <div className={styles.cornerB} />
            {days.map(d => (
              <div
                key={d.date}
                className={[styles.dayHeader, d.isWeekend ? styles.dayWeekend : "", d.isToday ? styles.dayToday : ""].filter(Boolean).join(" ")}
                title={d.date}
              >
                <span className={styles.dayWkd}>{d.weekday}</span>
                <span className={styles.dayNum}>{d.dayOfMonth}</span>
              </div>
            ))}
            {cars.length === 0 && !loading && (
              <div className={styles.emptyMsg} style={{ gridColumn: `span ${numDays + 1}` }}>
                No cars found. Add cars in the Fleet section first.
              </div>
            )}
            {cars.map(car => (
              <CarRow
                key={car.id}
                car={car}
                days={days}
                dayMap={pricingMaps[car.id] ?? {}}
                availDayMap={availMaps[car.id] ?? {}}
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
            <span className={styles.legendSwatch} style={{ background: "rgba(239,68,68,0.15)", border: "1.5px solid rgba(239,68,68,0.5)" }} />
            Unavailable
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
        <div ref={popoverRef} className={styles.bookingPopover} style={popoverStyle}>
          <div className={styles.popoverHeader}>
            <span
              className={styles.popoverStatus}
              style={{
                background:  `${bookingSolidColor(bookingPopover.booking.status)}22`,
                color:        bookingSolidColor(bookingPopover.booking.status),
                borderColor: `${bookingSolidColor(bookingPopover.booking.status)}44`,
              }}
            >
              {bookingLabel(bookingPopover.booking.status)}
            </span>
            <button className={styles.popoverClose} onClick={() => setBookingPopover(null)} aria-label="Close"><X size={14} strokeWidth={1.75} /></button>
          </div>
          <p className={styles.popoverCustomer}>{bookingPopover.booking.user?.name ?? "Unknown guest"}</p>
          <div className={styles.popoverDates}>
            <div className={styles.popoverDateRow}>
              <span className={styles.popoverDateLabel}>Start</span>
              <span className={styles.popoverDateVal}>{fmtDateTime(bookingPopover.booking.startDateTime, tz)}</span>
            </div>
            <div className={styles.popoverDateRow}>
              <span className={styles.popoverDateLabel}>End</span>
              <span className={styles.popoverDateVal}>{fmtDateTime(bookingPopover.booking.endDateTime, tz)}</span>
            </div>
          </div>
          <div className={styles.popoverSource}>via {bookingPopover.booking.source}</div>
        </div>
      )}

      {/* Calendar entry modal */}
      {modal && (
        <CalendarEntryModal
          entry={modal}
          carName={modalCarName}
          overlaps={pricingOverlaps}
          onSavePricing={handleSavePricing}
          onDeletePricing={modal.mode === "edit-pricing" ? handleDeletePricing : undefined}
          onSaveAvail={handleSaveAvail}
          onDeleteAvail={modal.mode === "edit-avail" ? handleDeleteAvail : undefined}
          onClose={() => { setModal(null); closeModal(); }}
        />
      )}
    </div>
  );
}
