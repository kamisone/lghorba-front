"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type { Car } from "./data";
import styles from "./OperationsAnalytics.module.css";

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

interface HealthOverview {
  healthy: number;
  warning: number;
  critical: number;
  unsafe: number;
  needs_service: number;
}

type Period = "7d" | "30d" | "90d";

const HEALTH_COLOR: Record<string, string> = {
  healthy: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
  unsafe: "#7c3aed",
  needs_service: "#f97316",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtEur(n: number): string {
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
  const mins = Math.floor(ms / 60_000);
  return `${mins}m`;
}

function getPeriodStart(period: Period): Date {
  const d = new Date();
  d.setDate(d.getDate() - (period === "7d" ? 7 : period === "30d" ? 30 : 90));
  return d;
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

export default function OperationsAnalytics() {
  const [period, setPeriod] = useState<Period>("30d");
  const [cars, setCars] = useState<Car[]>([]);
  const [sessions, setSessions] = useState<RentSession[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [health, setHealth] = useState<HealthOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/next-api/cars").then(r => r.ok ? r.json() : []),
      fetch("/next-api/rent-sessions?limit=1000").then(r => r.ok ? r.json() : []),
      fetch("/next-api/bookings?limit=1000").then(r => r.ok ? r.json() : []),
      fetch("/next-api/fleet-analytics/health-overview").then(r => r.ok ? r.json() : null),
    ]).then(([carsData, sessionsData, bookingsData, healthData]) => {
      setCars(safeArray<Car>(carsData));
      setSessions(safeArray<RentSession>(sessionsData));
      setBookings(safeArray<AdminBooking>(bookingsData));
      setHealth(healthData && typeof healthData === "object" && !healthData.error ? healthData : null);
      setLoading(false);
    });
  }, []);

  const periodStart = useMemo(() => getPeriodStart(period), [period]);

  const inPeriod = useMemo(() => ({
    sessions: sessions.filter(s => new Date(s.startedAt) >= periodStart),
    bookings: bookings.filter(
      b => new Date(b.startDateTime) >= periodStart && b.status !== "cancelled",
    ),
  }), [sessions, bookings, periodStart]);

  const kpis = useMemo(() => {
    const totalFleet = cars.length;
    const activeNow = cars.filter(c => c.isCurrentlyRented).length;
    const vehiclesWithTrips = new Set(inPeriod.sessions.map(s => s.carId)).size;
    const utilizationRate = totalFleet > 0 ? (vehiclesWithTrips / totalFleet) * 100 : 0;

    const endedSessions = inPeriod.sessions.filter(s => s.status === "ended" && s.endedAt);
    const avgDurationMs =
      endedSessions.length > 0
        ? endedSessions.reduce(
            (sum, s) =>
              sum + (new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()),
            0,
          ) / endedSessions.length
        : 0;

    const revenue = inPeriod.bookings.reduce((sum, b) => sum + toNum(b.totalEarning), 0);

    return { totalFleet, activeNow, utilizationRate, totalTrips: inPeriod.sessions.length, avgDurationMs, revenue };
  }, [cars, inPeriod]);

  const vehicleStats = useMemo(() => {
    return cars
      .map(car => {
        const trips = inPeriod.sessions.filter(s => s.carId === car.id).length;
        const revenue = inPeriod.bookings
          .filter(b => b.carId === car.id)
          .reduce((sum, b) => sum + toNum(b.totalEarning), 0);
        return { car, trips, revenue };
      })
      .sort((a, b) => b.trips - a.trips);
  }, [cars, inPeriod]);

  const maxTrips = useMemo(
    () => Math.max(...vehicleStats.map(v => v.trips), 1),
    [vehicleStats],
  );

  const totalHealthVehicles = health
    ? Object.values(health).reduce((s, v) => s + v, 0)
    : 0;

  const PERIOD_LABELS: Record<Period, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>Loading fleet analytics…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Fleet Analytics</h1>
          <p className={styles.subtitle}>
            Operational intelligence and fleet performance — {cars.length} vehicles tracked
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

      {/* ── KPI Grid ── */}
      <div className={styles.kpiGrid}>
        <KPICard
          icon="directions_car"
          label="Total Fleet"
          value={String(kpis.totalFleet)}
          accent="#00466E"
          sub={`${kpis.activeNow} currently rented`}
        />
        <KPICard
          icon="trip_origin"
          label="Total Trips"
          value={String(kpis.totalTrips)}
          accent="#8DC220"
          sub={`Last ${PERIOD_LABELS[period]}`}
        />
        <KPICard
          icon="speed"
          label="Fleet Utilization"
          value={`${kpis.utilizationRate.toFixed(0)}%`}
          accent={
            kpis.utilizationRate >= 70
              ? "#22c55e"
              : kpis.utilizationRate >= 40
              ? "#f59e0b"
              : "#ef4444"
          }
          sub="Vehicles active this period"
        />
        <KPICard
          icon="electric_bolt"
          label="Active Right Now"
          value={String(kpis.activeNow)}
          accent="#3b82f6"
          sub={`${kpis.totalFleet - kpis.activeNow} idle`}
        />
        <KPICard
          icon="schedule"
          label="Avg Trip Duration"
          value={kpis.avgDurationMs > 0 ? fmtDuration(kpis.avgDurationMs) : "—"}
          accent="#8b5cf6"
          sub="Per completed session"
        />
        <KPICard
          icon="payments"
          label="Period Revenue"
          value={fmtEur(kpis.revenue)}
          accent="#f59e0b"
          sub={`From ${inPeriod.bookings.length} bookings`}
        />
      </div>

      {/* ── Fleet Health ── */}
      {health && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Fleet Health Status</h2>
          <div className={styles.healthBar}>
            {(Object.entries(health) as [string, number][]).map(([s, count]) => {
              const pct = totalHealthVehicles > 0 ? (count / totalHealthVehicles) * 100 : 0;
              if (pct < 1) return null;
              return (
                <div
                  key={s}
                  style={{ flex: pct, background: HEALTH_COLOR[s] ?? "#94a3b8" }}
                  title={`${s.replace(/_/g, " ")}: ${count}`}
                />
              );
            })}
          </div>
          <div className={styles.healthLegend}>
            {(Object.entries(health) as [string, number][]).map(([s, count]) => (
              <span key={s} className={styles.healthLegendItem}>
                <span
                  className={styles.healthDot}
                  style={{ background: HEALTH_COLOR[s] ?? "#94a3b8" }}
                />
                {s.replace(/_/g, " ")}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Vehicle Rankings ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitleInRow}>Vehicle Utilization Ranking</h2>
          <Link href="/admin/analytics/fleet" className={styles.sectionLink}>
            Full fleet analytics →
          </Link>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Vehicle</th>
                <th>Trips</th>
                <th>Revenue</th>
                <th>Status</th>
                <th>Activity</th>
              </tr>
            </thead>
            <tbody>
              {vehicleStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    No vehicle data for this period
                  </td>
                </tr>
              ) : (
                vehicleStats.slice(0, 8).map(({ car, trips, revenue }, idx) => (
                  <tr key={car.id}>
                    <td className={styles.rankCell}>{idx + 1}</td>
                    <td>
                      <Link
                        href={`/admin/fleet/${car.id}/management`}
                        className={styles.vehicleLink}
                      >
                        {car.name}
                      </Link>
                      <span className={styles.plateTag}>{car.immatriculation}</span>
                    </td>
                    <td className={styles.numCell}>{trips}</td>
                    <td className={styles.numCell}>{revenue > 0 ? fmtEur(revenue) : "—"}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          car.isCurrentlyRented ? styles.statusActive : styles.statusIdle
                        }`}
                      >
                        {car.isCurrentlyRented ? "Active" : "Idle"}
                      </span>
                    </td>
                    <td className={styles.barCell}>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${(trips / maxTrips) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Sub-dashboard Navigation ── */}
      <div className={styles.navCardGrid}>
        <NavCard
          href="/admin/analytics/fleet"
          icon="garage"
          title="Fleet Performance"
          desc="Vehicle rankings, utilization rates, idle detection, maintenance cost impact"
          color="#00466E"
        />
        <NavCard
          href="/admin/analytics/telemetry"
          icon="location_on"
          title="Telemetry & Routes"
          desc="Trip routes, geographic patterns, session positions, coverage zones"
          color="#8DC220"
        />
        <NavCard
          href="/admin/analytics/utilization"
          icon="bar_chart"
          title="Utilization Trends"
          desc="Booking trends, source breakdown, occupancy rates, daily activity"
          color="#3b82f6"
        />
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KPICard({
  icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  accent: string;
  sub: string;
}) {
  return (
    <div className={styles.kpiCard} style={{ borderTopColor: accent }}>
      <div className={styles.kpiHeader}>
        <span
          className={`material-symbols-outlined ${styles.kpiIcon}`}
          style={{ color: accent }}
        >
          {icon}
        </span>
        <span className={styles.kpiLabel}>{label}</span>
      </div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiSub}>{sub}</div>
    </div>
  );
}

function NavCard({
  href,
  icon,
  title,
  desc,
  color,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <Link href={href} className={styles.navCard}>
      <span
        className={`material-symbols-outlined ${styles.navCardIcon}`}
        style={{ color }}
      >
        {icon}
      </span>
      <div>
        <div className={styles.navCardTitle}>{title}</div>
        <div className={styles.navCardDesc}>{desc}</div>
      </div>
    </Link>
  );
}
