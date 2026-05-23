"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface Transaction {
  id: string;
  orderId: string;
  provider: string;
  type: string;
  amountCents: number;
  currency: string;
  createdAt: string;
}

function cents(n: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n / 100);
}

export default function PaymentFailuresPage() {
  const [items, setItems]     = useState<Transaction[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/next-api/admin/shop/transactions?status=failed&limit=100")
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Payment Failures</h1>
        <span className={styles.subtitle}>{total} failed</span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Order</th>
            <th>Provider</th>
            <th>Type</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }, (_, i) => (
              <tr key={i}>{Array.from({ length: 5 }, (__, j) => <td key={j}><span className={styles.skeleton} style={{ height: 14, width: "80%" }} /></td>)}</tr>
            ))
          ) : items.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No payment failures found</td></tr>
          ) : items.map(t => (
            <tr key={t.id}>
              <td>{new Date(t.createdAt).toLocaleDateString("en-GB")}</td>
              <td><span style={{ fontFamily: "monospace", fontSize: 12 }}>{t.orderId.slice(0, 8)}…</span></td>
              <td>{t.provider}</td>
              <td>{t.type.replace("_", " ")}</td>
              <td>{cents(t.amountCents, t.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
