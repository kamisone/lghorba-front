"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ImageGalleryEditor from "@/components/admin/shop/ImageGalleryEditor";
import MediaPicker, { MediaAsset } from "@/components/admin/media/MediaPicker";
import BilingualField from "@/components/admin/fleet/BilingualField";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { useEntityTranslations } from "@/hooks/useEntityTranslations";

interface Category { id: string; name: string; parentId: string | null }

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: "", slug: "", sku: "", brand: "", shortDescription: "", description: "",
    priceCents: "", initialStock: "0", featured: false,
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
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>New Product</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Core fields ── */}
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
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label>Slug (optional)</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" />
          </div>
          <div className={styles.formField}>
            <label>SKU</label>
            <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
          </div>
          <div className={styles.formField}>
            <label>Price (€) *</label>
            <input required type="number" step="0.01" min="0" value={form.priceCents} onChange={e => setForm(f => ({ ...f, priceCents: e.target.value }))} placeholder="0.00" />
          </div>
          <div className={styles.formField}>
            <label>Initial stock</label>
            <input type="number" min="0" value={form.initialStock} onChange={e => setForm(f => ({ ...f, initialStock: e.target.value }))} />
          </div>
          <div className={styles.formField}>
            <label>Brand</label>
            <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
          </div>
          <div className={styles.formField}>
            <label>Featured</label>
            <select value={String(form.featured)} onChange={e => setForm(f => ({ ...f, featured: e.target.value === "true" }))}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
        </div>

        {/* ── Categories ── */}
        {categories.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af", margin: "24px 0 10px" }}>Categories</p>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Primary category</label>
                <select value={form.primaryCategoryId} onChange={e => setForm(f => ({ ...f, primaryCategoryId: e.target.value }))}>
                  <option value="">— None —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className={`${styles.formField} ${styles.formSpan2}`}>
                <label>Additional categories</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  {categories.map(c => (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
                      <input type="checkbox" checked={form.categoryIds.includes(c.id)} onChange={() => toggleCategory(c.id)} />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Content ── */}
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af", margin: "24px 0 10px" }}>Content</p>
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

        {/* ── Media ── */}
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af", margin: "24px 0 10px" }}>Media</p>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label>Featured image</label>
            {featuredUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={featuredUrl} alt="" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb", marginBottom: 8, display: "block" }} />
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setFeaturedOpen(true)}>
                {featuredKey ? "Change image" : "Choose from Library"}
              </button>
              {featuredKey && (
                <button type="button" className={styles.btn} onClick={() => { setFeaturedKey(null); setFeaturedUrl(null); }}>Remove</button>
              )}
            </div>
            <MediaPicker open={featuredOpen} onClose={() => setFeaturedOpen(false)} onSelect={handleFeaturedSelect} title="Select featured image" currentKey={featuredKey ?? undefined} />
          </div>
          <div className={`${styles.formField} ${styles.formSpan2}`}>
            <ImageGalleryEditor
              initialKeys={[]}
              initialUrls={[]}
              onChange={setGalleryKeys}
              label="Gallery images"
            />
          </div>
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <button type="submit" disabled={submitting} className={`${styles.btn} ${styles.btnPrimary}`}>
            {submitting ? "Creating..." : "Create Product"}
          </button>
          <button type="button" onClick={() => router.back()} className={`${styles.btn} ${styles.btnSecondary}`}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
