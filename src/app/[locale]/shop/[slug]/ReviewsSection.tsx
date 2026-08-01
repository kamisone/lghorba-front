"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Star, BadgeCheck, Play, X } from "lucide-react";
import { getTranslations, toBcp47 } from "@/lib/i18n";
import WriteReviewForm from "./WriteReviewForm";
import styles from "./ReviewsSection.module.css";

interface ReviewMedia { key: string; type: "image" | "video"; url: string; altText?: string | null }

export interface ReviewItem {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string | null;
  media: ReviewMedia[];
  isVerifiedPurchase: boolean;
  createdAt: string;
}

interface Stats { average: number; count: number; distribution?: Record<string, number> }

interface Props {
  productId: string;
  locale: string;
  stats: Stats;
  initialReviews: { items: ReviewItem[]; total: number };
}

function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <div className={styles.cardStars} aria-hidden="true">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={size} strokeWidth={1.75} fill={n <= Math.round(value) ? "currentColor" : "none"} />
      ))}
    </div>
  );
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(toBcp47(locale), { day: "2-digit", month: "short", year: "numeric" });
}

export default function ReviewsSection({ productId, locale, stats, initialReviews }: Props) {
  const t = getTranslations(locale).shop;
  const reviewsCount = (n: number) => `${n} ${n === 1 ? t.reviewCountSingular : t.reviewCountPlural}`;

  const [items, setItems] = useState(initialReviews.items);
  const [total, setTotal] = useState(initialReviews.total);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [viewerMedia, setViewerMedia] = useState<ReviewMedia | null>(null);

  const distribution = stats.distribution ?? {};
  const maxCount = Math.max(1, ...[1, 2, 3, 4, 5].map(n => distribution[String(n)] ?? 0));

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await fetch(`/next-api/public/shop/reviews/product/${productId}?limit=10&offset=${items.length}`);
      if (res.ok) {
        const data = await res.json();
        setItems(prev => [...prev, ...(data.items ?? [])]);
        setTotal(data.total ?? total);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  async function refreshFirstPage() {
    const res = await fetch(`/next-api/public/shop/reviews/product/${productId}?limit=${Math.max(items.length, 10)}&offset=0`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? total);
    }
  }

  return (
    <section id="reviews" className={styles.section} aria-label={t.reviewsHeading}>
      <h2 className={styles.title}>{t.reviewsHeading}</h2>

      <div className={styles.header}>
        <div className={styles.summary}>
          <div className={styles.summaryScore}>
            <span className={styles.summaryAverage}>{stats.count > 0 ? stats.average.toFixed(1) : "—"}</span>
            <Stars value={stats.average} size={18} />
            <span className={styles.summaryCount}>{reviewsCount(stats.count)}</span>
          </div>

          {stats.count > 0 && (
            <div className={styles.distribution}>
              {[5, 4, 3, 2, 1].map(n => {
                const count = distribution[String(n)] ?? 0;
                return (
                  <div key={n} className={styles.distRow}>
                    <span className={styles.distLabel}>{n}</span>
                    <span className={styles.distTrack}>
                      <span className={styles.distFill} style={{ width: `${(count / maxCount) * 100}%` }} />
                    </span>
                    <span className={styles.distCount}>{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button type="button" className={styles.writeBtn} onClick={() => setShowForm(true)}>
          {t.reviewsWriteBtn}
        </button>
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>{t.reviewsEmpty}</p>
      ) : (
        <div className={styles.list}>
          {items.map(r => (
            <article key={r.id} className={styles.card}>
              <div className={styles.cardHead}>
                <Stars value={r.rating} />
                {r.isVerifiedPurchase && (
                  <span className={styles.verifiedBadge}>
                    <BadgeCheck size={13} strokeWidth={2} /> {t.reviewVerifiedBadge}
                  </span>
                )}
              </div>
              <div className={styles.cardAuthorRow}>
                <span className={styles.cardAuthor}>{r.authorName}</span>
                <span aria-hidden="true">·</span>
                <span className={styles.cardDate}>{formatDate(r.createdAt, locale)}</span>
              </div>
              {r.title && <h3 className={styles.cardTitle}>{r.title}</h3>}
              {r.body && <p className={styles.cardBody}>{r.body}</p>}

              {r.media.length > 0 && (
                <div className={styles.mediaRow}>
                  {r.media.map(m => (
                    <button
                      key={m.key}
                      type="button"
                      className={styles.mediaThumb}
                      onClick={() => setViewerMedia(m)}
                      aria-label={m.type === "video" ? "Play video" : "View image"}
                    >
                      {m.type === "video"
                        ? <video src={m.url} muted playsInline />
                        : <img src={m.url} alt={m.altText ?? ""} loading="lazy" />}
                      {m.type === "video" && (
                        <span className={styles.mediaPlayBadge} aria-hidden="true"><Play size={18} fill="currentColor" /></span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {items.length < total && (
        <button type="button" className={styles.loadMoreBtn} onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "…" : t.reviewLoadMore}
        </button>
      )}

      {showForm && (
        <WriteReviewForm
          productId={productId}
          locale={locale}
          onClose={() => setShowForm(false)}
          onSubmitted={refreshFirstPage}
        />
      )}

      {viewerMedia && createPortal(
        <div className={styles.overlay} onMouseDown={e => { if (e.target === e.currentTarget) setViewerMedia(null); }}>
          <div className={styles.modal} style={{ padding: 12, maxWidth: 720 }} role="dialog" aria-modal="true" aria-label="Media viewer">
            <button type="button" className={styles.closeBtn} style={{ float: "right" }} onClick={() => setViewerMedia(null)} aria-label={t.reviewClose}>
              <X size={18} strokeWidth={2} />
            </button>
            <div style={{ clear: "both" }}>
              {viewerMedia.type === "video"
                ? <video src={viewerMedia.url} controls autoPlay style={{ width: "100%", borderRadius: 10 }} />
                : <img src={viewerMedia.url} alt={viewerMedia.altText ?? ""} style={{ width: "100%", borderRadius: 10 }} />}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}
