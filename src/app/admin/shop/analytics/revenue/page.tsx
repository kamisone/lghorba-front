"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface RevenuePoint { date: string; revenueCents: number; orders: number }

function cents(n: number) { return `€${(n / 100).toFixed(2)}`; }

export default function RevenueAnalyticsPage() {
  const [days, setDays]       = useState(30);
  const [series, setSeries]   = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/next-api/shop/analytics/revenue-series?days=${days}`)
      .then(r => r.json())
      .then(d => setSeries(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [days]);

  const totalRevenue = series.reduce((s, p) => s + p.revenueCents, 0);
  const totalOrders  = series.reduce((s, p) => s + p.orders, 0);
  const avgOrder     = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const maxRevenue   = Math.max(...series.map(p => p.revenueCents), 1);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Revenue Analytics</h1>
        <select className={styles.filterSelect} value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className={styles.kpiGrid} style={{ marginBottom: 32 }}>
        {loading ? Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={styles.kpiCard}>
            <span className={styles.skeleton} style={{ height: 12, width: "55%" }} />
            <span className={`${styles.skeleton} ${styles.skeletonKpi}`} />
          </div>
        )) : (
          <>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Total Revenue</div><div className={styles.kpiValue}>{cents(totalRevenue)}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Total Orders</div><div className={styles.kpiValue}>{totalOrders}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Avg Order Value</div><div className={styles.kpiValue}>{cents(avgOrder)}</div></div>
          </>
        )}
      </div>

      {loading && <span className={styles.skeleton} style={{ height: 180, width: "100%", borderRadius: 12, display: "block", marginBottom: 32 }} />}
      {!loading && series.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Daily Revenue</h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 180, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 16px 8px", marginBottom: 32 }}>
            {series.map(p => (
              <div key={p.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  style={{ width: "100%", background: "#1d4ed8", borderRadius: 3, height: `${(p.revenueCents / maxRevenue) * 148}px`, minHeight: p.revenueCents > 0 ? 2 : 0 }}
                  title={`${p.date}: ${cents(p.revenueCents)} (${p.orders} orders)`}
                />
                <span style={{ fontSize: 9, color: "#9ca3af", transform: "rotate(-45deg)", display: "block", transformOrigin: "top left" }}>{p.date.slice(5)}</span>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Daily Breakdown</h2>
          <table className={styles.table}>
            <thead><tr><th>Date</th><th>Orders</th><th>Revenue</th><th>Avg Order</th></tr></thead>
            <tbody>
              {[...series].reverse().map(p => (
                <tr key={p.date}>
                  <td>{p.date}</td>
                  <td>{p.orders}</td>
                  <td>{cents(p.revenueCents)}</td>
                  <td>{p.orders > 0 ? cents(p.revenueCents / p.orders) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {!loading && series.length === 0 && (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 48 }}>No revenue data for this period.</p>
      )}
    </div>
  );
}
