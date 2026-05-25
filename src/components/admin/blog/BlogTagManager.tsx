"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./BlogCategoryManager.module.css"; // reuse same styles
import { slugify } from "@/lib/slugify";

interface Tag { id: string; slug: string; name: string; }

export default function BlogTagManager() {
  const [items,   setItems]   = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding,  setAdding]  = useState(false);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/next-api/blog/tags")
      .then(r => r.json())
      .then(setItems)
      .catch(() => setError("Failed to load tags"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await fetch("/next-api/blog/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), slug: slugify(newName) }),
      });
      setNewName("");
      load();
    } catch { setError("Failed to add tag"); }
    finally { setAdding(false); }
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await fetch(`/next-api/blog/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditId(null);
    load();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete tag "${name}"?`)) return;
    await fetch(`/next-api/blog/tags/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Blog tags</h1>
      </div>

      <div className={styles.addCard}>
        <div className={styles.addTitle}>New tag</div>
        <div className={styles.form}>
          <input
            className={styles.input}
            placeholder="Tag name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          />
          <button className={styles.addBtn} onClick={add} disabled={adding || !newName.trim()}>
            {adding ? "Adding…" : "+ Add"}
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Slug</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className={styles.td} colSpan={3} style={{ textAlign: "center" }}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={3}><div className={styles.empty}>No tags yet.</div></td></tr>
            ) : items.map(tag => (
              <tr key={tag.id} className={styles.tr}>
                <td className={styles.td}>
                  {editId === tag.id ? (
                    <input
                      className={styles.editInput}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(tag.id); if (e.key === "Escape") setEditId(null); }}
                      autoFocus
                    />
                  ) : tag.name}
                </td>
                <td className={styles.td} style={{ fontFamily: "monospace", fontSize: 12 }}>{tag.slug}</td>
                <td className={styles.td}>
                  <div className={styles.actions}>
                    {editId === tag.id ? (
                      <>
                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => saveEdit(tag.id)}>Save</button>
                        <button className={styles.btn} onClick={() => setEditId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className={styles.btn} onClick={() => { setEditId(tag.id); setEditName(tag.name); }}>Edit</button>
                        <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => remove(tag.id, tag.name)}>Delete</button>
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
