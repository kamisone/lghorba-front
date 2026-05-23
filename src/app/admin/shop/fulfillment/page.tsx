"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface Shipment {
  id: string;
  orderId: string;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  estimatedDeliveryAt: string | null;
  createdAt: string;
}

const STATUS_CLASS: Record<string, string> = {
  pending:       styles.badgeDraft,
  label_created: styles.badgeDraft,
  in_transit:    styles.badgeActive,
  delivered:     styles.badgeActive,
  failed:        styles.badgeCancelled,
};

export default function FulfillmentPage() {
  const [items, setItems]     = useState<Shipment[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState("");
  const [offset, setOffset]   = useState(0);
  const limit = 50;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (status) params.set("status", status);
    fetch(`/next-api/admin/shop/shipments?${params}`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [status, offset]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Fulfillment Tracking</h1>
        <span className={styles.subtitle}>{total} shipments</span>
      </div>

      <div className={styles.filters}>
        <select className={styles.filterSelect} value={status} onChange={e => { setStatus(e.target.value); setOffset(0); }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="label_created">Label Created</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Order</th>
            <th>Status</th>
            <th>Carrier</th>
            <th>Tracking</th>
            <th>Shipped</th>
            <th>Est. Delivery</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 8 }, (_, i) => (
              <tr key={i}>{Array.from({ length: 6 }, (__, j) => <td key={j}><span className={styles.skeleton} style={{ height: 14, width: "80%" }} /></td>)}</tr>
            ))
          ) : items.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No shipments found</td></tr>
          ) : items.map(s => (
            <tr key={s.id}>
              <td><span style={{ fontFamily: "monospace", fontSize: 12 }}>{s.orderId.slice(0, 8)}…</span></td>
              <td><span className={`${styles.badge} ${STATUS_CLASS[s.status] ?? styles.badgeDraft}`}>{s.status.replace("_", " ")}</span></td>
              <td>{s.carrier ?? "—"}</td>
              <td>
                {s.trackingNumber
                  ? s.trackingUrl
                    ? <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>{s.trackingNumber}</a>
                    : s.trackingNumber
                  : "—"}
              </td>
              <td>{s.shippedAt ? new Date(s.shippedAt).toLocaleDateString("en-GB") : "—"}</td>
              <td>{s.estimatedDeliveryAt ? new Date(s.estimatedDeliveryAt).toLocaleDateString("en-GB") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {!loading && total > limit && (
        <div className={styles.pagination}>
          <button className={styles.btn} disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - limit))}>Previous</button>
          <span>{Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}</span>
          <button className={styles.btn} disabled={offset + limit >= total} onClick={() => setOffset(o => o + limit)}>Next</button>
        </div>
      )}
    </div>
  );
}
