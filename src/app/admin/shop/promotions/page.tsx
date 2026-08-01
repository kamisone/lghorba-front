"use client";

import { useEffect, useState } from "react";
import BilingualField from "@/components/admin/BilingualField";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { useEntityTranslations } from "@/hooks/useEntityTranslations";
import { X } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type PromotionTrigger      = "automatic" | "coupon";
type PromotionScope        = "site_wide" | "category" | "product";
type PromotionDiscountType = "percentage" | "fixed_amount" | "free_shipping";

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  trigger: PromotionTrigger;
  code: string | null;
  discountType: PromotionDiscountType;
  discountValue: number;
  scope: PromotionScope;
  minOrderCents: number | null;
  maxUsesTotal: number | null;
  usesCount: number;
  priority: number;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface ProductCategory { id: string; name: string; }
interface Product         { id: string; title: string; sku: string | null; }
interface CategoryLink    { id: string; promotionId: string; categoryId: string; category: ProductCategory; }
interface ProductLink     { id: string; promotionId: string; productId: string; product: Product; }

const EMPTY: Partial<Promotion> = {
  name: "", description: "", trigger: "automatic", code: "",
  discountType: "percentage", discountValue: 0,
  scope: "site_wide", minOrderCents: null, maxUsesTotal: null,
  priority: 0, isActive: true, startsAt: null, expiresAt: null,
};

function formatDiscount(p: Promotion) {
  if (p.discountType === "percentage")   return `${p.discountValue}%`;
  if (p.discountType === "fixed_amount") return `€${(p.discountValue / 100).toFixed(2)}`;
  return "Free shipping";
}

const TRIGGER_LABELS: Record<PromotionTrigger, string> = {
  automatic: "Auto",
  coupon:    "Coupon",
};

