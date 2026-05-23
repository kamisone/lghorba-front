"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface LowStockItem {
  variantId: string;
  productId: string;
  available: number;
  lowStockThreshold: number;
}

interface InventoryData {
  totalItems:     number;
  outOfStock:     number;
  lowStock:       number;
  lowStockItems:  LowStockItem[];
}

export default function InventoryAnalyticsPage() {
  const [data, setData]       = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/next-api/admin/shop/analytics/inventory")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Inventory Analytics</h1>
      </div>

      <div className={styles.kpiGrid} style={{ marginBottom: 32 }}>
        {loading ? Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={styles.kpiCard}>
            <span className={styles.skeleton} style={{ height: 12, width: "55%" }} />
            <span className={`${styles.skeleton} ${styles.skeletonKpi}`} />
          </div>
        )) : (
          <>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Total SKUs</div><div className={styles.kpiValue}>{data?.totalItems ?? 0}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Out of Stock</div><div className={styles.kpiValue} style={{ color: "#ef4444" }}>{data?.outOfStock ?? 0}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Low Stock</div><div className={styles.kpiValue} style={{ color: "#f59e0b" }}>{data?.lowStock ?? 0}</div></div>
          </>
        )}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Low Stock Items</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Variant</th>
            <th>Available</th>
            <th>Threshold</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }, (_, i) => (
              <tr key={i}>{Array.from({ length: 4 }, (__, j) => <td key={j}><span className={styles.skeleton} style={{ height: 14, width: "80%" }} /></td>)}</tr>
            ))
          ) : (data?.lowStockItems ?? []).length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No low-stock items</td></tr>
          ) : (data?.lowStockItems ?? []).map(item => (
            <tr key={item.variantId}>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{item.variantId.slice(0, 8)}…</td>
              <td style={{ color: item.available === 0 ? "#ef4444" : "#f59e0b", fontWeight: 600 }}>{item.available}</td>
              <td style={{ color: "#6b7280" }}>{item.lowStockThreshold}</td>
              <td>
                <span className={`${styles.badge} ${item.available === 0 ? styles.badgeCancelled : styles.badgeDraft}`}>
                  {item.available === 0 ? "Out of stock" : "Low stock"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
