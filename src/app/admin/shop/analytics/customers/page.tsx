"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface TopSpender {
  customerId: string;
  email: string;
  totalCents: number;
  orderCount: number;
}

interface CustomerInsights {
  totalCustomers: number;
  newCustomers:   number;
  topSpenders:    TopSpender[];
}

function cents(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }).format(n / 100);
}

export default function CustomerInsightsPage() {
  const [data, setData]       = useState<CustomerInsights | null>(null);
  const [days, setDays]       = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/next-api/admin/shop/analytics/customers?days=${days}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Customer Insights</h1>
        <select className={styles.filterSelect} value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className={styles.kpiGrid} style={{ marginBottom: 32 }}>
        {loading ? Array.from({ length: 2 }, (_, i) => (
          <div key={i} className={styles.kpiCard}>
            <span className={styles.skeleton} style={{ height: 12, width: "55%" }} />
            <span className={`${styles.skeleton} ${styles.skeletonKpi}`} />
          </div>
        )) : (
          <>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Total Customers</div><div className={styles.kpiValue}>{data?.totalCustomers ?? 0}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>New Customers (last {days}d)</div><div className={styles.kpiValue}>{data?.newCustomers ?? 0}</div></div>
          </>
        )}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Top Spenders</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Orders</th>
            <th>Total Spent</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }, (_, i) => (
              <tr key={i}>{Array.from({ length: 3 }, (__, j) => <td key={j}><span className={styles.skeleton} style={{ height: 14, width: "80%" }} /></td>)}</tr>
            ))
          ) : (data?.topSpenders ?? []).length === 0 ? (
            <tr><td colSpan={3} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No data for this period</td></tr>
          ) : (data?.topSpenders ?? []).map(s => (
            <tr key={s.customerId}>
              <td>{s.email}</td>
              <td>{s.orderCount}</td>
              <td>{cents(s.totalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
