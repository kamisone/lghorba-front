"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface Order { id: string; orderNumber: string; status: string; customerEmail: string; totalCents: number; createdAt: string }

const STATUS_CLASS: Record<string, string> = {
  pending: styles.badgePending, awaiting_payment: styles.badgePending,
  paid: styles.badgePaid, processing: styles.badgeShipped,
  shipped: styles.badgeShipped, delivered: styles.badgePublished,
  cancelled: styles.badgeCancelled, refunded: styles.badgeCancelled,
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
      if (search) qs.set("search", search);
      if (status) qs.set("status", status);
      const res = await fetch(`/next-api/shop/orders?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, status]);

  const pages = Math.ceil(total / limit);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Orders</h1>
      </div>
      <div className={styles.filters}>
        <input className={styles.filterInput} placeholder="Search orders..." value={search}
          onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { setPage(1); load(); } }} />
        <select className={styles.filterSelect} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {["pending","awaiting_payment","paid","processing","shipped","delivered","cancelled","refunded"].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      <table className={styles.table}>
        <thead>
          <tr><th>Order #</th><th>Email</th><th>Status</th><th>Total</th><th>Date</th><th>Action</th></tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: 5 }, (_, i) => (
            <tr key={i}>
              {[55, 140, 80, 60, 70, 50].map((w, j) => (
                <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
              ))}
            </tr>
          )) : orders.map(o => (
            <tr key={o.id}>
              <td><Link href={`/admin/shop/orders/${o.id}`}>{o.orderNumber}</Link></td>
              <td>{o.customerEmail}</td>
              <td><span className={`${styles.badge} ${STATUS_CLASS[o.status] ?? styles.badgeDraft}`}>{o.status.replace(/_/g, " ")}</span></td>
              <td>€{(o.totalCents / 100).toFixed(2)}</td>
              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
              <td><Link href={`/admin/shop/orders/${o.id}`} className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: 12, padding: "4px 10px" }}>View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.pagination}>
        <span className={styles.pageInfo}>{total} orders</span>
        {Array.from({ length: pages }, (_, i) => (
          <button key={i} onClick={() => setPage(i + 1)} className={`${styles.btn} ${page === i + 1 ? styles.btnPrimary : styles.btnSecondary}`} style={{ padding: "4px 10px", minWidth: 36 }}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
