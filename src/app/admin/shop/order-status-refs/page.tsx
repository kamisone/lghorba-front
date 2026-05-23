"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

interface OrderStatusRef {
  id: string;
  code: string;
  label: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface FormState {
  code: string;
  label: string;
  description: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

const EMPTY: FormState = { code: "", label: "", description: "", color: "#6b7280", sortOrder: 0, isActive: true };

export default function OrderStatusRefsPage() {
  const { toast } = useToast();
  const [refs,    setRefs]    = useState<OrderStatusRef[]>([]);
  const [modal,   setModal]   = useState<null | "create" | "edit">(null);
  const [form,    setForm]    = useState<FormState>(EMPTY);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/next-api/admin/shop/order-status-refs");
      if (res.ok) setRefs(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setEditId(null); setModal("create"); }
  function openEdit(r: OrderStatusRef) {
    setForm({ code: r.code, label: r.label, description: r.description ?? "", color: r.color ?? "#6b7280", sortOrder: r.sortOrder, isActive: r.isActive });
    setEditId(r.id);
    setModal("edit");
  }

  async function save() {
    setSaving(true);
    const body = { ...form, description: form.description || null, color: form.color || null };
    const url    = modal === "create" ? "/next-api/admin/shop/order-status-refs" : `/next-api/admin/shop/order-status-refs/${editId}`;
    const method = modal === "create" ? "POST" : "PATCH";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) toast.success(modal === "create" ? "Status created" : "Status updated");
    else toast.error("Failed to save status");
    setSaving(false);
    setModal(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this order status?")) return;
    const res = await fetch(`/next-api/admin/shop/order-status-refs/${id}`, { method: "DELETE" });
    if (res.ok) toast.success("Status deleted");
    else toast.error("Failed to delete status");
    load();
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Order Statuses</h1>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}>+ New status</button>
      </div>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
        Define the order status lifecycle. These statuses are used for display and analytics; the transition logic is enforced at the order service level.
      </p>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Code</th>
            <th>Label</th>
            <th>Color</th>
            <th>Order</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  {[90, 130, 60, 40, 60, 110].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
                  ))}
                </tr>
              ))
            : refs.map(r => (
                <tr key={r.id}>
                  <td><code style={{ fontSize: 12, background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>{r.code}</code></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 12, height: 12, borderRadius: "50%", background: r.color ?? "#6b7280", flexShrink: 0 }} />
                      <strong>{r.label}</strong>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 18, height: 18, borderRadius: 4, background: r.color ?? "#6b7280", border: "1px solid #e5e7eb" }} />
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{r.color ?? "—"}</span>
                    </div>
                  </td>
                  <td>{r.sortOrder}</td>
                  <td>
                    <span className={`${styles.badge} ${r.isActive ? styles.badgeActive : styles.badgeDraft}`}>
                      {r.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ marginRight: 8 }} onClick={() => openEdit(r)}>Edit</button>
                    <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => handleDelete(r.id)}>Delete</button>
                  </td>
                </tr>
              ))
          }
          {!loading && refs.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No order statuses yet</td></tr>
          )}
        </tbody>
      </table>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, width: 480, maxWidth: "95vw" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              {modal === "create" ? "New Order Status" : "Edit Order Status"}
            </h2>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Code *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="pending, paid, shipped…" />
              </div>
              <div className={styles.formField}>
                <label>Label *</label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Pending Payment" />
              </div>
              <div className={`${styles.formField} ${styles.formSpan2}`}>
                <label>Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief explanation of this status" />
              </div>
              <div className={styles.formField}>
                <label>Color (hex)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 40, height: 36, padding: 2, border: "1px solid #d1d5db", borderRadius: 6 }} />
                  <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ flex: 1 }} />
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
              <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving || !form.code || !form.label} onClick={save}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
