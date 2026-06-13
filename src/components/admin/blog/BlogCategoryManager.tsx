"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./BlogCategoryManager.module.css";
import { slugify } from "@/lib/slugify";

// ── Types ─────────────────────────────────────────────────────────────────────

type Locale = "en" | "fr";

interface CategoryTranslation { name: string; }

interface Category {
  id: string;
  slug: string;
  color: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  translations: Partial<Record<Locale, CategoryTranslation>>;
}

function displayName(cat: Category) {
  return cat.translations.en?.name || cat.translations.fr?.name || cat.slug;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BlogCategoryManager() {
  const [items,   setItems]   = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // New category form
  const [newNameEn, setNewNameEn] = useState("");
  const [newNameFr, setNewNameFr] = useState("");
  const [newColor,  setNewColor]  = useState("#005C8F");
  const [adding,    setAdding]    = useState(false);

  // Edit state
  const [editId,     setEditId]     = useState<string | null>(null);
  const [editNameEn, setEditNameEn] = useState("");
  const [editNameFr, setEditNameFr] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/next-api/blog/categories")
      .then(r => r.json())
      .then(setItems)
      .catch(() => setError("Failed to load categories"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!newNameEn.trim() && !newNameFr.trim()) return;
    setAdding(true);
    setError(null);
    const primary = newNameEn.trim() || newNameFr.trim();
    try {
      await fetch("/next-api/blog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slugify(primary),
          color: newColor,
          translations: {
            en: { name: newNameEn.trim() },
            fr: { name: newNameFr.trim() },
          },
        }),
      });
      setNewNameEn("");
      setNewNameFr("");
      load();
    } catch {
      setError("Failed to add category");
    } finally {
      setAdding(false);
    }
  };

  const saveEdit = async (id: string) => {
    if (!editNameEn.trim() && !editNameFr.trim()) return;
    try {
      await fetch(`/next-api/blog/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          translations: {
            en: { name: editNameEn.trim() },
            fr: { name: editNameFr.trim() },
          },
        }),
      });
      setEditId(null);
      load();
    } catch {
      setError("Failed to update");
    }
  };

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setEditNameEn(cat.translations.en?.name ?? "");
    setEditNameFr(cat.translations.fr?.name ?? "");
  };

  const remove = async (cat: Category) => {
    if (!confirm(`Delete category "${displayName(cat)}"? Posts will be uncategorized.`)) return;
    await fetch(`/next-api/blog/categories/${cat.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Blog categories</h1>
      </div>

      {/* Add form */}
      <div className={styles.addCard}>
        <div className={styles.addTitle}>New category</div>
        <div className={styles.form}>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>English name</span>
            <input
              className={styles.input}
              placeholder="Travel"
              value={newNameEn}
              onChange={(e) => setNewNameEn(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>Nom en français</span>
            <input
              className={styles.input}
              placeholder="Voyage"
              value={newNameFr}
              onChange={(e) => setNewNameFr(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            />
          </div>
          <input
            type="color"
            className={styles.colorInput}
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            title="Category color"
            style={{ alignSelf: "flex-end" }}
          />
          <button
            className={styles.addBtn}
            onClick={add}
            disabled={adding || (!newNameEn.trim() && !newNameFr.trim())}
            style={{ alignSelf: "flex-end" }}
          >
            {adding ? "Adding…" : "+ Add"}
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Name (EN)</th>
              <th className={styles.th}>Nom (FR)</th>
              <th className={styles.th}>Slug</th>
              <th className={styles.th}>Color</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className={styles.td} colSpan={5} style={{ textAlign: "center" }}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5}><div className={styles.empty}>No categories yet. Add one above.</div></td></tr>
            ) : items.map(cat => (
              <tr key={cat.id} className={styles.tr}>
                <td className={styles.td}>
                  {editId === cat.id ? (
                    <div className={styles.editInputGroup}>
                      <input
                        className={styles.editInput}
                        value={editNameEn}
                        onChange={(e) => setEditNameEn(e.target.value)}
                        placeholder="English name"
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(cat.id); if (e.key === "Escape") setEditId(null); }}
                        autoFocus
                      />
                    </div>
                  ) : (cat.translations.en?.name ?? <span style={{ color: "var(--color-text-muted)" }}>—</span>)}
                </td>
                <td className={styles.td}>
                  {editId === cat.id ? (
                    <div className={styles.editInputGroup}>
                      <input
                        className={styles.editInput}
                        value={editNameFr}
                        onChange={(e) => setEditNameFr(e.target.value)}
                        placeholder="Nom en français"
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(cat.id); if (e.key === "Escape") setEditId(null); }}
                      />
                    </div>
                  ) : (cat.translations.fr?.name ?? <span style={{ color: "var(--color-text-muted)" }}>—</span>)}
                </td>
                <td className={styles.td} style={{ fontFamily: "monospace", fontSize: 12 }}>{cat.slug}</td>
                <td className={styles.td}>
                  {cat.color && (
                    <span className={styles.dot} style={{ background: cat.color }} title={cat.color} />
                  )}
                </td>
                <td className={styles.td}>
                  <div className={styles.actions}>
                    {editId === cat.id ? (
                      <>
                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => saveEdit(cat.id)}>Save</button>
                        <button className={styles.btn} onClick={() => setEditId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className={styles.btn} onClick={() => startEdit(cat)}>Edit</button>
                        <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => remove(cat)}>Delete</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
