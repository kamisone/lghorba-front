"use client";

import { useEffect, useState } from "react";

type HealthStatus = "healthy"|"warning"|"critical"|"unsafe"|"needs_service";
interface HealthOverview { healthy: number; warning: number; critical: number; unsafe: number; needs_service: number; }
interface CostRow { carId: string; name: string; maintenanceCount: number; totalCostEur: number; downtimeDays: number; odometerDeltaKm: number | null; costPerKm: number | null; }

const HEALTH_COLOR: Record<HealthStatus, string> = {
  healthy: "#22c55e", warning: "#f59e0b", critical: "#ef4444", unsafe: "#7c3aed", needs_service: "#f97316",
};

function fmtEur(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

export default function FleetAnalytics() {
  const [health,  setHealth]  = useState<HealthOverview | null>(null);
  const [costs,   setCosts]   = useState<CostRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [hRes, cRes] = await Promise.all([
          fetch("/next-api/fleet-analytics/health-overview"),
          fetch("/next-api/fleet-analytics/cost-per-vehicle"),
        ]);
        if (hRes.ok) setHealth(await hRes.json());
        if (cRes.ok) setCosts(await cRes.json());
      } finally { setLoading(false); }
    })();
  }, []);

  const maxCost = costs.length > 0 ? Math.max(...costs.map(r => r.totalCostEur), 1) : 1;
  const totalHealthVehicles = health ? Object.values(health).reduce((s, v) => s + v, 0) : 0;

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px" }}>Fleet Analytics</h1>

      {/* Health overview */}
      {health && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px", color: "#0f172a" }}>Fleet Health</h2>
          <div style={{ display: "flex", gap: 4, height: 24, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", marginBottom: 10 }}>
            {(Object.entries(health) as [HealthStatus, number][]).map(([s, count]) => {
              const pct = totalHealthVehicles > 0 ? (count / totalHealthVehicles) * 100 : 0;
              if (pct < 1) return null;
              return <div key={s} style={{ flex: pct, background: HEALTH_COLOR[s], minWidth: 4 }} title={`${s}: ${count}`} />;
            })}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {(Object.entries(health) as [HealthStatus, number][]).map(([s, count]) => (
              <span key={s} style={{ fontSize: 12, color: "#64748b" }}>
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: HEALTH_COLOR[s], marginRight: 5 }} />
                {s.replace(/_/g, " ")}: <strong style={{ color: "#0f172a" }}>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cost per vehicle */}
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px", color: "#0f172a" }}>Maintenance Costs by Vehicle</h2>
      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading…</p>
      ) : costs.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>No completed maintenance records yet.</p>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Vehicle","Records","Total Cost","Downtime","Odometer Δ","Cost / km","Cost bar"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748b", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {costs.map(r => (
                <tr key={r.carId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: "10px 14px" }}>{r.maintenanceCount}</td>
                  <td style={{ padding: "10px 14px", fontVariantNumeric: "tabular-nums" }}>{fmtEur(r.totalCostEur)}</td>
                  <td style={{ padding: "10px 14px" }}>{r.downtimeDays > 0 ? `${r.downtimeDays}d` : "—"}</td>
                  <td style={{ padding: "10px 14px" }}>{r.odometerDeltaKm != null ? `${r.odometerDeltaKm.toLocaleString()} km` : "—"}</td>
                  <td style={{ padding: "10px 14px" }}>{fmtEur(r.costPerKm)} /km</td>
                  <td style={{ padding: "10px 14px", width: 120 }}>
                    <div style={{ height: 8, borderRadius: 4, background: "#f1f5f9", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(r.totalCostEur / maxCost) * 100}%`, background: "#f97316", borderRadius: 4 }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
