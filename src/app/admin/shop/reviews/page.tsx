"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

interface Review { id: string; productId: string; authorName: string; authorEmail: string; rating: number; title: string | null; body: string | null; status: string; createdAt: string }

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [status, setStatus] = useState("pending");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "50" });
      if (status) qs.set("status", status);
      const res = await fetch(`/next-api/shop/reviews?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [status]);

  async function moderate(id: string, newStatus: "published" | "rejected") {
    const res = await fetch(`/next-api/shop/reviews/${id}/moderate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) toast.success(`Review ${newStatus}`);
    else toast.error("Failed to moderate review");
    load();
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Review Moderation</h1>
      </div>
      <div className={styles.filters}>
        <select className={styles.filterSelect} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
        </select>
        <span style={{ fontSize: 14, color: "#6b7280" }}>{total} reviews</span>
      </div>
      <table className={styles.table}>
        <thead><tr><th>Author</th><th>Rating</th><th>Title</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
          {loading ? Array.from({ length: 5 }, (_, i) => (
            <tr key={i}>
              {[130, 40, 120, 60, 70, 90].map((w, j) => (
                <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
              ))}
            </tr>
          )) : reviews.map(r => (
            <tr key={r.id}>
              <td>{r.authorName}<br /><span style={{ fontSize: 12, color: "#9ca3af" }}>{r.authorEmail}</span></td>
              <td>{"★".repeat(r.rating)}</td>
              <td>{r.title ?? <span style={{ color: "#9ca3af" }}>—</span>}</td>
              <td><span className={`${styles.badge} ${r.status === "published" ? styles.badgePublished : r.status === "rejected" ? styles.badgeRejected : styles.badgePending}`}>{r.status}</span></td>
              <td style={{ fontSize: 12, color: "#9ca3af" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
              <td style={{ display: "flex", gap: 8 }}>
                {r.status !== "published" && <button onClick={() => moderate(r.id, "published")} className={`${styles.btn} ${styles.btnSuccess}`} style={{ fontSize: 12, padding: "4px 10px" }}>Publish</button>}
                {r.status !== "rejected" && <button onClick={() => moderate(r.id, "rejected")} className={`${styles.btn} ${styles.btnDanger}`} style={{ fontSize: 12, padding: "4px 10px" }}>Reject</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
