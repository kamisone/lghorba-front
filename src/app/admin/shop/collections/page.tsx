"use client";

import { useEffect, useState } from "react";
import BilingualField from "@/components/admin/fleet/BilingualField";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { useEntityTranslations } from "@/hooks/useEntityTranslations";

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

const EMPTY: Partial<Collection> = { name: "", slug: "", description: "", isActive: true, isFeatured: false, sortOrder: 0 };

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function CollectionsPage() {
  const { toast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [modal, setModal]   = useState<null | "create" | "edit">(null);
  const [form, setForm]     = useState<Partial<Collection>>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { enValues, setEn, saveEnTranslations } = useEntityTranslations('shop_collection', editId);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/next-api/shop/collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setEditId(null); setModal("create"); }
  function openEdit(c: Collection) { setForm({ ...c }); setEditId(c.id); setModal("edit"); }

  async function save() {
    setSaving(true);
    const body = { ...form, slug: form.slug || slugify(form.name ?? "") };
    let res: Response;
    if (modal === "create") {
      res = await fetch("/next-api/shop/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      res = await fetch(`/next-api/shop/collections/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    if (res.ok) {
      const saved = await res.json().catch(() => ({}));
      const id = saved?.id ?? editId;
      if (id) {
        await saveEnTranslations(id, ['name', 'description', 'heroTitle', 'heroSubtitle', 'seoTitle', 'seoDescription']);
      }
      toast.success(modal === "create" ? "Collection created" : "Collection updated");
    } else {
      toast.error("Failed to save collection");
    }
    setSaving(false);
    setModal(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this collection?")) return;
    const res = await fetch(`/next-api/shop/collections/${id}`, { method: "DELETE" });
    if (res.ok) toast.success("Collection deleted");
    else toast.error("Failed to delete collection");
    load();
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Collections</h1>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}>+ New collection</button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Featured</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: 4 }, (_, i) => (
            <tr key={i}>
              {[140, 100, 30, 60, 90].map((w, j) => (
                <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
              ))}
            </tr>
          )) : collections.map(c => (
            <tr key={c.id}>
              <td><strong>{c.name}</strong></td>
              <td style={{ color: "#6b7280", fontSize: 13 }}>{c.slug}</td>
              <td>{c.isFeatured ? "⭐" : "—"}</td>
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
          ))}
          {!loading && collections.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No collections yet</td></tr>
          )}
        </tbody>
      </table>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, width: 500, maxWidth: "90vw" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              {modal === "create" ? "New Collection" : "Edit Collection"}
            </h2>
            <BilingualField
              label="Name"
              frRequired
              frValue={form.name ?? ""}
              frOnChange={v => setForm(f => ({ ...f, name: v, slug: modal === "create" ? slugify(v) : f.slug }))}
              enValue={enValues.name ?? ""}
              enOnChange={v => setEn('name', v)}
            />
            <BilingualField
              label="Description"
              frValue={form.description ?? ""}
              frOnChange={v => setForm(f => ({ ...f, description: v || null }))}
              enValue={enValues.description ?? ""}
              enOnChange={v => setEn('description', v)}
              multiline rows={3}
            />
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Slug *</label>
                <input value={form.slug ?? ""} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
              </div>
              <div className={styles.formField}>
                <label>Status</label>
                <select value={form.isActive ? "active" : "inactive"} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label>Featured</label>
                <select value={form.isFeatured ? "yes" : "no"} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.value === "yes" }))}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
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
