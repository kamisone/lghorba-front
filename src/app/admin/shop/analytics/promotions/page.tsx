"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface PromoPerf {
  code: string;
  name: string;
  usesCount: number;
  discountCents: number;
}

function cents(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }).format(n / 100);
}

export default function PromotionPerformancePage() {
  const [items, setItems]     = useState<PromoPerf[]>([]);
  const [loading, setLoading] = useState(true);

  const totalDiscount = items.reduce((s, p) => s + p.discountCents, 0);
  const totalUses     = items.reduce((s, p) => s + p.usesCount, 0);

  useEffect(() => {
    setLoading(true);
    fetch("/next-api/admin/shop/analytics/promotions")
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Promotion Performance</h1>
      </div>

      <div className={styles.kpiGrid} style={{ marginBottom: 32 }}>
        {loading ? Array.from({ length: 2 }, (_, i) => (
          <div key={i} className={styles.kpiCard}>
            <span className={styles.skeleton} style={{ height: 12, width: "55%" }} />
            <span className={`${styles.skeleton} ${styles.skeletonKpi}`} />
          </div>
        )) : (
          <>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Total Uses</div><div className={styles.kpiValue}>{totalUses}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Total Discount Given</div><div className={styles.kpiValue}>{cents(totalDiscount)}</div></div>
          </>
        )}
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Uses</th>
            <th>Discount Given</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }, (_, i) => (
              <tr key={i}>{Array.from({ length: 4 }, (__, j) => <td key={j}><span className={styles.skeleton} style={{ height: 14, width: "80%" }} /></td>)}</tr>
            ))
          ) : items.length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No promotion data found</td></tr>
          ) : items.map(p => (
            <tr key={p.code}>
              <td><span style={{ fontFamily: "monospace", fontSize: 13 }}>{p.code}</span></td>
              <td>{p.name}</td>
              <td>{p.usesCount}</td>
              <td>{cents(p.discountCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
