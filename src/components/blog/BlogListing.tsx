"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Car } from "lucide-react";
import { getTranslations } from "@/lib/i18n";
import styles from "./BlogListing.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Category { id: string; name: string; slug: string; color: string | null; }
export interface Tag       { id: string; name: string; slug: string; }

export interface Post {
  id: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  featuredImageKey: string | null;
  featuredImageUrl: string | null;
  readingTimeMinutes: number;
  publishedAt: string | null;
  featured: boolean;
  authorName: string | null;
  categories: Category[];
  tags: Tag[];
}

interface ListResult { items: Post[]; total: number; }

const PAGE_SIZE = 9;
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  locale: string;
  // Default-view (page 0, no search/category filter) data fetched server-side
  // in blog/page.tsx, so the first paint has real HTML instead of an empty
  // shell — this component previously fetched everything client-side on
  // mount, which meant no SSR content for search engines and a fetch
  // waterfall (HTML -> JS -> client fetch) on every visit. Passing these in
  // lets it skip that redundant first fetch while every later interaction
  // (search, filter, pagination) still fetches client-side exactly as before.
  initialPosts?:      Post[];
  initialFeatured?:   Post | null;
  initialCategories?: Category[];
  initialTotal?:      number;
}

export default function BlogListing({ locale, initialPosts, initialFeatured, initialCategories, initialTotal }: Props) {
  const t = getTranslations(locale).blog;

  const [posts,      setPosts]      = useState<Post[]>(initialPosts ?? []);
  const [featured,   setFeatured]   = useState<Post | null>(initialFeatured ?? null);
  const [categories, setCategories] = useState<Category[]>(initialCategories ?? []);
  const [total,      setTotal]      = useState(initialTotal ?? 0);
  const [page,       setPage]       = useState(0);
  const [search,     setSearch]     = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCat,  setActiveCat]  = useState<string | null>(null);
  const [loading,    setLoading]    = useState(initialPosts === undefined);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Load categories once — skipped when the server already supplied them.
  const skipCategoriesFetchRef = useRef(initialCategories !== undefined);
  useEffect(() => {
    if (skipCategoriesFetchRef.current) { skipCategoriesFetchRef.current = false; return; }
    fetch(`/next-api/public/blog/categories`)
      .then(r => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  // The very first `load()` call matches exactly the default view the server
  // already fetched (page 0, no search, no category) — skip just that one.
  const skipInitialLoadRef = useRef(initialPosts !== undefined);
  const load = useCallback(() => {
    if (skipInitialLoadRef.current) { skipInitialLoadRef.current = false; return; }
    setLoading(true);
    const params = new URLSearchParams({
      locale,
      limit:  String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (activeCat)       params.set("categoryId", activeCat);

    fetch(`/next-api/public/blog?${params}`)
      .then(r => r.json())
      .then((d: ListResult) => {
        setPosts(d.items);
        setTotal(d.total);
        // Set featured from first featured item (or first item if on page 0)
        if (page === 0 && !debouncedSearch && !activeCat) {
          const f = d.items.find(p => p.featured) ?? d.items[0] ?? null;
          setFeatured(f);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [locale, page, debouncedSearch, activeCat]);

  useEffect(() => { load(); }, [load]);

  const totalPages  = Math.ceil(total / PAGE_SIZE);
  const heroPost    = page === 0 && !debouncedSearch && !activeCat ? featured : null;
  const gridPosts   = heroPost ? posts.filter(p => p.id !== heroPost.id) : posts;

  return (
    <div className={styles.page}>
      {/* ── Hero banner ── */}
      <div className={styles.hero}>
        <span className={styles.heroEyebrow}>{t.heroEyebrow}</span>
        <h1 className={styles.heroTitle}>{t.heroTitleLine1}<br />{t.heroTitleLine2}</h1>
        <p className={styles.heroSub}>{t.heroSub}</p>
        <div className={styles.searchBar}>
          <input
            className={styles.searchInput}
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className={styles.searchBtn} onClick={() => setDebouncedSearch(search)}>{t.searchBtn}</button>
        </div>
      </div>

      {/* ── Category filter bar ── */}
      {categories.length > 0 && (
        <div className={styles.catBar}>
          <button
            className={`${styles.catBtn} ${!activeCat ? styles.catBtnActive : ""}`}
            onClick={() => { setActiveCat(null); setPage(0); }}
          >
            {t.filterAll}
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`${styles.catBtn} ${activeCat === cat.id ? styles.catBtnActive : ""}`}
              onClick={() => { setActiveCat(cat.id); setPage(0); }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className={styles.container}>
        {/* ── Featured article ── */}
        {heroPost && (
          <div className={styles.featuredSection}>
            <p className={styles.sectionLabel}>{t.featuredSection}</p>
            <Link href={`/${locale}/blog/${heroPost.slug}`} className={styles.featuredCard}>
              {heroPost.featuredImageUrl
                ? <img src={heroPost.featuredImageUrl} alt={heroPost.title} className={styles.featuredImage} />
                : <div className={styles.featuredImagePlaceholder}><Car size={16} strokeWidth={1.75} /></div>
              }
              <div className={styles.featuredBody}>
                <div className={styles.featuredMeta}>
                  {heroPost.categories[0] && (
                    <span className={styles.catChip}>{heroPost.categories[0].name}</span>
                  )}
                  {heroPost.publishedAt && (
                    <><span className={styles.metaDot}>·</span>
                    <span className={styles.metaText}>{formatDate(heroPost.publishedAt)}</span></>
                  )}
                  <span className={styles.metaDot}>·</span>
                  <span className={styles.metaText}>{heroPost.readingTimeMinutes} min read</span>
                </div>
                <h2 className={styles.featuredTitle}>{heroPost.title}</h2>
                {heroPost.excerpt && (
                  <p className={styles.featuredExcerpt}>{heroPost.excerpt}</p>
                )}
                <span className={styles.readMore}>{t.readArticle}</span>
              </div>
            </Link>
          </div>
        )}

        {/* ── Articles grid ── */}
        <div className={styles.gridSection}>
          {!heroPost && page === 0 && (
            <p className={styles.sectionLabel}>
              {debouncedSearch ? `"${debouncedSearch}"` : activeCat ? t.filteredArticles : t.latestArticles}
            </p>
          )}
          {heroPost && gridPosts.length > 0 && (
            <p className={styles.sectionLabel}>{t.moreArticles}</p>
          )}

          {loading ? (
            <div className={styles.empty}>{t.loading}</div>
          ) : gridPosts.length === 0 && !heroPost ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>{t.noResults}</div>
              {debouncedSearch
                ? `${t.noResultsFor} "${debouncedSearch}". ${t.noResultsTry}`
                : t.noResultsDefault}
            </div>
          ) : (
            <div className={styles.grid}>
              {gridPosts.map(post => (
                <Link key={post.id} href={`/${locale}/blog/${post.slug}`} className={styles.card}>
                  {post.featuredImageUrl
                    ? <img src={post.featuredImageUrl} alt={post.title} className={styles.cardImage} />
                    : <div className={styles.cardImagePlaceholder}><Car size={16} strokeWidth={1.75} /></div>
                  }
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      {post.categories[0] && (
                        <span className={styles.catChip} style={{ background: post.categories[0].color ?? undefined }}>
                          {post.categories[0].name}
                        </span>
                      )}
                    </div>
                    <h3 className={styles.cardTitle}>{post.title}</h3>
                    {post.excerpt && <p className={styles.cardExcerpt}>{post.excerpt}</p>}
                    <div className={styles.cardFooter}>
                      <span className={styles.cardAuthor}>
                        {post.authorName ?? t.teamName}
                        {post.publishedAt && ` · ${formatDate(post.publishedAt)}`}
                      </span>
                      <span className={styles.readTime}>{post.readingTimeMinutes} {t.minRead}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>{t.prevPage}</button>
            <span className={styles.pageInfo}>{page + 1} / {totalPages}</span>
            <button className={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>{t.nextPage}</button>
          </div>
        )}
      </div>
    </div>
  );
}
