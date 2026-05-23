"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string;
  totalCents: number;
  createdAt: string;
}

function cents(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }).format(n / 100);
}

export default function DraftOrdersPage() {
  const [items, setItems]     = useState<Order[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset]   = useState(0);
  const limit = 50;

  useEffect(() => {
    setLoading(true);
    fetch(`/next-api/shop/orders?status=draft&limit=${limit}&offset=${offset}`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? d ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [offset]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Draft Orders</h1>
        <span className={styles.subtitle}>{total} drafts</span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 8 }, (_, i) => (
              <tr key={i}>{Array.from({ length: 4 }, (__, j) => <td key={j}><span className={styles.skeleton} style={{ height: 14, width: "80%" }} /></td>)}</tr>
            ))
          ) : items.length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No draft orders</td></tr>
          ) : items.map(o => (
            <tr key={o.id}>
              <td><Link href={`/admin/shop/orders/${o.id}`} className={styles.link}>{o.orderNumber}</Link></td>
              <td>{o.customerEmail}</td>
              <td>{cents(o.totalCents)}</td>
              <td>{new Date(o.createdAt).toLocaleDateString("en-GB")}</td>
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
