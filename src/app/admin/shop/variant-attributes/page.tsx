"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/shop/ShopAdmin.module.css";
import { useToast } from "@/components/toast/ToastContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OptionValue {
  id: string;
  value: string;
  displayValue: string | null;
  swatchValue: string | null;
  swatchType: "color" | "image" | null;
  sortOrder: number;
  isActive: boolean;
}

interface VariantAttribute {
  id: string;
  name: string;
  slug: string;
  displayType: "swatch" | "button" | "dropdown";
  sortOrder: number;
  isActive: boolean;
  optionValues: OptionValue[];
}

interface AttrForm {
  name: string;
  slug: string;
  displayType: "swatch" | "button" | "dropdown";
  sortOrder: number;
  isActive: boolean;
}

interface ValueForm {
  value: string;
  displayValue: string;
  swatchValue: string;
  swatchType: "color" | "image" | "";
  sortOrder: number;
  isActive: boolean;
}

const ATTR_EMPTY: AttrForm = { name: "", slug: "", displayType: "button", sortOrder: 0, isActive: true };
const VALUE_EMPTY: ValueForm = { value: "", displayValue: "", swatchValue: "", swatchType: "", sortOrder: 0, isActive: true };

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const DISPLAY_TYPE_LABEL: Record<string, string> = {
  button: "Button", swatch: "Swatch", dropdown: "Dropdown",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function VariantAttributesPage() {
  const { toast } = useToast();

  // Attribute state
  const [attributes, setAttributes] = useState<VariantAttribute[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);

  // Attribute modal
  const [attrModal, setAttrModal]   = useState<null | "create" | "edit">(null);
  const [attrForm, setAttrForm]     = useState<AttrForm>(ATTR_EMPTY);
  const [attrEditId, setAttrEditId] = useState<string | null>(null);
  const [attrSaving, setAttrSaving] = useState(false);

  // Value modal
  const [valModal, setValModal]     = useState<null | "create" | "edit">(null);
  const [valForm, setValForm]       = useState<ValueForm>(VALUE_EMPTY);
  const [valEditId, setValEditId]   = useState<string | null>(null);
  const [valAttrId, setValAttrId]   = useState<string | null>(null);
  const [valSaving, setValSaving]   = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/next-api/admin/shop/variant-attributes");
      if (res.ok) setAttributes(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── Attribute CRUD ────────────────────────────────────────────────────────

  function openAttrCreate() {
    setAttrForm(ATTR_EMPTY);
    setAttrEditId(null);
    setAttrModal("create");
  }

  function openAttrEdit(a: VariantAttribute) {
    setAttrForm({ name: a.name, slug: a.slug, displayType: a.displayType, sortOrder: a.sortOrder, isActive: a.isActive });
    setAttrEditId(a.id);
    setAttrModal("edit");
  }

  async function saveAttr() {
    setAttrSaving(true);
    const body = { ...attrForm, slug: attrForm.slug || slugify(attrForm.name) };
    const url    = attrModal === "create" ? "/next-api/admin/shop/variant-attributes" : `/next-api/admin/shop/variant-attributes/${attrEditId}`;
    const method = attrModal === "create" ? "POST" : "PATCH";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) toast.success(attrModal === "create" ? "Attribute created" : "Attribute updated");
    else toast.error("Failed to save attribute");
    setAttrSaving(false);
    setAttrModal(null);
    load();
  }

  async function deleteAttr(id: string) {
    if (!confirm("Delete this attribute and all its option values?")) return;
    const res = await fetch(`/next-api/admin/shop/variant-attributes/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Attribute deleted"); setExpanded(e => e === id ? null : e); }
    else toast.error("Failed to delete attribute");
    load();
  }

  // ── Option Value CRUD ─────────────────────────────────────────────────────

  function openValCreate(attributeId: string) {
    setValForm(VALUE_EMPTY);
    setValEditId(null);
    setValAttrId(attributeId);
    setValModal("create");
  }

  function openValEdit(v: OptionValue, attributeId: string) {
    setValForm({
      value:        v.value,
      displayValue: v.displayValue ?? "",
      swatchValue:  v.swatchValue ?? "",
      swatchType:   v.swatchType ?? "",
      sortOrder:    v.sortOrder,
      isActive:     v.isActive,
    });
    setValEditId(v.id);
    setValAttrId(attributeId);
    setValModal("edit");
  }

  async function saveVal() {
    setValSaving(true);
    const body = {
      ...valForm,
      displayValue: valForm.displayValue || null,
      swatchValue:  valForm.swatchValue  || null,
      swatchType:   valForm.swatchType   || null,
    };
    const url    = valModal === "create"
      ? `/next-api/admin/shop/variant-attributes/${valAttrId}/values`
      : `/next-api/admin/shop/variant-attributes/${valAttrId}/values/${valEditId}`;
    const method = valModal === "create" ? "POST" : "PATCH";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) toast.success(valModal === "create" ? "Value added" : "Value updated");
    else toast.error("Failed to save value");
    setValSaving(false);
    setValModal(null);
    load();
  }

  async function deleteVal(attributeId: string, valueId: string) {
    if (!confirm("Delete this option value?")) return;
    const res = await fetch(`/next-api/admin/shop/variant-attributes/${attributeId}/values/${valueId}`, { method: "DELETE" });
    if (res.ok) toast.success("Value deleted");
    else toast.error("Failed to delete value");
    load();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Variation Attributes</h1>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openAttrCreate}>+ New attribute</button>
      </div>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
        Define variation dimensions (Color, Size, Material…) and their allowed values. Products use these to build variant selectors.
      </p>

      {/* ── Attributes table ── */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: 32 }} />
            <th>Name</th>
            <th>Slug</th>
            <th>Display</th>
            <th>Values</th>
            <th>Order</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 4 }, (_, i) => (
                <tr key={i}>
                  {[20, 120, 100, 70, 50, 40, 60, 100].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w }} /></td>
                  ))}
                </tr>
              ))
            : attributes.map(a => (
                <>
                  <tr key={a.id} style={{ cursor: "pointer" }}>
                    {/* Expand toggle */}
                    <td onClick={() => setExpanded(e => e === a.id ? null : a.id)} style={{ textAlign: "center", color: "#9ca3af", userSelect: "none", fontSize: 18 }}>
                      {expanded === a.id ? "▾" : "▸"}
                    </td>
                    <td onClick={() => setExpanded(e => e === a.id ? null : a.id)}>
                      <strong>{a.name}</strong>
                    </td>
                    <td style={{ color: "#6b7280", fontSize: 13 }}>{a.slug}</td>
                    <td>
                      <span style={{ fontSize: 12, background: "#f3f4f6", padding: "2px 8px", borderRadius: 12, color: "#374151" }}>
                        {DISPLAY_TYPE_LABEL[a.displayType]}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{a.optionValues?.length ?? 0}</td>
                    <td>{a.sortOrder}</td>
                    <td>
                      <span className={`${styles.badge} ${a.isActive ? styles.badgeActive : styles.badgeDraft}`}>
                        {a.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ marginRight: 8 }} onClick={() => openAttrEdit(a)}>Edit</button>
                      <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => deleteAttr(a.id)}>Delete</button>
                    </td>
                  </tr>

                  {/* ── Expanded option values ── */}
                  {expanded === a.id && (
                    <tr key={`${a.id}-values`}>
                      <td />
                      <td colSpan={7} style={{ padding: "0 0 16px 0", background: "#f9fafb" }}>
                        <div style={{ padding: "16px 16px 4px", borderLeft: "3px solid #e5e7eb", marginLeft: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: 0 }}>
                              Option values for <em>{a.name}</em>
                            </p>
                            <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ fontSize: 12, padding: "4px 12px" }} onClick={() => openValCreate(a.id)}>
                              + Add value
                            </button>
                          </div>

                          {a.optionValues && a.optionValues.length > 0 ? (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#6b7280", fontWeight: 500 }}>Swatch</th>
                                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#6b7280", fontWeight: 500 }}>Value</th>
                                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#6b7280", fontWeight: 500 }}>Display</th>
                                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#6b7280", fontWeight: 500 }}>Order</th>
                                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#6b7280", fontWeight: 500 }}>Status</th>
                                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#6b7280", fontWeight: 500 }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...a.optionValues].sort((x, y) => x.sortOrder - y.sortOrder).map(v => (
                                  <tr key={v.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                    <td style={{ padding: "6px 8px" }}>
                                      {v.swatchType === "color" && v.swatchValue
                                        ? <span style={{ display: "inline-block", width: 20, height: 20, borderRadius: 4, background: v.swatchValue, border: "1px solid #d1d5db", verticalAlign: "middle" }} />
                                        : <span style={{ color: "#d1d5db" }}>—</span>}
                                    </td>
                                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>{v.value}</td>
                                    <td style={{ padding: "6px 8px", color: "#6b7280" }}>{v.displayValue ?? v.value}</td>
                                    <td style={{ padding: "6px 8px" }}>{v.sortOrder}</td>
                                    <td style={{ padding: "6px 8px" }}>
                                      <span style={{
                                        fontSize: 11, padding: "2px 6px", borderRadius: 10,
                                        background: v.isActive ? "#d1fae5" : "#f3f4f6",
                                        color: v.isActive ? "#065f46" : "#6b7280",
                                      }}>
                                        {v.isActive ? "Active" : "Hidden"}
                                      </span>
                                    </td>
                                    <td style={{ padding: "6px 8px" }}>
                                      <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: 11, padding: "2px 8px", marginRight: 6 }} onClick={() => openValEdit(v, a.id)}>Edit</button>
                                      <button className={`${styles.btn} ${styles.btnDanger}`} style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => deleteVal(a.id, v.id)}>Delete</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p style={{ color: "#9ca3af", fontSize: 13 }}>No option values yet. Add one to enable structured variant selection.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
          }
          {!loading && attributes.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No variation attributes yet</td></tr>
          )}
        </tbody>
      </table>

      {/* ── Attribute modal ── */}
      {attrModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, width: 500, maxWidth: "95vw" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              {attrModal === "create" ? "New Variation Attribute" : "Edit Variation Attribute"}
            </h2>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Name * <span style={{ color: "#9ca3af", fontWeight: 400 }}>(e.g. Color, Size)</span></label>
                <input
                  value={attrForm.name}
                  onChange={e => setAttrForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                  placeholder="Color"
                />
              </div>
              <div className={styles.formField}>
                <label>Slug *</label>
                <input value={attrForm.slug} onChange={e => setAttrForm(f => ({ ...f, slug: e.target.value }))} placeholder="color" />
              </div>
              <div className={styles.formField}>
                <label>Display type</label>
                <select value={attrForm.displayType} onChange={e => setAttrForm(f => ({ ...f, displayType: e.target.value as AttrForm["displayType"] }))}>
                  <option value="button">Button</option>
                  <option value="swatch">Swatch (color / image)</option>
                  <option value="dropdown">Dropdown</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label>Sort order</label>
                <input type="number" value={attrForm.sortOrder} onChange={e => setAttrForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
              </div>
              <div className={styles.formField}>
                <label>Status</label>
                <select value={attrForm.isActive ? "active" : "inactive"} onChange={e => setAttrForm(f => ({ ...f, isActive: e.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setAttrModal(null)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={attrSaving || !attrForm.name} onClick={saveAttr}>
                {attrSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Option value modal ── */}
      {valModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, width: 520, maxWidth: "95vw" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              {valModal === "create" ? "Add Option Value" : "Edit Option Value"}
            </h2>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Value * <span style={{ color: "#9ca3af", fontWeight: 400 }}>(machine key)</span></label>
                <input value={valForm.value} onChange={e => setValForm(f => ({ ...f, value: e.target.value }))} placeholder="Black" />
              </div>
              <div className={styles.formField}>
                <label>Display value <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional label)</span></label>
                <input value={valForm.displayValue} onChange={e => setValForm(f => ({ ...f, displayValue: e.target.value }))} placeholder="Noir" />
              </div>
              <div className={styles.formField}>
                <label>Swatch type</label>
                <select value={valForm.swatchType} onChange={e => setValForm(f => ({ ...f, swatchType: e.target.value as ValueForm["swatchType"] }))}>
                  <option value="">None</option>
                  <option value="color">Color (hex)</option>
                  <option value="image">Image (GCS key)</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label>Swatch value</label>
                {valForm.swatchType === "color"
                  ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="color" value={valForm.swatchValue || "#000000"} onChange={e => setValForm(f => ({ ...f, swatchValue: e.target.value }))} style={{ width: 40, height: 36, padding: 2, border: "1px solid #e5e7eb", borderRadius: 6 }} />
                      <input value={valForm.swatchValue} onChange={e => setValForm(f => ({ ...f, swatchValue: e.target.value }))} placeholder="#000000" style={{ flex: 1 }} />
                    </div>
                  : <input value={valForm.swatchValue} onChange={e => setValForm(f => ({ ...f, swatchValue: e.target.value }))} placeholder={valForm.swatchType === "image" ? "swatches/black-texture.jpg" : "—"} disabled={!valForm.swatchType} />
                }
              </div>
              <div className={styles.formField}>
                <label>Sort order</label>
                <input type="number" value={valForm.sortOrder} onChange={e => setValForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
              </div>
              <div className={styles.formField}>
                <label>Status</label>
                <select value={valForm.isActive ? "active" : "hidden"} onChange={e => setValForm(f => ({ ...f, isActive: e.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setValModal(null)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={valSaving || !valForm.value} onClick={saveVal}>
                {valSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
