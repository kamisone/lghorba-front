"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface TestProductDemand {
  productId: string;
  title: string;
  slug: string;
  status: string;
  views: number;
  addsToCart: number;
  reachedCheckout: number;
  viewToCartRatePct: number;
  cartToCheckoutRatePct: number;
  viewToCheckoutRatePct: number;
}

export default function TestProductsAnalyticsPage() {
  const [days, setDays]       = useState(30);
  const [rows, setRows]       = useState<TestProductDemand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/next-api/admin/shop/analytics/test-products?days=${days}`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [days]);

  const totals = rows.reduce(
    (acc, r) => ({
      views: acc.views + r.views,
      addsToCart: acc.addsToCart + r.addsToCart,
      reachedCheckout: acc.reachedCheckout + r.reachedCheckout,
    }),
    { views: 0, addsToCart: 0, reachedCheckout: 0 },
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Test Products</h1>
        <select className={styles.filterSelect} value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <p style={{ marginTop: -12, marginBottom: 20, fontSize: 13, color: "#6b7280", maxWidth: 760, lineHeight: 1.6 }}>
        Test products behave like real products until checkout, which is refused before the
        payment form loads. <strong>Reached checkout</strong> counts customers who entered
        their address, chose a shipping method and clicked through to payment — the furthest
        the product can be taken, and the people who would have bought it. Counted once per
        customer, so retries after the error do not inflate it.
      </p>

      {loading ? (
        <div className={styles.kpiGrid}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Loading</div>
              <div className={`${styles.skeleton} ${styles.skeletonKpi}`} />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: 48 }}>
          No test products yet. Turn on &ldquo;Test product&rdquo; on a product to start
          measuring demand.
        </p>
      ) : (
        <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Test Products</div>
              <div className={styles.kpiValue}>{rows.length}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Views</div>
              <div className={styles.kpiValue}>{totals.views}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Added to Cart</div>
              <div className={styles.kpiValue}>{totals.addsToCart}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Reached Checkout</div>
              <div className={styles.kpiValue} style={{ color: "#b45309" }}>{totals.reachedCheckout}</div>
            </div>
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Demand by product — Last {days} days
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Views</th>
                  <th>Added to Cart</th>
                  <th>Reached Checkout</th>
                  <th>View → Cart</th>
                  <th>Cart → Checkout</th>
                  <th>View → Checkout</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.productId}>
                    <td>
                      <Link href={`/admin/shop/products/${r.productId}`} className={styles.link}>
                        {r.title}
                      </Link>
                    </td>
                    <td style={{ color: "#6b7280" }}>{r.status}</td>
                    <td>{r.views}</td>
                    <td>{r.addsToCart}</td>
                    <td style={{ fontWeight: 700, color: "#b45309" }}>{r.reachedCheckout}</td>
                    <td>{r.viewToCartRatePct}%</td>
                    <td>{r.cartToCheckoutRatePct}%</td>
                    <td>{r.viewToCheckoutRatePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
