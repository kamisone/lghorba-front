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
interface Variant   { id: string; sku: string; title: string; priceCents: number; isDefault: boolean; mediaUrls: string[] }
interface Product {
  id: string; title: string; sku: string | null; slug: string; status: string;
  featured: boolean; shortDescription: string | null; description: string | null;
  brand: string | null;
  featuredImageKey:  string | null;
  featuredImageUrl:  string | null;
  galleryImageKeys:  string[];
  galleryImageUrls:  string[];
  primaryCategoryId: string | null;
  categories: Array<{ id: string; name: string }>;
  variants: Variant[];
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [product, setProduct]       = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: "", slug: "", status: "", brand: "", shortDescription: "", description: "",
    primaryCategoryId: "",
    categoryIds: [] as string[],
  });

  const [featuredKey, setFeaturedKey]   = useState<string | null>(null);
  const [featuredUrl, setFeaturedUrl]   = useState<string | null>(null);
  const [featuredOpen, setFeaturedOpen] = useState(false);
  const [galleryKeys, setGalleryKeys]   = useState<string[]>([]);
  const [saving, setSaving]             = useState(false);
  const { enValues, setEn, saveEnTranslations } = useEntityTranslations('shop_product', params.id);

  useEffect(() => {
    Promise.all([
      fetch(`/next-api/shop/products/${params.id}`).then(r => r.json()),
      fetch("/next-api/admin/shop/categories").then(r => r.ok ? r.json() : []),
    ]).then(([p, cats]) => {
      setProduct(p);
      setGalleryKeys(p.galleryImageKeys ?? []);
      setFeaturedKey(p.featuredImageKey ?? null);
      setFeaturedUrl(p.featuredImageUrl ?? null);
      setCategories(Array.isArray(cats) ? cats : []);
      setForm({
        title:             p.title,
        slug:              p.slug,
        status:            p.status,
        brand:             p.brand ?? "",
        shortDescription:  p.shortDescription ?? "",
        description:       p.description ?? "",
        primaryCategoryId: p.primaryCategoryId ?? "",
        categoryIds:       (p.categories ?? []).map((c: { id: string }) => c.id),
      });
    });
  }, [params.id]);

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const categoryIds = form.primaryCategoryId && !form.categoryIds.includes(form.primaryCategoryId)
      ? [form.primaryCategoryId, ...form.categoryIds]
      : form.categoryIds;

    const res = await fetch(`/next-api/shop/products/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        brand:             form.brand || null,
        primaryCategoryId: form.primaryCategoryId || null,
        categoryIds,
        featuredImageKey:  featuredKey,
        galleryImageKeys:  galleryKeys,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as any).message ?? "Save failed");
    } else {
      const p: Product = await res.json();
      await saveEnTranslations(params.id, ['title', 'shortDescription', 'description', 'seoTitle', 'seoDescription', 'featuredImageAlt']);
      setProduct(p);
      setGalleryKeys(p.galleryImageKeys ?? []);
      setFeaturedKey(p.featuredImageKey ?? null);
      setFeaturedUrl(p.featuredImageUrl ?? null);
      toast.success("Changes saved");
    }
    setSaving(false);
  }

  if (!product) return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.skeleton} style={{ height: 28, width: 260 }} />
        <span className={styles.skeleton} style={{ height: 34, width: 80 }} />
      </div>
      <div className={styles.formGrid} style={{ marginTop: 8 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={i < 2 ? `${styles.formField} ${styles.formSpan2}` : styles.formField}>
            <span className={styles.skeleton} style={{ height: 12, width: 80, marginBottom: 4 }} />
            <span className={styles.skeleton} style={{ height: 36, width: "100%" }} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Edit: {product.title}</h1>
        <button onClick={() => router.back()} className={`${styles.btn} ${styles.btnSecondary}`}>← Back</button>
      </div>

      <form onSubmit={handleSave}>
        {/* ── Core fields ── */}
        <BilingualField
          label="Title"
          frRequired
          frValue={form.title}
          frOnChange={v => setForm(f => ({ ...f, title: v }))}
          enValue={enValues.title ?? ""}
          enOnChange={v => setEn('title', v)}
        />
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label>Slug</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
          </div>
          <div className={styles.formField}>
            <label>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
          <div className={styles.formField}>
            <label>Brand</label>
            <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
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
          {/* Featured image */}
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

          {/* Gallery */}
          <div className={`${styles.formField} ${styles.formSpan2}`}>
            <ImageGalleryEditor
              initialKeys={product.galleryImageKeys ?? []}
              initialUrls={product.galleryImageUrls ?? []}
              onChange={setGalleryKeys}
              label="Gallery images"
            />
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button type="submit" disabled={saving} className={`${styles.btn} ${styles.btnPrimary}`}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* ── Variants ── */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Variants</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Default</th>
              <th>Images</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(product.variants ?? []).map(v => (
              <tr key={v.id}>
                <td>{v.title}</td>
                <td>{v.sku}</td>
                <td>€{(v.priceCents / 100).toFixed(2)}</td>
                <td>{v.isDefault ? "✓" : ""}</td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(v.mediaUrls ?? []).length === 0
                      ? <span style={{ fontSize: 12, color: "#9ca3af" }}>None</span>
                      : (v.mediaUrls ?? []).map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={url} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, border: "1px solid #e5e7eb" }} />
                        ))
                    }
                  </div>
                </td>
                <td>
                  <button
                    className={`${styles.btn} ${styles.btnDanger}`}
                    disabled={v.isDefault}
                    title={v.isDefault ? "Cannot delete the default variant" : "Delete variant"}
                    onClick={async () => {
                      if (!confirm(`Delete variant "${v.title}"? This cannot be undone.`)) return;
                      const res = await fetch(`/next-api/shop/products/${params.id}/variants/${v.id}`, { method: "DELETE" });
                      if (res.ok) {
                        toast.success("Variant deleted");
                        const updated = await fetch(`/next-api/shop/products/${params.id}`).then(r => r.json());
                        setProduct(updated);
                      } else {
                        toast.error("Failed to delete variant");
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
