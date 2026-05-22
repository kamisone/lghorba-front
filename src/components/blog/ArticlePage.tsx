"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import styles from "./ArticlePage.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category { id: string; name: string; slug: string; color: string | null; }
interface Tag       { id: string; name: string; slug: string; }

interface Post {
  id: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  featuredImageKey: string | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  readingTimeMinutes: number;
  publishedAt: string | null;
  authorName: string | null;
  categories: Category[];
  tags: Tag[];
}

interface Props {
  post: Post;
  locale: string;
  related?: Post[];
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

// ── Reading progress ──────────────────────────────────────────────────────────

function ReadingProgress({ contentRef }: { contentRef: React.RefObject<HTMLElement> }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = contentRef.current;
      if (!el) return;
      const rect  = el.getBoundingClientRect();
      const total = el.offsetHeight;
      const seen  = Math.max(0, -rect.top);
      setProgress(Math.min(100, (seen / total) * 100));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [contentRef]);

  return <div className={styles.progressBar} style={{ width: `${progress}%` }} />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ArticlePage({ post, locale, related = [] }: Props) {
  const t = getTranslations(locale).blog;
  const tNav = getTranslations(locale).nav;
  const contentRef = useRef<HTMLElement>(null!);

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: post.title, text: post.excerpt ?? "", url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert(t.linkCopied);
    }
  };

  const authorInitial = post.authorName?.charAt(0).toUpperCase() ?? "V";
  const imgUrl = post.featuredImageUrl;

  return (
    <>
      <ReadingProgress contentRef={contentRef} />

      {/* ── Breadcrumb ── */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href={`/${locale}`}>{tNav.home}</Link>
        <span className={styles.breadSep}>›</span>
        <Link href={`/${locale}/blog`}>{t.breadcrumbBlog}</Link>
        {post.categories[0] && (
          <>
            <span className={styles.breadSep}>›</span>
            <span>{post.categories[0].name}</span>
          </>
        )}
        <span className={styles.breadSep}>›</span>
        <span style={{ color: "var(--color-text-secondary)" }}>{post.title}</span>
      </nav>

      <article className={styles.article} ref={contentRef as React.RefObject<HTMLDivElement>}>
        {/* ── Article header ── */}
        <header className={styles.header}>
          <div className={styles.catRow}>
            {post.categories.map(cat => (
              <span
                key={cat.id}
                className={styles.catChip}
                style={{ background: cat.color ?? undefined }}
              >
                {cat.name}
              </span>
            ))}
          </div>

          <h1 className={styles.title}>{post.title}</h1>

          {post.excerpt && (
            <p className={styles.excerpt}>{post.excerpt}</p>
          )}

          <div className={styles.meta}>
            <div className={styles.authorAvatar}>{authorInitial}</div>
            <span>{post.authorName ?? t.teamName}</span>
            {post.publishedAt && (
              <>
                <span className={styles.metaDot}>·</span>
                <span>{formatDate(post.publishedAt, locale)}</span>
              </>
            )}
            <span className={styles.metaDot}>·</span>
            <span>{post.readingTimeMinutes} {t.minRead}</span>
          </div>
        </header>

        {/* ── Featured image ── */}
        {imgUrl
          ? <img src={imgUrl} alt={post.featuredImageAlt ?? post.title} className={styles.featuredImage} />
          : <div className={styles.featuredImagePlaceholder}>🚗</div>
        }

        {/* ── Content ── */}
        {post.content && (
          <div
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        )}

        {/* ── CTA box ── */}
        <div className={styles.ctaBox}>
          <div className={styles.ctaTitle}>{t.ctaTitle}</div>
          <p className={styles.ctaSub}>{t.ctaSub}</p>
          <Link href={`/${locale}/fleet`} className={styles.ctaBtn}>{t.ctaBtn}</Link>
        </div>

        {/* ── Tags ── */}
        {post.tags.length > 0 && (
          <div className={styles.tagSection}>
            <span className={styles.tagLabel}>{t.tags}</span>
            {post.tags.map(tag => (
              <Link
                key={tag.id}
                href={`/${locale}/blog?tag=${tag.slug}`}
                className={styles.tagChip}
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* ── Share ── */}
        <div className={styles.shareSection}>
          <span className={styles.shareLabel}>{t.share}</span>
          <button className={styles.shareBtn} onClick={share}>🔗 {t.copyLink}</button>
        </div>
      </article>

      {/* ── Related articles ── */}
      {related.length > 0 && (
        <section className={styles.relatedSection}>
          <h2 className={styles.relatedTitle}>{t.relatedTitle}</h2>
          <div className={styles.relatedGrid}>
            {related.map(rel => (
                <Link key={rel.id} href={`/${locale}/blog/${rel.slug}`} className={styles.relatedCard}>
                  {rel.featuredImageUrl
                    ? <img src={rel.featuredImageUrl} alt={rel.title} className={styles.relatedImage} />
                    : <div className={styles.relatedImagePlaceholder}>🚗</div>
                  }
                  <div className={styles.relatedCardMeta}>
                    {rel.categories[0]?.name}
                    {rel.publishedAt && ` · ${new Date(rel.publishedAt).toLocaleDateString()}`}
                  </div>
                  <div className={styles.relatedCardTitle}>{rel.title}</div>
                </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
