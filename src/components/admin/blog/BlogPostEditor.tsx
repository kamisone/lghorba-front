"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import styles from "./BlogPostEditor.module.css";
import { slugify } from "@/lib/slugify";

const BlogRichEditor = dynamic(() => import("./BlogRichEditor"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

export type BlogPostStatus = "draft" | "scheduled" | "published" | "archived";

export interface BlogCategory { id: string; name: string; slug: string; color: string | null; }
export interface BlogTag       { id: string; name: string; slug: string; }

export interface BlogPost {
  id: string;
  slug: string;
  locale: string;
  status: BlogPostStatus;
  title: string;
  excerpt: string | null;
  content: string | null;
  featuredImageKey: string | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  readingTimeMinutes: number;
  publishedAt: string | null;
  scheduledPublishAt: string | null;
  featured: boolean;
  authorName: string | null;
  categories: BlogCategory[];
  tags: BlogTag[];
}

interface Props {
  postId?: string;
}

// ── Picker modal ──────────────────────────────────────────────────────────────

function PickerModal({
  title, items, selected, onToggle, onClose,
}: {
  title: string;
  items: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className={styles.pickerOverlay} onClick={onClose}>
      <div className={styles.pickerBox} onClick={(e) => e.stopPropagation()}>
        <h4>{title}</h4>
        {items.map((item) => {
          const checked = selected.includes(item.id);
          return (
            <div
              key={item.id}
              className={`${styles.pickerItem} ${checked ? styles.pickerItemChecked : ""}`}
              onClick={() => onToggle(item.id)}
            >
              <input type="checkbox" readOnly checked={checked} style={{ accentColor: "var(--color-brand-primary)" }} />
              {item.name}
            </div>
          );
        })}
        <div className={styles.pickerClose}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BlogPostEditor({ postId }: Props) {
  const router = useRouter();
  const isEdit = !!postId;

  const [loading,    setLoading]    = useState(isEdit);
  const [saving,     setSaving]     = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Form state
  const [title,              setTitle]              = useState("");
  const [slug,               setSlug]               = useState("");
  const [locale,             setLocale]             = useState<"fr" | "en">("fr");
  const [status,             setStatus]             = useState<BlogPostStatus>("draft");
  const [excerpt,            setExcerpt]            = useState("");
  const [content,            setContent]            = useState("");
  const [featuredImageKey,        setFeaturedImageKey]        = useState("");
  const [featuredImagePreviewUrl, setFeaturedImagePreviewUrl] = useState<string | null>(null);
  const [featuredImageAlt,        setFeaturedImageAlt]        = useState("");
  const [seoTitle,           setSeoTitle]           = useState("");
  const [seoDescription,     setSeoDescription]     = useState("");
  const [canonicalUrl,       setCanonicalUrl]       = useState("");
  const [scheduledPublishAt, setScheduledPublishAt] = useState("");
  const [featured,           setFeatured]           = useState(false);
  const [authorName,         setAuthorName]         = useState("");

  const [allCategories, setAllCategories] = useState<BlogCategory[]>([]);
  const [allTags,       setAllTags]       = useState<BlogTag[]>([]);
  const [categoryIds,   setCategoryIds]   = useState<string[]>([]);
  const [tagIds,        setTagIds]        = useState<string[]>([]);

  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);

  // Auto-save timer
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch("/next-api/blog/categories").then(r => r.json()),
      fetch("/next-api/blog/tags").then(r => r.json()),
    ]).then(([cats, tags]) => {
      setAllCategories(cats);
      setAllTags(tags);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) { setLoading(false); return; }
    fetch(`/next-api/blog/${postId}`)
      .then(r => r.json())
      .then((p: BlogPost) => {
        setTitle(p.title);
        setSlug(p.slug);
        setLocale(p.locale as "fr" | "en");
        setStatus(p.status);
        setExcerpt(p.excerpt ?? "");
        setContent(p.content ?? "");
        setFeaturedImageKey(p.featuredImageKey ?? "");
        setFeaturedImagePreviewUrl(p.featuredImageUrl ?? null);
        setFeaturedImageAlt(p.featuredImageAlt ?? "");
        setSeoTitle(p.seoTitle ?? "");
        setSeoDescription(p.seoDescription ?? "");
        setCanonicalUrl(p.canonicalUrl ?? "");
        setScheduledPublishAt(
          p.scheduledPublishAt ? p.scheduledPublishAt.slice(0, 16) : "",
        );
        setFeatured(p.featured);
        setAuthorName(p.authorName ?? "");
        setCategoryIds(p.categories.map(c => c.id));
        setTagIds(p.tags.map(t => t.id));
      })
      .catch(() => setError("Failed to load post"))
      .finally(() => setLoading(false));
  }, [postId, isEdit]);

  // ── Auto-slug ──────────────────────────────────────────────────────────────

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEdit || status === "draft") {
      setSlug(slugify(val));
    }
  };

  // ── Auto-save draft (debounced 3s) ─────────────────────────────────────────

  const buildPayload = useCallback(() => ({
    title,
    slug:               slug || undefined,
    locale,
    status,
    excerpt:            excerpt || null,
    content:            content || null,
    featuredImageKey:   featuredImageKey || null,
    featuredImageAlt:   featuredImageAlt || null,
    seoTitle:           seoTitle || null,
    seoDescription:     seoDescription || null,
    canonicalUrl:       canonicalUrl || null,
    scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null,
    featured,
    authorName:         authorName || null,
    categoryIds,
    tagIds,
  }), [title, slug, locale, status, excerpt, content, featuredImageKey, featuredImageAlt, seoTitle, seoDescription, canonicalUrl, scheduledPublishAt, featured, authorName, categoryIds, tagIds]);

  const save = useCallback(async (opts: { publish?: boolean } = {}) => {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...buildPayload(),
        ...(opts.publish ? { status: "published" } : {}),
      };
      if (isEdit) {
        await fetch(`/next-api/blog/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (opts.publish) {
          await fetch(`/next-api/blog/${postId}/publish`, { method: "POST" });
          setStatus("published");
        }
      } else {
        const res = await fetch("/next-api/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const created = await res.json() as { id: string };
        if (opts.publish) {
          await fetch(`/next-api/blog/${created.id}/publish`, { method: "POST" });
        }
        router.replace(`/admin/blog/${created.id}/edit`);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  }, [buildPayload, isEdit, postId, router, title]);

  // Debounced auto-save for edits
  useEffect(() => {
    if (!isEdit || !title) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => save(), 10_000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [title, content, excerpt, seoTitle, seoDescription, isEdit, save]);

  // ── Featured image upload ──────────────────────────────────────────────────

  const uploadFeaturedImage = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/next-api/blog/media", { method: "POST", body: fd });
      const data = await res.json() as { key: string; url: string };
      setFeaturedImageKey(data.key);
      setFeaturedImagePreviewUrl(data.url);
      if (!featuredImageAlt) setFeaturedImageAlt(file.name.replace(/\.[^.]+$/, ""));
    } catch {
      setError("Image upload failed");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <div style={{ padding: 40, color: "var(--color-text-muted)" }}>Loading…</div>;

  const selectedCats = allCategories.filter(c => categoryIds.includes(c.id));
  const selectedTags = allTags.filter(t => tagIds.includes(t.id));

  const featuredImageUrl = featuredImagePreviewUrl;

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <Link href="/admin/blog" className={styles.backBtn}>← Articles</Link>
        <h1 className={styles.headerTitle}>{isEdit ? "Edit article" : "New article"}</h1>
        <div className={styles.headerActions}>
          <button className={styles.btnGhost} onClick={() => save()} disabled={saving}>
            {saving ? "Saving…" : "Save draft"}
          </button>
          {status !== "published" && (
            <button
              className={styles.btnSuccess}
              onClick={() => { setPublishing(true); save({ publish: true }).finally(() => setPublishing(false)); }}
              disabled={saving || publishing}
            >
              {publishing ? "Publishing…" : "Publish"}
            </button>
          )}
        </div>
      </div>

      {saved  && <p className={styles.savedNote}>Saved ✓</p>}
      {error  && <p className={styles.errorNote}>{error}</p>}

      <div className={styles.layout}>
        {/* ── Main column ── */}
        <div className={styles.main}>
          {/* Title */}
          <div className={styles.card}>
            <div className={styles.field}>
              <label className={styles.label}>Title *</label>
              <input
                className={styles.input}
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Article title"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                Slug
                <span className={styles.labelMuted}>(URL identifier)</span>
              </label>
              <div className={styles.slugRow}>
                <input
                  className={`${styles.input} ${styles.slugInput}`}
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="article-url-slug"
                />
                <button
                  type="button"
                  className={styles.slugBtn}
                  onClick={() => setSlug(slugify(title))}
                >
                  ↺ Regenerate
                </button>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                Excerpt
                <span className={styles.labelMuted}>(shown in cards & meta)</span>
              </label>
              <textarea
                className={styles.textarea}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A short, compelling summary of the article (150–200 chars recommended)…"
                rows={3}
              />
            </div>
          </div>

          {/* Content */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Content</div>
            <BlogRichEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing your article…"
            />
          </div>

          {/* SEO */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>SEO</div>
            <div className={styles.field}>
              <label className={styles.label}>
                SEO Title
                <span className={styles.labelMuted}>(defaults to article title)</span>
              </label>
              <input
                className={styles.input}
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Custom SEO title"
                maxLength={70}
              />
              <span className={styles.labelMuted}>{seoTitle.length}/70</span>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>SEO Description</label>
              <textarea
                className={styles.textarea}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Meta description for search engines (150–160 chars recommended)"
                rows={3}
                maxLength={160}
              />
              <span className={styles.labelMuted}>{seoDescription.length}/160</span>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Canonical URL <span className={styles.labelMuted}>(optional)</span></label>
              <input
                className={styles.input}
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                placeholder="https://example.com/blog/original-post"
                type="url"
              />
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className={styles.sidebar}>
          {/* Status & publishing */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Status</div>
            <div className={styles.field}>
              <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value as BlogPostStatus)}>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            {status === "scheduled" && (
              <div className={styles.field}>
                <label className={styles.label}>Publish at</label>
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={scheduledPublishAt}
                  onChange={(e) => setScheduledPublishAt(e.target.value)}
                />
              </div>
            )}
            <div className={styles.field}>
              <label className={styles.label}>Locale</label>
              <select className={styles.select} value={locale} onChange={(e) => setLocale(e.target.value as "fr" | "en")}>
                <option value="fr">French (FR)</option>
                <option value="en">English (EN)</option>
              </select>
            </div>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
              <span className={styles.checkLabel}>Featured article</span>
            </label>
          </div>

          {/* Author */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Author</div>
            <div className={styles.field}>
              <input
                className={styles.input}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Author name"
              />
            </div>
          </div>

          {/* Featured image */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Featured image</div>
            {featuredImageUrl ? (
              <img src={featuredImageUrl} alt={featuredImageAlt} className={styles.imagePreview} />
            ) : (
              <div
                className={styles.imagePlaceholder}
                onClick={() => imageInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                + Upload image
              </div>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFeaturedImage(f);
                e.target.value = "";
              }}
            />
            {featuredImageUrl && (
              <button
                type="button"
                className={`${styles.btnGhost} ${styles.btnFull}`}
                style={{ marginBottom: 8 }}
                onClick={() => imageInputRef.current?.click()}
              >
                Change image
              </button>
            )}
            {featuredImageKey && (
              <div className={styles.field}>
                <label className={styles.label}>Alt text</label>
                <input
                  className={styles.input}
                  value={featuredImageAlt}
                  onChange={(e) => setFeaturedImageAlt(e.target.value)}
                  placeholder="Image alt description"
                />
              </div>
            )}
          </div>

          {/* Categories */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Categories</div>
            <div className={styles.pills}>
              {selectedCats.map(c => (
                <span key={c.id} className={styles.pill}>
                  {c.name}
                  <button
                    type="button"
                    className={styles.pillRemove}
                    onClick={() => setCategoryIds(ids => ids.filter(id => id !== c.id))}
                  >×</button>
                </span>
              ))}
              <button
                type="button"
                className={styles.addPill}
                onClick={() => setShowCatPicker(true)}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Tags</div>
            <div className={styles.pills}>
              {selectedTags.map(t => (
                <span key={t.id} className={styles.pill}>
                  {t.name}
                  <button
                    type="button"
                    className={styles.pillRemove}
                    onClick={() => setTagIds(ids => ids.filter(id => id !== t.id))}
                  >×</button>
                </span>
              ))}
              <button
                type="button"
                className={styles.addPill}
                onClick={() => setShowTagPicker(true)}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Save button */}
          <button
            className={`${styles.btnPrimary} ${styles.btnFull}`}
            onClick={() => save()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* ── Pickers ── */}
      {showCatPicker && (
        <PickerModal
          title="Select categories"
          items={allCategories}
          selected={categoryIds}
          onToggle={(id) => setCategoryIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id])}
          onClose={() => setShowCatPicker(false)}
        />
      )}
      {showTagPicker && (
        <PickerModal
          title="Select tags"
          items={allTags}
          selected={tagIds}
          onToggle={(id) => setTagIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id])}
          onClose={() => setShowTagPicker(false)}
        />
      )}
    </div>
  );
}
