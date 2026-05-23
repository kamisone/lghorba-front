"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface Transaction {
  id: string;
  orderId: string;
  provider: string;
  providerTransactionId: string;
  type: string;
  status: string;
  amountCents: number;
  currency: string;
  createdAt: string;
}

function cents(n: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n / 100);
}

const STATUS_CLASS: Record<string, string> = {
  succeeded: styles.badgeActive,
  failed:    styles.badgeCancelled,
  pending:   styles.badgeDraft,
  cancelled: styles.badgeCancelled,
};

export default function TransactionsPage() {
  const [items, setItems]       = useState<Transaction[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [type, setType]         = useState("");
  const [status, setStatus]     = useState("");
  const [offset, setOffset]     = useState(0);
  const limit = 50;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (type)   params.set("type",   type);
    if (status) params.set("status", status);
    fetch(`/next-api/admin/shop/transactions?${params}`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [type, status, offset]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Transactions</h1>
        <span className={styles.subtitle}>{total} total</span>
      </div>

      <div className={styles.filters}>
        <select className={styles.filterSelect} value={type} onChange={e => { setType(e.target.value); setOffset(0); }}>
          <option value="">All types</option>
          <option value="charge">Charge</option>
          <option value="refund">Refund</option>
          <option value="partial_refund">Partial refund</option>
        </select>
        <select className={styles.filterSelect} value={status} onChange={e => { setStatus(e.target.value); setOffset(0); }}>
          <option value="">All statuses</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Order</th>
            <th>Provider</th>
            <th>Type</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 8 }, (_, i) => (
              <tr key={i}>{Array.from({ length: 6 }, (__, j) => <td key={j}><span className={styles.skeleton} style={{ height: 14, width: "80%" }} /></td>)}</tr>
            ))
          ) : items.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No transactions found</td></tr>
          ) : items.map(t => (
            <tr key={t.id}>
              <td>{new Date(t.createdAt).toLocaleDateString("en-GB")}</td>
              <td><span style={{ fontFamily: "monospace", fontSize: 12 }}>{t.orderId.slice(0, 8)}…</span></td>
              <td>{t.provider}</td>
              <td><span className={`${styles.badge} ${styles.badgeDraft}`}>{t.type.replace("_", " ")}</span></td>
              <td><span className={`${styles.badge} ${STATUS_CLASS[t.status] ?? styles.badgeDraft}`}>{t.status}</span></td>
              <td>{cents(t.amountCents, t.currency)}</td>
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
