"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface BestSeller { productId: string; title: string; totalSold: number; revenueCents: number }

function cents(n: number) { return `€${(n / 100).toFixed(2)}`; }

export default function ProductPerformancePage() {
  const [days, setDays]       = useState(30);
  const [sellers, setSellers] = useState<BestSeller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/next-api/shop/analytics/best-sellers?days=${days}&limit=50`)
      .then(r => r.json())
      .then(d => setSellers(Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : []))
      .finally(() => setLoading(false));
  }, [days]);

  const totalUnits   = sellers.reduce((s, p) => s + p.totalSold, 0);
  const totalRevenue = sellers.reduce((s, p) => s + p.revenueCents, 0);
  const maxSold      = Math.max(...sellers.map(p => p.totalSold), 1);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Product Performance</h1>
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
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Products ranked</div><div className={styles.kpiValue}>{sellers.length}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Total units sold</div><div className={styles.kpiValue}>{totalUnits}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Total revenue</div><div className={styles.kpiValue}>{cents(totalRevenue)}</div></div>
          </>
        )}
      </div>

      {loading ? (
        <table className={styles.table}>
          <thead><tr><th>#</th><th>Product</th><th>Units sold</th><th>Share</th><th>Revenue</th><th>Avg price</th><th></th></tr></thead>
          <tbody>
            {Array.from({ length: 5 }, (_, i) => (
              <tr key={i}>
                {[20, 160, 60, 90, 60, 60, 40].map((w, j) => (
                  <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : sellers.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Units sold</th>
              <th>Share</th>
              <th>Revenue</th>
              <th>Avg price</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((p, i) => (
              <tr key={p.productId}>
                <td style={{ color: "#9ca3af", width: 32 }}>{i + 1}</td>
                <td><strong>{p.title}</strong></td>
                <td>{p.totalSold}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ height: 6, width: 80, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(p.totalSold / maxSold) * 100}%`, background: "#1d4ed8", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{Math.round((p.totalSold / totalUnits) * 100)}%</span>
                  </div>
                </td>
                <td>{cents(p.revenueCents)}</td>
                <td style={{ color: "#6b7280" }}>{p.totalSold > 0 ? cents(p.revenueCents / p.totalSold) : "—"}</td>
                <td>
                  <Link href={`/admin/shop/products/${p.productId}`} className={`${styles.btn} ${styles.btnSecondary}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 48 }}>No sales data for this period.</p>
      )}

    </div>
  );
}
