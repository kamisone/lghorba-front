"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface VendorPerf {
  vendorId: string;
  orderCount: number;
  revenueCents: number;
  itemsSold: number;
}

interface Vendor { id: string; name: string; }

function cents(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }).format(n / 100);
}

export default function VendorPerformancePage() {
  const [rows, setRows]         = useState<VendorPerf[]>([]);
  const [vendors, setVendors]   = useState<Map<string, string>>(new Map());
  const [days, setDays]         = useState(30);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch("/next-api/admin/shop/vendors?limit=200")
      .then(r => r.json())
      .then(d => {
        const map = new Map<string, string>();
        for (const v of (d.items ?? d ?? []) as Vendor[]) map.set(v.id, v.name);
        setVendors(map);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/next-api/admin/shop/vendors/analytics/performance?days=${days}`)
      .then(r => r.json())
      .then(d => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [days]);

  const totalRevenue = rows.reduce((s, r) => s + r.revenueCents, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vendor Performance</h1>
        <select className={styles.filterSelect} value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className={styles.kpiGrid} style={{ marginBottom: 24 }}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Total Vendor Revenue</div>
          <div className={styles.kpiValue}>{cents(totalRevenue)}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Active Vendors</div>
          <div className={styles.kpiValue}>{rows.length}</div>
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Orders</th>
            <th>Items Sold</th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }, (_, i) => (
              <tr key={i}>{Array.from({ length: 4 }, (__, j) => <td key={j}><span className={styles.skeleton} style={{ height: 14, width: "80%" }} /></td>)}</tr>
            ))
          ) : rows.length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No vendor sales in this period</td></tr>
          ) : rows.map(r => (
            <tr key={r.vendorId}>
              <td>{vendors.get(r.vendorId) ?? <span style={{ fontFamily: "monospace", fontSize: 12 }}>{r.vendorId.slice(0, 8)}…</span>}</td>
              <td>{r.orderCount}</td>
              <td>{r.itemsSold}</td>
              <td>{cents(r.revenueCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
