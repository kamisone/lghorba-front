"use client";

import { useEffect, useState } from "react";
import styles from "./AdminPromotions.module.css";

type PromotionType = "percentage" | "fixed_amount" | "free_delivery";

interface Promotion {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  type: PromotionType;
  value: number;
  isActive: boolean;
  isAutomatic: boolean;
  isFirstBookingOnly: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  maxUsages: number | null;
  maxUsagesPerCustomer: number | null;
  minBookingAmount: number | null;
  minBookingDays: number | null;
  maxDiscountAmount: number | null;
  applicableCarIds: string[] | null;
  usageCount: number;
  createdAt: string;
}

interface PromotionUsage {
  id: string;
  promotionId: string;
  bookingId: string;
  customerEmail: string | null;
  discountAmount: number;
  originalAmount: number;
  createdAt: string;
}

const TYPE_LABELS: Record<PromotionType, string> = {
  percentage:    "Percentage %",
  fixed_amount:  "Fixed €",
  free_delivery: "Free delivery",
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(s));
}

function fmtEur(n: number) {
  return `€${Number(n).toFixed(2)}`;
}

function valueLabel(p: Promotion) {
  if (p.type === "percentage")    return `${Number(p.value)}%`;
  if (p.type === "fixed_amount")  return fmtEur(Number(p.value));
  return "—";
}

// ── Default form state ────────────────────────────────────────────────────────

const EMPTY: Omit<Promotion, "id" | "usageCount" | "createdAt"> = {
  code: "",
  name: "",
  description: null,
  type: "percentage",
  value: 10,
  isActive: true,
  isAutomatic: false,
  isFirstBookingOnly: false,
  startsAt: null,
  expiresAt: null,
  maxUsages: null,
  maxUsagesPerCustomer: null,
  minBookingAmount: null,
  minBookingDays: null,
  maxDiscountAmount: null,
  applicableCarIds: null,
};

