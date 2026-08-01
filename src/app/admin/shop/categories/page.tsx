"use client";

import { useEffect, useState } from "react";
import BilingualField from "@/components/admin/BilingualField";
import { OVERLAY_LANGS, type OverlayLang } from "@/hooks/useEntityTranslations";
import styles from "./Categories.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { slugify } from "@/lib/slugify";
import { X } from "lucide-react";

interface Translations {
  name?: Partial<Record<"fr" | OverlayLang, string>>;
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

interface CategoryRow extends Category { depth: number }

interface FormState {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  sortOrder: number;
  isActive: boolean;
  nameFr: string;
  /** Overlay-language name translations, keyed by lang (en/es/it/de/nl/pl) */
  nameOverlay: Record<OverlayLang, string>;
  slugFr: string;
  slugEn: string;
}

function emptyOverlay(): Record<OverlayLang, string> {
  return Object.fromEntries(OVERLAY_LANGS.map(l => [l, ""])) as Record<OverlayLang, string>;
}

const EMPTY: FormState = {
  name: "", slug: "", description: "", parentId: "", sortOrder: 0, isActive: true,
  nameFr: "", nameOverlay: emptyOverlay(), slugFr: "", slugEn: "",
};


function formToBody(form: FormState) {
  const translations: Translations = {};
  const hasNameOverlay = form.nameFr || OVERLAY_LANGS.some(l => form.nameOverlay[l]);
  if (hasNameOverlay) {
    translations.name = {};
    if (form.nameFr) translations.name.fr = form.nameFr;
    for (const l of OVERLAY_LANGS) {
      if (form.nameOverlay[l]) translations.name[l] = form.nameOverlay[l];
    }
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
    nameOverlay: Object.fromEntries(OVERLAY_LANGS.map(l => [l, c.translations?.name?.[l] ?? ""])) as Record<OverlayLang, string>,
    slugFr:      c.translations?.slug?.fr ?? "",
    slugEn:      c.translations?.slug?.en ?? "",
  };
}

function buildTree(cats: Category[]): CategoryRow[] {
  const idSet = new Set(cats.map(c => c.id));
  const rows: CategoryRow[] = [];

  function traverse(cat: Category, depth: number) {
    rows.push({ ...cat, depth });
    cats.filter(c => c.parentId === cat.id).sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(child => traverse(child, depth + 1));
  }

  cats.filter(c => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach(c => traverse(c, 0));

  // Orphans (parent deleted)
  cats.filter(c => c.parentId && !idSet.has(c.parentId))
    .forEach(c => rows.push({ ...c, depth: 0 }));

  return rows;
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

  const treeRows = buildTree(categories);
  const parentMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Categories</h1>
          <span className={styles.subtitle}>{categories.length} categories</span>
        </div>
        <button className={styles.newBtn} onClick={openCreate}>
          + New Category
        </button>
      </div>

      {/* ── Table card ── */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHead}>
          <span className={styles.tableCardIcon}>🗂</span>
          <span className={styles.tableCardTitle}>Category Tree</span>
        </div>

        {loading ? (
          <div style={{ padding: 20 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} style={{ display: "flex", gap: 16, alignItems: "center", padding: "12px 0", borderBottom: i < 3 ? "1px solid var(--color-border)" : "none" }}>
                <span className={styles.skeleton} style={{ height: 14, width: 140 }} />
                <span className={styles.skeleton} style={{ height: 12, width: 100 }} />
                <span className={styles.skeleton} style={{ height: 12, width: 60 }} />
                <span className={styles.skeleton} style={{ height: 20, width: 55, marginLeft: "auto" }} />
                <span className={styles.skeleton} style={{ height: 28, width: 90 }} />
              </div>
            ))}
          </div>
        ) : treeRows.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🗂</span>
            <span className={styles.emptyText}>No categories yet</span>
            <span className={styles.emptyHint}>Create your first category to organise your products</span>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Translations</th>
                <th>Parent</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {treeRows.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className={styles.depthIndent} style={{ paddingLeft: c.depth * 20 }}>
                      {c.depth > 0 && <span className={styles.depthLine} />}
                      <div>
                        <div className={styles.catName}>{c.name}</div>
                        <div className={styles.catSlug}>{c.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--color-text-muted)" }}>
                      {c.slug}
                    </span>
                  </td>
                  <td>
                    <div className={styles.langChips}>
                      {c.translations?.name?.fr && (
                        <span className={styles.chipFr}>FR</span>
                      )}
                      {c.translations?.name?.en && (
                        <span className={styles.chipEn}>EN</span>
                      )}
                      {!c.translations?.name?.fr && !c.translations?.name?.en && (
                        <span className={styles.chipNone}>—</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={styles.catParent}>
                      {c.parentId ? parentMap[c.parentId] ?? "—" : "—"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>
                      {c.sortOrder}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${c.isActive ? styles.badgeActive : styles.badgeHidden}`}>
                      {c.isActive ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button className={`${styles.actionBtn} ${styles.actionEdit}`} onClick={() => openEdit(c)}>
                        Edit
                      </button>
                      <button className={`${styles.actionBtn} ${styles.actionDelete}`} onClick={() => handleDelete(c.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className={styles.modal}>
            {/* Head */}
            <div className={styles.modalHead}>
              <span className={styles.modalTitle}>
                {modal === "create" ? "New Category" : "Edit Category"}
              </span>
              <button className={styles.modalClose} onClick={() => setModal(null)}><X size={14} strokeWidth={2} /></button>
            </div>

            {/* Body */}
            <div className={styles.modalBody}>

              {/* Content section */}
              <div className={styles.modalSection}>
                <p className={styles.modalSectionTitle}>Content</p>
                <BilingualField
                  label="Name"
                  field="name"
                  frRequired
                  frValue={form.name}
                  frOnChange={v => setForm(f => ({
                    ...f,
                    name:  v,
                    slug:  modal === "create" ? slugify(v) : f.slug,
                    nameFr: v,
                  }))}
                  frPlaceholder="Nom de la catégorie"
                  translations={Object.fromEntries(
                    OVERLAY_LANGS.map(l => [l, { name: form.nameOverlay[l] }]),
                  ) as unknown as Record<OverlayLang, Record<string, string>>}
                  onTranslationChange={(lang, _field, value) =>
                    setForm(f => ({ ...f, nameOverlay: { ...f.nameOverlay, [lang]: value } }))
                  }
                  overlayPlaceholder="Category name"
                />
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Slug (FR)<span className={styles.required}>*</span>
                    </label>
                    <input
                      className={styles.input}
                      value={form.slug}
                      onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                      placeholder="slug-en-francais"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Slug (EN)</label>
                    <input
                      className={styles.input}
                      value={form.slugEn}
                      onChange={e => setForm(f => ({ ...f, slugEn: e.target.value }))}
                      placeholder="slug-in-english"
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Description</label>
                  <textarea
                    className={styles.textarea}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="Optional description…"
                  />
                </div>
              </div>

              {/* Settings section */}
              <div className={styles.modalSection}>
                <p className={styles.modalSectionTitle}>Settings</p>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Parent category</label>
                    <select
                      className={styles.select}
                      value={form.parentId}
                      onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                    >
                      <option value="">— None (top-level) —</option>
                      {categories.filter(c => c.id !== editId).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Sort order</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={form.sortOrder}
                      onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                    />
                    <span className={styles.hint}>Lower numbers appear first</span>
                  </div>
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.toggleLabel}>Active</div>
                    <div className={styles.toggleNote}>Visible to customers in the shop</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: "var(--color-admin-secondary)", cursor: "pointer" }}
                  />
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className={styles.modalFoot}>
              <button className={styles.cancelBtn} onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                className={styles.saveBtn}
                disabled={saving || !form.name}
                onClick={save}
              >
                {saving ? "Saving…" : modal === "create" ? "Create Category" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
