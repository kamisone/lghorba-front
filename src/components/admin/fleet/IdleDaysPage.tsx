"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { CalendarClock, TrendingUp, Trophy, Car as CarIcon, Percent } from "lucide-react";
import IdleDaysHeatmap from "./IdleDaysHeatmap";
import IdleDaysBestList from "./IdleDaysBestList";
import KPICard from "../analytics/KPICard";
import { useModalUrl } from "@/hooks/useModalUrl";
import type { DayIdle } from "./idleDaysShared";
import { fmtDayLabel, ymd } from "./idleDaysShared";
import styles from "./IdleDaysPage.module.css";

interface IdleDaysResponse {
  from: string;
  to: string;
  fleetSize: number;
  parkingId: string | null;
  days: DayIdle[];
}

interface DetailCar {
  carId: string;
  name: string;
  immatriculation: string;
  parkingId: string | null;
  parkingLabel: string | null;
}

interface DetailResponse {
  date: string;
  idleCount: number;
  cars: DetailCar[];
}

interface ParkingOption { id: string; label: string }

function safeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

function startOfMonth(year: number, month: number): Date { return new Date(year, month, 1); }
function endOfMonth(year: number, month: number): Date { return new Date(year, month + 1, 0); }

const ROLLING_WINDOW_DAYS = 30;

