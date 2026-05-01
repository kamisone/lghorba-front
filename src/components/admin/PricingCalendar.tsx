"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import PricingModal, { type CarPricing } from "./PricingModal";
import { useModalUrl } from "@/hooks/useModalUrl";
import styles from "./PricingCalendar.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Car {
  id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  immatriculation?: string | null;
  photo?: string | null;
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
  days: number;  // day count in this month within the view
}

type ModalState =
  | { mode: "create"; carId: string; startDate: string; endDate: string }
  | { mode: "edit";   carId: string; pricing: CarPricing };

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

// ── Date helpers ──────────────────────────────────────────────────────────────

function addDay(date: string, n = 1): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function buildCalendar(base: Date, numMonths: number): { days: DayInfo[]; months: MonthGroup[] } {
  const today = todayStr();
  const days: DayInfo[]     = [];
  const months: MonthGroup[] = [];

  const start = new Date(Date.UTC(base.getFullYear(), base.getMonth(), 1));
  const end   = new Date(Date.UTC(base.getFullYear(), base.getMonth() + numMonths, 1));

  let cur     = new Date(start);
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
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  isWeekend: boolean;
  isToday: boolean;
  onDown: (carId: string, date: string, pricing: CarPricing | null, e: React.MouseEvent) => void;
  onEnter: (carId: string, date: string) => void;
}

const Cell = React.memo(function Cell({
  date, carId, pricing, isFirst, isLast, isSelected,
  isWeekend, isToday, onDown, onEnter,
}: CellProps) {
  const color  = pricing ? colorForId(pricing.id) : null;
  const title  = pricing
    ? `€${Number(pricing.pricePerDay).toFixed(2)}/day${pricing.label ? ` · ${pricing.label}` : ""}\n${pricing.startDate} → ${pricing.endDate}`
    : date;

  return (
    <div
      className={[
        styles.cell,
        isSelected  ? styles.cellSel     : "",
        isWeekend   ? styles.cellWeekend : "",
        isToday     ? styles.cellToday   : "",
        pricing     ? styles.cellPriced  : "",
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
          €{Number(pricing.pricePerDay).toFixed(0)}
          {pricing.label ? <span className={styles.cellBadgeLabel}> {pricing.label}</span> : null}
        </span>
      )}
    </div>
  );
});

// ── Car row (memoised) ────────────────────────────────────────────────────────

interface CarRowProps {
  car:       Car;
  days:      DayInfo[];
  dayMap:    Record<string, CarPricing>;  // date → pricing
  selCarId:  string | null;
  selStart:  string | null;
  selEnd:    string | null;
  onDown:    CellProps["onDown"];
  onEnter:   CellProps["onEnter"];
}

const CarRow = React.memo(function CarRow({
  car, days, dayMap, selCarId, selStart, selEnd, onDown, onEnter,
}: CarRowProps) {
  const label = [car.brand, car.model].filter(Boolean).join(" ") || car.name;

  return (
    <>
      <div className={styles.carName} title={`${label}${car.immatriculation ? ` · ${car.immatriculation}` : ""}`}>
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
        <div className={styles.carInfo}>
          <span className={styles.carInfoName}>{label}</span>
          {car.immatriculation && (
            <span className={styles.carInfoImmat}>{car.immatriculation}</span>
          )}
        </div>
      </div>
      {days.map((d) => {
        const pricing   = dayMap[d.date] ?? null;
        const isFirst   = pricing?.startDate === d.date;
        const isLast    = pricing?.endDate   === d.date;
        const [lo, hi]  = selStart && selEnd && selStart <= selEnd
          ? [selStart, selEnd] : [selEnd ?? "", selStart ?? ""];
        const isSelected = selCarId === car.id && d.date >= lo && d.date <= hi;

        return (
          <Cell
            key={d.date}
            date={d.date}
            carId={car.id}
            pricing={pricing}
            isFirst={isFirst}
            isLast={isLast}
            isSelected={isSelected}
            isWeekend={d.isWeekend}
            isToday={d.isToday}
            onDown={onDown}
            onEnter={onEnter}
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

  // ─ Modal
  const [modal, setModal] = useState<ModalState | null>(null);
  const { openModal, closeModal } = useModalUrl();

  // ─ Derived
  const { days, months } = useMemo(() => buildCalendar(baseDate, NUM_MONTHS), [baseDate]);

  // Precompute date→pricing maps per car for O(1) cell lookup
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

        const results = await Promise.all(
          carsData.map(async (c) => {
            try {
              const r = await fetch(`/next-api/cars/${c.id}/pricings`, { cache: "no-store" });
              return [c.id, r.ok ? await r.json() : []] as [string, CarPricing[]];
            } catch {
              return [c.id, []] as [string, CarPricing[]];
            }
          }),
        );
        if (cancelled) return;
        setPricings(Object.fromEntries(results));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const pendingPricingEditRef = React.useRef<{ carId: string; pricingId: string } | null>(null);

  // ─ URL modal restore (mount: read params; deferred: wait for data)
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

  useEffect(() => {
    if (loading || !pendingPricingEditRef.current) return;
    const { carId, pricingId } = pendingPricingEditRef.current;
    const pricing = (pricings[carId] ?? []).find(p => p.id === pricingId);
    if (pricing) {
      setModal({ mode: "edit", carId, pricing });
      pendingPricingEditRef.current = null;
    }
  }, [loading, pricings]);

  // ─ Mouse up (global)
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

  // ─ Overlap detection
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
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
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
  const shift = (n: number) =>
    setBaseDate((d) => new Date(Date.UTC(d.getFullYear(), d.getMonth() + n, 1)));

  const jumpToday = () => {
    const d = new Date();
    setBaseDate(new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)));
  };

  // ─ Render
  const numDays = days.length;
  const gridCols = `210px repeat(${numDays}, 28px)`;

  return (
    <div className={styles.root}>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h1 className={styles.pageTitle}>Pricing calendar</h1>
          <span className={styles.hint}>Drag to select a date range · Click a range to edit</span>
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
          <div className={styles.grid} style={{ gridTemplateColumns: gridCols }}>

            {/* ── Row 0: Month headers ── */}
            <div className={`${styles.cornerA}`}>Cars</div>
            {months.map((m) => (
              <div key={m.key} className={styles.monthHeader} style={{ gridColumn: `span ${m.days}` }}>
                {m.label}
              </div>
            ))}

            {/* ── Row 1: Day numbers ── */}
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
                selCarId={dragCarId}
                selStart={selStart}
                selEnd={selEnd}
                onDown={handleCellDown}
                onEnter={handleCellEnter}
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
        </div>
      )}

      {/* Modal */}
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