const SCOPE_LABELS: Record<PromotionScope, string> = {
  site_wide: "Site-wide",
  category:  "Category",
  product:   "Product",
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PromotionsPage() {
  const { toast } = useToast();

  // List state
  const [items, setItems]   = useState<Promotion[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterTrigger, setFilterTrigger] = useState<"" | PromotionTrigger>("");
  const [filterScope,   setFilterScope]   = useState<"" | PromotionScope>("");
  const [filterActive,  setFilterActive]  = useState<"" | "true" | "false">("");

  // Modal state
  const [modal, setModal]   = useState<null | "create" | "edit">(null);
  const [form, setForm]     = useState<Partial<Promotion>>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { translations: promoTr, setTranslation: setPromoTr, saveTranslations: savePromoTr } =
    useEntityTranslations('shop_promotion', editId);

  // Reference data
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products,   setProducts]   = useState<Product[]>([]);

  // Scope link state (edit mode only)
  const [categoryLinks,  setCategoryLinks]  = useState<CategoryLink[]>([]);
  const [productLinks,   setProductLinks]   = useState<ProductLink[]>([]);
  const [addLinkId,      setAddLinkId]      = useState("");
  const [addingLink,     setAddingLink]     = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "50", offset: "0" });
      if (filterTrigger) qs.set("trigger",  filterTrigger);
      if (filterScope)   qs.set("scope",    filterScope);
      if (filterActive)  qs.set("isActive", filterActive);
      const res = await fetch(`/next-api/admin/shop/promotions?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch("/next-api/admin/shop/categories").then(r => r.ok ? r.json() : []).then(d => setCategories(Array.isArray(d) ? d : []));
    fetch("/next-api/shop/products?limit=200").then(r => r.ok ? r.json() : { items: [] }).then(d => {
      const list = Array.isArray(d) ? d : Array.isArray(d.items) ? d.items : [];
      setProducts(list);
    });
  }, []);

  useEffect(() => { load(); }, [filterTrigger, filterScope, filterActive]);

  // ── Modal helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY);
    setEditId(null);
    setCategoryLinks([]);
    setProductLinks([]);
    setAddLinkId("");
    setModal("create");
  }

  function openEdit(p: Promotion) {
    setForm({ ...p });
    setEditId(p.id);
    setAddLinkId("");
    setModal("edit");
    // Load scope links
    if (p.scope === "category") {
      fetch(`/next-api/admin/shop/promotions/${p.id}/category-links`)
        .then(r => r.ok ? r.json() : [])
        .then(d => setCategoryLinks(Array.isArray(d) ? d : []));
      setProductLinks([]);
    } else if (p.scope === "product") {
      fetch(`/next-api/admin/shop/promotions/${p.id}/product-links`)
        .then(r => r.ok ? r.json() : [])
        .then(d => setProductLinks(Array.isArray(d) ? d : []));
      setCategoryLinks([]);
    } else {
      setCategoryLinks([]);
      setProductLinks([]);
    }
  }

  // ── Save / delete ─────────────────────────────────────────────────────────

  async function save() {
    setSaving(true);
    const body = {
      ...form,
      code:          form.trigger === "automatic" ? null : (form.code || null),
      discountValue: form.discountType === "free_shipping" ? 0 : (form.discountValue ?? 0),
      minOrderCents: form.minOrderCents || null,
      maxUsesTotal:  form.maxUsesTotal  || null,
    };
    const url    = modal === "create"
      ? "/next-api/admin/shop/promotions"
      : `/next-api/admin/shop/promotions/${editId}`;
    const method = modal === "create" ? "POST" : "PATCH";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const saved = await res.json().catch(() => ({}));
      const id = saved?.id ?? editId;
      if (id) await savePromoTr(id, ['name', 'description', 'marketingLabel', 'bannerText']);
      toast.success(modal === "create" ? "Promotion created" : "Promotion updated");
    } else {
      const err = await res.json().catch(() => null);
      toast.error(err?.message ?? "Failed to save promotion");
    }
    setSaving(false);
    setModal(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this promotion? This cannot be undone.")) return;
    const res = await fetch(`/next-api/admin/shop/promotions/${id}`, { method: "DELETE" });
    if (res.ok) toast.success("Promotion deleted");
    else toast.error("Failed to delete promotion");
    load();
  }

  async function toggleActive(p: Promotion) {
    const res = await fetch(`/next-api/admin/shop/promotions/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    if (res.ok) toast.success(p.isActive ? "Promotion paused" : "Promotion activated");
    else toast.error("Failed to update");
    load();
  }

  // ── Scope link management ─────────────────────────────────────────────────

  async function addLink() {
    if (!addLinkId || !editId) return;
    const currentScope = form.scope ?? "site_wide";
    if (currentScope === "site_wide") return;

    setAddingLink(true);
    const endpoint = currentScope === "category"
      ? `/next-api/admin/shop/promotions/${editId}/category-links`
      : `/next-api/admin/shop/promotions/${editId}/product-links`;
    const bodyKey = currentScope === "category" ? "categoryId" : "productId";

    const res = await fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [bodyKey]: addLinkId }),
    });
    if (res.ok) {
      const link = await res.json();
      if (currentScope === "category") {
        const cat = categories.find(c => c.id === addLinkId);
        setCategoryLinks(l => [...l, { ...link, category: cat ?? { id: addLinkId, name: "?" } }]);
      } else {
        const prod = products.find(p => p.id === addLinkId);
        setProductLinks(l => [...l, { ...link, product: prod ?? { id: addLinkId, title: "?", sku: null } }]);
      }
      setAddLinkId("");
      toast.success(currentScope === "category" ? "Category restriction added" : "Product added");
    } else {
      const err = await res.json().catch(() => null);
      toast.error(err?.message ?? "Failed to add");
    }
    setAddingLink(false);
  }

  async function removeLink(linkId: string, type: "category" | "product") {
    if (!editId) return;
    const endpoint = type === "category"
      ? `/next-api/admin/shop/promotions/${editId}/category-links/${linkId}`
      : `/next-api/admin/shop/promotions/${editId}/product-links/${linkId}`;
    const res = await fetch(endpoint, { method: "DELETE" });
    if (res.ok) {
      if (type === "category") setCategoryLinks(l => l.filter(x => x.id !== linkId));
      else setProductLinks(l => l.filter(x => x.id !== linkId));
      toast.success("Removed");
    } else {
      toast.error("Failed to remove");
    }
  }

  const usedCategoryIds = new Set(categoryLinks.map(l => l.categoryId));
  const usedProductIds  = new Set(productLinks.map(l => l.productId));

  const currentScope = form.scope ?? "site_wide";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Promotions</h1>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}>+ New promotion</button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <select className={styles.filterSelect} value={filterTrigger} onChange={e => setFilterTrigger(e.target.value as any)}>
          <option value="">All triggers</option>
          <option value="automatic">Automatic</option>
          <option value="coupon">Coupon</option>
        </select>
        <select className={styles.filterSelect} value={filterScope} onChange={e => setFilterScope(e.target.value as any)}>
          <option value="">All scopes</option>
          <option value="site_wide">Site-wide</option>
          <option value="category">Category</option>
          <option value="product">Product</option>
        </select>
        <select className={styles.filterSelect} value={filterActive} onChange={e => setFilterActive(e.target.value as any)}>
          <option value="">Any status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <span style={{ fontSize: 14, color: "#6b7280", marginLeft: "auto" }}>{total} promotions</span>
      </div>

      {/* Table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Trigger</th>
            <th>Scope</th>
            <th>Discount</th>
            <th>Uses</th>
            <th>Priority</th>
            <th>Expires</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: 5 }, (_, i) => (
            <tr key={i}>
              {[130, 70, 70, 80, 50, 40, 70, 60, 110].map((w, j) => (
                <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
              ))}
            </tr>
          )) : items.map(p => (
            <tr key={p.id}>
              <td>
                <strong>{p.name}</strong>
                {p.code && (
                  <code style={{ display: "block", fontSize: 11, color: "#6b7280", marginTop: 2 }}>{p.code}</code>
                )}
              </td>
              <td>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                  background: p.trigger === "automatic" ? "#dbeafe" : "#fef3c7",
                  color:      p.trigger === "automatic" ? "#1d4ed8" : "#92400e",
                }}>
                  {TRIGGER_LABELS[p.trigger]}
                </span>
              </td>
              <td>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{SCOPE_LABELS[p.scope]}</span>
              </td>
              <td>{formatDiscount(p)}</td>
              <td style={{ color: "#6b7280", fontSize: 13 }}>
                {p.usesCount}{p.maxUsesTotal ? ` / ${p.maxUsesTotal}` : ""}
              </td>
              <td style={{ color: "#6b7280", fontSize: 13 }}>{p.priority}</td>
              <td style={{ fontSize: 13, color: "#9ca3af" }}>
                {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "—"}
              </td>
              <td>
                <span className={`${styles.badge} ${p.isActive ? styles.badgeActive : styles.badgeDraft}`}>
                  {p.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td style={{ display: "flex", gap: 6 }}>
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => openEdit(p)}>Edit</button>
                <button
                  className={`${styles.btn} ${p.isActive ? styles.btnSecondary : styles.btnSuccess}`}
                  onClick={() => toggleActive(p)}
                >
                  {p.isActive ? "Pause" : "Activate"}
                </button>
                <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => handleDelete(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {!loading && items.length === 0 && (
            <tr>
              <td colSpan={9} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>
                No promotions yet
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, width: 600, maxWidth: "92vw", maxHeight: "92vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              {modal === "create" ? "New Promotion" : "Edit Promotion"}
            </h2>

            <BilingualField
              label="Name"
              field="name"
              frRequired
              frValue={form.name ?? ""}
              frOnChange={v => setForm(f => ({ ...f, name: v }))}
              translations={promoTr}
              onTranslationChange={setPromoTr}
            />
            <BilingualField
              label="Description"
              field="description"
              frValue={form.description ?? ""}
              frOnChange={v => setForm(f => ({ ...f, description: v || null }))}
              translations={promoTr}
              onTranslationChange={setPromoTr}
              multiline rows={2}
            />

            <div className={styles.formGrid}>

              {/* Trigger */}
              <div className={styles.formField}>
                <label>Trigger *</label>
                <select value={form.trigger ?? "automatic"} onChange={e => setForm(f => ({ ...f, trigger: e.target.value as PromotionTrigger, code: e.target.value === "automatic" ? "" : f.code }))}>
                  <option value="automatic">Automatic (no code needed)</option>
                  <option value="coupon">Coupon code required</option>
                </select>
              </div>

              {/* Code (only for coupon) */}
              <div className={styles.formField}>
                <label>Coupon code {form.trigger === "coupon" ? "*" : "(disabled)"}</label>
                <input
                  disabled={form.trigger !== "coupon"}
                  placeholder={form.trigger === "coupon" ? "SUMMER20" : "N/A for automatic"}
                  value={form.code ?? ""}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  style={{ opacity: form.trigger !== "coupon" ? 0.4 : 1 }}
                />
              </div>

              {/* Discount type */}
              <div className={styles.formField}>
                <label>Discount type *</label>
                <select value={form.discountType ?? "percentage"} onChange={e => setForm(f => ({ ...f, discountType: e.target.value as PromotionDiscountType }))}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed_amount">Fixed amount (cents)</option>
                  <option value="free_shipping">Free shipping</option>
                </select>
              </div>

              {/* Discount value */}
              <div className={styles.formField}>
                <label>Value {form.discountType === "percentage" ? "(%)" : form.discountType === "fixed_amount" ? "(cents)" : "(N/A)"}</label>
                <input
                  type="number" min="0"
                  disabled={form.discountType === "free_shipping"}
                  value={form.discountValue ?? 0}
                  onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))}
                  style={{ opacity: form.discountType === "free_shipping" ? 0.4 : 1 }}
                />
              </div>

              {/* Scope */}
              <div className={styles.formField}>
                <label>Scope *</label>
                <select
                  value={form.scope ?? "site_wide"}
                  onChange={e => setForm(f => ({ ...f, scope: e.target.value as PromotionScope }))}
                >
                  <option value="site_wide">Site-wide (all products)</option>
                  <option value="category">Category-specific</option>
                  <option value="product">Product-specific</option>
                </select>
              </div>

              {/* Priority */}
              <div className={styles.formField}>
                <label>Priority</label>
                <input
                  type="number"
                  value={form.priority ?? 0}
                  onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                />
              </div>

              {/* Min order */}
              <div className={styles.formField}>
                <label>Min order (cents)</label>
                <input
                  type="number" min="0"
                  value={form.minOrderCents ?? ""}
                  placeholder="No minimum"
                  onChange={e => setForm(f => ({ ...f, minOrderCents: e.target.value ? Number(e.target.value) : null }))}
                />
              </div>

              {/* Max uses */}
              <div className={styles.formField}>
                <label>Max uses</label>
                <input
                  type="number" min="1"
                  value={form.maxUsesTotal ?? ""}
                  placeholder="Unlimited"
                  onChange={e => setForm(f => ({ ...f, maxUsesTotal: e.target.value ? Number(e.target.value) : null }))}
                />
              </div>

              {/* Date range */}
              <div className={styles.formField}>
                <label>Starts at</label>
                <input
                  type="datetime-local"
                  value={form.startsAt ? (form.startsAt as string).slice(0, 16) : ""}
                  onChange={e => setForm(f => ({ ...f, startsAt: e.target.value || null }))}
                />
              </div>
              <div className={styles.formField}>
                <label>Expires at</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt ? (form.expiresAt as string).slice(0, 16) : ""}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value || null }))}
                />
              </div>

              {/* Status */}
              <div className={styles.formField}>
                <label>Status</label>
                <select value={form.isActive ? "active" : "inactive"} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* ── Scope link manager (edit mode only) ── */}
            {modal === "edit" && currentScope !== "site_wide" && (
              <div style={{ marginTop: 28, borderTop: "1px solid #e5e7eb", paddingTop: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  {currentScope === "category" ? "Category restrictions" : "Product restrictions"}
                </p>
                <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
                  {currentScope === "category"
                    ? "This promotion applies only to products in these categories."
                    : "This promotion applies only to these specific products."}
                </p>

                {/* Current links */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {currentScope === "category" && categoryLinks.map(l => (
                    <span key={l.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eff6ff", border: "1px solid #bfdbfe", padding: "4px 10px", borderRadius: 20, fontSize: 13 }}>
                      {l.category.name}
                      <button onClick={() => removeLink(l.id, "category")} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 0, fontSize: 15, lineHeight: 1 }}><X size={14} strokeWidth={2} /></button>
                    </span>
                  ))}
                  {currentScope === "product" && productLinks.map(l => (
                    <span key={l.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "4px 10px", borderRadius: 20, fontSize: 13 }}>
                      {l.product.title}{l.product.sku ? ` (${l.product.sku})` : ""}
                      <button onClick={() => removeLink(l.id, "product")} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 0, fontSize: 15, lineHeight: 1 }}><X size={14} strokeWidth={2} /></button>
                    </span>
                  ))}
                  {((currentScope === "category" && categoryLinks.length === 0) ||
                    (currentScope === "product"  && productLinks.length === 0)) && (
                    <span style={{ fontSize: 13, color: "#9ca3af" }}>None added yet</span>
                  )}
                </div>

                {/* Add link */}
                <div style={{ display: "flex", gap: 8 }}>
                  {currentScope === "category" ? (
                    <select
                      value={addLinkId}
                      onChange={e => setAddLinkId(e.target.value)}
                      style={{ flex: 1, fontSize: 13, padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
                    >
                      <option value="">— Add category —</option>
                      {categories.filter(c => !usedCategoryIds.has(c.id)).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={addLinkId}
                      onChange={e => setAddLinkId(e.target.value)}
                      style={{ flex: 1, fontSize: 13, padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
                    >
                      <option value="">— Add product —</option>
                      {products.filter(p => !usedProductIds.has(p.id)).map(p => (
                        <option key={p.id} value={p.id}>{p.title}{p.sku ? ` — ${p.sku}` : ""}</option>
                      ))}
                    </select>
                  )}
                  <button
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    disabled={!addLinkId || addingLink}
                    onClick={addLink}
                  >
                    {addingLink ? "…" : "Add"}
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setModal(null)}>Cancel</button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={saving || !form.name || (form.trigger === "coupon" && !form.code)}
                onClick={save}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
