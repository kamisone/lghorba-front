"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductMediaManager, { ProductMediaItem, ResolvedProductMediaItem } from "@/components/admin/shop/ProductMediaManager";
import ProductInfoSectionsManager, { ProductInfoSection } from "@/components/admin/shop/ProductInfoSectionsManager";
import ProductTrustBadgesManager, { ProductTrustBadge } from "@/components/admin/shop/ProductTrustBadgesManager";
import ProductFaqsManager, { ProductFaq } from "@/components/admin/shop/ProductFaqsManager";
import CollapsibleSection from "@/components/admin/shop/CollapsibleSection";
import ProductImagePicker from "@/components/admin/shop/ProductImagePicker";
import BilingualField from "@/components/admin/BilingualField";
import styles from "../ProductEdit.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { useEntityTranslations } from "@/hooks/useEntityTranslations";
import { Pencil, ImagePlus } from "lucide-react";

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

interface OptionImage {
  optionValueId: string;
  mediaKey: string;
  url: string | null;
}

interface DefaultVariant {
  id: string; priceCents: number; compareAtPriceCents: number | null;
  sku: string | null; isDefault: boolean;
}

interface Product {
  id: string; title: string; sku: string | null; slug: string; status: string;
  featured: boolean; shortDescription: string | null; description: string | null;
  brand: string | null; basePriceCents: number | null;
  media: ResolvedProductMediaItem[];
  infoSections: ProductInfoSection[];
  trustBadges: ProductTrustBadge[];
  faqs: ProductFaq[];
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
  const [media, setMedia] = useState<ProductMediaItem[]>([]);
  const [resolvedMedia, setResolvedMedia] = useState<ResolvedProductMediaItem[]>([]);
  const [infoSections, setInfoSections] = useState<ProductInfoSection[]>([]);
  const [trustBadges, setTrustBadges] = useState<ProductTrustBadge[]>([]);
  const [faqs, setFaqs] = useState<ProductFaq[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Bilingual
  const { enValues, setEn, saveEnTranslations } = useEntityTranslations('shop_product', params.id);

  // ── Product-level variation attributes ──────────────────────────────────────
  const [productAttrs, setProductAttrs] = useState<ProductAttr[]>([]);
  const [allAttrs, setAllAttrs]         = useState<VariantAttr[]>([]);
  const [attrLinkId, setAttrLinkId]     = useState("");
  const [attrLinkDefaultId, setAttrLinkDefaultId] = useState("");
  const [attrLinking, setAttrLinking]   = useState(false);

  // ── Inventory (for simple products without variations) ─────────────────────
  const [inventory, setInventory] = useState<{
    available: number; reserved: number; committed: number;
    incoming: number; lowStockThreshold: number;
  } | null>(null);
  const [stockDelta, setStockDelta] = useState("");
  const [stockNote, setStockNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // ── Per-product images for "image" swatch option values ────────────────────
  const [optionImages, setOptionImages] = useState<OptionImage[]>([]);
  const [optionImagePickerTarget, setOptionImagePickerTarget] = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch(`/next-api/shop/products/${params.id}`).then(r => r.json()),
      fetch("/next-api/admin/shop/categories").then(r => r.ok ? r.json() : []),
      fetch("/next-api/admin/shop/variant-attributes").then(r => r.ok ? r.json() : []),
      fetch(`/next-api/shop/products/${params.id}/attributes`).then(r => r.ok ? r.json() : []),
      fetch(`/next-api/shop/products/${params.id}/option-images`).then(r => r.ok ? r.json() : []),
    ]).then(([p, cats, attrs, prodAttrs, optImages]) => {
      setProduct(p);
      setMedia(p.media ?? []);
      setResolvedMedia(p.media ?? []);
      setInfoSections(p.infoSections ?? []);
      setTrustBadges(p.trustBadges ?? []);
      setFaqs(p.faqs ?? []);
      setCategories(Array.isArray(cats) ? cats : []);
      setAllAttrs(Array.isArray(attrs) ? attrs : []);
      setProductAttrs(Array.isArray(prodAttrs) ? prodAttrs : []);
      setOptionImages(Array.isArray(optImages) ? optImages : []);
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
      // Base price comes from product.basePriceCents; fall back to default variant for legacy products
      if (p.basePriceCents != null) {
        setPrice((p.basePriceCents / 100).toFixed(2));
      } else {
        const dv: DefaultVariant | undefined =
          (p.variants ?? []).find((v: DefaultVariant) => v.isDefault) ?? p.variants?.[0];
        if (dv?.priceCents != null) setPrice((dv.priceCents / 100).toFixed(2));
      }
      const dv: DefaultVariant | undefined =
        (p.variants ?? []).find((v: DefaultVariant) => v.isDefault) ?? p.variants?.[0];
      setCompareAtPrice(dv?.compareAtPriceCents ? (dv.compareAtPriceCents / 100).toFixed(2) : "");

      // Load inventory for the default variant
      if (dv?.id) {
        fetch(`/next-api/shop/inventory/${dv.id}`)
          .then(r => r.ok ? r.json() : null)
          .then(inv => { if (inv) setInventory(inv); });
      }
    });
  }, [params.id]);

  // ── Product attribute management ──────────────────────────────────────────

  const linkedAttrIds = new Set(productAttrs.map(pa => pa.attributeId));
  const unlinkedAttrs = allAttrs.filter(a => a.isActive && !linkedAttrIds.has(a.id));

  async function generateCombinations(silent = false): Promise<void> {
    const res = await fetch(`/next-api/shop/products/${params.id}/variants/generate-combinations`, { method: "POST" });
    if (res.ok) {
      const data: { created: number; skipped: number; deleted: number } = await res.json();
      const hasActivity = data.created > 0 || data.deleted > 0;
      if (!silent || hasActivity) {
        const parts = [`${data.created} SKU${data.created !== 1 ? "s" : ""} created`];
        if (data.skipped > 0) parts.push(`${data.skipped} already existed`);
        if (data.deleted > 0) parts.push(`${data.deleted} stale SKU${data.deleted !== 1 ? "s" : ""} removed`);
        toast.success(parts.join(", "));
      }
    } else {
      const err = await res.json().catch(() => ({}));
      if (!silent) toast.error((err as any).message ?? "Failed to generate combinations");
    }
  }

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
      await generateCombinations(true);
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
    if (!confirm(`Remove "${attrName}" from this product? All generated SKUs and inventory entries for this variation will be deleted.`)) return;
    const res = await fetch(`/next-api/shop/products/${params.id}/attributes/${attributeId}`, { method: "DELETE" });
    if (res.ok) {
      const data: { deletedVariants: number } = await res.json().catch(() => ({ deletedVariants: 0 }));
      setProductAttrs(prev => prev.filter(pa => pa.attributeId !== attributeId));
      toast.success(
        data.deletedVariants > 0
          ? `Removed "${attrName}" — ${data.deletedVariants} SKU${data.deletedVariants !== 1 ? "s" : ""} and their inventory deleted`
          : `Removed "${attrName}"`,
      );
    } else {
      toast.error("Failed to remove variation");
    }
  }

  // ── Per-product option images ────────────────────────────────────────────

  async function setOptionImage(optionValueId: string, mediaKey: string) {
    const res = await fetch(`/next-api/shop/products/${params.id}/option-images/${optionValueId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaKey }),
    });
    if (res.ok) {
      const saved: OptionImage = await res.json();
      setOptionImages(prev => [...prev.filter(oi => oi.optionValueId !== optionValueId), saved]);
      toast.success("Image updated");
    } else {
      toast.error("Failed to set image");
    }
    setOptionImagePickerTarget(null);
  }

  async function removeOptionImage(optionValueId: string) {
    const res = await fetch(`/next-api/shop/products/${params.id}/option-images/${optionValueId}`, { method: "DELETE" });
    if (res.ok) {
      setOptionImages(prev => prev.filter(oi => oi.optionValueId !== optionValueId));
      toast.success("Image removed");
    } else {
      toast.error("Failed to remove image");
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const categoryIds = form.primaryCategoryId && !form.categoryIds.includes(form.primaryCategoryId)
      ? [form.primaryCategoryId, ...form.categoryIds]
      : form.categoryIds;

    const basePriceCents      = price ? Math.round(parseFloat(price) * 100) : undefined;
    const compareAtPriceCents = compareAtPrice ? Math.round(parseFloat(compareAtPrice) * 100) : null;

    const res = await fetch(`/next-api/shop/products/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        brand:             form.brand || null,
        primaryCategoryId: form.primaryCategoryId || null,
        categoryIds,
        media,
        infoSections,
        trustBadges,
        faqs,
        ...(basePriceCents !== undefined ? { basePriceCents } : {}),
        compareAtPriceCents,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as any).message ?? "Save failed");
    } else {
      const p: Product = await res.json();
      const infoSectionFields = infoSections.flatMap(s => [`infoSection:${s.id}:label`, `infoSection:${s.id}:value`]);
      const trustBadgeFields = trustBadges.flatMap(b => [`trustBadge:${b.id}:title`, `trustBadge:${b.id}:subtitle`]);
      const faqFields = faqs.flatMap(f => [`faq:${f.id}:question`, `faq:${f.id}:answer`]);
      await saveEnTranslations(params.id, ['title', 'shortDescription', 'description', 'seoTitle', 'seoDescription', 'featuredImageAlt', ...infoSectionFields, ...trustBadgeFields, ...faqFields]);
      setProduct(p);
      setMedia(p.media ?? []);
      setResolvedMedia(p.media ?? []);
      setInfoSections(p.infoSections ?? []);
      setTrustBadges(p.trustBadges ?? []);
      setFaqs(p.faqs ?? []);
      toast.success("Changes saved");
    }
    setSaving(false);
  }

  async function handlePublish() {
    setPublishing(true);
    const res = await fetch(`/next-api/shop/products/${params.id}/publish`, { method: "POST" });
    if (res.ok) {
      const p: Product = await res.json();
      setProduct(p);
      setForm(f => ({ ...f, status: p.status }));
      toast.success("Product published");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error((err as any).message ?? "Publish failed");
    }
    setPublishing(false);
  }

  const defaultVariant: DefaultVariant | undefined =
    (product?.variants ?? []).find((v: DefaultVariant) => v.isDefault) ?? product?.variants?.[0];
  const isSimpleProduct = productAttrs.length === 0;

  async function handleAdjustStock() {
    const delta = parseInt(stockDelta, 10);
    if (!defaultVariant || isNaN(delta) || delta === 0) return;
    setAdjusting(true);
    const res = await fetch(`/next-api/shop/inventory/${defaultVariant.id}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta, note: stockNote || "Manual adjustment from product page" }),
    });
    if (res.ok) {
      const inv = await fetch(`/next-api/shop/inventory/${defaultVariant.id}`).then(r => r.ok ? r.json() : null);
      if (inv) setInventory(inv);
      toast.success(`Stock adjusted by ${delta > 0 ? "+" : ""}${delta}`);
      setStockDelta("");
      setStockNote("");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error((err as any).message ?? "Failed to adjust stock");
    }
    setAdjusting(false);
  }

  async function handleUpdateThreshold(value: number) {
    if (!defaultVariant) return;
    const res = await fetch(`/next-api/shop/inventory/${defaultVariant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lowStockThreshold: value }),
    });
    if (res.ok) {
      setInventory(prev => prev ? { ...prev, lowStockThreshold: value } : prev);
    }
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
          <button form="product-form" type="submit" className={styles.saveBtn} disabled={saving || publishing}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {form.status !== "active" && (
            <button type="button" className={styles.publishBtn} disabled={publishing || saving} onClick={handlePublish}>
              {publishing ? "Publishing…" : "Publish"}
            </button>
          )}
        </div>
      </div>

      <form id="product-form" onSubmit={handleSave}>
        <div className={styles.body}>

          {/* ── Left main column ── */}
          <div>

            {/* Content */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionIcon}><Pencil size={14} strokeWidth={1.75} /></span>
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
                <BilingualField label="Description" frValue={form.description} frOnChange={v => setForm(f => ({ ...f, description: v }))} enValue={enValues.description ?? ""} enOnChange={v => setEn('description', v)} richText collapsible />
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
                    <label className={styles.label}>Base price (€) *</label>
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
                <ProductMediaManager initialMedia={product.media ?? []} onChange={setMedia} onResolvedChange={setResolvedMedia} />
              </div>
            </div>

            {/* Specifications */}
            <CollapsibleSection icon="📋" title="Specifications">
              <ProductInfoSectionsManager sections={infoSections} onChange={setInfoSections} enValues={enValues} setEn={setEn} />
            </CollapsibleSection>

            {/* Trust badges */}
            <CollapsibleSection icon="🛡️" title="Trust badges">
              <ProductTrustBadgesManager badges={trustBadges} onChange={setTrustBadges} enValues={enValues} setEn={setEn} />
            </CollapsibleSection>

            {/* FAQs */}
            <CollapsibleSection icon="❓" title="FAQs">
              <ProductFaqsManager faqs={faqs} onChange={setFaqs} enValues={enValues} setEn={setEn} />
            </CollapsibleSection>

            {/* ── Variations ── */}
            <CollapsibleSection icon="🎨" title="Variations" last>
                {productAttrs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => generateCombinations(false)}
                    className={styles.saveBtn}
                    style={{ fontSize: 12, padding: "5px 12px", marginBottom: 14 }}
                  >
                    Generate Combinations
                  </button>
                )}

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
                            ) : activeOvs.map(ov => {
                              const optImg = ov.swatchType === "image"
                                ? optionImages.find(oi => oi.optionValueId === ov.id)
                                : undefined;
                              return (
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
                                  {ov.swatchType === "image" && (
                                    <span style={{
                                      width: 20, height: 20, borderRadius: 4,
                                      overflow: "hidden", flexShrink: 0,
                                      background: "var(--color-surface-raised)",
                                      border: "1px solid var(--color-border)",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                      {optImg?.url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={optImg.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                      ) : (
                                        <ImagePlus size={11} strokeWidth={1.75} style={{ color: "var(--color-text-muted)" }} />
                                      )}
                                    </span>
                                  )}
                                  {ov.displayValue ?? ov.value}
                                  {pa.defaultOptionValueId === ov.id && (
                                    <span style={{ fontSize: 10, color: "var(--color-admin-secondary)", fontWeight: 700 }}>default</span>
                                  )}
                                  {ov.swatchType === "image" && (
                                    <span style={{ display: "inline-flex", gap: 4 }}>
                                      <button
                                        type="button"
                                        onClick={() => setOptionImagePickerTarget(ov.id)}
                                        style={{
                                          fontSize: 10, fontWeight: 600,
                                          color: "var(--color-admin-secondary)",
                                          background: "none", border: "none", cursor: "pointer", padding: 0,
                                        }}
                                      >
                                        {optImg ? "Change" : "Set image"}
                                      </button>
                                      {optImg && (
                                        <button
                                          type="button"
                                          onClick={() => removeOptionImage(ov.id)}
                                          style={{
                                            fontSize: 10, fontWeight: 600,
                                            color: "var(--color-error)",
                                            background: "none", border: "none", cursor: "pointer", padding: 0,
                                          }}
                                        >
                                          Remove
                                        </button>
                                      )}
                                    </span>
                                  )}
                                </span>
                              );
                            })}
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
            </CollapsibleSection>
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

            {/* Inventory — shown for simple products (no variations) */}
            {isSimpleProduct && inventory && (
              <div className={styles.sidebarCard}>
                <div className={styles.sidebarCardHead}>
                  <span className={styles.sidebarCardTitle}>Inventory</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                    background: inventory.available <= 0 ? "#fee2e2" : inventory.available <= inventory.lowStockThreshold ? "#fef3c7" : "#dcfce7",
                    color: inventory.available <= 0 ? "#dc2626" : inventory.available <= inventory.lowStockThreshold ? "#d97706" : "#16a34a",
                  }}>
                    {inventory.available <= 0 ? "Out of stock" : inventory.available <= inventory.lowStockThreshold ? "Low stock" : "In stock"}
                  </span>
                </div>
                <div className={styles.sidebarCardBody}>
                  {/* Stock levels */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div style={{ background: "var(--color-surface)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>{inventory.available}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Available</div>
                    </div>
                    <div style={{ background: "var(--color-surface)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>{inventory.reserved}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Reserved</div>
                    </div>
                    <div style={{ background: "var(--color-surface)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>{inventory.committed}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Committed</div>
                    </div>
                    <div style={{ background: "var(--color-surface)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>{inventory.incoming}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Incoming</div>
                    </div>
                  </div>

                  <div className={styles.divider} />

                  {/* Adjust stock */}
                  <label className={styles.label} style={{ marginBottom: 6 }}>Adjust stock</label>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <input
                      className={styles.input}
                      type="number"
                      value={stockDelta}
                      onChange={e => setStockDelta(e.target.value)}
                      placeholder="+10 or -5"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className={styles.saveBtn}
                      disabled={adjusting || !stockDelta || parseInt(stockDelta, 10) === 0}
                      onClick={handleAdjustStock}
                      style={{ fontSize: 12, padding: "6px 14px" }}
                    >
                      {adjusting ? "…" : "Apply"}
                    </button>
                  </div>
                  <input
                    className={styles.input}
                    value={stockNote}
                    onChange={e => setStockNote(e.target.value)}
                    placeholder="Reason (optional)"
                    style={{ fontSize: 12, marginBottom: 12 }}
                  />

                  <div className={styles.divider} />

                  {/* Low stock threshold */}
                  <div className={styles.field}>
                    <label className={styles.label}>Low stock alert threshold</label>
                    <input
                      className={styles.input}
                      type="number" min={0}
                      value={inventory.lowStockThreshold}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= 0) {
                          setInventory(prev => prev ? { ...prev, lowStockThreshold: v } : prev);
                          handleUpdateThreshold(v);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      <ProductImagePicker
        open={optionImagePickerTarget !== null}
        onClose={() => setOptionImagePickerTarget(null)}
        images={resolvedMedia.filter(m => m.type === "image")}
        onSelect={item => setOptionImage(optionImagePickerTarget!, item.key)}
        title="Select option image"
      />
    </div>
  );
}
