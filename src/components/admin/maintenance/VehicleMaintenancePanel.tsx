"use client";

import { useEffect, useState } from "react";
import styles from "./VehicleMaintenancePanel.module.css";

type MaintenanceStatus = "planned"|"scheduled"|"in_progress"|"waiting_parts"|"completed"|"cancelled";
type HealthStatus = "healthy"|"warning"|"critical"|"unsafe"|"needs_service";

interface MaintenanceRecord {
  id: string; title: string; status: MaintenanceStatus;
  scheduledDate: string | null; costEur: number | null; completedAt: string | null;
  maintenanceType: { name: string } | null;
}
interface OdometerReading { id: string; readingKm: number; recordedAt: string; source: string; }
interface HealthRecord { carId: string; status: HealthStatus; reason: string | null; lastCheckedAt: string; }
interface CostSummary { totalCostEur: number; count: number; avgCostEur: number; }

const STATUS_COLOR: Record<MaintenanceStatus, string> = {
  planned: "#94a3b8", scheduled: "#3b82f6", in_progress: "#f59e0b",
  waiting_parts: "#f97316", completed: "#22c55e", cancelled: "#64748b",
};
const HEALTH_COLOR: Record<HealthStatus, string> = {
  healthy: "#22c55e", warning: "#f59e0b", critical: "#ef4444", unsafe: "#7c3aed", needs_service: "#f97316",
};
const HEALTH_LABEL: Record<HealthStatus, string> = {
  healthy: "Healthy", warning: "Warning", critical: "Critical", unsafe: "Unsafe", needs_service: "Needs Service",
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(s.slice(0,10) + "T00:00:00Z"));
}
function fmtEur(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n));
}

export default function VehicleMaintenancePanel({ carId }: { carId: string }) {
  const [records,      setRecords]      = useState<MaintenanceRecord[]>([]);
  const [odometer,     setOdometer]     = useState<OdometerReading[]>([]);
  const [health,       setHealth]       = useState<HealthRecord | null>(null);
  const [cost,         setCost]         = useState<CostSummary | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [newKm,        setNewKm]        = useState("");
  const [savingKm,     setSavingKm]     = useState(false);
  const [healthEdit,   setHealthEdit]   = useState(false);
  const [newHealth,    setNewHealth]    = useState<HealthStatus>("healthy");
  const [healthReason, setHealthReason] = useState("");
  const [savingHealth, setSavingHealth] = useState(false);

  const load = async () => {
    try {
      const [rRes, oRes, hRes, cRes] = await Promise.all([
        fetch(`/next-api/maintenance?carId=${carId}`),
        fetch(`/next-api/odometer?carId=${carId}`),
        fetch(`/next-api/vehicle-health/${carId}`),
        fetch(`/next-api/fleet-analytics/cost-summary?carId=${carId}`),
      ]);
      if (rRes.ok) setRecords(await rRes.json());
      if (oRes.ok) setOdometer(await oRes.json());
      if (hRes.ok) setHealth(await hRes.json());
      if (cRes.ok) setCost(await cRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [carId]);

  const logOdometer = async () => {
    if (!newKm || isNaN(+newKm)) return;
    setSavingKm(true);
    try {
      const res = await fetch("/next-api/odometer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId, readingKm: +newKm, recordedAt: new Date().toISOString(), source: "manual" }),
      });
      if (res.ok) { setNewKm(""); await load(); }
    } finally { setSavingKm(false); }
  };

  const saveHealth = async () => {
    setSavingHealth(true);
    try {
      const res = await fetch(`/next-api/vehicle-health/${carId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newHealth, reason: healthReason || undefined }),
      });
      if (res.ok) { setHealthEdit(false); setHealthReason(""); await load(); }
    } finally { setSavingHealth(false); }
  };

  if (loading) return <div style={{ padding: 32, color: "#94a3b8" }}>Loading…</div>;

  const currentKm = odometer[0]?.readingKm ?? null;
  const currentStatus = health?.status ?? "healthy";

  return (
    <div className={styles.panel}>

      {/* Health + Odometer row */}
      <div className={styles.topRow}>
        <div className={styles.healthBox} style={{ borderColor: HEALTH_COLOR[currentStatus] }}>
          <div className={styles.healthBadge} style={{ background: `${HEALTH_COLOR[currentStatus]}20`, color: HEALTH_COLOR[currentStatus] }}>
            {HEALTH_LABEL[currentStatus]}
          </div>
          {health?.reason && <p className={styles.healthReason}>{health.reason}</p>}
          {!healthEdit ? (
            <button className={styles.editBtn} onClick={() => { setHealthEdit(true); setNewHealth(currentStatus); }}>
              Update health
            </button>
          ) : (
            <div className={styles.healthForm}>
              <select className={styles.select} value={newHealth} onChange={e => setNewHealth(e.target.value as HealthStatus)}>
                {(Object.keys(HEALTH_LABEL) as HealthStatus[]).map(s => <option key={s} value={s}>{HEALTH_LABEL[s]}</option>)}
              </select>
              <input className={styles.input} placeholder="Reason (optional)" value={healthReason} onChange={e => setHealthReason(e.target.value)} />
              <div className={styles.formActions}>
                <button className={styles.saveBtn} onClick={saveHealth} disabled={savingHealth}>{savingHealth ? "Saving…" : "Save"}</button>
                <button className={styles.cancelBtn} onClick={() => setHealthEdit(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.odometerBox}>
          <p className={styles.odometerTitle}>Current odometer</p>
          <p className={styles.odometerValue}>{currentKm != null ? `${currentKm.toLocaleString()} km` : "—"}</p>
          <div className={styles.odometerForm}>
            <input
              className={styles.input} type="number" placeholder="New reading (km)"
              value={newKm} onChange={e => setNewKm(e.target.value)}
            />
            <button className={styles.saveBtn} onClick={logOdometer} disabled={savingKm || !newKm}>
              {savingKm ? "…" : "Log"}
            </button>
          </div>
        </div>

        {cost && (
          <div className={styles.costBox}>
            <p className={styles.costTitle}>Maintenance costs</p>
            <p className={styles.costValue}>{fmtEur(cost.totalCostEur)}</p>
            <p className={styles.costSub}>{cost.count} records · avg {fmtEur(cost.avgCostEur)}</p>
          </div>
        )}
      </div>

      {/* Maintenance history */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Maintenance history</h2>
        {records.length === 0 ? (
          <p className={styles.empty}>No maintenance records for this vehicle.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Title</th><th>Type</th><th>Scheduled</th><th>Completed</th><th>Cost</th><th>Status</th></tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td style={{ fontSize: 12, color: "#64748b" }}>{r.maintenanceType?.name ?? "—"}</td>
                    <td>{fmtDate(r.scheduledDate)}</td>
                    <td>{fmtDate(r.completedAt)}</td>
                    <td>{fmtEur(r.costEur)}</td>
                    <td>
                      <span style={{ display:"inline-block", padding:"2px 9px", borderRadius:12, fontSize:11, fontWeight:600, background:`${STATUS_COLOR[r.status]}20`, color:STATUS_COLOR[r.status] }}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Odometer history */}
      {odometer.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Odometer history</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Reading</th><th>Date</th><th>Source</th></tr></thead>
              <tbody>
                {odometer.slice(0, 10).map(o => (
                  <tr key={o.id}>
                    <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{o.readingKm.toLocaleString()} km</td>
                    <td>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(o.recordedAt))}</td>
                    <td style={{ fontSize: 12, color: "#64748b", textTransform: "capitalize" }}>{o.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