type FormData = typeof EMPTY;

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminPromotions() {
  const [promos,    setPromos]    = useState<Promotion[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState<"create" | "edit" | "usages" | null>(null);
  const [selected,  setSelected]  = useState<Promotion | null>(null);
  const [usages,    setUsages]    = useState<PromotionUsage[]>([]);
  const [form,      setForm]      = useState<FormData>({ ...EMPTY });
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/next-api/promotions");
      if (res.ok) setPromos(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Open modals ───────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm({ ...EMPTY });
    setSelected(null);
    setError("");
    setModal("create");
  };

  const openEdit = (p: Promotion) => {
    setSelected(p);
    setForm({
      code:                p.code ?? "",
      name:                p.name,
      description:         p.description,
      type:                p.type,
      value:               Number(p.value),
      isActive:            p.isActive,
      isAutomatic:         p.isAutomatic,
      isFirstBookingOnly:  p.isFirstBookingOnly,
      startsAt:            p.startsAt ? p.startsAt.slice(0, 16) : null,
      expiresAt:           p.expiresAt ? p.expiresAt.slice(0, 16) : null,
      maxUsages:           p.maxUsages,
      maxUsagesPerCustomer: p.maxUsagesPerCustomer,
      minBookingAmount:    p.minBookingAmount,
      minBookingDays:      p.minBookingDays,
      maxDiscountAmount:   p.maxDiscountAmount,
      applicableCarIds:    p.applicableCarIds,
    });
    setError("");
    setModal("edit");
  };

  const openUsages = async (p: Promotion) => {
    setSelected(p);
    setUsages([]);
    setModal("usages");
    const res = await fetch(`/next-api/promotions/${p.id}/usages`);
    if (res.ok) setUsages(await res.json());
  };

  // ── Save / delete ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        code:             form.code?.trim().toUpperCase() || null,
        startsAt:         form.startsAt  || null,
        expiresAt:        form.expiresAt || null,
        value:            Number(form.value),
        maxUsages:        form.maxUsages        != null ? Number(form.maxUsages)        : null,
        maxUsagesPerCustomer: form.maxUsagesPerCustomer != null ? Number(form.maxUsagesPerCustomer) : null,
        minBookingAmount: form.minBookingAmount != null ? Number(form.minBookingAmount) : null,
        minBookingDays:   form.minBookingDays   != null ? Number(form.minBookingDays)   : null,
        maxDiscountAmount: form.maxDiscountAmount != null ? Number(form.maxDiscountAmount) : null,
      };
      const url    = modal === "edit" ? `/next-api/promotions/${selected!.id}` : "/next-api/promotions";
      const method = modal === "edit" ? "PATCH" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.message ?? "Failed to save");
        return;
      }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promotion?")) return;
    await fetch(`/next-api/promotions/${id}`, { method: "DELETE" });
    await load();
  };

  const handleToggleActive = async (p: Promotion) => {
    await fetch(`/next-api/promotions/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    await load();
  };

  // ── Form field helper ──────────────────────────────────────────────────────────

  function field(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const val = e.target.type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.value === "" ? null : e.target.value;
      setForm(prev => ({ ...prev, [key]: val }));
    };
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <h1 className={styles.title}>Promotions & Coupons</h1>
        <button className={styles.btnPrimary} onClick={openCreate}>+ New promotion</button>
      </div>

      {loading ? (
        <p className={styles.loading}>Loading…</p>
      ) : promos.length === 0 ? (
        <p className={styles.empty}>No promotions yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Active</th>
                <th>Usages</th>
                <th>Expires</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {promos.map(p => (
                <tr key={p.id} className={!p.isActive ? styles.rowInactive : ""}>
                  <td className={styles.colName}>
                    <span className={styles.promoName}>{p.name}</span>
                    {p.isAutomatic && <span className={styles.tagAuto}>auto</span>}
                    {p.isFirstBookingOnly && <span className={styles.tagFirst}>1st</span>}
                  </td>
                  <td>
                    {p.code
                      ? <code className={styles.code}>{p.code}</code>
                      : <span className={styles.muted}>—</span>}
                  </td>
                  <td>{TYPE_LABELS[p.type]}</td>
                  <td>{valueLabel(p)}</td>
                  <td>
                    <button
                      className={`${styles.toggleBtn} ${p.isActive ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => handleToggleActive(p)}
                      title={p.isActive ? "Deactivate" : "Activate"}
                    >
                      {p.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td>
                    <button className={styles.linkBtn} onClick={() => openUsages(p)}>
                      {p.usageCount}
                      {p.maxUsages != null ? ` / ${p.maxUsages}` : ""}
                    </button>
                  </td>
                  <td>{fmtDate(p.expiresAt)}</td>
                  <td className={styles.actions}>
                    <button className={styles.btnEdit} onClick={() => openEdit(p)}>Edit</button>
                    <button className={styles.btnDelete} onClick={() => handleDelete(p.id)}>Del</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit modal ── */}
      {(modal === "create" || modal === "edit") && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{modal === "create" ? "New promotion" : "Edit promotion"}</h2>

            <div className={styles.formGrid}>

              <label className={styles.formLabel}>Name *
                <input className={styles.formInput} value={form.name ?? ""} onChange={field("name")} />
              </label>

              <label className={styles.formLabel}>Coupon code (leave blank = automatic)
                <input className={styles.formInput} value={form.code ?? ""} onChange={field("code")}
                  placeholder="e.g. SUMMER20" style={{ textTransform: "uppercase" }} />
              </label>

              <label className={styles.formLabel}>Type *
                <select className={styles.formSelect} value={form.type} onChange={field("type")}>
                  <option value="percentage">Percentage %</option>
                  <option value="fixed_amount">Fixed amount €</option>
                  <option value="free_delivery">Free delivery</option>
                </select>
              </label>

              <label className={styles.formLabel}>Value {form.type === "percentage" ? "(0–100)" : form.type === "fixed_amount" ? "(€)" : "(ignored)"}
                <input className={styles.formInput} type="number" step="0.01" min="0"
                  value={form.value ?? 0} onChange={field("value")} disabled={form.type === "free_delivery"} />
              </label>

              {form.type === "percentage" && (
                <label className={styles.formLabel}>Max discount cap (€, optional)
                  <input className={styles.formInput} type="number" step="0.01" min="0"
                    value={form.maxDiscountAmount ?? ""} onChange={field("maxDiscountAmount")} />
                </label>
              )}

              <label className={styles.formLabel}>Starts at
                <input className={styles.formInput} type="datetime-local" value={form.startsAt ?? ""}
                  onChange={field("startsAt")} />
              </label>

              <label className={styles.formLabel}>Expires at
                <input className={styles.formInput} type="datetime-local" value={form.expiresAt ?? ""}
                  onChange={field("expiresAt")} />
              </label>

              <label className={styles.formLabel}>Max total usages (blank = unlimited)
                <input className={styles.formInput} type="number" min="1" step="1"
                  value={form.maxUsages ?? ""} onChange={field("maxUsages")} />
              </label>

              <label className={styles.formLabel}>Max usages per customer (blank = unlimited)
                <input className={styles.formInput} type="number" min="1" step="1"
                  value={form.maxUsagesPerCustomer ?? ""} onChange={field("maxUsagesPerCustomer")} />
              </label>

              <label className={styles.formLabel}>Min booking amount (€)
                <input className={styles.formInput} type="number" step="0.01" min="0"
                  value={form.minBookingAmount ?? ""} onChange={field("minBookingAmount")} />
              </label>

              <label className={styles.formLabel}>Min booking days
                <input className={styles.formInput} type="number" min="1" step="1"
                  value={form.minBookingDays ?? ""} onChange={field("minBookingDays")} />
              </label>

              <label className={styles.formLabel}>Description
                <textarea className={styles.formInput} rows={2}
                  value={form.description ?? ""}
                  onChange={field("description")}
                />
              </label>

            </div>

            <div className={styles.checkboxRow}>
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={form.isActive} onChange={field("isActive")} /> Active
              </label>
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={form.isAutomatic} onChange={field("isAutomatic")} /> Automatic (no code needed)
              </label>
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={form.isFirstBookingOnly} onChange={field("isFirstBookingOnly")} /> First booking only
              </label>
            </div>

            {error && <p className={styles.formError}>{error}</p>}

            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
              <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Usages modal ── */}
      {modal === "usages" && selected && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Usages — {selected.name}</h2>
            {usages.length === 0 ? (
              <p className={styles.empty}>No usages recorded.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Email</th>
                    <th>Original</th>
                    <th>Discount</th>
                  </tr>
                </thead>
                <tbody>
                  {usages.map(u => (
                    <tr key={u.id}>
                      <td>{fmtDate(u.createdAt)}</td>
                      <td>{u.customerEmail ?? "—"}</td>
                      <td>{fmtEur(Number(u.originalAmount))}</td>
                      <td className={styles.discountCell}>−{fmtEur(Number(u.discountAmount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
