"use client";

import { useEffect, useState } from "react";
import MediaPicker, { MediaAsset } from "@/components/admin/media/MediaPicker";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

interface PaymentType {
  id: string;
  code: string;
  name: string;
  iconKey: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface FormState {
  code: string;
  name: string;
  iconKey: string;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY: FormState = { code: "", name: "", iconKey: "", isActive: true, sortOrder: 0 };

export default function PaymentTypesPage() {
  const { toast } = useToast();
  const [types, setTypes]     = useState<PaymentType[]>([]);
  const [modal, setModal]     = useState<null | "create" | "edit">(null);
  const [form, setForm]       = useState<FormState>(EMPTY);
  const [editId, setEditId]   = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/next-api/admin/shop/payment-types");
      if (res.ok) setTypes(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setEditId(null); setModal("create"); }
  function openEdit(t: PaymentType) {
    setForm({ code: t.code, name: t.name, iconKey: t.iconKey ?? "", isActive: t.isActive, sortOrder: t.sortOrder });
    setEditId(t.id);
    setModal("edit");
  }

  async function save() {
    setSaving(true);
    const body = { ...form, iconKey: form.iconKey || null };
    const url    = modal === "create" ? "/next-api/admin/shop/payment-types" : `/next-api/admin/shop/payment-types/${editId}`;
    const method = modal === "create" ? "POST" : "PATCH";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) toast.success(modal === "create" ? "Payment type created" : "Payment type updated");
    else toast.error("Failed to save payment type");
    setSaving(false);
    setModal(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this payment type?")) return;
    const res = await fetch(`/next-api/admin/shop/payment-types/${id}`, { method: "DELETE" });
    if (res.ok) toast.success("Payment type deleted");
    else toast.error("Failed to delete payment type");
    load();
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Payment Types</h1>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}>+ New type</button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Order</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 4 }, (_, i) => (
                <tr key={i}>
                  {[80, 140, 40, 60, 100].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
                  ))}
                </tr>
              ))
            : types.map(t => (
                <tr key={t.id}>
                  <td><code style={{ fontSize: 13, background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>{t.code}</code></td>
                  <td><strong>{t.name}</strong></td>
                  <td>{t.sortOrder}</td>
                  <td>
                    <span className={`${styles.badge} ${t.isActive ? styles.badgeActive : styles.badgeDraft}`}>
                      {t.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ marginRight: 8 }} onClick={() => openEdit(t)}>Edit</button>
                    <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => handleDelete(t.id)}>Delete</button>
                  </td>
                </tr>
              ))
          }
          {!loading && types.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No payment types yet</td></tr>
          )}
        </tbody>
      </table>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, width: 480, maxWidth: "95vw" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              {modal === "create" ? "New Payment Type" : "Edit Payment Type"}
            </h2>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Code *</label>
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="card, paypal, apple_pay…"
                />
              </div>
              <div className={styles.formField}>
                <label>Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Credit / Debit Card" />
              </div>
              <div className={`${styles.formField} ${styles.formSpan2}`}>
                <label>Icon (optional)</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                  {form.iconKey && (
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#6b7280", wordBreak: "break-all" }}>{form.iconKey}</span>
                  )}
                  <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIconPickerOpen(true)}>
                    {form.iconKey ? "Change icon" : "Choose from Library"}
                  </button>
                  {form.iconKey && (
                    <button type="button" className={styles.btn} onClick={() => setForm(f => ({ ...f, iconKey: "" }))}>Remove</button>
                  )}
                </div>
                <MediaPicker
                  open={iconPickerOpen}
                  onClose={() => setIconPickerOpen(false)}
                  onSelect={(a: MediaAsset) => { setForm(f => ({ ...f, iconKey: a.storageKey })); setIconPickerOpen(false); }}
                  title="Select payment icon"
                  currentKey={form.iconKey || undefined}
                />
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
              <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving || !form.code || !form.name} onClick={save}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
