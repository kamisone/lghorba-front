"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import styles from "./BlogPostEditor.module.css";
import { slugify } from "@/lib/slugify";
import { X } from "lucide-react";

const BlogRichEditor = dynamic(() => import("./BlogRichEditor"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

export type BlogPostStatus = "draft" | "scheduled" | "published" | "archived";
type Locale = "en" | "fr";

interface PostTranslation {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  featuredImageAlt: string | null;
}

export interface BlogCategory {
  id: string;
  slug: string;
  color: string | null;
  translations: Partial<Record<Locale, { name: string }>>;
}

export interface BlogTag { id: string; name: string; slug: string; }

export interface BlogPost {
  id: string;
  status: BlogPostStatus;
  featuredImageKey: string | null;
  featuredImageUrl: string | null;
  readingTimeMinutes: number;
  publishedAt: string | null;
  scheduledPublishAt: string | null;
  featured: boolean;
  authorName: string | null;
  categories: BlogCategory[];
  tags: BlogTag[];
  translations: Partial<Record<Locale, PostTranslation>>;
}

interface Props { postId?: string; }

// Per-locale form state
interface TranslationForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  featuredImageAlt: string;
}

const emptyForm = (): TranslationForm => ({
  title: "", slug: "", excerpt: "", content: "",
  seoTitle: "", seoDescription: "", canonicalUrl: "", featuredImageAlt: "",
});

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

  // Language tab
  const [activeLang, setActiveLang] = useState<Locale>("en");
  const [translations, setTranslations] = useState<Record<Locale, TranslationForm>>({
    en: emptyForm(),
    fr: emptyForm(),
  });

  // Shared (non-translatable) fields
  const [status,             setStatus]             = useState<BlogPostStatus>("draft");
  const [featuredImageKey,        setFeaturedImageKey]        = useState("");
  const [featuredImagePreviewUrl, setFeaturedImagePreviewUrl] = useState<string | null>(null);
  const [scheduledPublishAt, setScheduledPublishAt] = useState("");
  const [featured,           setFeatured]           = useState(false);
  const [authorName,         setAuthorName]         = useState("");

  const [allCategories, setAllCategories] = useState<BlogCategory[]>([]);
  const [allTags,       setAllTags]       = useState<BlogTag[]>([]);
  const [categoryIds,   setCategoryIds]   = useState<string[]>([]);
  const [tagIds,        setTagIds]        = useState<string[]>([]);

  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);

  const imageInputRef  = useRef<HTMLInputElement>(null);
  const autoSaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helper: update a field in the active language ──────────────────────────

  function setField<K extends keyof TranslationForm>(key: K, val: TranslationForm[K]) {
    setTranslations(prev => ({
      ...prev,
      [activeLang]: { ...prev[activeLang], [key]: val },
    }));
  }

  // ── Category display name (active lang with fallback) ──────────────────────

  const catName = (c: BlogCategory) =>
    c.translations[activeLang]?.name ?? c.translations.en?.name ?? c.translations.fr?.name ?? c.slug;

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
        setStatus(p.status);
        setScheduledPublishAt(p.scheduledPublishAt ? p.scheduledPublishAt.slice(0, 16) : "");
        setFeatured(p.featured);
        setAuthorName(p.authorName ?? "");
        setCategoryIds(p.categories.map(c => c.id));
        setTagIds(p.tags.map(t => t.id));
        setFeaturedImageKey(p.featuredImageKey ?? "");
        setFeaturedImagePreviewUrl(p.featuredImageUrl ?? null);
        setTranslations({
          en: {
            title:            p.translations.en?.title ?? "",
            slug:             p.translations.en?.slug ?? "",
            excerpt:          p.translations.en?.excerpt ?? "",
            content:          p.translations.en?.content ?? "",
            seoTitle:         p.translations.en?.seoTitle ?? "",
            seoDescription:   p.translations.en?.seoDescription ?? "",
            canonicalUrl:     p.translations.en?.canonicalUrl ?? "",
            featuredImageAlt: p.translations.en?.featuredImageAlt ?? "",
          },
          fr: {
            title:            p.translations.fr?.title ?? "",
            slug:             p.translations.fr?.slug ?? "",
            excerpt:          p.translations.fr?.excerpt ?? "",
            content:          p.translations.fr?.content ?? "",
            seoTitle:         p.translations.fr?.seoTitle ?? "",
            seoDescription:   p.translations.fr?.seoDescription ?? "",
            canonicalUrl:     p.translations.fr?.canonicalUrl ?? "",
            featuredImageAlt: p.translations.fr?.featuredImageAlt ?? "",
          },
        });
        // Open the first language that has a title
        if (!p.translations.en?.title && p.translations.fr?.title) setActiveLang("fr");
      })
      .catch(() => setError("Failed to load post"))
      .finally(() => setLoading(false));
  }, [postId, isEdit]);

  // ── Auto-slug ──────────────────────────────────────────────────────────────

  const handleTitleChange = (val: string) => {
    const autoSlug = !isEdit || status === "draft" ? slugify(val) : translations[activeLang].slug;
    setTranslations(prev => ({
      ...prev,
      [activeLang]: { ...prev[activeLang], title: val, slug: autoSlug },
    }));
  };

  // ── Build payload ──────────────────────────────────────────────────────────

  const buildPayload = useCallback(() => ({
    status,
    scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null,
    featured,
    authorName: authorName || null,
    featuredImageKey: featuredImageKey || null,
    categoryIds,
    tagIds,
    translations: {
      en: {
        title:            translations.en.title || undefined,
        slug:             translations.en.slug  || undefined,
        excerpt:          translations.en.excerpt || null,
        content:          translations.en.content || null,
        seoTitle:         translations.en.seoTitle || null,
        seoDescription:   translations.en.seoDescription || null,
        canonicalUrl:     translations.en.canonicalUrl || null,
        featuredImageAlt: translations.en.featuredImageAlt || null,
      },
      fr: {
        title:            translations.fr.title || undefined,
        slug:             translations.fr.slug  || undefined,
        excerpt:          translations.fr.excerpt || null,
        content:          translations.fr.content || null,
        seoTitle:         translations.fr.seoTitle || null,
        seoDescription:   translations.fr.seoDescription || null,
        canonicalUrl:     translations.fr.canonicalUrl || null,
        featuredImageAlt: translations.fr.featuredImageAlt || null,
      },
    },
  }), [translations, status, scheduledPublishAt, featured, authorName, featuredImageKey, categoryIds, tagIds]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const save = useCallback(async (opts: { publish?: boolean } = {}) => {
    const hasTitle = translations.en.title.trim() || translations.fr.title.trim();
    if (!hasTitle) { setError("At least one language title is required"); return; }
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
  }, [buildPayload, isEdit, postId, router, translations]);

  // Debounced auto-save for edits
  useEffect(() => {
    if (!isEdit) return;
    if (!translations.en.title && !translations.fr.title) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => save(), 10_000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [translations, isEdit, save]);

  // ── Featured image upload ──────────────────────────────────────────────────

  const uploadFeaturedImage = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/next-api/blog/media", { method: "POST", body: fd });
      const data = await res.json() as { key: string; url: string };
      setFeaturedImageKey(data.key);
      setFeaturedImagePreviewUrl(data.url);
    } catch {
      setError("Image upload failed");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <div style={{ padding: 40, color: "var(--color-text-muted)" }}>Loading…</div>;

  const t = translations[activeLang];
  const selectedCats = allCategories.filter(c => categoryIds.includes(c.id));
  const selectedTags = allTags.filter(tg => tagIds.includes(tg.id));
  const catPickerItems = allCategories.map(c => ({ id: c.id, name: catName(c) }));

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

      {saved && <p className={styles.savedNote}>Saved ✓</p>}
      {error && <p className={styles.errorNote}>{error}</p>}

      <div className={styles.layout}>
        {/* ── Main column ── */}
        <div className={styles.main}>
          {/* Language tabs */}
          <div className={styles.langTabs}>
            {(["en", "fr"] as const).map(lang => (
              <button
                key={lang}
                type="button"
                className={`${styles.langTab} ${activeLang === lang ? styles.langTabActive : ""}`}
                onClick={() => setActiveLang(lang)}
              >
                {lang === "en" ? "EN — English" : "FR — Français"}
                {translations[lang].title && <span className={styles.langDot} />}
              </button>
            ))}
          </div>

          {/* Title & slug */}
          <div className={styles.card}>
            <div className={styles.field}>
              <label className={styles.label}>Title *</label>
              <input
                className={styles.input}
                value={t.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={activeLang === "en" ? "Article title" : "Titre de l'article"}
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
                  value={t.slug}
                  onChange={(e) => setField("slug", slugify(e.target.value))}
                  placeholder="article-url-slug"
                />
                <button
                  type="button"
                  className={styles.slugBtn}
                  onClick={() => setField("slug", slugify(t.title))}
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
                value={t.excerpt}
                onChange={(e) => setField("excerpt", e.target.value)}
                placeholder={activeLang === "en"
                  ? "A short, compelling summary (150–200 chars recommended)…"
                  : "Un résumé court et accrocheur (150–200 caractères recommandés)…"}
                rows={3}
              />
            </div>
          </div>

          {/* Content — remount editor when switching language to reset internal state */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Content</div>
            <BlogRichEditor
              key={activeLang}
              content={t.content ?? ""}
              onChange={(val) => setField("content", val)}
              placeholder={activeLang === "en" ? "Start writing your article…" : "Commencez à rédiger votre article…"}
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
                value={t.seoTitle}
                onChange={(e) => setField("seoTitle", e.target.value)}
                placeholder="Custom SEO title"
                maxLength={70}
              />
              <span className={styles.labelMuted}>{t.seoTitle.length}/70</span>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>SEO Description</label>
              <textarea
                className={styles.textarea}
                value={t.seoDescription}
                onChange={(e) => setField("seoDescription", e.target.value)}
                placeholder="Meta description for search engines (150–160 chars recommended)"
                rows={3}
                maxLength={160}
              />
              <span className={styles.labelMuted}>{t.seoDescription.length}/160</span>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Canonical URL <span className={styles.labelMuted}>(optional)</span></label>
              <input
                className={styles.input}
                value={t.canonicalUrl}
                onChange={(e) => setField("canonicalUrl", e.target.value)}
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
            {featuredImagePreviewUrl ? (
              <img src={featuredImagePreviewUrl} alt={t.featuredImageAlt} className={styles.imagePreview} />
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
            {featuredImagePreviewUrl && (
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
                <label className={styles.label}>
                  Alt text
                  <span className={styles.labelMuted}>({activeLang.toUpperCase()})</span>
                </label>
                <input
                  className={styles.input}
                  value={t.featuredImageAlt}
                  onChange={(e) => setField("featuredImageAlt", e.target.value)}
                  placeholder="Image description for screen readers"
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
                  {catName(c)}
                  <button
                    type="button"
                    className={styles.pillRemove}
                    onClick={() => setCategoryIds(ids => ids.filter(id => id !== c.id))}
                  ><X size={14} strokeWidth={2} /></button>
                </span>
              ))}
              <button type="button" className={styles.addPill} onClick={() => setShowCatPicker(true)}>
                + Add
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Tags</div>
            <div className={styles.pills}>
              {selectedTags.map(tg => (
                <span key={tg.id} className={styles.pill}>
                  {tg.name}
                  <button
                    type="button"
                    className={styles.pillRemove}
                    onClick={() => setTagIds(ids => ids.filter(id => id !== tg.id))}
                  ><X size={14} strokeWidth={2} /></button>
                </span>
              ))}
              <button type="button" className={styles.addPill} onClick={() => setShowTagPicker(true)}>
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
          items={catPickerItems}
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
