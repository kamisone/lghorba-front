"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy, EyeOff, MessageSquareText, Pencil, Plus, Search, Settings2, Trash2, X,
} from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";
import CopyReplyButton from "./CopyReplyButton";
import QuickReplyCategoryManager from "./QuickReplyCategoryManager";
import QuickReplyFormModal from "./QuickReplyFormModal";
import { categoryColor, categoryLabel, type QuickReply } from "./types";
import styles from "./QuickReplyList.module.css";

type StatusFilter = "all" | "active" | "inactive";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function QuickReplyList() {
  const { toast } = useToast();

  const [replies,  setReplies]  = useState<QuickReply[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadFail, setLoadFail] = useState(false);

  const [search,         setSearch]         = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>("all");

  const [formOpen,       setFormOpen]       = useState(false);
  const [editTarget,     setEditTarget]     = useState<QuickReply | null>(null);
  const [confirmDelId,   setConfirmDelId]   = useState<string | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFail(false);
    try {
      const res = await fetch("/next-api/quick-replies", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setReplies(await res.json());
    } catch {
      setLoadFail(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const categories = useMemo(
    () => Array.from(new Set(replies.map(r => r.category))).sort(),
    [replies],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return replies.filter(r => {
      if (statusFilter === "active"   && !r.isActive) return false;
      if (statusFilter === "inactive" &&  r.isActive) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (q && !r.title.toLowerCase().includes(q) && !r.body.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [replies, search, categoryFilter, statusFilter]);

  const totalCopies = useMemo(() => replies.reduce((s, r) => s + r.usageCount, 0), [replies]);
  const hasFilters  = search.trim() !== "" || categoryFilter !== "all" || statusFilter !== "all";

  // ── Actions ────────────────────────────────────────────────────────────────

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit   = (r: QuickReply) => { setEditTarget(r); setFormOpen(true); };
  const handleSaved = () => { setFormOpen(false); load(); };

  const toggleActive = async (r: QuickReply) => {
    // Optimistic flip with rollback on failure.
    setReplies(prev => prev.map(x => x.id === r.id ? { ...x, isActive: !x.isActive } : x));
    try {
      const res = await fetch(`/next-api/quick-replies/${r.id}/active`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      toast.success(r.isActive ? "Reply deactivated" : "Reply activated");
    } catch {
      setReplies(prev => prev.map(x => x.id === r.id ? { ...x, isActive: r.isActive } : x));
      toast.error("Failed to update reply");
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDelId(null);
    const prev = replies;
    setReplies(p => p.filter(r => r.id !== id));
    try {
      const res = await fetch(`/next-api/quick-replies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Reply deleted");
    } catch {
      setReplies(prev);
      toast.error("Failed to delete reply");
    }
  };

  const clearFilters = () => { setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); };

  // A rename/delete can invalidate the active category filter — fall back to "all".
  const handleCategoriesChanged = () => { setCategoryFilter("all"); load(); };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Replies</h1>
          <p className={styles.subtitle}>Reusable guest messages — copy them in one click from any vehicle page</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryBtn} onClick={() => setCategoriesOpen(true)}>
            <Settings2 size={14} strokeWidth={1.75} /> Manage categories
          </button>
          <button className={styles.primaryBtn} onClick={openCreate}>
            <Plus size={16} strokeWidth={1.75} /> New reply
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      {!loading && !loadFail && replies.length > 0 && (
        <div className={styles.statsBar}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Replies</div>
            <div className={styles.statValue}>{replies.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Active</div>
            <div className={styles.statValue} style={{ color: "#16a34a" }}>
              {replies.filter(r => r.isActive).length}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Categories</div>
            <div className={styles.statValue}>{categories.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Times copied</div>
            <div className={styles.statValue} style={{ color: "#0284c7" }}>{totalCopies}</div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
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

        <select
          className={styles.select}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <div className={styles.categoryChips}>
          <button
            className={`${styles.chip} ${categoryFilter === "all" ? styles.chipActive : ""}`}
            onClick={() => setCategoryFilter("all")}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c}
              className={`${styles.chip} ${categoryFilter === c ? styles.chipActive : ""}`}
              onClick={() => setCategoryFilter(c)}
            >
              {categoryLabel(c)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonLine} style={{ width: "55%" }} />
              <div className={styles.skeletonLine} style={{ width: "100%" }} />
              <div className={styles.skeletonLine} style={{ width: "85%" }} />
              <div className={styles.skeletonLine} style={{ width: "40%", marginTop: 10 }} />
            </div>
          ))}
        </div>
      ) : loadFail ? (
        <div className={styles.empty}>
          <MessageSquareText size={44} strokeWidth={1.5} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Could not load replies</p>
          <p className={styles.emptyText}>Please check your connection and try again.</p>
          <button className={styles.primaryBtn} onClick={load}>Retry</button>
        </div>
      ) : replies.length === 0 ? (
        <div className={styles.empty}>
          <MessageSquareText size={44} strokeWidth={1.5} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No replies yet</p>
          <p className={styles.emptyText}>
            Save the messages you send guests over and over — check-in instructions, payment
            reminders, directions — and copy them in one click.
          </p>
          <button className={styles.primaryBtn} onClick={openCreate}>
            <Plus size={16} strokeWidth={1.75} /> Create your first reply
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <Search size={44} strokeWidth={1.5} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No matching replies</p>
          <p className={styles.emptyText}>Try a different search or clear the filters.</p>
          <button className={styles.secondaryBtn} onClick={clearFilters}>Clear filters</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(r => (
            <article key={r.id} className={`${styles.card} ${!r.isActive ? styles.cardInactive : ""}`}>
              <div className={styles.cardHead}>
                <span
                  className={styles.categoryBadge}
                  style={{ background: categoryColor(r.category) + "18", color: categoryColor(r.category) }}
                >
                  {categoryLabel(r.category)}
                </span>
                {r.carId && (
                  <span className={styles.carBadge} title="Only shown on this car's Messages tab">
                    {r.car?.name ?? "Car-specific"}
                  </span>
                )}
                {!r.isActive && <span className={styles.inactiveBadge}>Inactive</span>}
              </div>

              <h3 className={styles.cardTitle}>{r.title}</h3>
              <p className={styles.cardBody}>{r.body}</p>

              <div className={styles.cardFooter}>
                <span className={styles.cardMeta} title={`Last updated ${fmtDate(r.updatedAt)}`}>
                  {r.usageCount > 0 && (
                    <span className={styles.usage}>
                      <Copy size={11} strokeWidth={2} /> {r.usageCount}
                    </span>
                  )}
                  {fmtDate(r.updatedAt)}
                </span>

                <div className={styles.cardActions}>
                  <CopyReplyButton reply={r} variant="ghost" />
                  <button className={styles.iconBtn} title="Edit" onClick={() => openEdit(r)}>
                    <Pencil size={15} strokeWidth={1.75} />
                  </button>
                  <button
                    className={styles.iconBtn}
                    title={r.isActive ? "Deactivate" : "Activate"}
                    onClick={() => toggleActive(r)}
                  >
                    <EyeOff size={15} strokeWidth={1.75} style={r.isActive ? undefined : { color: "#16a34a" }} />
                  </button>
                  {confirmDelId === r.id ? (
                    <button
                      className={styles.confirmDelBtn}
                      onClick={() => handleDelete(r.id)}
                      onBlur={() => setConfirmDelId(null)}
                      autoFocus
                    >
                      Confirm?
                    </button>
                  ) : (
                    <button className={styles.iconBtn} title="Delete" onClick={() => setConfirmDelId(r.id)}>
                      <Trash2 size={15} strokeWidth={1.75} style={{ color: "#ef4444" }} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {formOpen && (
        <QuickReplyFormModal
          reply={editTarget ?? undefined}
          categories={categories}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {categoriesOpen && (
        <QuickReplyCategoryManager
          onClose={() => setCategoriesOpen(false)}
          onChanged={handleCategoriesChanged}
        />
      )}
    </div>
  );
}
