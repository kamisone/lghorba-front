"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProductMediaManager, { ProductMediaItem } from "@/components/admin/shop/ProductMediaManager";
import ProductInfoSectionsManager, { ProductInfoSection } from "@/components/admin/shop/ProductInfoSectionsManager";
import ProductTrustBadgesManager, { ProductTrustBadge } from "@/components/admin/shop/ProductTrustBadgesManager";
import ProductFaqsManager, { ProductFaq } from "@/components/admin/shop/ProductFaqsManager";
import CollapsibleSection from "@/components/admin/shop/CollapsibleSection";
import BilingualField from "@/components/admin/BilingualField";
import styles from "../ProductEdit.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { useEntityTranslations } from "@/hooks/useEntityTranslations";
import { useSectionGenerate } from "@/hooks/useSectionGenerate";
import { AI_TARGET_LANGS, summarizeGenerateErrors, type SectionTranslationOutcome } from "@/lib/sectionTranslate";
import { Pencil } from "lucide-react";

interface Category { id: string; name: string; parentId: string | null }

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: "", slug: "", sku: "", brand: "",
    shortDescription: "", description: "",
    basePriceCents: "", initialStock: "0",
    featured: false,
    isTestProduct: false,
    freeShipping: false,
    primaryCategoryId: "",
    categoryIds: [] as string[],
  });
  const { translations, setTranslation, saveTranslations } = useEntityTranslations('shop_product', null);

  // AI "Generate" — one independent button per field: smaller, more focused
  // Translation requests per click rather than one big multi-field call.
  const titleGen = useSectionGenerate<SectionTranslationOutcome<string>>("/next-api/shop/products/sections/title/translate");
  const shortDescriptionGen = useSectionGenerate<SectionTranslationOutcome<string>>("/next-api/shop/products/sections/short-description/translate");
  const descriptionGen = useSectionGenerate<SectionTranslationOutcome<string>>("/next-api/shop/products/sections/description/translate");

  async function generateTitle() {
    const en = translations.en?.title?.trim();
    if (!en) return;
    const outcome = await titleGen.generate({ text: en });
    if (!outcome) return;
    // A failed language comes back as an empty string (see TranslationService) — never
    // let that blank out content the admin already wrote.
    if (outcome.result.fr) setForm(f => ({ ...f, title: outcome.result.fr }));
    AI_TARGET_LANGS.forEach(lang => { if (outcome.result[lang]) setTranslation(lang, "title", outcome.result[lang]); });
    const errorSummary = summarizeGenerateErrors(outcome.errors);
    if (errorSummary) titleGen.setError(errorSummary);
  }

  async function generateShortDescription() {
    const en = translations.en?.shortDescription?.trim();
    if (!en) return;
    const outcome = await shortDescriptionGen.generate({ text: en });
    if (!outcome) return;
    if (outcome.result.fr) setForm(f => ({ ...f, shortDescription: outcome.result.fr }));
    AI_TARGET_LANGS.forEach(lang => { if (outcome.result[lang]) setTranslation(lang, "shortDescription", outcome.result[lang]); });
    const errorSummary = summarizeGenerateErrors(outcome.errors);
    if (errorSummary) shortDescriptionGen.setError(errorSummary);
  }

  async function generateDescription() {
    const en = translations.en?.description?.trim();
    if (!en) return;
    const outcome = await descriptionGen.generate({ html: en });
    if (!outcome) return;
    if (outcome.result.fr) setForm(f => ({ ...f, description: outcome.result.fr }));
    AI_TARGET_LANGS.forEach(lang => { if (outcome.result[lang]) setTranslation(lang, "description", outcome.result[lang]); });
    const errorSummary = summarizeGenerateErrors(outcome.errors);
    if (errorSummary) descriptionGen.setError(errorSummary);
  }

  const [media, setMedia]               = useState<ProductMediaItem[]>([]);
  const [infoSections, setInfoSections] = useState<ProductInfoSection[]>([]);
  const [trustBadges, setTrustBadges] = useState<ProductTrustBadge[]>([]);
  const [faqs, setFaqs] = useState<ProductFaq[]>([]);
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
        basePriceCents:    Math.round(parseFloat(form.basePriceCents) * 100),
        initialStock:      parseInt(form.initialStock, 10) || 0,
        featured:          form.featured,
        isTestProduct:     form.isTestProduct,
        freeShipping:      form.freeShipping,
        media,
        infoSections,
        trustBadges,
        faqs,
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
    const infoSectionFields = infoSections.flatMap(s => [`infoSection:${s.id}:label`, `infoSection:${s.id}:value`]);
    const trustBadgeFields = trustBadges.flatMap(b => [`trustBadge:${b.id}:title`, `trustBadge:${b.id}:subtitle`]);
    const faqFields = faqs.flatMap(f => [`faq:${f.id}:question`, `faq:${f.id}:answer`]);
    await saveTranslations(product.id, ['title', 'shortDescription', 'description', 'seoTitle', 'seoDescription', 'featuredImageAlt', ...infoSectionFields, ...trustBadgeFields, ...faqFields]);
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
                  field="title"
                  frRequired
                  frValue={form.title}
                  frOnChange={v => setForm(f => ({ ...f, title: v }))}
                  frPlaceholder="Titre du produit"
                  translations={translations}
                  onTranslationChange={setTranslation}
                  overlayPlaceholder="Product title"
                  onGenerate={generateTitle}
                  generating={titleGen.generating}
                  generateError={titleGen.error}
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
                  field="shortDescription"
                  frValue={form.shortDescription}
                  frOnChange={v => setForm(f => ({ ...f, shortDescription: v }))}
                  translations={translations}
                  onTranslationChange={setTranslation}
                  multiline rows={2}
                  onGenerate={generateShortDescription}
                  generating={shortDescriptionGen.generating}
                  generateError={shortDescriptionGen.error}
                />
                <BilingualField
                  label="Description"
                  field="description"
                  frValue={form.description}
                  frOnChange={v => setForm(f => ({ ...f, description: v }))}
                  translations={translations}
                  onTranslationChange={setTranslation}
                  richText
                  collapsible
                  onGenerate={generateDescription}
                  generating={descriptionGen.generating}
                  generateError={descriptionGen.error}
                />
              </div>
            </div>

            {/* Media section */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionIcon}>🖼</span>
                <span className={styles.sectionTitle}>Media</span>
              </div>
              <div className={styles.sectionBody}>
                <ProductMediaManager initialMedia={[]} onChange={setMedia} />
              </div>
            </div>

            {/* Specifications */}
            <CollapsibleSection icon="📋" title="Specifications">
              <ProductInfoSectionsManager sections={infoSections} onChange={setInfoSections} translations={translations} setTranslation={setTranslation} />
            </CollapsibleSection>

            {/* Trust badges */}
            <CollapsibleSection icon="🛡️" title="Trust badges">
              <ProductTrustBadgesManager badges={trustBadges} onChange={setTrustBadges} translations={translations} setTranslation={setTranslation} />
            </CollapsibleSection>

            {/* FAQs */}
            <CollapsibleSection icon="❓" title="FAQs" last>
              <ProductFaqsManager faqs={faqs} onChange={setFaqs} translations={translations} setTranslation={setTranslation} />
            </CollapsibleSection>
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
                    Base price (€)<span className={styles.required}>*</span>
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    className={styles.input}
                    value={form.basePriceCents}
                    onChange={e => setForm(f => ({ ...f, basePriceCents: e.target.value }))}
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
                <div className={styles.divider} />
                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>Test product</div>
                    <div className={styles.toggleNote}>
                      Cannot be sold — measures demand before you order stock.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.isTestProduct}
                    onChange={e => setForm(f => ({ ...f, isTestProduct: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: "var(--color-admin-secondary)", cursor: "pointer" }}
                  />
                </div>

                <div className={styles.divider} />
                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>Free shipping</div>
                    <div className={styles.toggleNote}>
                      Delivery offered — applies when the basket contains only
                      free-shipping products.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.freeShipping}
                    onChange={e => setForm(f => ({ ...f, freeShipping: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: "#059669", cursor: "pointer" }}
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
