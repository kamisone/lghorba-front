"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface SearchOverview {
  totalSearches: number;
  zeroResultSearches: number;
  zeroResultRatePct: number;
}

interface SearchRow { query: string; count: number }

export default function SearchInsightsPage() {
  const [days, setDays]           = useState(30);
  const [overview, setOverview]   = useState<SearchOverview | null>(null);
  const [topSearches, setTop]     = useState<SearchRow[]>([]);
  const [zeroResults, setZero]    = useState<SearchRow[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/next-api/admin/shop/analytics/search-overview?days=${days}`).then(r => r.ok ? r.json() : null),
      fetch(`/next-api/admin/shop/analytics/top-searches?days=${days}&limit=20`).then(r => r.ok ? r.json() : []),
      fetch(`/next-api/admin/shop/analytics/zero-result-searches?days=${days}&limit=20`).then(r => r.ok ? r.json() : []),
    ]).then(([overviewData, topData, zeroData]) => {
      setOverview(overviewData);
      setTop(Array.isArray(topData) ? topData : []);
      setZero(Array.isArray(zeroData) ? zeroData : []);
    }).finally(() => setLoading(false));
  }, [days]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Search Insights</h1>
        <select className={styles.filterSelect} value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className={styles.kpiGrid} style={{ marginBottom: 32 }}>
        {loading || !overview ? Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={styles.kpiCard}>
            <span className={styles.skeleton} style={{ height: 12, width: "55%" }} />
            <span className={`${styles.skeleton} ${styles.skeletonKpi}`} />
          </div>
        )) : (
          <>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Total Searches</div><div className={styles.kpiValue}>{overview.totalSearches}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Zero-Result Searches</div><div className={styles.kpiValue}>{overview.zeroResultSearches}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Zero-Result Rate</div><div className={styles.kpiValue}>{overview.zeroResultRatePct}%</div></div>
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Top Searches</h2>
          {loading ? (
            <span className={styles.skeleton} style={{ height: 200, width: "100%", borderRadius: 12, display: "block" }} />
          ) : topSearches.length === 0 ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: 32 }}>No searches for this period.</p>
          ) : (
            <table className={styles.table}>
              <thead><tr><th>Query</th><th>Searches</th></tr></thead>
              <tbody>
                {topSearches.map(r => (
                  <tr key={r.query}><td>{r.query}</td><td>{r.count}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Zero-Result Searches
            <span style={{ fontWeight: 400, fontSize: 13, color: "#9ca3af", marginLeft: 8 }}>— unmet catalog demand</span>
          </h2>
          {loading ? (
            <span className={styles.skeleton} style={{ height: 200, width: "100%", borderRadius: 12, display: "block" }} />
          ) : zeroResults.length === 0 ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: 32 }}>No zero-result searches for this period.</p>
          ) : (
            <table className={styles.table}>
              <thead><tr><th>Query</th><th>Searches</th></tr></thead>
              <tbody>
                {zeroResults.map(r => (
                  <tr key={r.query}>
                    <td>{r.query}</td>
                    <td><span className={`${styles.badge} ${styles.badgeCancelled}`}>{r.count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
