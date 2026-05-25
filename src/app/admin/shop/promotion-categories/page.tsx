"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { slugify } from "@/lib/slugify";

interface PromotionCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY: FormState = { name: "", slug: "", description: "", color: "#6366f1", isActive: true, sortOrder: 0 };


export default function PromotionCategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<PromotionCategory[]>([]);
  const [modal, setModal]   = useState<null | "create" | "edit">(null);
  const [form, setForm]     = useState<FormState>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/next-api/admin/shop/promotion-categories");
      if (res.ok) setCategories(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setEditId(null); setModal("create"); }
  function openEdit(c: PromotionCategory) {
    setForm({
      name: c.name, slug: c.slug,
      description: c.description ?? "",
      color: c.color ?? "#6366f1",
      isActive: c.isActive, sortOrder: c.sortOrder,
    });
    setEditId(c.id);
    setModal("edit");
  }

  async function save() {
    setSaving(true);
    const body = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description || null,
      color: form.color || null,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
    };
    const url  = modal === "create" ? "/next-api/admin/shop/promotion-categories" : `/next-api/admin/shop/promotion-categories/${editId}`;
    const method = modal === "create" ? "POST" : "PATCH";
    const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) toast.success(modal === "create" ? "Category created" : "Category updated");
    else toast.error("Failed to save category");
    setSaving(false);
    setModal(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this promotion category?")) return;
    const res = await fetch(`/next-api/admin/shop/promotion-categories/${id}`, { method: "DELETE" });
    if (res.ok) toast.success("Category deleted");
    else toast.error("Failed to delete category");
    load();
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Promotion Categories</h1>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}>+ New category</button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Color</th>
            <th>Name</th>
            <th>Slug</th>
            <th>Order</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 4 }, (_, i) => (
                <tr key={i}>
                  {[30, 120, 120, 40, 60, 100].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
                  ))}
                </tr>
              ))
            : categories.map(c => (
                <tr key={c.id}>
                  <td>
                    {c.color
                      ? <span style={{ display: "inline-block", width: 20, height: 20, borderRadius: 4, background: c.color, border: "1px solid #e5e7eb", verticalAlign: "middle" }} />
                      : "—"}
                  </td>
                  <td><strong>{c.name}</strong></td>
                  <td style={{ color: "#6b7280", fontSize: 13 }}>{c.slug}</td>
                  <td>{c.sortOrder}</td>
                  <td>
                    <span className={`${styles.badge} ${c.isActive ? styles.badgeActive : styles.badgeDraft}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ marginRight: 8 }} onClick={() => openEdit(c)}>Edit</button>
                    <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => handleDelete(c.id)}>Delete</button>
                  </td>
                </tr>
              ))
          }
          {!loading && categories.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No promotion categories yet</td></tr>
          )}
        </tbody>
      </table>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, width: 520, maxWidth: "95vw" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              {modal === "create" ? "New Promotion Category" : "Edit Promotion Category"}
            </h2>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                />
              </div>
              <div className={styles.formField}>
                <label>Slug *</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
              </div>
              <div className={`${styles.formField} ${styles.formSpan2}`}>
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className={styles.formField}>
                <label>Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 40, height: 36, padding: 2, border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer" }} />
                  <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ flex: 1 }} placeholder="#6366f1" />
                </div>
              </div>
              <div className={styles.formField}>
                <label>Sort order</label>
                <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
              </div>
              <div className={styles.formField}>
                <label>Status</label>
                <select value={form.isActive ? "active" : "inactive"} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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
