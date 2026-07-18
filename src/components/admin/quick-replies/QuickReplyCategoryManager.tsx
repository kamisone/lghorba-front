"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";
import { categoryLabel } from "./types";
import styles from "./QuickReplyCategoryManager.module.css";

interface CategoryRow {
  category: string;
  count: number;
}

interface Props {
  onClose: () => void;
  /** Called after any successful rename/delete so the caller can refresh its reply list. */
  onChanged: () => void;
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export default function QuickReplyCategoryManager({ onClose, onChanged }: Props) {
  const { toast } = useToast();

  const [rows,    setRows]    = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);

  const [editKey,    setEditKey]    = useState<string | null>(null);
  const [editValue,  setEditValue]  = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/next-api/quick-replies/categories", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : []))
      .then((data: CategoryRow[]) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startEdit = (row: CategoryRow) => { setEditKey(row.category); setEditValue(row.category); };

  const saveEdit = async (from: string) => {
    const to = slugify(editValue);
    if (!to) { toast.error("Category name can't be empty"); return; }
    if (to === from) { setEditKey(null); return; }
    setBusy(true);
    try {
      const res = await fetch(`/next-api/quick-replies/categories/${encodeURIComponent(from)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: to }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Rename failed");
      }
      toast.success("Category renamed");
      setEditKey(null);
      load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename category");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (category: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/next-api/quick-replies/categories/${encodeURIComponent(category)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Delete failed");
      }
      toast.success("Category deleted");
      setConfirmDel(null);
      load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Manage categories"
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Manage categories</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div className={styles.body}>
          {loading ? (
            <p className={styles.hint}>Loading…</p>
          ) : rows.length === 0 ? (
            <p className={styles.hint}>No categories yet.</p>
          ) : (
            <ul className={styles.list}>
              {rows.map(row => (
                <li key={row.category} className={styles.row}>
                  {editKey === row.category ? (
                    <input
                      className={styles.editInput}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") saveEdit(row.category);
                        if (e.key === "Escape") setEditKey(null);
                      }}
                      maxLength={64}
                      autoFocus
                    />
                  ) : (
                    <span className={styles.rowLabel}>{categoryLabel(row.category)}</span>
                  )}

                  <span className={styles.rowCount}>{row.count} {row.count === 1 ? "reply" : "replies"}</span>

                  <div className={styles.rowActions}>
                    {editKey === row.category ? (
                      <>
                        <button className={styles.iconBtn} disabled={busy} onClick={() => saveEdit(row.category)} title="Save">
                          <Check size={14} strokeWidth={2} />
                        </button>
                        <button className={styles.iconBtn} disabled={busy} onClick={() => setEditKey(null)} title="Cancel">
                          <X size={14} strokeWidth={2} />
                        </button>
                      </>
                    ) : row.category === "general" ? (
                      <span className={styles.defaultTag} title="Default category — can't be deleted">Default</span>
                    ) : confirmDel === row.category ? (
                      <button
                        className={styles.confirmDelBtn}
                        disabled={busy}
                        onClick={() => remove(row.category)}
                        onBlur={() => setConfirmDel(null)}
                        autoFocus
                      >
                        Confirm?
                      </button>
                    ) : (
                      <>
                        <button className={styles.iconBtn} disabled={busy} onClick={() => startEdit(row)} title="Rename">
                          <Pencil size={14} strokeWidth={1.75} />
                        </button>
                        <button className={styles.iconBtn} disabled={busy} onClick={() => setConfirmDel(row.category)} title="Delete">
                          <Trash2 size={14} strokeWidth={1.75} style={{ color: "#ef4444" }} />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.hint}>Deleting a category moves its replies to &quot;General&quot;.</p>
        </div>
      </div>
    </div>
  );
}
