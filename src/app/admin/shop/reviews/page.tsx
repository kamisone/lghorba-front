"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./Reviews.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { Star, BadgeCheck } from "lucide-react";

interface ReviewMedia { key: string; type: "image" | "video"; url: string }

interface Review {
  id: string;
  productId: string;
  productTitle: string | null;
  authorName: string;
  authorEmail: string;
  rating: number;
  title: string | null;
  body: string | null;
  media: ReviewMedia[];
  status: string;
  isVerifiedPurchase: boolean;
  rejectionReason: string | null;
  createdAt: string;
}

type Tab = "pending" | "approved" | "rejected" | "hidden" | "";

const TABS: { key: Tab; label: string }[] = [
  { key: "",          label: "All" },
  { key: "pending",   label: "Pending" },
  { key: "approved",  label: "Approved" },
  { key: "rejected",  label: "Rejected" },
  { key: "hidden",    label: "Hidden" },
];

function badgeCls(status: string) {
  if (status === "approved") return styles.badgeApproved;
  if (status === "rejected") return styles.badgeRejected;
  if (status === "hidden")   return styles.badgeHidden;
  return styles.badgePending;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={`${styles.star} ${n <= rating ? styles.starFilled : styles.starEmpty}`}><Star size={14} strokeWidth={1.75} /></span>
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

  const [rejectTarget, setRejectTarget] = useState<Review | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [editTarget, setEditTarget] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editTitle, setEditTitle]   = useState("");
  const [editBody, setEditBody]     = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);

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
    const statuses: Tab[] = ["pending", "approved", "rejected", "hidden"];
    const results = await Promise.all(
      statuses.map(s => fetch(`/next-api/shop/reviews?limit=1&status=${s}`).then(r => r.ok ? r.json() : { total: 0 }))
    );
    setCounts({
      pending:  results[0].total ?? 0,
      approved: results[1].total ?? 0,
      rejected: results[2].total ?? 0,
      hidden:   results[3].total ?? 0,
    });
  }

  useEffect(() => { load(tab); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadCounts(); }, []);

  function switchTab(next: Tab) { setTab(next); }

  async function moderate(id: string, status: "approved" | "rejected" | "hidden" | "pending", rejectionReason?: string) {
    const res = await fetch(`/next-api/shop/reviews/${id}/moderate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejectionReason }),
    });
    if (res.ok) { toast.success(`Review ${status}`); loadCounts(); }
    else toast.error("Failed to moderate review");
    load(tab);
  }

  function openReject(review: Review) {
    setRejectTarget(review);
    setRejectReason("");
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    await moderate(rejectTarget.id, "rejected", rejectReason.trim() || undefined);
    setRejectTarget(null);
  }

  function openEdit(review: Review) {
    setEditTarget(review);
    setEditRating(review.rating);
    setEditTitle(review.title ?? "");
    setEditBody(review.body ?? "");
  }

  async function confirmEdit() {
    if (!editTarget) return;
    const res = await fetch(`/next-api/shop/reviews/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: editRating, title: editTitle.trim() || null, body: editBody.trim() || null }),
    });
    if (res.ok) { toast.success("Review updated"); loadCounts(); } else toast.error("Failed to update review");
    setEditTarget(null);
    load(tab);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/next-api/shop/reviews/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Review deleted"); loadCounts(); } else toast.error("Failed to delete review");
    setDeleteTarget(null);
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
              <th>Product</th>
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
                  {[110, 140, 90, 200, 70, 80, 140].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w, display: "block" }} /></td>
                  ))}
                </tr>
              ))
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={7}>
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
                    <Link href={`/admin/shop/products/${r.productId}`} className={styles.productLink}>
                      {r.productTitle ?? "—"}
                    </Link>
                  </td>
                  <td>
                    <div className={styles.authorName}>{r.authorName}</div>
                    <div className={styles.authorEmail}>{r.authorEmail}</div>
                    {r.isVerifiedPurchase && (
                      <span className={styles.verifiedPill}><BadgeCheck size={11} strokeWidth={2.25} /> Verified</span>
                    )}
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
                    {r.media.length > 0 && (
                      <div className={styles.mediaRow}>
                        {r.media.map(m => (
                          <a key={m.key} href={m.url} target="_blank" rel="noopener noreferrer" className={styles.mediaThumb}>
                            {m.type === "video" ? <video src={m.url} muted /> : <img src={m.url} alt="" />}
                          </a>
                        ))}
                      </div>
                    )}
                    {r.status === "rejected" && r.rejectionReason && (
                      <div className={styles.reviewBody}>Reason: {r.rejectionReason}</div>
                    )}
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
                      {r.status !== "approved" && (
                        <button className={`${styles.actionBtn} ${styles.actionApprove}`} onClick={() => moderate(r.id, "approved")}>
                          Approve
                        </button>
                      )}
                      {r.status !== "rejected" && (
                        <button className={`${styles.actionBtn} ${styles.actionReject}`} onClick={() => openReject(r)}>
                          Reject
                        </button>
                      )}
                      {r.status === "approved" && (
                        <button className={`${styles.actionBtn} ${styles.actionHide}`} onClick={() => moderate(r.id, "hidden")}>
                          Hide
                        </button>
                      )}
                      <button className={`${styles.actionBtn} ${styles.actionEdit}`} onClick={() => openEdit(r)}>
                        Edit
                      </button>
                      <button className={`${styles.actionBtn} ${styles.actionDelete}`} onClick={() => setDeleteTarget(r)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Reject reason modal ── */}
      {rejectTarget && (
        <div className={styles.overlay} onMouseDown={e => { if (e.target === e.currentTarget) setRejectTarget(null); }}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Reject review">
            <h2 className={styles.modalTitle}>Reject review</h2>
            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="reject-reason">Reason (optional, internal)</label>
              <textarea
                id="reject-reason" className={styles.modalTextarea}
                value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Why is this review being rejected?"
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalBtnCancel} onClick={() => setRejectTarget(null)}>Cancel</button>
              <button className={styles.modalBtnDanger} onClick={confirmReject}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editTarget && (
        <div className={styles.overlay} onMouseDown={e => { if (e.target === e.currentTarget) setEditTarget(null); }}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Edit review">
            <h2 className={styles.modalTitle}>Edit review</h2>
            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="edit-rating">Rating</label>
              <select id="edit-rating" className={styles.modalInput} value={editRating} onChange={e => setEditRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n}/5</option>)}
              </select>
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="edit-title">Title</label>
              <input id="edit-title" className={styles.modalInput} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor="edit-body">Body</label>
              <textarea id="edit-body" className={styles.modalTextarea} value={editBody} onChange={e => setEditBody(e.target.value)} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalBtnCancel} onClick={() => setEditTarget(null)}>Cancel</button>
              <button className={styles.modalBtnConfirm} onClick={confirmEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <div className={styles.overlay} onMouseDown={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Delete review">
            <h2 className={styles.modalTitle}>Delete this review?</h2>
            <p style={{ fontSize: 13.5, color: "var(--color-text-muted)", margin: "0 0 16px" }}>
              This permanently removes the review by {deleteTarget.authorName} and its media. This can't be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalBtnCancel} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className={styles.modalBtnDanger} onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
