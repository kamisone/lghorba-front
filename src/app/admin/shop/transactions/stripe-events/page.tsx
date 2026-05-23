"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface StripeEvent {
  webhookEventId: string;
  orderId: string;
  status: string;
  count: string;
  createdAt: string;
}

export default function StripeEventsPage() {
  const [items, setItems]     = useState<StripeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/next-api/admin/shop/transactions/stripe-events?limit=100")
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Stripe Events</h1>
        <span className={styles.subtitle}>{items.length} events</span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Event ID</th>
            <th>Order</th>
            <th>Status</th>
            <th>Transactions</th>
            <th>Last seen</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }, (_, i) => (
              <tr key={i}>{Array.from({ length: 5 }, (__, j) => <td key={j}><span className={styles.skeleton} style={{ height: 14, width: "80%" }} /></td>)}</tr>
            ))
          ) : items.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No Stripe events recorded</td></tr>
          ) : items.map(e => (
            <tr key={e.webhookEventId}>
              <td><span style={{ fontFamily: "monospace", fontSize: 12 }}>{e.webhookEventId}</span></td>
              <td><span style={{ fontFamily: "monospace", fontSize: 12 }}>{e.orderId?.slice(0, 8)}…</span></td>
              <td><span className={`${styles.badge} ${styles.badgeDraft}`}>{e.status}</span></td>
              <td>{e.count}</td>
              <td>{new Date(e.createdAt).toLocaleDateString("en-GB")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
