"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ImageGalleryEditor from "@/components/admin/shop/ImageGalleryEditor";
import MediaPicker, { MediaAsset } from "@/components/admin/media/MediaPicker";
import BilingualField from "@/components/admin/BilingualField";
import styles from "../ProductEdit.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { useEntityTranslations } from "@/hooks/useEntityTranslations";
import { Pencil } from "lucide-react";

interface Category { id: string; name: string; parentId: string | null }

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: "", slug: "", sku: "", brand: "",
    shortDescription: "", description: "",
    priceCents: "", initialStock: "0",
    featured: false,
    primaryCategoryId: "",
    categoryIds: [] as string[],
  });
  const { enValues, setEn, saveEnTranslations } = useEntityTranslations('shop_product', null);

  const [featuredKey, setFeaturedKey]   = useState<string | null>(null);
  const [featuredUrl, setFeaturedUrl]   = useState<string | null>(null);
  const [featuredOpen, setFeaturedOpen] = useState(false);
  const [galleryKeys, setGalleryKeys]   = useState<string[]>([]);
  const [submitting, setSubmitting]     = useState(false);

  useEffect(() => {
    fetch("/next-api/admin/shop/categories")
      .then(r => r.ok ? r.json() : [])
      .then(data => setCategories(Array.isArray(data) ? data : data.items ?? []))
      .catch(() => {});
  }, []);

  function toggleCategory(id: string) {
    setForm(f => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter(x => x !== id)
        : [...f.categoryIds, id],
    }));
  }

  function handleFeaturedSelect(asset: MediaAsset) {
    setFeaturedKey(asset.storageKey);
    setFeaturedUrl(asset.url);
    setFeaturedOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const categoryIds = form.primaryCategoryId && !form.categoryIds.includes(form.primaryCategoryId)
      ? [form.primaryCategoryId, ...form.categoryIds]
      : form.categoryIds;

    const res = await fetch("/next-api/shop/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:             form.title,
        slug:              form.slug || undefined,
        sku:               form.sku || null,
        brand:             form.brand || null,
        shortDescription:  form.shortDescription || null,
        description:       form.description || null,
        priceCents:        Math.round(parseFloat(form.priceCents) * 100),
        initialStock:      parseInt(form.initialStock, 10) || 0,
        featured:          form.featured,
        featuredImageKey:  featuredKey ?? null,
        galleryImageKeys:  galleryKeys,
        primaryCategoryId: form.primaryCategoryId || null,
        categoryIds:       categoryIds.length ? categoryIds : undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as any).message ?? "Failed to create product");
      setSubmitting(false);
      return;
    }

    const product = await res.json();
    await saveEnTranslations(product.id, ['title', 'shortDescription', 'description', 'seoTitle', 'seoDescription', 'featuredImageAlt']);
    toast.success("Product created");
    router.push(`/admin/shop/products/${product.id}`);
  }

  return (
    <div className={styles.page}>
      {/* ── Sticky topbar ── */}
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <Link href="/admin/shop/products" className={styles.backBtn}>
            ← Products
          </Link>
          <span className={styles.topbarTitle}>New Product</span>
        </div>
        <div className={styles.topbarActions}>
          <button
            form="product-form"
            type="submit"
            className={styles.saveBtn}
            disabled={submitting}
          >
            {submitting ? "Creating…" : "Create Product"}
          </button>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSubmit}>
        <div className={styles.body}>

          {/* ── Left main column ── */}
          <div>

            {/* Content section */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionIcon}><Pencil size={14} strokeWidth={1.75} /></span>
                <span className={styles.sectionTitle}>Content</span>
              </div>
              <div className={styles.sectionBody}>
                <BilingualField
                  label="Title"
                  frRequired
                  frValue={form.title}
                  frOnChange={v => setForm(f => ({ ...f, title: v }))}
                  frPlaceholder="Titre du produit"
                  enValue={enValues.title ?? ""}
                  enOnChange={v => setEn('title', v)}
                  enPlaceholder="Product title"
                />
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Slug <span className={styles.hint} style={{ fontWeight: 400 }}>(auto-generated)</span></label>
                    <input
                      className={styles.input}
                      value={form.slug}
                      onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                      placeholder="auto-generated"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Brand</label>
                    <input
                      className={styles.input}
                      value={form.brand}
                      onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    />
                  </div>
                </div>
                <BilingualField
                  label="Short description"
                  frValue={form.shortDescription}
                  frOnChange={v => setForm(f => ({ ...f, shortDescription: v }))}
                  enValue={enValues.shortDescription ?? ""}
                  enOnChange={v => setEn('shortDescription', v)}
                  multiline rows={2}
                />
                <BilingualField
                  label="Description"
                  frValue={form.description}
                  frOnChange={v => setForm(f => ({ ...f, description: v }))}
                  enValue={enValues.description ?? ""}
                  enOnChange={v => setEn('description', v)}
                  multiline rows={5}
                />
              </div>
            </div>

            {/* Media section */}
            <div className={`${styles.section} ${styles.sectionLast}`}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionIcon}>🖼</span>
                <span className={styles.sectionTitle}>Media</span>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Featured image</label>
                    <div className={styles.featuredImgWrap} onClick={() => setFeaturedOpen(true)}>
                      {featuredUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={featuredUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                          <div className={styles.featuredImgOverlay}>
                            <span className={styles.featuredImgOverlayBtn}>Change image</span>
                          </div>
                        </>
                      ) : (
                        <div className={styles.featuredImgPlaceholder}>
                          <span className={styles.featuredImgIcon}>🖼</span>
                          <span className={styles.featuredImgHint}>Click to choose image</span>
                        </div>
                      )}
                    </div>
                    {featuredKey && (
                      <button
                        type="button"
                        onClick={() => { setFeaturedKey(null); setFeaturedUrl(null); }}
                        style={{ fontSize: 12, color: "var(--color-error)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
                      >
                        Remove image
                      </button>
                    )}
                    <MediaPicker
                      open={featuredOpen}
                      onClose={() => setFeaturedOpen(false)}
                      onSelect={handleFeaturedSelect}
                      title="Select featured image"
                      currentKey={featuredKey ?? undefined}
                    />
                  </div>
                  <div>
                    <ImageGalleryEditor
                      initialKeys={[]}
                      initialUrls={[]}
                      onChange={setGalleryKeys}
                      label="Gallery images"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div>

            {/* Pricing & Stock card */}
            <div className={styles.sidebarCard}>
              <div className={styles.sidebarCardHead}>
                <span className={styles.sidebarCardTitle}>Pricing & Stock</span>
              </div>
              <div className={styles.sidebarCardBody}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Price (€)<span className={styles.required}>*</span>
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    className={styles.input}
                    value={form.priceCents}
                    onChange={e => setForm(f => ({ ...f, priceCents: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Initial stock</label>
                  <input
                    type="number"
                    min="0"
                    className={styles.input}
                    value={form.initialStock}
                    onChange={e => setForm(f => ({ ...f, initialStock: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>SKU</label>
                  <input
                    className={styles.input}
                    value={form.sku}
                    onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Settings card */}
            <div className={styles.sidebarCard}>
              <div className={styles.sidebarCardHead}>
                <span className={styles.sidebarCardTitle}>Settings</span>
              </div>
              <div className={styles.sidebarCardBody}>
                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>Featured</div>
                    <div className={styles.toggleNote}>Show in featured sections</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: "var(--color-admin-secondary)", cursor: "pointer" }}
                  />
                </div>
              </div>
            </div>

            {/* Categories card */}
            {categories.length > 0 && (
              <div className={styles.sidebarCard}>
                <div className={styles.sidebarCardHead}>
                  <span className={styles.sidebarCardTitle}>Categories</span>
                </div>
                <div className={styles.sidebarCardBody}>
                  <div className={styles.field}>
                    <label className={styles.label}>Primary category</label>
                    <select
                      className={styles.select}
                      value={form.primaryCategoryId}
                      onChange={e => setForm(f => ({ ...f, primaryCategoryId: e.target.value }))}
                    >
                      <option value="">— None —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.divider} />
                  <label className={styles.label} style={{ display: "block", marginBottom: 8 }}>
                    Additional categories
                  </label>
                  <div className={styles.categoryList}>
                    {categories.map(c => (
                      <label key={c.id} className={styles.categoryItem}>
                        <input
                          type="checkbox"
                          checked={form.categoryIds.includes(c.id)}
                          onChange={() => toggleCategory(c.id)}
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </form>
    </div>
  );
}
