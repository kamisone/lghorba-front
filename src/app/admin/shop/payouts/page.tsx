"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface Payout {
  id: string;
  vendorId: string;
  orderId: string;
  orderItemId: string | null;
  grossCents: number;
  platformFeeCents: number;
  netCents: number;
  status: "pending" | "transferred" | "failed";
  stripeTransferId: string | null;
  failureReason: string | null;
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending:     styles.badgePending,
  transferred: styles.badgeActive,
  failed:      styles.badgeCancelled,
};

function cents(n: number) { return `€${(n / 100).toFixed(2)}`; }

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 25;

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
      const res = await fetch(`/next-api/admin/shop/payouts?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setPayouts(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page]);

  const pages = Math.ceil(total / limit);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vendor Payouts</h1>
        <span style={{ fontSize: 14, color: "#6b7280" }}>{total} total</span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Order</th>
            <th>Gross</th>
            <th>Platform fee</th>
            <th>Net</th>
            <th>Status</th>
            <th>Stripe Transfer</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: 5 }, (_, i) => (
            <tr key={i}>
              {[70, 70, 60, 60, 60, 60, 100, 70].map((w, j) => (
                <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
              ))}
            </tr>
          )) : payouts.map(p => (
            <tr key={p.id}>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.vendorId.slice(0, 8)}…</td>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.orderId.slice(0, 8)}…</td>
              <td>{cents(p.grossCents)}</td>
              <td style={{ color: "#dc2626" }}>−{cents(p.platformFeeCents)}</td>
              <td><strong>{cents(p.netCents)}</strong></td>
              <td>
                <span className={`${styles.badge} ${STATUS_BADGE[p.status] ?? styles.badgeDraft}`}>
                  {p.status}
                </span>
              </td>
              <td style={{ fontSize: 12, fontFamily: "monospace", color: "#6b7280" }}>
                {p.stripeTransferId ?? (p.failureReason ? <span style={{ color: "#dc2626" }} title={p.failureReason}>Failed</span> : "—")}
              </td>
              <td style={{ fontSize: 13, color: "#9ca3af" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
          {!loading && payouts.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No payouts yet</td></tr>
          )}
        </tbody>
      </table>

      {pages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>{total} payouts</span>
          <button className={`${styles.btn} ${styles.btnSecondary}`} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span style={{ fontSize: 14 }}>Page {page} / {pages}</span>
          <button className={`${styles.btn} ${styles.btnSecondary}`} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
