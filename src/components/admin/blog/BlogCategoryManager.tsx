"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./BlogCategoryManager.module.css";

interface Category {
  id: string;
  slug: string;
  name: string;
  color: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

function slugify(str: string): string {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-");
}

export default function BlogCategoryManager() {
  const [items,   setItems]   = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // New category form
  const [newName,  setNewName]  = useState("");
  const [newColor, setNewColor] = useState("#005C8F");
  const [adding,   setAdding]   = useState(false);

  // Edit state
  const [editId,   setEditId]   = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await fetch("/next-api/blog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), slug: slugify(newName), color: newColor }),
      });
      setNewName("");
      load();
    } catch {
      setError("Failed to add category");
    } finally {
      setAdding(false);
    }
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await fetch(`/next-api/blog/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      setEditId(null);
      load();
    } catch {
      setError("Failed to update");
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Posts will be uncategorized.`)) return;
    await fetch(`/next-api/blog/categories/${id}`, { method: "DELETE" });
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
          <input
            className={styles.input}
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          />
          <input
            type="color"
            className={styles.colorInput}
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            title="Category color"
          />
          <button className={styles.addBtn} onClick={add} disabled={adding || !newName.trim()}>
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
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Slug</th>
              <th className={styles.th}>Color</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className={styles.td} colSpan={4} style={{ textAlign: "center" }}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4}><div className={styles.empty}>No categories yet. Add one above.</div></td></tr>
            ) : items.map(cat => (
              <tr key={cat.id} className={styles.tr}>
                <td className={styles.td}>
                  {editId === cat.id ? (
                    <input
                      className={styles.editInput}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(cat.id); if (e.key === "Escape") setEditId(null); }}
                      autoFocus
                    />
                  ) : cat.name}
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
                        <button className={styles.btn} onClick={() => { setEditId(cat.id); setEditName(cat.name); }}>Edit</button>
                        <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => remove(cat.id, cat.name)}>Delete</button>
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
