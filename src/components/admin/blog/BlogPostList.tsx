"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import styles from "./BlogPostList.module.css";
import { Star } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = "draft" | "scheduled" | "published" | "archived";
type Locale = "en" | "fr";

interface PostTranslation { title: string; slug: string; }
interface Category        { id: string; translations: Partial<Record<Locale, { name: string }>>; }
interface Tag             { id: string; name: string; }

interface Post {
  id: string;
  status: Status;
  featured: boolean;
  authorName: string | null;
  readingTimeMinutes: number;
  publishedAt: string | null;
  scheduledPublishAt: string | null;
  categories: Category[];
  tags: Tag[];
  createdAt: string;
  translations: Partial<Record<Locale, PostTranslation>>;
}

interface ListResult { items: Post[]; total: number; }

const STATUS_LABELS: Record<Status, string> = {
  draft: "Draft", scheduled: "Scheduled", published: "Published", archived: "Archived",
};

const PAGE_SIZE = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTitle(post: Post, locale?: string): string {
  if (locale) {
    const t = post.translations[locale as Locale]?.title;
    if (t) return t;
  }
  return post.translations.en?.title || post.translations.fr?.title || "(untitled)";
}

function getCatName(cat: Category): string {
  return cat.translations.en?.name || cat.translations.fr?.name || "";
}

function getLocales(post: Post): Locale[] {
  return (["en", "fr"] as Locale[]).filter(l => post.translations[l]?.slug);
}

function getViewHref(post: Post, localeFilter: string): string | null {
  const locale = (localeFilter || (post.translations.en?.slug ? "en" : "fr")) as Locale;
  const slug = post.translations[locale]?.slug;
  return slug ? `/${locale}/blog/${slug}` : null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BlogPostList() {
  const [items,        setItems]        = useState<Post[]>([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(0);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [localeFilter, setLocaleFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      limit:  String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter)    params.set("status", statusFilter);
    if (localeFilter)    params.set("locale", localeFilter);

    fetch(`/next-api/blog?${params}`)
      .then(r => r.json())
      .then((d: ListResult) => { setItems(d.items); setTotal(d.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, statusFilter, localeFilter]);

  useEffect(() => { load(); }, [load]);

  const deletePost = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await fetch(`/next-api/blog/${id}`, { method: "DELETE" });
    load();
  };

  const publishPost = async (id: string) => {
    await fetch(`/next-api/blog/${id}/publish`, { method: "POST" });
    load();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Blog articles</h1>
        <Link href="/admin/blog/new" className={styles.newBtn}>+ New article</Link>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          className={styles.searchInput}
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select className={styles.filterSelect} value={localeFilter} onChange={(e) => { setLocaleFilter(e.target.value); setPage(0); }}>
          <option value="">All locales</option>
          <option value="fr">French (FR)</option>
          <option value="en">English (EN)</option>
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Article</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Languages</th>
              <th className={styles.th}>Categories</th>
              <th className={styles.th}>Published</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className={styles.td} colSpan={6} style={{ textAlign: "center", color: "var(--color-text-muted)" }}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6}><div className={styles.empty}>No articles yet. <Link href="/admin/blog/new" style={{ color: "var(--color-brand-primary)" }}>Create the first one →</Link></div></td></tr>
            ) : items.map(post => {
              const title    = getTitle(post, localeFilter);
              const locales  = getLocales(post);
              const viewHref = getViewHref(post, localeFilter);
              return (
                <tr key={post.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.titleCell}>
                      <span className={styles.postTitle}>
                        {post.featured && <span className={styles.featuredStar}><Star size={14} strokeWidth={1.75} /></span>}
                        {title}
                      </span>
                      {(post.translations.en?.slug || post.translations.fr?.slug) && (
                        <span className={styles.postSlug}>
                          /{locales.length > 0 && (post.translations[locales[0]]?.slug ?? "")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${styles[post.status]}`}>
                      {STATUS_LABELS[post.status]}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {locales.map(l => (
                        <span key={l} className={styles.localeBadge}>{l.toUpperCase()}</span>
                      ))}
                      {locales.length === 0 && <span style={{ color: "var(--color-text-muted)" }}>—</span>}
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.pills}>
                      {post.categories.map(c => (
                        <span key={c.id} className={styles.pill}>{getCatName(c)}</span>
                      ))}
                    </div>
                  </td>
                  <td className={styles.td}>
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString()
                      : post.scheduledPublishAt
                        ? `📅 ${new Date(post.scheduledPublishAt).toLocaleDateString()}`
                        : "—"}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <Link href={`/admin/blog/${post.id}/edit`} className={styles.actionBtn}>Edit</Link>
                      {post.status !== "published" && (
                        <button type="button" className={styles.actionBtn} onClick={() => publishPost(post.id)}>
                          Publish
                        </button>
                      )}
                      {viewHref && (
                        <a href={viewHref} target="_blank" rel="noopener noreferrer" className={styles.actionBtn}>
                          View ↗
                        </a>
                      )}
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        onClick={() => deletePost(post.id, title)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {total > PAGE_SIZE && (
          <div className={styles.paging}>
            <span>{total} articles · page {page + 1} / {totalPages}</span>
            <div className={styles.pagingBtns}>
              <button className={styles.pagingBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className={styles.pagingBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