export default function IdleDaysPage() {
  const { openModal, closeModal } = useModalUrl();

  const [viewDate, setViewDate] = useState(() => new Date());
  const [parkingId, setParkingId] = useState<string>("");
  const [parkings, setParkings]   = useState<ParkingOption[]>([]);
  const [data, setData]           = useState<IdleDaysResponse | null>(null);
  const [loading, setLoading]     = useState(true);

  const [selectedDate, setSelectedDate]   = useState<string | null>(null);
  const [detail, setDetail]               = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const restoredRef = useRef(false);

  useEffect(() => {
    fetch("/next-api/parkings")
      .then(r => r.ok ? r.json() : [])
      .then(res => setParkings(safeArray<ParkingOption>(res).map(p => ({ id: p.id, label: p.label }))));
  }, []);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Widened fetch range: visible month ∪ rolling next-30-days window, so one
  // request feeds both the calendar and the KPI/best-days list regardless of
  // which month is currently being viewed.
  const range = useMemo(() => {
    const monthStart = startOfMonth(year, month);
    const monthEnd   = endOfMonth(year, month);
    const today      = new Date();
    today.setHours(0, 0, 0, 0);
    const rollingEnd = new Date(today);
    rollingEnd.setDate(rollingEnd.getDate() + (ROLLING_WINDOW_DAYS - 1));

    const from = monthStart < today ? monthStart : today;
    const to   = monthEnd > rollingEnd ? monthEnd : rollingEnd;
    return { from: ymd(from), to: ymd(to) };
  }, [year, month]);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ from: range.from, to: range.to });
    if (parkingId) qs.set("parkingId", parkingId);
    fetch(`/next-api/fleet-analytics/idle-days?${qs}`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false));
  }, [range, parkingId]);

  const fetchDetail = useCallback((date: string) => {
    setDetailLoading(true);
    const qs = new URLSearchParams({ date });
    if (parkingId) qs.set("parkingId", parkingId);
    fetch(`/next-api/fleet-analytics/idle-days/detail?${qs}`)
      .then(r => r.ok ? r.json() : null)
      .then(setDetail)
      .finally(() => setDetailLoading(false));
  }, [parkingId]);

  // Restore selected day from URL once (deep-link / back-button support)
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("modal") !== "idle-day-detail") return;
    const d = sp.get("id");
    if (!d) return;
    setSelectedDate(d);
    fetchDetail(d);
  }, [fetchDetail]);

  const selectDay = (date: string) => {
    setSelectedDate(date);
    fetchDetail(date);
    openModal("idle-day-detail", { id: date });
  };

  const clearSelection = () => {
    setSelectedDate(null);
    setDetail(null);
    closeModal();
  };

  const todayStr      = ymd(new Date());
  const rollingEndStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + (ROLLING_WINDOW_DAYS - 1));
    return ymd(d);
  }, []);

  const upcomingDays = useMemo(
    () => (data?.days ?? []).filter(d => d.date >= todayStr && d.date <= rollingEndStr),
    [data, todayStr, rollingEndStr],
  );

  const monthDays = useMemo(() => {
    const monthStartStr = ymd(startOfMonth(year, month));
    const monthEndStr   = ymd(endOfMonth(year, month));
    return (data?.days ?? []).filter(d => d.date >= monthStartStr && d.date <= monthEndStr);
  }, [data, year, month]);

  const fleetSize = data?.fleetSize ?? 0;

  const kpis = useMemo(() => {
    if (upcomingDays.length === 0) {
      return { avgIdle: 0, bestLabel: "—", bestCount: 0, avgRatePct: 0 };
    }
    const totalIdle = upcomingDays.reduce((s, d) => s + d.idleCount, 0);
    const best      = [...upcomingDays].sort((a, b) => b.idleCount - a.idleCount)[0];
    const avgRatePct = fleetSize > 0 ? (totalIdle / upcomingDays.length / fleetSize) * 100 : 0;
    return {
      avgIdle:    totalIdle / upcomingDays.length,
      bestLabel:  fmtDayLabel(best.date),
      bestCount:  best.idleCount,
      avgRatePct,
    };
  }, [upcomingDays, fleetSize]);

  // Group the selected day's idle cars by parking location for the detail panel
  const detailByParking = useMemo(() => {
    if (!detail) return [];
    const groups = new Map<string, { label: string; cars: DetailCar[] }>();
    for (const car of detail.cars) {
      const key   = car.parkingId ?? "unassigned";
      const label = car.parkingLabel ?? "Unassigned";
      if (!groups.has(key)) groups.set(key, { label, cars: [] });
      groups.get(key)!.cars.push(car);
    }
    return Array.from(groups.values()).sort((a, b) => b.cars.length - a.cars.length);
  }, [detail]);

  if (loading && !data) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>Loading idle-days data…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <CalendarClock size={22} strokeWidth={1.75} />
            Idle Days
          </h1>
          <p className={styles.subtitle}>
            Days with the most cars sitting idle — a good window to schedule cleaning, maintenance, or other servicing.
          </p>
        </div>
        {parkings.length > 0 && (
          <select
            className={styles.parkingSelect}
            value={parkingId}
            onChange={e => setParkingId(e.target.value)}
          >
            <option value="">All parkings</option>
            {parkings.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── KPI Grid ── */}
      <div className={styles.kpiGrid}>
        <KPICard
          icon={<CarIcon size={18} strokeWidth={1.75} />}
          label="Fleet Size"
          value={String(fleetSize)}
          accent="#00466E"
          sub={parkingId ? "Filtered to this parking" : "All parkings"}
        />
        <KPICard
          icon={<TrendingUp size={18} strokeWidth={1.75} />}
          label="Avg Idle Cars / Day"
          value={kpis.avgIdle.toFixed(1)}
          accent="#8DC220"
          sub={`Next ${ROLLING_WINDOW_DAYS} days`}
        />
        <KPICard
          icon={<Trophy size={18} strokeWidth={1.75} />}
          label="Best Day to Service"
          value={kpis.bestCount > 0 ? kpis.bestLabel : "—"}
          accent="#f59e0b"
          sub={kpis.bestCount > 0 ? `${kpis.bestCount} cars idle` : "No idle days found"}
        />
        <KPICard
          icon={<Percent size={18} strokeWidth={1.75} />}
          label="Avg Idle Rate"
          value={`${kpis.avgRatePct.toFixed(0)}%`}
          accent={kpis.avgRatePct >= 40 ? "#22c55e" : kpis.avgRatePct >= 20 ? "#f59e0b" : "#ef4444"}
          sub={`Next ${ROLLING_WINDOW_DAYS} days`}
        />
      </div>

      {/* ── Calendar + side panels ── */}
      <div className={styles.grid2}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Fleet Idle Calendar</h2>
          <IdleDaysHeatmap
            year={year}
            month={month}
            days={monthDays}
            selectedDate={selectedDate}
            onSelectDate={selectDay}
            onPrevMonth={() => setViewDate(new Date(year, month - 1, 1))}
            onNextMonth={() => setViewDate(new Date(year, month + 1, 1))}
          />
        </div>

        <div>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Best Upcoming Days to Service</h2>
            <IdleDaysBestList
              days={upcomingDays}
              fleetSize={fleetSize}
              selectedDate={selectedDate}
              onSelect={selectDay}
            />
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Day Detail</h2>
            {!selectedDate ? (
              <div className={styles.detailEmpty}>Click a day to see idle cars by parking location</div>
            ) : detailLoading || !detail ? (
              <div className={styles.detailEmpty}>Loading…</div>
            ) : (
              <>
                <div className={styles.detailHeader}>
                  <span className={styles.detailDate}>{fmtDayLabel(detail.date)}</span>
                  <span className={styles.detailCount}>{detail.idleCount} idle</span>
                </div>
                {detailByParking.length === 0 ? (
                  <div className={styles.detailEmpty}>No idle cars this day</div>
                ) : (
                  detailByParking.map(group => (
                    <div key={group.label} className={styles.parkingGroup}>
                      <p className={styles.parkingGroupTitle}>{group.label} ({group.cars.length})</p>
                      {group.cars.map(car => (
                        <div key={car.carId} className={styles.carRow}>
                          <span className={styles.carName}>{car.name}</span>
                          <span className={styles.carPlate}>{car.immatriculation}</span>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
