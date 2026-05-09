"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import styles from "./AnalyticsUtilization.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminBooking {
  id: string;
  carId: string;
  status: string;
  source: "private" | "turo" | "getaround";
  startDateTime: string;
  endDateTime: string;
  totalEarning?: number | string | null;
  car?: { name: string } | null;
}

type Period = "14d" | "30d" | "90d";

interface DayStat {
  date: string;       // "YYYY-MM-DD"
  label: string;      // "dd MMM"
  count: number;
  revenue: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function fmtEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function daysBetween(start: string, end: string): number {
  return Math.max(
    1,
    Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000,
    ),
  );
}

function getPeriodDays(period: Period): number {
  return period === "14d" ? 14 : period === "30d" ? 30 : 90;
}

function getPeriodStart(period: Period): Date {
  const d = new Date();
  d.setDate(d.getDate() - getPeriodDays(period));
  d.setHours(0, 0, 0, 0);
  return d;
}

const SOURCE_COLOR: Record<string, string> = {
  private: "#00466E",
  turo:    "#3b82f6",
  getaround: "#8DC220",
};

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────

function DailyBarChart({ data }: { data: DayStat[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const chartH = 130;
  const padB = 20;
  const innerH = chartH - padB;
  const n = data.length;

  if (n === 0) return <div className={styles.emptyState}>No booking data</div>;

  // Render thin bars using SVG with preserveAspectRatio="none"
  const barW = 100 / n;
  const gap = barW * 0.25;

  return (
    <div className={styles.chartWrap}>
      <svg
        viewBox={`0 0 100 ${chartH}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: chartH, display: "block" }}
      >
        {data.map((d, i) => {
          const barH = max > 0 ? (d.count / max) * innerH : 0;
          const x = i * barW + gap / 2;
          const w = barW - gap;
          const y = innerH - barH;

          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={w}
                height={barH}
                fill="#8DC220"
                rx="1"
                opacity={d.count > 0 ? 0.85 : 0.15}
                className={styles.chartBar}
              />
              {/* Show label every ~7 items to avoid clutter */}
              {i % Math.ceil(n / 10) === 0 && (
                <text
                  x={x + w / 2}
                  y={chartH - 4}
                  textAnchor="middle"
                  className={styles.chartAxisLabel}
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
        {/* Y-axis reference line */}
        <line x1="0" y1={innerH} x2="100" y2={innerH} stroke="#e2e8f0" strokeWidth="0.3" />
      </svg>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AnalyticsUtilization() {
  const [period, setPeriod] = useState<Period>("30d");
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/next-api/bookings?limit=1000")
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setBookings(safeArray<AdminBooking>(data));
        setLoading(false);
      });
  }, []);

  const periodStart = useMemo(() => getPeriodStart(period), [period]);
  const periodDays = getPeriodDays(period);

  const filtered = useMemo(
    () => bookings.filter(
      b => new Date(b.startDateTime) >= periodStart && b.status !== "cancelled",
    ),
    [bookings, periodStart],
  );

  // ── Daily stats ──────────────────────────────────────────────────────────────
  const dailyStats = useMemo((): DayStat[] => {
    const days: DayStat[] = [];
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });

    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);

      const dateStr = d.toISOString().slice(0, 10);
      const dayBookings = bookings.filter(b => {
        const s = new Date(b.startDateTime);
        return s >= d && s < next && b.status !== "cancelled";
      });

      days.push({
        date: dateStr,
        label: fmt.format(d).replace(" ", " "),
        count: dayBookings.length,
        revenue: dayBookings.reduce((sum, b) => sum + toNum(b.totalEarning), 0),
      });
    }
    return days;
  }, [bookings, periodDays]);

  // ── Source distribution ───────────────────────────────────────────────────────
  const sourceDist = useMemo(() => {
    const counts: Record<string, number> = { private: 0, turo: 0, getaround: 0 };
    for (const b of filtered) counts[b.source] = (counts[b.source] ?? 0) + 1;
    const total = filtered.length;
    return Object.entries(counts)
      .map(([source, count]) => ({
        source,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  // ── Duration buckets ─────────────────────────────────────────────────────────
  const durationBuckets = useMemo(() => {
    const buckets = [
      { label: "< 1 day", min: 0, max: 1, count: 0 },
      { label: "1–3 days", min: 1, max: 3, count: 0 },
      { label: "3–7 days", min: 3, max: 7, count: 0 },
      { label: "1–2 weeks", min: 7, max: 14, count: 0 },
      { label: "> 2 weeks", min: 14, max: Infinity, count: 0 },
    ];
    for (const b of filtered) {
      const days = daysBetween(b.startDateTime, b.endDateTime);
      const bucket = buckets.find(bk => days > bk.min && days <= (bk.max === Infinity ? 9999 : bk.max));
      // Handle exact boundaries
      const match = buckets.find(bk => days >= bk.min && days < (bk.max === Infinity ? 9999 : bk.max + 1));
      if (match) match.count++;
    }
    return buckets;
  }, [filtered]);

  const maxDuration = useMemo(
    () => Math.max(...durationBuckets.map(b => b.count), 1),
    [durationBuckets],
  );

  // ── Aggregate KPIs ────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const revenue = filtered.reduce((s, b) => s + toNum(b.totalEarning), 0);
    const avgDays =
      filtered.length > 0
        ? filtered.reduce((s, b) => s + daysBetween(b.startDateTime, b.endDateTime), 0) /
          filtered.length
        : 0;
    return { total: filtered.length, revenue, avgDays };
  }, [filtered]);

  // ── Revenue by day (top 7) ────────────────────────────────────────────────────
  const topRevenueDays = useMemo(() => {
    return [...dailyStats]
      .filter(d => d.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 7);
  }, [dailyStats]);

  const PERIOD_LABELS: Record<Period, string> = {
    "14d": "14 days",
    "30d": "30 days",
    "90d": "90 days",
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>Loading utilization data…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <Link href="/admin/analytics" className={styles.breadcrumbLink}>Analytics</Link>
            <span className={styles.breadcrumbSep}>›</span>
            Utilization Trends
          </div>
          <h1 className={styles.title}>Utilization Trends</h1>
          <p className={styles.subtitle}>
            Booking patterns, occupancy rates, and revenue distribution
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

      {/* ── Summary Cards ── */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={`material-symbols-outlined ${styles.summaryIcon}`} style={{ color: "#8DC220" }}>
            event_available
          </span>
          <div className={styles.summaryValue}>{kpis.total}</div>
          <div className={styles.summaryLabel}>Total Bookings</div>
        </div>
        <div className={styles.summaryCard}>
          <span className={`material-symbols-outlined ${styles.summaryIcon}`} style={{ color: "#00466E" }}>
            payments
          </span>
          <div className={styles.summaryValue}>{fmtEur(kpis.revenue)}</div>
          <div className={styles.summaryLabel}>Total Revenue</div>
        </div>
        <div className={styles.summaryCard}>
          <span className={`material-symbols-outlined ${styles.summaryIcon}`} style={{ color: "#3b82f6" }}>
            schedule
          </span>
          <div className={styles.summaryValue}>{kpis.avgDays.toFixed(1)}d</div>
          <div className={styles.summaryLabel}>Avg Booking Length</div>
        </div>
        <div className={styles.summaryCard}>
          <span className={`material-symbols-outlined ${styles.summaryIcon}`} style={{ color: "#f59e0b" }}>
            trending_up
          </span>
          <div className={styles.summaryValue}>
            {kpis.total > 0 ? fmtEur(kpis.revenue / kpis.total) : "—"}
          </div>
          <div className={styles.summaryLabel}>Avg Revenue / Booking</div>
        </div>
      </div>

      {/* ── Daily Bookings Chart ── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Daily Bookings — Last {PERIOD_LABELS[period]}
        </h2>
        <DailyBarChart data={dailyStats} />
      </div>

      {/* ── Source + Duration split ── */}
      <div className={styles.grid2}>

        {/* Booking Source Distribution */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Booking Sources</h2>
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>No bookings this period</div>
          ) : (
            <div className={styles.sourceList}>
              {sourceDist.map(({ source, count, pct }) => (
                <div key={source} className={styles.sourceRow}>
                  <div className={styles.sourceLabel}>{source}</div>
                  <div className={styles.sourceTrack}>
                    <div
                      className={styles.sourceFill}
                      style={{
                        width: `${pct}%`,
                        background: SOURCE_COLOR[source] ?? "#94a3b8",
                      }}
                    />
                  </div>
                  <div className={styles.sourceCount}>{count}</div>
                  <div className={styles.sourcePct}>{pct.toFixed(0)}%</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Duration Distribution */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Booking Duration</h2>
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>No bookings this period</div>
          ) : (
            <div className={styles.durationBars}>
              {durationBuckets.map(b => (
                <div key={b.label} className={styles.durationRow}>
                  <div className={styles.durationLabel}>{b.label}</div>
                  <div className={styles.durationTrack}>
                    <div
                      className={styles.durationFill}
                      style={{ width: `${(b.count / maxDuration) * 100}%` }}
                    />
                  </div>
                  <div className={styles.durationCount}>{b.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Top Revenue Days ── */}
      {topRevenueDays.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Top Revenue Days</h2>
          <div className={styles.revenueList}>
            {topRevenueDays.map(d => (
              <div key={d.date} className={styles.revenueRow}>
                <span className={styles.revenueDate}>{d.date}</span>
                <span className={styles.revenueCount}>{d.count} booking{d.count !== 1 ? "s" : ""}</span>
                <span className={styles.revenueAmount}>{fmtEur(d.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
