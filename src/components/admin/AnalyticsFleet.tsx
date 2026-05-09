"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type { Car } from "./data";
import styles from "./AnalyticsFleet.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RentSession {
  id: string;
  carId: string;
  status: "active" | "ended";
  startedAt: string;
  endedAt?: string | null;
}

interface AdminBooking {
  id: string;
  carId: string;
  status: string;
  startDateTime: string;
  endDateTime: string;
  totalEarning?: number | string | null;
}

interface CostRow {
  carId: string;
  name: string;
  maintenanceCount: number;
  totalCostEur: number;
  downtimeDays: number;
}

type Period = "7d" | "30d" | "90d";
type SortField = "trips" | "revenue" | "utilization" | "name";

interface VehicleStat {
  car: Car;
  tripCount: number;
  avgDurationMs: number;
  revenue: number;
  utilizationPct: number;
  maintCost: number;
  maintDowntime: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPeriodDays(period: Period): number {
  return period === "7d" ? 7 : period === "30d" ? 30 : 90;
}

function getPeriodStart(period: Period): Date {
  const d = new Date();
  d.setDate(d.getDate() - getPeriodDays(period));
  return d;
}

function fmtEur(n: number | null): string {
  if (n == null || n === 0) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDuration(ms: number): string {
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs >= 48) return `${Math.round(hrs / 24)}d`;
  if (hrs >= 1) return `${hrs}h`;
  return `${Math.floor(ms / 60_000)}m`;
}

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : parseFloat(String(v)) || 0;
}

function safeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AnalyticsFleet() {
  const [period, setPeriod] = useState<Period>("30d");
  const [sortField, setSortField] = useState<SortField>("trips");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [cars, setCars] = useState<Car[]>([]);
  const [sessions, setSessions] = useState<RentSession[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/next-api/cars").then(r => r.ok ? r.json() : []),
      fetch("/next-api/rent-sessions?limit=1000").then(r => r.ok ? r.json() : []),
      fetch("/next-api/bookings?limit=1000").then(r => r.ok ? r.json() : []),
      fetch("/next-api/fleet-analytics/cost-per-vehicle").then(r => r.ok ? r.json() : []),
    ]).then(([carsData, sessionsData, bookingsData, costsData]) => {
      setCars(safeArray<Car>(carsData));
      setSessions(safeArray<RentSession>(sessionsData));
      setBookings(safeArray<AdminBooking>(bookingsData));
      setCosts(safeArray<CostRow>(costsData));
      setLoading(false);
    });
  }, []);

  const periodStart = useMemo(() => getPeriodStart(period), [period]);
  const periodDays = getPeriodDays(period);

  const vehicleStats = useMemo((): VehicleStat[] => {
    const periodSessions = sessions.filter(s => new Date(s.startedAt) >= periodStart);
    const periodBookings = bookings.filter(
      b => new Date(b.startDateTime) >= periodStart && b.status !== "cancelled",
    );

    return cars.map(car => {
      const carSessions = periodSessions.filter(s => s.carId === car.id);
      const carBookings = periodBookings.filter(b => b.carId === car.id);

      const ended = carSessions.filter(s => s.status === "ended" && s.endedAt);
      const totalDurationMs = ended.reduce(
        (sum, s) => sum + (new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()),
        0,
      );
      const avgDurationMs = ended.length > 0 ? totalDurationMs / ended.length : 0;
      const rentedHours = totalDurationMs / 3_600_000;
      const utilizationPct = Math.min(100, (rentedHours / (periodDays * 24)) * 100);

      const revenue = carBookings.reduce((sum, b) => sum + toNum(b.totalEarning), 0);
      const costRow = costs.find(c => c.carId === car.id);

      return {
        car,
        tripCount: carSessions.length,
        avgDurationMs,
        revenue,
        utilizationPct,
        maintCost: costRow?.totalCostEur ?? 0,
        maintDowntime: costRow?.downtimeDays ?? 0,
      };
    });
  }, [cars, sessions, bookings, costs, periodStart, periodDays]);

  const sorted = useMemo(() => {
    return [...vehicleStats].sort((a, b) => {
      let diff = 0;
      if (sortField === "trips") diff = a.tripCount - b.tripCount;
      else if (sortField === "revenue") diff = a.revenue - b.revenue;
      else if (sortField === "utilization") diff = a.utilizationPct - b.utilizationPct;
      else if (sortField === "name") diff = a.car.name.localeCompare(b.car.name);
      return sortDir === "desc" ? -diff : diff;
    });
  }, [vehicleStats, sortField, sortDir]);

  const maxTrips = useMemo(
    () => Math.max(...vehicleStats.map(v => v.tripCount), 1),
    [vehicleStats],
  );

  const totals = useMemo(() => ({
    active: cars.filter(c => c.isCurrentlyRented).length,
    idle: vehicleStats.filter(v => !v.car.isCurrentlyRented && v.tripCount === 0).length,
    avgUtil:
      vehicleStats.length > 0
        ? vehicleStats.reduce((s, v) => s + v.utilizationPct, 0) / vehicleStats.length
        : 0,
    revenue: vehicleStats.reduce((s, v) => s + v.revenue, 0),
    trips: vehicleStats.reduce((s, v) => s + v.tripCount, 0),
  }), [cars, vehicleStats]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function sortArrow(field: SortField) {
    if (sortField !== field) return "";
    return sortDir === "desc" ? " ↓" : " ↑";
  }

  const PERIOD_LABELS: Record<Period, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <Link href="/admin/analytics" className={styles.breadcrumbLink}>Analytics</Link>
            <span className={styles.breadcrumbSep}>›</span>
            Fleet Performance
          </div>
          <h1 className={styles.title}>Fleet Performance</h1>
          <p className={styles.subtitle}>
            Per-vehicle utilization, revenue, and maintenance efficiency
          </p>
        </div>
        <div className={styles.periodSelector}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              className={`${styles.periodBtn} ${period === p ? styles.periodBtnActive : ""}`}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary Row ── */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{cars.length}</div>
          <div className={styles.summaryLabel}>Total Vehicles</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue} style={{ color: "#22c55e" }}>{totals.active}</div>
          <div className={styles.summaryLabel}>Active Now</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue} style={{ color: "#f59e0b" }}>{totals.idle}</div>
          <div className={styles.summaryLabel}>Idle This Period</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{totals.avgUtil.toFixed(1)}%</div>
          <div className={styles.summaryLabel}>Avg Utilization</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{totals.trips}</div>
          <div className={styles.summaryLabel}>Total Trips</div>
        </div>
      </div>

      {/* ── Vehicle Table ── */}
      <div className={styles.section}>
        {loading ? (
          <div className={styles.loadingState}>Loading fleet data…</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.rankTh}>#</th>
                  <th>
                    <button className={styles.sortBtn} onClick={() => toggleSort("name")}>
                      Vehicle{sortArrow("name")}
                    </button>
                  </th>
                  <th>
                    <button className={styles.sortBtn} onClick={() => toggleSort("trips")}>
                      Trips{sortArrow("trips")}
                    </button>
                  </th>
                  <th>Avg Duration</th>
                  <th>
                    <button className={styles.sortBtn} onClick={() => toggleSort("utilization")}>
                      Utilization{sortArrow("utilization")}
                    </button>
                  </th>
                  <th>
                    <button className={styles.sortBtn} onClick={() => toggleSort("revenue")}>
                      Revenue{sortArrow("revenue")}
                    </button>
                  </th>
                  <th>Maint. Cost</th>
                  <th>Downtime</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={styles.emptyCell}>No vehicles found</td>
                  </tr>
                ) : (
                  sorted.map((v, idx) => (
                    <tr key={v.car.id}>
                      <td className={styles.rankCell}>{idx + 1}</td>
                      <td>
                        <Link
                          href={`/admin/fleet/${v.car.id}/management`}
                          className={styles.vehicleLink}
                        >
                          {v.car.name}
                        </Link>
                        <span className={styles.plateTag}>{v.car.immatriculation}</span>
                      </td>
                      <td className={styles.numCell}>{v.tripCount}</td>
                      <td className={styles.numCell}>
                        {v.avgDurationMs > 0 ? fmtDuration(v.avgDurationMs) : "—"}
                      </td>
                      <td>
                        <div className={styles.utilCell}>
                          <span className={styles.utilPct}>
                            {v.utilizationPct.toFixed(1)}%
                          </span>
                          <div className={styles.utilBar}>
                            <div
                              className={styles.utilFill}
                              style={{
                                width: `${v.utilizationPct}%`,
                                background:
                                  v.utilizationPct >= 60
                                    ? "#22c55e"
                                    : v.utilizationPct >= 25
                                    ? "#f59e0b"
                                    : "#ef4444",
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className={styles.numCell}>{fmtEur(v.revenue)}</td>
                      <td className={styles.numCell}>{fmtEur(v.maintCost)}</td>
                      <td className={styles.numCell}>
                        {v.maintDowntime > 0 ? `${v.maintDowntime}d` : "—"}
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            v.car.isCurrentlyRented
                              ? styles.badgeActive
                              : v.tripCount === 0
                              ? styles.badgeIdle
                              : styles.badgeAvail
                          }`}
                        >
                          {v.car.isCurrentlyRented
                            ? "Rented"
                            : v.tripCount === 0
                            ? "Idle"
                            : "Available"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Trips per Vehicle bar chart ── */}
      {!loading && vehicleStats.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Trips per Vehicle — Last {PERIOD_LABELS[period]}</h2>
          <div className={styles.barChart}>
            {vehicleStats
              .slice()
              .sort((a, b) => b.tripCount - a.tripCount)
              .slice(0, 15)
              .map(v => (
                <div key={v.car.id} className={styles.barChartRow}>
                  <div className={styles.barChartLabel} title={v.car.name}>
                    {v.car.name}
                  </div>
                  <div className={styles.barChartTrack}>
                    <div
                      className={styles.barChartFill}
                      style={{ width: `${(v.tripCount / maxTrips) * 100}%` }}
                    />
                  </div>
                  <div className={styles.barChartVal}>{v.tripCount}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
