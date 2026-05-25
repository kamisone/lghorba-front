"use client";

import { useEffect, useState } from "react";
import BilingualField from "@/components/admin/BilingualField";
import styles from "./Collections.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { useEntityTranslations } from "@/hooks/useEntityTranslations";
import { slugify } from "@/lib/slugify";

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


export default function CollectionsPage() {
  const { toast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [modal, setModal]     = useState<null | "create" | "edit">(null);
  const [form, setForm]       = useState<Partial<Collection>>(EMPTY);
  const [editId, setEditId]   = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("");

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
  function closeModal() { setModal(null); }

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
    closeModal();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this collection? This cannot be undone.")) return;
    const res = await fetch(`/next-api/shop/collections/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Collection deleted"); load(); }
    else toast.error("Failed to delete collection");
  }

  const filtered = collections.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search.toLowerCase());
    const matchFilter = !filter
      || (filter === "active" && c.isActive)
      || (filter === "inactive" && !c.isActive)
      || (filter === "featured" && c.isFeatured);
    return matchSearch && matchFilter;
  });

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Collections</h1>
          <span className={styles.subtitle}>{collections.length} total collections</span>
        </div>
        <button className={styles.newBtn} onClick={openCreate}>
          + New Collection
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className={styles.searchInput}
            placeholder="Search collections…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="featured">Featured</option>
        </select>
        <div className={styles.toolbarRight}>{filtered.length} collections</div>
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Collection</th>
              <th>Slug</th>
              <th>Order</th>
              <th>Featured</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {[180, 120, 40, 60, 70, 100].map((w, j) => (
                    <td key={j}>
                      <span className={styles.skeleton} style={{ height: 14, width: w, display: "block" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}>🗂</span>
                    <span className={styles.emptyText}>
                      {search || filter ? "No collections match your filters" : "No collections yet"}
                    </span>
                    {!search && !filter && (
                      <span className={styles.emptyHint}>Create your first collection to get started</span>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className={styles.rowName}>{c.name}</div>
                    {c.description && (
                      <div className={styles.rowDesc}>{c.description}</div>
                    )}
                  </td>
                  <td>
                    <span className={styles.rowSlug}>{c.slug}</span>
                  </td>
                  <td>
                    <span className={styles.sortOrder}>{c.sortOrder}</span>
                  </td>
                  <td>
                    {c.isFeatured
                      ? <span className={styles.featuredBadge}>⭐ Featured</span>
                      : <span className={styles.noFeatured}>—</span>
                    }
                  </td>
                  <td>
                    <span className={`${styles.badge} ${c.isActive ? styles.badgeActive : styles.badgeInactive}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={`${styles.actionBtn} ${styles.actionEdit}`}
                        onClick={() => openEdit(c)}
                      >
                        Edit
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.actionDelete}`}
                        onClick={() => handleDelete(c.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {modal === "create" ? "New Collection" : "Edit Collection"}
              </h2>
              <button className={styles.modalClose} onClick={closeModal}>×</button>
            </div>

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
              <div className={`${styles.formField} ${styles.formSpan2}`}>
                <label>Slug *</label>
                <input
                  value={form.slug ?? ""}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="auto-generated from name"
                />
              </div>
              <div className={styles.formField}>
                <label>Status</label>
                <select
                  value={form.isActive ? "active" : "inactive"}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.value === "active" }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label>Featured</label>
                <select
                  value={form.isFeatured ? "yes" : "no"}
                  onChange={e => setForm(f => ({ ...f, isFeatured: e.target.value === "yes" }))}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label>Sort Order</label>
                <input
                  type="number"
                  min={0}
                  value={form.sortOrder ?? 0}
                  onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
              <button
                className={styles.saveBtn}
                disabled={saving || !form.name}
                onClick={save}
              >
                {saving ? "Saving…" : modal === "create" ? "Create Collection" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
