"use client";

import { useEffect, useState } from "react";
import BilingualField from "@/components/admin/fleet/BilingualField";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

interface Translations {
  name?: { fr?: string; en?: string };
  slug?: { fr?: string; en?: string };
  seoTitle?: { fr?: string; en?: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  translations?: Translations;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  sortOrder: number;
  isActive: boolean;
  nameFr: string;
  nameEn: string;
  slugFr: string;
  slugEn: string;
}

const EMPTY: FormState = {
  name: "", slug: "", description: "", parentId: "", sortOrder: 0, isActive: true,
  nameFr: "", nameEn: "", slugFr: "", slugEn: "",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formToBody(form: FormState) {
  const translations: Translations = {};
  if (form.nameFr || form.nameEn) {
    translations.name = {};
    if (form.nameFr) translations.name.fr = form.nameFr;
    if (form.nameEn) translations.name.en = form.nameEn;
  }
  if (form.slugFr || form.slugEn) {
    translations.slug = {};
    if (form.slugFr) translations.slug.fr = form.slugFr;
    if (form.slugEn) translations.slug.en = form.slugEn;
  }
  return {
    name:        form.name,
    slug:        form.slug || slugify(form.name),
    description: form.description || null,
    parentId:    form.parentId || null,
    sortOrder:   form.sortOrder,
    isActive:    form.isActive,
    translations: Object.keys(translations).length ? translations : undefined,
  };
}

function categoryToForm(c: Category): FormState {
  return {
    name:        c.name,
    slug:        c.slug,
    description: c.description ?? "",
    parentId:    c.parentId ?? "",
    sortOrder:   c.sortOrder,
    isActive:    c.isActive,
    nameFr:      c.translations?.name?.fr ?? "",
    nameEn:      c.translations?.name?.en ?? "",
    slugFr:      c.translations?.slug?.fr ?? "",
    slugEn:      c.translations?.slug?.en ?? "",
  };
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [modal, setModal]     = useState<null | "create" | "edit">(null);
  const [form, setForm]       = useState<FormState>(EMPTY);
  const [editId, setEditId]   = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/next-api/admin/shop/categories");
      if (res.ok) setCategories(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setEditId(null); setModal("create"); }
  function openEdit(c: Category) { setForm(categoryToForm(c)); setEditId(c.id); setModal("edit"); }

  async function save() {
    setSaving(true);
    const body = formToBody(form);
    let res: Response;
    if (modal === "create") {
      res = await fetch("/next-api/admin/shop/categories", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } else {
      res = await fetch(`/next-api/admin/shop/categories/${editId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    }
    if (res.ok) toast.success(modal === "create" ? "Category created" : "Category updated");
    else toast.error("Failed to save category");
    setSaving(false);
    setModal(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    const res = await fetch(`/next-api/admin/shop/categories/${id}`, { method: "DELETE" });
    if (res.ok) toast.success("Category deleted");
    else toast.error("Failed to delete category");
    load();
  }

  const parentMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Categories</h1>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}>+ New category</button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>FR / EN</th>
            <th>Parent</th>
            <th>Order</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: 4 }, (_, i) => (
            <tr key={i}>
              {[120, 100, 120, 70, 40, 60, 90].map((w, j) => (
                <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
              ))}
            </tr>
          )) : categories.map(c => (
            <tr key={c.id}>
              <td><strong>{c.name}</strong></td>
              <td style={{ color: "#6b7280", fontSize: 13 }}>{c.slug}</td>
              <td style={{ fontSize: 12, color: "#6b7280" }}>
                {c.translations?.name?.fr && <span title="FR">{c.translations.name.fr}</span>}
                {c.translations?.name?.fr && c.translations?.name?.en && " / "}
                {c.translations?.name?.en && <span title="EN">{c.translations.name.en}</span>}
                {!c.translations?.name?.fr && !c.translations?.name?.en && "—"}
              </td>
              <td>{c.parentId ? parentMap[c.parentId] ?? c.parentId : "—"}</td>
              <td>{c.sortOrder}</td>
              <td>
                <span className={`${styles.badge} ${c.isActive ? styles.badgeActive : styles.badgeDraft}`}>
                  {c.isActive ? "Active" : "Hidden"}
                </span>
              </td>
              <td>
                <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ marginRight: 8 }} onClick={() => openEdit(c)}>Edit</button>
                <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => handleDelete(c.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {!loading && categories.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No categories yet</td></tr>
          )}
        </tbody>
      </table>

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, width: 580, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              {modal === "create" ? "New Category" : "Edit Category"}
            </h2>

            {/* ── Core fields ── */}
            <BilingualField
              label="Name"
              frRequired
              frValue={form.name}
              frOnChange={v => setForm(f => ({ ...f, name: v, slug: modal === "create" ? slugify(v) : f.slug, nameFr: v }))}
              frPlaceholder="Nom de la catégorie"
              enValue={form.nameEn}
              enOnChange={v => setForm(f => ({ ...f, nameEn: v }))}
              enPlaceholder="Category name"
            />
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Slug *</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
              </div>
              <div className={styles.formField}>
                <label>Slug EN</label>
                <input value={form.slugEn} onChange={e => setForm(f => ({ ...f, slugEn: e.target.value }))} placeholder="slug-in-english" />
              </div>
              <div className={`${styles.formField} ${styles.formSpan2}`}>
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>

            {/* ── Settings ── */}
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af", margin: "20px 0 10px" }}>
              Settings
            </p>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Parent category</label>
                <select value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}>
                  <option value="">— None —</option>
                  {categories.filter(c => c.id !== editId).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label>Sort order</label>
                <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
              </div>
              <div className={styles.formField}>
                <label>Status</label>
                <select value={form.isActive ? "active" : "hidden"} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setModal(null)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving || !form.name} onClick={save}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
