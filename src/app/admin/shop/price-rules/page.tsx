"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

type RuleType  = "percentage_off" | "fixed_off" | "override";
type RuleScope = "variant" | "product" | "global";

interface PriceRule {
  id: string;
  name: string;
  type: RuleType;
  value: number;
  scope: RuleScope;
  variantId: string | null;
  productId: string | null;
  minQty: number;
  priority: number;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
}

const EMPTY_FORM = {
  name: "", type: "percentage_off" as RuleType, value: "", scope: "global" as RuleScope,
  variantId: "", productId: "", minQty: "0", priority: "0",
  isActive: true, startsAt: "", expiresAt: "",
};

function fmtValue(rule: PriceRule): string {
  if (rule.type === "percentage_off") return `${(rule.value / 100).toFixed(1)}%`;
  if (rule.type === "fixed_off")      return `-€${(rule.value / 100).toFixed(2)}`;
  return `€${(rule.value / 100).toFixed(2)} override`;
}

export default function AdminPriceRulesPage() {
  const { toast } = useToast();
  const [rules, setRules]     = useState<PriceRule[]>([]);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [editId, setEditId]   = useState<string | null>(null);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/next-api/shop/price-rules");
      if (res.ok) setRules(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY_FORM); setEditId(null); setOpen(true); }

  function openEdit(r: PriceRule) {
    setForm({
      name: r.name, type: r.type, value: String(r.value), scope: r.scope,
      variantId: r.variantId ?? "", productId: r.productId ?? "",
      minQty: String(r.minQty), priority: String(r.priority),
      isActive: r.isActive,
      startsAt:  r.startsAt  ? r.startsAt.slice(0, 16)  : "",
      expiresAt: r.expiresAt ? r.expiresAt.slice(0, 16) : "",
    });
    setEditId(r.id);
    setOpen(true);
  }

  async function handleSave() {
    const body = {
      name:      form.name,
      type:      form.type,
      value:     parseInt(form.value, 10),
      scope:     form.scope,
      variantId: form.variantId || null,
      productId: form.productId || null,
      minQty:    parseInt(form.minQty, 10) || 0,
      priority:  parseInt(form.priority, 10) || 0,
      isActive:  form.isActive,
      startsAt:  form.startsAt  || null,
      expiresAt: form.expiresAt || null,
    };
    const url    = editId ? `/next-api/shop/price-rules/${editId}` : "/next-api/shop/price-rules";
    const method = editId ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      toast.success(editId ? "Price rule updated" : "Price rule created");
      setOpen(false);
      load();
    } else {
      toast.error("Failed to save price rule");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this price rule?")) return;
    const res = await fetch(`/next-api/shop/price-rules/${id}`, { method: "DELETE" });
    if (res.ok) toast.success("Price rule deleted");
    else toast.error("Failed to delete price rule");
    load();
  }

  async function toggleActive(r: PriceRule) {
    const res = await fetch(`/next-api/shop/price-rules/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !r.isActive }),
    });
    if (res.ok) toast.success(r.isActive ? "Rule deactivated" : "Rule activated");
    else toast.error("Failed to update rule");
    load();
  }

  const f = (field: keyof typeof EMPTY_FORM, val: string | boolean) =>
    setForm(p => ({ ...p, [field]: val }));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Price Rules</h1>
        <button onClick={openCreate} className={`${styles.btn} ${styles.btnPrimary}`}>+ New Rule</button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th><th>Type</th><th>Value</th><th>Scope</th>
            <th>Priority</th><th>Min Qty</th><th>Active</th>
            <th>Starts</th><th>Expires</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: 5 }, (_, i) => (
            <tr key={i}>
              {[120, 90, 70, 60, 40, 40, 60, 70, 70, 90].map((w, j) => (
                <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
              ))}
            </tr>
          )) : rules.map(r => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td><span style={{ fontFamily: "monospace", fontSize: 12 }}>{r.type}</span></td>
              <td style={{ fontWeight: 600 }}>{fmtValue(r)}</td>
              <td>
                <span className={`${styles.badge} ${styles.badgeDraft}`}>{r.scope}</span>
              </td>
              <td style={{ textAlign: "center" }}>{r.priority}</td>
              <td style={{ textAlign: "center" }}>{r.minQty}</td>
              <td>
                <button
                  onClick={() => toggleActive(r)}
                  className={`${styles.btn} ${r.isActive ? styles.btnSuccess : styles.btnSecondary}`}
                  style={{ fontSize: 12, padding: "2px 10px" }}
                >
                  {r.isActive ? "Active" : "Inactive"}
                </button>
              </td>
              <td style={{ fontSize: 12, color: "#9ca3af" }}>
                {r.startsAt ? new Date(r.startsAt).toLocaleDateString() : "—"}
              </td>
              <td style={{ fontSize: 12, color: "#9ca3af" }}>
                {r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "—"}
              </td>
              <td style={{ display: "flex", gap: 8 }}>
                <button onClick={() => openEdit(r)} className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: 12, padding: "4px 10px" }}>Edit</button>
                <button onClick={() => handleDelete(r.id)} className={`${styles.btn} ${styles.btnDanger}`} style={{ fontSize: 12, padding: "4px 10px" }}>Delete</button>
              </td>
            </tr>
          ))}
          {!loading && !rules.length && (
            <tr><td colSpan={10} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No price rules yet</td></tr>
          )}
        </tbody>
      </table>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, overflowY: "auto", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 560, maxWidth: "100%" }}>
            <h3 style={{ marginBottom: 20 }}>{editId ? "Edit" : "New"} Price Rule</h3>

            <div className={styles.formGrid}>
              <div className={`${styles.formField} ${styles.formSpan2}`}>
                <label>Name</label>
                <input value={form.name} onChange={e => f("name", e.target.value)} placeholder="e.g. Summer 20% Off" />
              </div>

              <div className={styles.formField}>
                <label>Type</label>
                <select value={form.type} onChange={e => f("type", e.target.value)}>
                  <option value="percentage_off">Percentage off (basis pts)</option>
                  <option value="fixed_off">Fixed amount off (cents)</option>
                  <option value="override">Override price (cents)</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label>
                  Value{" "}
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>
                    {form.type === "percentage_off" ? "(basis pts — 2000 = 20%)" : "(cents)"}
                  </span>
                </label>
                <input type="number" value={form.value} onChange={e => f("value", e.target.value)} />
              </div>

              <div className={styles.formField}>
                <label>Scope</label>
                <select value={form.scope} onChange={e => f("scope", e.target.value as RuleScope)}>
                  <option value="global">Global</option>
                  <option value="product">Product</option>
                  <option value="variant">Variant</option>
                </select>
              </div>

              {form.scope === "product" && (
                <div className={styles.formField}>
                  <label>Product ID</label>
                  <input value={form.productId} onChange={e => f("productId", e.target.value)} placeholder="UUID" />
                </div>
              )}
              {form.scope === "variant" && (
                <div className={styles.formField}>
                  <label>Variant ID</label>
                  <input value={form.variantId} onChange={e => f("variantId", e.target.value)} placeholder="UUID" />
                </div>
              )}

              <div className={styles.formField}>
                <label>Priority (higher wins)</label>
                <input type="number" value={form.priority} onChange={e => f("priority", e.target.value)} />
              </div>

              <div className={styles.formField}>
                <label>Min Quantity</label>
                <input type="number" min={0} value={form.minQty} onChange={e => f("minQty", e.target.value)} />
              </div>

              <div className={styles.formField}>
                <label>Starts at</label>
                <input type="datetime-local" value={form.startsAt} onChange={e => f("startsAt", e.target.value)} />
              </div>

              <div className={styles.formField}>
                <label>Expires at</label>
                <input type="datetime-local" value={form.expiresAt} onChange={e => f("expiresAt", e.target.value)} />
              </div>

              <div className={`${styles.formField} ${styles.formSpan2}`} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => f("isActive", e.target.checked)} style={{ width: 16, height: 16 }} />
                <label htmlFor="isActive" style={{ cursor: "pointer" }}>Active</label>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={handleSave} className={`${styles.btn} ${styles.btnPrimary}`}>Save</button>
              <button onClick={() => setOpen(false)} className={`${styles.btn} ${styles.btnSecondary}`}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
