"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./FleetMaintenance.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type MaintenanceStatus = "planned" | "scheduled" | "in_progress" | "waiting_parts" | "completed" | "cancelled";
type HealthStatus = "healthy" | "warning" | "critical" | "unsafe" | "needs_service";

interface MaintenanceType { id: string; name: string; code: string; }
interface MaintenanceRecord {
  id: string; carId: string; title: string; status: MaintenanceStatus;
  scheduledDate: string | null; costEur: number | null;
  maintenanceType: MaintenanceType;
  createdAt: string;
}
interface HealthOverview { healthy: number; warning: number; critical: number; unsafe: number; needs_service: number; }

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<MaintenanceStatus, string> = {
  planned: "#94a3b8", scheduled: "#3b82f6", in_progress: "#f59e0b",
  waiting_parts: "#f97316", completed: "#22c55e", cancelled: "#64748b",
};
const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  planned: "Planned", scheduled: "Scheduled", in_progress: "In Progress",
  waiting_parts: "Waiting Parts", completed: "Completed", cancelled: "Cancelled",
};
const HEALTH_COLOR: Record<HealthStatus, string> = {
  healthy: "#22c55e", warning: "#f59e0b", critical: "#ef4444", unsafe: "#7c3aed", needs_service: "#f97316",
};
const HEALTH_LABEL: Record<HealthStatus, string> = {
  healthy: "Healthy", warning: "Warning", critical: "Critical", unsafe: "Unsafe", needs_service: "Needs Service",
};

const FILTERS: Array<{ value: MaintenanceStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "planned", label: "Planned" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_parts", label: "Waiting Parts" },
  { value: "completed", label: "Completed" },
];

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(s + "T00:00:00Z"));
}
function fmtEur(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FleetMaintenance() {
  const [records,  setRecords]  = useState<MaintenanceRecord[]>([]);
  const [health,   setHealth]   = useState<HealthOverview | null>(null);
  const [overdue,  setOverdue]  = useState<MaintenanceRecord[]>([]);
  const [filter,   setFilter]   = useState<MaintenanceStatus | "">("");
  const [loading,  setLoading]  = useState(true);

  const loadData = async (status?: MaintenanceStatus | "") => {
    try {
      const qs = status ? `?status=${status}` : "";
      const [rRes, hRes, oRes] = await Promise.all([
        fetch(`/next-api/maintenance${qs}`),
        fetch("/next-api/fleet-analytics/health-overview"),
        fetch("/next-api/fleet-analytics/overdue-maintenance"),
      ]);
      if (rRes.ok) setRecords(await rRes.json());
      if (hRes.ok) setHealth(await hRes.json());
      if (oRes.ok) setOverdue(await oRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(filter || undefined); }, [filter]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Fleet Maintenance</h1>
        <div className={styles.headerActions}>
          <Link href="/admin/maintenance/analytics" className={styles.secondaryBtn}>Analytics</Link>
          <Link href="/admin/maintenance/suppliers" className={styles.secondaryBtn}>Suppliers</Link>
        </div>
      </div>

      {/* ── Fleet health bar ── */}
      {health && (
        <div className={styles.healthRow}>
          {(Object.keys(HEALTH_COLOR) as HealthStatus[]).map(s => (
            <div key={s} className={styles.healthCard} style={{ borderTopColor: HEALTH_COLOR[s] }}>
              <div className={styles.healthLabel}>{HEALTH_LABEL[s]}</div>
              <div className={styles.healthValue} style={{ color: HEALTH_COLOR[s] }}>{health[s] ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Overdue alerts ── */}
      {overdue.length > 0 && (
        <div className={styles.overdueBox}>
          <p className={styles.overdueTitle}>⚠ {overdue.length} overdue record{overdue.length > 1 ? "s" : ""}</p>
          <div className={styles.overdueList}>
            {overdue.slice(0, 5).map(r => (
              <div key={r.id} className={styles.overdueItem}>
                <span className={styles.overdueItemTitle}>{r.title}</span>
                <span className={styles.overdueItemDate}>Due: {fmtDate(r.scheduledDate)}</span>
              </div>
            ))}
            {overdue.length > 5 && <p className={styles.overdueMore}>+{overdue.length - 5} more</p>}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={`${styles.filterBtn} ${filter === f.value ? styles.filterBtnActive : ""}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Records table ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Scheduled</th>
              <th>Cost</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>Loading…</td></tr>
            )}
            {!loading && records.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>No records found</td></tr>
            )}
            {!loading && records.map(r => (
              <tr key={r.id}>
                <td className={styles.titleCell}>{r.title}</td>
                <td><span className={styles.typeBadge}>{r.maintenanceType?.name ?? "—"}</span></td>
                <td>{fmtDate(r.scheduledDate)}</td>
                <td>{fmtEur(r.costEur)}</td>
                <td>
                  <span className={styles.badge} style={{ background: `${STATUS_COLOR[r.status]}20`, color: STATUS_COLOR[r.status] }}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td>
                  <Link href={`/admin/fleet/${r.carId}/maintenance`} className={styles.viewLink}>
                    Vehicle →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
