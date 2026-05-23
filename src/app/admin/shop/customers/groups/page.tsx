"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";

interface CustomerGroup {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function CustomerGroupsPage() {
  const [items, setItems]       = useState<CustomerGroup[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName]         = useState("");
  const [description, setDesc]  = useState("");
  const [saving, setSaving]     = useState(false);

  function load() {
    setLoading(true);
    fetch("/next-api/admin/shop/customers/groups?limit=100")
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/next-api/admin/shop/customers/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null }),
    });
    setSaving(false);
    setShowForm(false);
    setName("");
    setDesc("");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this group?")) return;
    await fetch(`/next-api/admin/shop/customers/groups/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Customer Groups</h1>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowForm(v => !v)}>
          {showForm ? "Cancel" : "+ New Group"}
        </button>
      </div>

      {showForm && (
        <div className={styles.card} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
            <input className={styles.input} placeholder="Group name" value={name} onChange={e => setName(e.target.value)} />
            <input className={styles.input} placeholder="Description (optional)" value={description} onChange={e => setDesc(e.target.value)} />
            <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving || !name.trim()} onClick={save}>
              {saving ? "Saving…" : "Create Group"}
            </button>
          </div>
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Status</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }, (_, i) => (
              <tr key={i}>{Array.from({ length: 5 }, (__, j) => <td key={j}><span className={styles.skeleton} style={{ height: 14, width: "80%" }} /></td>)}</tr>
            ))
          ) : items.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No customer groups yet</td></tr>
          ) : items.map(g => (
            <tr key={g.id}>
              <td>{g.name}</td>
              <td style={{ color: "#6b7280" }}>{g.description ?? "—"}</td>
              <td><span className={`${styles.badge} ${g.isActive ? styles.badgeActive : styles.badgeCancelled}`}>{g.isActive ? "Active" : "Inactive"}</span></td>
              <td>{new Date(g.createdAt).toLocaleDateString("en-GB")}</td>
              <td><button className={styles.btnDanger} onClick={() => remove(g.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
