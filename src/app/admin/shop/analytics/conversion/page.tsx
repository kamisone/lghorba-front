"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface Funnel {
  days: number;
  views: number;
  addsToCart: number;
  checkoutsStarted: number;
  purchases: number;
  viewToCartRatePct: number;
  cartToCheckoutRatePct: number;
  checkoutToPurchaseRatePct: number;
  overallConversionRatePct: number;
}

interface ProductConversion {
  productId: string;
  title: string;
  slug: string;
  views: number;
  addsToCart: number;
  purchases: number;
  conversionRatePct: number;
}

const FUNNEL_STEPS: Array<{ key: keyof Funnel; label: string; color: string }> = [
  { key: "views",            label: "Product Views",    color: "#1d4ed8" },
  { key: "addsToCart",       label: "Added to Cart",    color: "#0891b2" },
  { key: "checkoutsStarted", label: "Checkout Started", color: "#059669" },
  { key: "purchases",        label: "Purchased",        color: "#7c3aed" },
];

export default function ConversionAnalyticsPage() {
  const [days, setDays]         = useState(30);
  const [funnel, setFunnel]     = useState<Funnel | null>(null);
  const [products, setProducts] = useState<ProductConversion[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/next-api/admin/shop/analytics/conversion-funnel?days=${days}`).then(r => r.ok ? r.json() : null),
      fetch(`/next-api/admin/shop/analytics/conversion-by-product?days=${days}&limit=20`).then(r => r.ok ? r.json() : []),
    ]).then(([funnelData, productData]) => {
      setFunnel(funnelData);
      setProducts(Array.isArray(productData) ? productData : []);
    }).finally(() => setLoading(false));
  }, [days]);

  const maxCount = funnel ? Math.max(funnel.views, 1) : 1;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Conversion Analytics</h1>
        <select className={styles.filterSelect} value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className={styles.kpiGrid} style={{ marginBottom: 32 }}>
        {loading || !funnel ? Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={styles.kpiCard}>
            <span className={styles.skeleton} style={{ height: 12, width: "55%" }} />
            <span className={`${styles.skeleton} ${styles.skeletonKpi}`} />
          </div>
        )) : (
          <>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Product Views</div><div className={styles.kpiValue}>{funnel.views}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Added to Cart</div><div className={styles.kpiValue}>{funnel.addsToCart}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Checkouts Started</div><div className={styles.kpiValue}>{funnel.checkoutsStarted}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Purchases</div><div className={styles.kpiValue}>{funnel.purchases}</div></div>
            <div className={styles.kpiCard}><div className={styles.kpiLabel}>Overall Conversion</div><div className={styles.kpiValue}>{funnel.overallConversionRatePct}%</div></div>
          </>
        )}
      </div>

      {!loading && funnel && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Funnel — Last {funnel.days} days</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
            {FUNNEL_STEPS.map((step, i) => {
              const count = funnel[step.key] as number;
              const widthPct = maxCount > 0 ? Math.max((count / maxCount) * 100, count > 0 ? 2 : 0) : 0;
              const prevCount = i > 0 ? (funnel[FUNNEL_STEPS[i - 1].key] as number) : null;
              const stepRatePct = prevCount ? Math.round((count / prevCount) * 1000) / 10 : null;
              return (
                <div key={step.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>{step.label}</span>
                    <span style={{ color: "#6b7280" }}>
                      {count}
                      {stepRatePct !== null && <span style={{ marginLeft: 8, color: "#9ca3af" }}>({stepRatePct}% of previous step)</span>}
                    </span>
                  </div>
                  <div style={{ background: "#f3f4f6", borderRadius: 6, height: 20, overflow: "hidden" }}>
                    <div style={{ width: `${widthPct}%`, background: step.color, height: "100%", borderRadius: 6, transition: "width 0.4s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Conversion by Product</h2>
      {loading ? (
        <span className={styles.skeleton} style={{ height: 200, width: "100%", borderRadius: 12, display: "block" }} />
      ) : products.length === 0 ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 48 }}>No product activity for this period.</p>
      ) : (
        <table className={styles.table}>
          <thead><tr><th>Product</th><th>Views</th><th>Added to Cart</th><th>Purchases</th><th>Conversion Rate</th></tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.productId}>
                <td>
                  {p.slug ? <Link href={`/shop/${p.slug}`} className={styles.link} target="_blank">{p.title}</Link> : p.title}
                </td>
                <td>{p.views}</td>
                <td>{p.addsToCart}</td>
                <td>{p.purchases}</td>
                <td>{p.conversionRatePct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
