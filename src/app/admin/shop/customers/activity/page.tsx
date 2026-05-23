"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface EventLog {
  id: string;
  eventName: string;
  entityId: string | null;
  source: string | null;
  status: "success" | "failed";
  error: string | null;
  createdAt: string;
}

export default function CustomerActivityPage() {
  const [items, setItems]     = useState<EventLog[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset]   = useState(0);
  const limit = 50;

  useEffect(() => {
    setLoading(true);
    fetch(`/next-api/admin/shop/customers/activity?limit=${limit}&offset=${offset}`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [offset]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Customer Activity</h1>
        <span className={styles.subtitle}>{total} events</span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Event</th>
            <th>Entity</th>
            <th>Source</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 10 }, (_, i) => (
              <tr key={i}>{Array.from({ length: 5 }, (__, j) => <td key={j}><span className={styles.skeleton} style={{ height: 14, width: "80%" }} /></td>)}</tr>
            ))
          ) : items.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No activity recorded</td></tr>
          ) : items.map(e => (
            <tr key={e.id}>
              <td style={{ whiteSpace: "nowrap" }}>{new Date(e.createdAt).toLocaleString("en-GB")}</td>
              <td><span style={{ fontFamily: "monospace", fontSize: 12 }}>{e.eventName}</span></td>
              <td style={{ fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{e.entityId?.slice(0, 8) ?? "—"}</td>
              <td style={{ color: "#6b7280" }}>{e.source ?? "—"}</td>
              <td>
                <span className={`${styles.badge} ${e.status === "success" ? styles.badgeActive : styles.badgeCancelled}`}>
                  {e.status}
                </span>
                {e.error && <span style={{ color: "#ef4444", fontSize: 12, marginLeft: 8 }}>{e.error.slice(0, 60)}</span>}
              </td>
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
