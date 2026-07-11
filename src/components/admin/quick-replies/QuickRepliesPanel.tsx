"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquareText, Search, Settings2, X } from "lucide-react";
import CopyReplyButton from "./CopyReplyButton";
import {
  applyPlaceholders, categoryColor, categoryLabel,
  type PlaceholderVars, type QuickReply,
} from "./types";
import styles from "./QuickRepliesPanel.module.css";

interface Props {
  /** Vehicle context substituted into {{car_name}} / {{plate}} / {{phone}} on copy. */
  vars?: PlaceholderVars;
  /** Restricts the list to global replies plus the ones linked to this car. */
  carId?: string;
}

export default function QuickRepliesPanel({ vars, carId }: Props) {
  const [replies,  setReplies]  = useState<QuickReply[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadFail, setLoadFail] = useState(false);
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFail(false);
    try {
      const params = new URLSearchParams({ active: "true" });
      if (carId) params.set("carId", carId);
      const res = await fetch(`/next-api/quick-replies?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setReplies(await res.json());
    } catch {
      setLoadFail(true);
    } finally {
      setLoading(false);
    }
  }, [carId]);

  useEffect(() => { load(); }, [load]);

  const categories = useMemo(
    () => Array.from(new Set(replies.map(r => r.category))).sort(),
    [replies],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return replies.filter(r => {
      if (category !== "all" && r.category !== category) return false;
      if (q && !r.title.toLowerCase().includes(q) && !r.body.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [replies, search, category]);

  return (
    <div className={styles.panel}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Replies</h2>
          <p className={styles.subtitle}>One-click messages for this vehicle — placeholders are filled automatically</p>
        </div>
        <Link href="/admin/replies" className={styles.manageLink}>
          <Settings2 size={14} strokeWidth={1.75} /> Manage replies
        </Link>
      </div>

      {/* ── Filters ── */}
      {(replies.length > 0 || search || category !== "all") && !loading && !loadFail && (
        <div className={styles.filters}>
          <div className={styles.searchWrap}>
            <Search size={15} strokeWidth={1.75} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search replies…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch("")} aria-label="Clear search">
                <X size={13} strokeWidth={2} />
              </button>
            )}
          </div>
          <div className={styles.categoryChips}>
            <button
              className={`${styles.chip} ${category === "all" ? styles.chipActive : ""}`}
              onClick={() => setCategory("all")}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c}
                className={`${styles.chip} ${category === c ? styles.chipActive : ""}`}
                onClick={() => setCategory(c)}
              >
                {categoryLabel(c)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonLine} style={{ width: "40%" }} />
              <div className={styles.skeletonLine} style={{ width: "95%" }} />
              <div className={styles.skeletonLine} style={{ width: "70%" }} />
            </div>
          ))}
        </div>
      ) : loadFail ? (
        <div className={styles.empty}>
          <MessageSquareText size={40} strokeWidth={1.5} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Could not load replies</p>
          <button className={styles.retryBtn} onClick={load}>Retry</button>
        </div>
      ) : replies.length === 0 ? (
        <div className={styles.empty}>
          <MessageSquareText size={40} strokeWidth={1.5} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No replies yet</p>
          <p className={styles.emptyText}>
            Create reusable guest messages once and copy them from any vehicle page.
          </p>
          <Link href="/admin/replies" className={styles.emptyCta}>Create replies</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <Search size={40} strokeWidth={1.5} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No matching replies</p>
          <button className={styles.retryBtn} onClick={() => { setSearch(""); setCategory("all"); }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(r => (
            <article key={r.id} className={styles.card}>
              <div className={styles.cardMain}>
                <div className={styles.cardHead}>
                  <h3 className={styles.cardTitle}>{r.title}</h3>
                  {r.carId && <span className={styles.carBadge}>This car</span>}
                  <span
                    className={styles.categoryBadge}
                    style={{ background: categoryColor(r.category) + "18", color: categoryColor(r.category) }}
                  >
                    {categoryLabel(r.category)}
                  </span>
                </div>
                {/* Preview shows the message exactly as it will be copied for this vehicle. */}
                <p className={styles.cardBody}>{applyPlaceholders(r.body, vars)}</p>
              </div>
              <div className={styles.cardAction}>
                <CopyReplyButton reply={r} vars={vars} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
