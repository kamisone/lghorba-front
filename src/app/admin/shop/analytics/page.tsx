"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface Overview { totalOrders: number; totalRevenueCents: number; avgOrderCents: number; pendingOrders: number; processingOrders: number; pendingReviews: number }
interface RevenuePoint { date: string; revenueCents: number; orders: number }
interface BestSeller { productId: string; title: string; totalSold: number; revenueCents: number }

function centsToEuros(c: number) { return `€${(c / 100).toFixed(2)}`; }

export default function ShopAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [series, setSeries] = useState<RevenuePoint[]>([]);
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/next-api/shop/analytics/overview?days=${days}`).then(r => r.json()),
      fetch(`/next-api/shop/analytics/revenue-series?days=${days}`).then(r => r.json()),
      fetch(`/next-api/shop/analytics/best-sellers?days=${days}`).then(r => r.json()),
    ]).then(([ov, sr, bs]) => {
      setOverview(ov);
      setSeries(Array.isArray(sr) ? sr : []);
      setBestSellers(Array.isArray(bs) ? bs : Array.isArray(bs?.items) ? bs.items : []);
    }).finally(() => setLoading(false));
  }, [days]);

  const maxRevenue = Math.max(...series.map(p => p.revenueCents), 1);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Shop Analytics</h1>
        <select className={styles.filterSelect} value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className={styles.kpiGrid}>
        {loading ? Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={styles.kpiCard}>
            <span className={styles.skeleton} style={{ height: 12, width: "55%" }} />
            <span className={`${styles.skeleton} ${styles.skeletonKpi}`} />
          </div>
        )) : overview ? (
          <>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Revenue</div><div className={styles.kpiValue}>{centsToEuros(overview.totalRevenueCents)}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Orders</div><div className={styles.kpiValue}>{overview.totalOrders}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Avg Order</div><div className={styles.kpiValue}>{centsToEuros(overview.avgOrderCents)}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Pending Payment</div><div className={styles.kpiValue}>{overview.pendingOrders}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Processing</div><div className={styles.kpiValue}>{overview.processingOrders}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Pending Reviews</div><div className={styles.kpiValue}>{overview.pendingReviews}</div></div>
          </>
        ) : null}
      </div>

      {/* Revenue chart */}
      {loading && (
        <div style={{ marginBottom: 32 }}>
          <span className={styles.skeleton} style={{ height: 18, width: 100, marginBottom: 16, display: "block" }} />
          <span className={styles.skeleton} style={{ height: 140, width: "100%", borderRadius: 12 }} />
        </div>
      )}
      {!loading && series.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Revenue</h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 16px 8px" }}>
            {series.map(p => (
              <div key={p.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", background: "#1d4ed8", borderRadius: 3, height: `${(p.revenueCents / maxRevenue) * 100}px`, minHeight: 2 }} title={`${p.date}: ${centsToEuros(p.revenueCents)}`} />
                <span style={{ fontSize: 9, color: "#9ca3af", transform: "rotate(-45deg)", display: "block" }}>{p.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best sellers */}
      {!loading && bestSellers.length > 0 && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Best Sellers</h2>
          <table className={styles.table}>
            <thead><tr><th>Product</th><th>Units sold</th><th>Revenue</th></tr></thead>
            <tbody>
              {bestSellers.map(b => (
                <tr key={b.productId}>
                  <td>{b.title}</td>
                  <td>{b.totalSold}</td>
                  <td>{centsToEuros(b.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
