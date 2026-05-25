"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ImageGalleryEditor from "@/components/admin/shop/ImageGalleryEditor";
import MediaPicker, { MediaAsset } from "@/components/admin/media/MediaPicker";
import BilingualField from "@/components/admin/fleet/BilingualField";
import styles from "../ProductEdit.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { useEntityTranslations } from "@/hooks/useEntityTranslations";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Category { id: string; name: string; parentId: string | null }

interface OptionValue {
  id: string; value: string; displayValue: string | null;
  sortOrder: number; isActive: boolean;
  swatchValue?: string | null; swatchType?: "color" | "image" | null;
}

interface VariantAttr {
  id: string; name: string; slug: string; displayType: string;
  isActive: boolean; sortOrder: number;
  optionValues: OptionValue[];
}

interface ProductAttr {
  id: string;
  attributeId: string;
  sortOrder: number;
  defaultOptionValueId: string | null;
  attribute: VariantAttr;
}

interface DefaultVariant {
  id: string; priceCents: number; compareAtPriceCents: number | null;
  sku: string | null; isDefault: boolean;
}

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
  variants: DefaultVariant[];
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function EditProductPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();

  // Product & categories
  const [product, setProduct]       = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: "", slug: "", status: "draft", featured: false,
    brand: "", shortDescription: "", description: "",
    primaryCategoryId: "",
    categoryIds: [] as string[],
  });

  // Pricing (synced to the default variant)
  const [price, setPrice]                   = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");

  // Media
  const [featuredKey, setFeaturedKey]   = useState<string | null>(null);
  const [featuredUrl, setFeaturedUrl]   = useState<string | null>(null);
  const [featuredOpen, setFeaturedOpen] = useState(false);
  const [galleryKeys, setGalleryKeys]   = useState<string[]>([]);
  const [saving, setSaving]             = useState(false);

  // Bilingual
  const { enValues, setEn, saveEnTranslations } = useEntityTranslations('shop_product', params.id);

  // ── Product-level variation attributes ──────────────────────────────────────
  const [productAttrs, setProductAttrs] = useState<ProductAttr[]>([]);
  const [allAttrs, setAllAttrs]         = useState<VariantAttr[]>([]);
  const [attrLinkId, setAttrLinkId]     = useState("");
  const [attrLinkDefaultId, setAttrLinkDefaultId] = useState("");
  const [attrLinking, setAttrLinking]   = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch(`/next-api/shop/products/${params.id}`).then(r => r.json()),
      fetch("/next-api/admin/shop/categories").then(r => r.ok ? r.json() : []),
      fetch("/next-api/admin/shop/variant-attributes").then(r => r.ok ? r.json() : []),
      fetch(`/next-api/shop/products/${params.id}/attributes`).then(r => r.ok ? r.json() : []),
    ]).then(([p, cats, attrs, prodAttrs]) => {
      setProduct(p);
      setGalleryKeys(p.galleryImageKeys ?? []);
      setFeaturedKey(p.featuredImageKey ?? null);
      setFeaturedUrl(p.featuredImageUrl ?? null);
      setCategories(Array.isArray(cats) ? cats : []);
      setAllAttrs(Array.isArray(attrs) ? attrs : []);
      setProductAttrs(Array.isArray(prodAttrs) ? prodAttrs : []);
      setForm({
        title:             p.title,
        slug:              p.slug,
        status:            p.status,
        featured:          p.featured ?? false,
        brand:             p.brand ?? "",
        shortDescription:  p.shortDescription ?? "",
        description:       p.description ?? "",
        primaryCategoryId: p.primaryCategoryId ?? "",
        categoryIds:       (p.categories ?? []).map((c: { id: string }) => c.id),
      });
      const dv: DefaultVariant | undefined =
        (p.variants ?? []).find((v: DefaultVariant) => v.isDefault) ?? p.variants?.[0];
      if (dv) {
        setPrice((dv.priceCents / 100).toFixed(2));
        setCompareAtPrice(dv.compareAtPriceCents ? (dv.compareAtPriceCents / 100).toFixed(2) : "");
      }
    });
  }, [params.id]);

  // ── Product attribute management ──────────────────────────────────────────

  const linkedAttrIds = new Set(productAttrs.map(pa => pa.attributeId));
  const unlinkedAttrs = allAttrs.filter(a => a.isActive && !linkedAttrIds.has(a.id));

  async function linkAttribute() {
    if (!attrLinkId) return;
    const selectedAttr = allAttrs.find(a => a.id === attrLinkId);
    const activeOvs = (selectedAttr?.optionValues ?? []).filter(v => v.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
    if (activeOvs.length > 0 && !attrLinkDefaultId) {
      toast.error("Please select a default option before adding");
      return;
    }
    setAttrLinking(true);
    const res = await fetch(`/next-api/shop/products/${params.id}/attributes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attributeId: attrLinkId,
        defaultOptionValueId: attrLinkDefaultId || null,
      }),
    });
    const updated: ProductAttr[] = await fetch(`/next-api/shop/products/${params.id}/attributes`).then(r => r.ok ? r.json() : []);
    setProductAttrs(updated);
    setAttrLinkId("");
    setAttrLinkDefaultId("");
    if (res.ok) {
      toast.success("Variation added to product");
    } else if (res.status === 409) {
      toast.success("Variation already linked — list refreshed");
    } else {
      toast.error("Failed to add variation");
    }
    setAttrLinking(false);
  }

  async function updateDefaultOption(attributeId: string, defaultOptionValueId: string | null) {
    const res = await fetch(`/next-api/shop/products/${params.id}/attributes/${attributeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultOptionValueId }),
    });
    if (res.ok) {
      setProductAttrs(prev => prev.map(pa =>
        pa.attributeId === attributeId ? { ...pa, defaultOptionValueId } : pa
      ));
      toast.success("Default option updated");
    } else {
      toast.error("Failed to update default option");
    }
  }

  async function unlinkAttribute(attributeId: string, attrName: string) {
    if (!confirm(`Remove "${attrName}" from this product?`)) return;
    const res = await fetch(`/next-api/shop/products/${params.id}/attributes/${attributeId}`, { method: "DELETE" });
    if (res.ok) {
      setProductAttrs(prev => prev.filter(pa => pa.attributeId !== attributeId));
      toast.success(`Removed "${attrName}"`);
    } else {
      toast.error("Failed to remove variation");
    }
  }

  // ── Product save ──────────────────────────────────────────────────────────

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

    const priceCents          = price ? Math.round(parseFloat(price) * 100) : undefined;
    const compareAtPriceCents = compareAtPrice ? Math.round(parseFloat(compareAtPrice) * 100) : null;

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
        ...(priceCents !== undefined ? { priceCents } : {}),
        compareAtPriceCents,
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

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (!product) return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <span className={styles.skeleton} style={{ height: 34, width: 100, display: "inline-block", borderRadius: 8 }} />
          <span className={styles.skeleton} style={{ height: 20, width: 220, display: "inline-block" }} />
        </div>
        <span className={styles.skeleton} style={{ height: 36, width: 130, display: "inline-block", borderRadius: 9 }} />
      </div>
      <div className={styles.body}>
        <div>
          {[1, 2].map(i => (
            <div key={i} className={styles.section}>
              <div className={styles.sectionHead} />
              <div className={styles.sectionBody}>
                {Array.from({ length: 3 }, (_, j) => (
                  <div key={j} className={styles.field}>
                    <span className={styles.skeleton} style={{ height: 12, width: 80, display: "block", marginBottom: 6 }} />
                    <span className={styles.skeleton} style={{ height: 38, width: "100%", display: "block" }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHead} />
            <div className={styles.sidebarCardBody}>
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className={styles.field}>
                  <span className={styles.skeleton} style={{ height: 12, width: 70, display: "block", marginBottom: 6 }} />
                  <span className={styles.skeleton} style={{ height: 36, width: "100%", display: "block" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {/* ── Sticky topbar ── */}
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <Link href="/admin/shop/products" className={styles.backBtn}>← Products</Link>
          <span className={styles.topbarTitle}>{product.title}</span>
        </div>
        <div className={styles.topbarActions}>
          <button form="product-form" type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSave}>
        <div className={styles.body}>

          {/* ── Left main column ── */}
          <div>

            {/* Content */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionIcon}>✏️</span>
                <span className={styles.sectionTitle}>Content</span>
              </div>
              <div className={styles.sectionBody}>
                <BilingualField label="Title" frRequired frValue={form.title} frOnChange={v => setForm(f => ({ ...f, title: v }))} enValue={enValues.title ?? ""} enOnChange={v => setEn('title', v)} />
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Slug</label>
                    <input className={styles.input} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Brand</label>
                    <input className={styles.input} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                  </div>
                </div>
                <BilingualField label="Short description" frValue={form.shortDescription} frOnChange={v => setForm(f => ({ ...f, shortDescription: v }))} enValue={enValues.shortDescription ?? ""} enOnChange={v => setEn('shortDescription', v)} multiline rows={2} />
                <BilingualField label="Description" frValue={form.description} frOnChange={v => setForm(f => ({ ...f, description: v }))} enValue={enValues.description ?? ""} enOnChange={v => setEn('description', v)} multiline rows={5} />
              </div>
            </div>

            {/* Pricing */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionIcon}>💰</span>
                <span className={styles.sectionTitle}>Pricing</span>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Price (€) *</label>
                    <input
                      className={styles.input}
                      type="number" step="0.01" min="0"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      placeholder="29.99"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Compare-at price (€)</label>
                    <input
                      className={styles.input}
                      type="number" step="0.01" min="0"
                      value={compareAtPrice}
                      onChange={e => setCompareAtPrice(e.target.value)}
                      placeholder="49.99 (optional)"
                    />
                    <span className={styles.hint}>Shown as crossed-out original price</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Media */}
            <div className={styles.section}>
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
                          <Image src={featuredUrl} alt="" fill style={{ objectFit: "cover" }} />
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
                      <button type="button" onClick={() => { setFeaturedKey(null); setFeaturedUrl(null); }} style={{ fontSize: 12, color: "var(--color-error)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
                        Remove image
                      </button>
                    )}
                    <MediaPicker open={featuredOpen} onClose={() => setFeaturedOpen(false)} onSelect={handleFeaturedSelect} title="Select featured image" currentKey={featuredKey ?? undefined} />
                  </div>
                  <div>
                    <ImageGalleryEditor initialKeys={product.galleryImageKeys ?? []} initialUrls={product.galleryImageUrls ?? []} onChange={setGalleryKeys} label="Gallery images" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Variations ── */}
            <div className={`${styles.section} ${styles.sectionLast}`}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionIcon}>🎨</span>
                <span className={styles.sectionTitle}>Variations</span>
              </div>
              <div className={styles.sectionBody}>

                {/* Currently linked attributes */}
                {productAttrs.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
                    No variations linked. Add a variation below — customers will see its options when choosing.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                    {[...productAttrs].sort((a, b) => a.sortOrder - b.sortOrder).map(pa => {
                      const activeOvs = [...pa.attribute.optionValues]
                        .filter(v => v.isActive)
                        .sort((a, b) => a.sortOrder - b.sortOrder);
                      return (
                        <div key={pa.id} style={{
                          border: "1px solid var(--color-border)",
                          borderRadius: 10,
                          padding: "12px 14px",
                          background: "var(--color-surface)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-primary)" }}>
                                {pa.attribute.name}
                              </span>
                              <span style={{
                                fontSize: 11, fontWeight: 600,
                                background: "var(--color-surface-raised)",
                                border: "1px solid var(--color-border)",
                                borderRadius: 5, padding: "1px 7px",
                                color: "var(--color-text-muted)",
                                textTransform: "capitalize",
                              }}>
                                {pa.attribute.displayType}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => unlinkAttribute(pa.attributeId, pa.attribute.name)}
                              style={{
                                fontSize: 12, color: "var(--color-error)",
                                background: "none", border: "none", cursor: "pointer",
                                padding: "2px 6px",
                              }}
                            >
                              Remove
                            </button>
                          </div>

                          {/* Option value chips */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                            {activeOvs.length === 0 ? (
                              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>No option values defined</span>
                            ) : activeOvs.map(ov => (
                              <span key={ov.id} style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                fontSize: 12, fontWeight: 500,
                                background: "#fff",
                                border: pa.defaultOptionValueId === ov.id
                                  ? "2px solid var(--color-admin-secondary)"
                                  : "1px solid var(--color-border)",
                                borderRadius: 6, padding: "3px 10px",
                                color: "var(--color-text-primary)",
                              }}>
                                {ov.swatchValue && ov.swatchType === "color" && (
                                  <span style={{
                                    width: 12, height: 12, borderRadius: "50%",
                                    background: ov.swatchValue,
                                    border: "1px solid rgba(0,0,0,.15)",
                                    flexShrink: 0,
                                  }} />
                                )}
                                {ov.displayValue ?? ov.value}
                                {pa.defaultOptionValueId === ov.id && (
                                  <span style={{ fontSize: 10, color: "var(--color-admin-secondary)", fontWeight: 700 }}>default</span>
                                )}
                              </span>
                            ))}
                          </div>

                          {/* Default option picker */}
                          {activeOvs.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <label style={{ fontSize: 12, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                                Default option:
                              </label>
                              <select
                                className={styles.select}
                                style={{ fontSize: 12, padding: "3px 8px", flex: 1 }}
                                value={pa.defaultOptionValueId ?? ""}
                                onChange={e => updateDefaultOption(pa.attributeId, e.target.value || null)}
                              >
                                <option value="">— none —</option>
                                {activeOvs.map(ov => (
                                  <option key={ov.id} value={ov.id}>
                                    {ov.displayValue ?? ov.value}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Link new attribute */}
                {unlinkedAttrs.length > 0 && (() => {
                  const selectedAttrForLink = allAttrs.find(a => a.id === attrLinkId);
                  const linkActiveOvs = (selectedAttrForLink?.optionValues ?? [])
                    .filter(v => v.isActive)
                    .sort((a, b) => a.sortOrder - b.sortOrder);
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select
                          className={styles.select}
                          value={attrLinkId}
                          onChange={e => { setAttrLinkId(e.target.value); setAttrLinkDefaultId(""); }}
                          style={{ flex: 1 }}
                        >
                          <option value="">— Add a variation (Color, Size…) —</option>
                          {unlinkedAttrs.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={linkAttribute}
                          disabled={!attrLinkId || attrLinking}
                          className={styles.saveBtn}
                          style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                        >
                          {attrLinking ? "Adding…" : "Add"}
                        </button>
                      </div>
                      {attrLinkId && linkActiveOvs.length > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <label style={{ fontSize: 12, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                            Default option:
                          </label>
                          <select
                            className={styles.select}
                            style={{ fontSize: 12, padding: "3px 8px", flex: 1 }}
                            value={attrLinkDefaultId}
                            onChange={e => setAttrLinkDefaultId(e.target.value)}
                          >
                            <option value="">— Select default option —</option>
                            {linkActiveOvs.map(ov => (
                              <option key={ov.id} value={ov.id}>
                                {ov.displayValue ?? ov.value}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {unlinkedAttrs.length === 0 && productAttrs.length > 0 && (
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 8 }}>
                    All available variations are linked to this product.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div>

            {/* Status & Visibility */}
            <div className={styles.sidebarCard}>
              <div className={styles.sidebarCardHead}>
                <span className={styles.sidebarCardTitle}>Status & Visibility</span>
              </div>
              <div className={styles.sidebarCardBody}>
                <div className={styles.field}>
                  <label className={styles.label}>Status</label>
                  <select className={styles.select} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
                <div className={styles.divider} />
                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>Featured</div>
                    <div className={styles.toggleNote}>Show in featured sections</div>
                  </div>
                  <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--color-admin-secondary)", cursor: "pointer" }} />
                </div>
              </div>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className={styles.sidebarCard}>
                <div className={styles.sidebarCardHead}>
                  <span className={styles.sidebarCardTitle}>Categories</span>
                </div>
                <div className={styles.sidebarCardBody}>
                  <div className={styles.field}>
                    <label className={styles.label}>Primary category</label>
                    <select className={styles.select} value={form.primaryCategoryId} onChange={e => setForm(f => ({ ...f, primaryCategoryId: e.target.value }))}>
                      <option value="">— None —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.divider} />
                  <label className={styles.label} style={{ display: "block", marginBottom: 8 }}>Additional categories</label>
                  <div className={styles.categoryList}>
                    {categories.map(c => (
                      <label key={c.id} className={styles.categoryItem}>
                        <input type="checkbox" checked={form.categoryIds.includes(c.id)} onChange={() => toggleCategory(c.id)} />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Product Info */}
            <div className={styles.sidebarCard}>
              <div className={styles.sidebarCardHead}>
                <span className={styles.sidebarCardTitle}>Product Info</span>
              </div>
              <div className={styles.sidebarCardBody}>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>SKU</span>
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--color-text-muted)" }}>{product.sku ?? "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
