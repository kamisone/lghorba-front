"use client";

import { useEffect, useState } from "react";
import styles from "./Reviews.module.css";
import { useToast } from "@/components/toast/ToastContext";

interface Review {
  id: string;
  productId: string;
  authorName: string;
  authorEmail: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  createdAt: string;
}

type Tab = "pending" | "published" | "rejected" | "";

const TABS: { key: Tab; label: string }[] = [
  { key: "",          label: "All" },
  { key: "pending",   label: "Pending" },
  { key: "published", label: "Published" },
  { key: "rejected",  label: "Rejected" },
];

function badgeCls(status: string) {
  if (status === "published") return styles.badgePublished;
  if (status === "rejected")  return styles.badgeRejected;
  return styles.badgePending;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={`${styles.star} ${n <= rating ? styles.starFilled : styles.starEmpty}`}>★</span>
      ))}
      <span className={styles.ratingNum}>{rating}/5</span>
    </div>
  );
}

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tab, setTab]         = useState<Tab>("pending");
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);

  const [counts, setCounts] = useState<Record<string, number>>({});

  async function load(status: Tab) {
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
    } finally { setLoading(false); }
  }

  async function loadCounts() {
    const statuses: Tab[] = ["pending", "published", "rejected"];
    const results = await Promise.all(
      statuses.map(s => fetch(`/next-api/shop/reviews?limit=1&status=${s}`).then(r => r.ok ? r.json() : { total: 0 }))
    );
    setCounts({ pending: results[0].total ?? 0, published: results[1].total ?? 0, rejected: results[2].total ?? 0 });
  }

  useEffect(() => { load(tab); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadCounts(); }, []);

  function switchTab(next: Tab) { setTab(next); }

  async function moderate(id: string, newStatus: "published" | "rejected") {
    const res = await fetch(`/next-api/shop/reviews/${id}/moderate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { toast.success(`Review ${newStatus}`); loadCounts(); }
    else toast.error("Failed to moderate review");
    load(tab);
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Review Moderation</h1>
          <span className={styles.subtitle}>{total} {tab ? tab : "total"} reviews</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        {TABS.map(t => {
          const count = t.key ? counts[t.key] : undefined;
          return (
            <button
              key={t.key}
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
              onClick={() => switchTab(t.key)}
            >
              {t.label}
              {count !== undefined && count > 0 && (
                <span className={`${styles.tabCount} ${tab === t.key ? styles.tabCountActive : ""}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Author</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {[140, 90, 200, 70, 80, 110].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w, display: "block" }} /></td>
                  ))}
                </tr>
              ))
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}>⭐</span>
                    <span className={styles.emptyText}>
                      {tab === "pending" ? "No reviews awaiting moderation" : `No ${tab || ""} reviews`}
                    </span>
                    {tab === "pending" && (
                      <span className={styles.emptyHint}>New customer reviews will appear here</span>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              reviews.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className={styles.authorName}>{r.authorName}</div>
                    <div className={styles.authorEmail}>{r.authorEmail}</div>
                  </td>
                  <td>
                    <StarRating rating={r.rating} />
                  </td>
                  <td>
                    {r.title
                      ? <div className={styles.reviewTitle}>{r.title}</div>
                      : <span className={styles.reviewNoContent}>No title</span>
                    }
                    {r.body && <div className={styles.reviewBody}>{r.body}</div>}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${badgeCls(r.status)}`}>{r.status}</span>
                  </td>
                  <td>
                    <span className={styles.date}>
                      {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {r.status !== "published" && (
                        <button className={`${styles.actionBtn} ${styles.actionPublish}`} onClick={() => moderate(r.id, "published")}>
                          Publish
                        </button>
                      )}
                      {r.status !== "rejected" && (
                        <button className={`${styles.actionBtn} ${styles.actionReject}`} onClick={() => moderate(r.id, "rejected")}>
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
