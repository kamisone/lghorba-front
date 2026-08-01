"use client";

import { useEffect, useState } from "react";
import styles from "./VariantAttributes.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { useEntityTranslations } from "@/hooks/useEntityTranslations";
import BilingualField from "@/components/admin/BilingualField";
import { slugify } from "@/lib/slugify";
import { X, ChevronDown } from "lucide-react";

interface OptionValue {
  id: string;
  value: string;
  displayValue: string | null;
  swatchValue: string | null;
  swatchType: "color" | "image" | null;
  priceAdjustmentCents: number | null;
  sortOrder: number;
  isActive: boolean;
}

interface VariantAttribute {
  id: string;
  name: string;
  slug: string;
  adminLabel: string | null;
  displayType: "swatch" | "button" | "dropdown";
  sortOrder: number;
  isActive: boolean;
  optionValues: OptionValue[];
}

interface AttrForm {
  name: string; slug: string; adminLabel: string;
  displayType: "swatch" | "button" | "dropdown";
  sortOrder: number; isActive: boolean;
}

interface ValueForm {
  value: string; displayValue: string; swatchValue: string;
  swatchType: "color" | "image" | "";
  priceAdjustmentEuros: string;
  sortOrder: number; isActive: boolean;
}

const ATTR_EMPTY: AttrForm  = { name: "", slug: "", adminLabel: "", displayType: "button", sortOrder: 0, isActive: true };
const VALUE_EMPTY: ValueForm = { value: "", displayValue: "", swatchValue: "", swatchType: "", priceAdjustmentEuros: "", sortOrder: 0, isActive: true };


const DISPLAY_LABEL: Record<string, string> = { button: "Button", swatch: "Swatch", dropdown: "Dropdown" };
const DISPLAY_CLS:   Record<string, string> = {
  button:   styles.displayBadgeButton,
  swatch:   styles.displayBadgeSwatch,
  dropdown: styles.displayBadgeDropdown,
};

export default function VariantAttributesPage() {
  const { toast } = useToast();

  const [attributes, setAttributes] = useState<VariantAttribute[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);

  const [attrModal, setAttrModal]   = useState<null | "create" | "edit">(null);
  const [attrForm, setAttrForm]     = useState<AttrForm>(ATTR_EMPTY);
  const [attrEditId, setAttrEditId] = useState<string | null>(null);
  const [attrSaving, setAttrSaving] = useState(false);

  const [valModal, setValModal]     = useState<null | "create" | "edit">(null);
  const [valForm, setValForm]       = useState<ValueForm>(VALUE_EMPTY);
  const [valEditId, setValEditId]   = useState<string | null>(null);
  const [valAttrId, setValAttrId]   = useState<string | null>(null);
  const [valSaving, setValSaving]   = useState(false);

  const { translations: attrTr, setTranslation: setAttrTr, saveTranslations: saveAttrTr } =
    useEntityTranslations("shop_variant_attribute", attrEditId);
  const { translations: valTr, setTranslation: setValTr, saveTranslations: saveValTr } =
    useEntityTranslations("shop_variation_option", valEditId);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/next-api/admin/shop/variant-attributes");
      if (res.ok) setAttributes(await res.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openAttrCreate() { setAttrForm(ATTR_EMPTY); setAttrEditId(null); setAttrModal("create"); }
  function openAttrEdit(a: VariantAttribute) {
    setAttrEditId(a.id);
    setAttrForm({ name: a.name, slug: a.slug, adminLabel: a.adminLabel ?? "", displayType: a.displayType, sortOrder: a.sortOrder, isActive: a.isActive });
    setAttrModal("edit");
  }

  async function saveAttr() {
    setAttrSaving(true);
    const body = { ...attrForm, slug: attrForm.slug || slugify(attrForm.name), adminLabel: attrForm.adminLabel.trim() || null };
    const url    = attrModal === "create" ? "/next-api/admin/shop/variant-attributes" : `/next-api/admin/shop/variant-attributes/${attrEditId}`;
    const method = attrModal === "create" ? "POST" : "PATCH";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const saved = await res.json();
      const entityId = attrModal === "create" ? saved.id : attrEditId!;
      await saveAttrTr(entityId, ["name"]);
      toast.success(attrModal === "create" ? "Attribute created" : "Attribute updated");
      setAttrModal(null); load();
    } else {
      let msg = "Failed to save attribute";
      try {
        const err = await res.json();
        if (err?.message) msg = Array.isArray(err.message) ? err.message.join(", ") : err.message;
      } catch { /* ignore non-JSON error body */ }
      toast.error(msg);
    }
    setAttrSaving(false);
  }

  async function deleteAttr(id: string) {
    if (!confirm("Delete this attribute and all its option values?")) return;
    const res = await fetch(`/next-api/admin/shop/variant-attributes/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Attribute deleted"); setExpanded(e => e === id ? null : e); }
    else toast.error("Failed to delete attribute");
    load();
  }

  function openValCreate(attributeId: string) { setValForm(VALUE_EMPTY); setValEditId(null); setValAttrId(attributeId); setValModal("create"); }
  function openValEdit(v: OptionValue, attributeId: string) {
    setValEditId(v.id);
    const form: ValueForm = {
      value: v.value, displayValue: v.displayValue ?? "",
      swatchValue: v.swatchValue ?? "", swatchType: (v.swatchType ?? "") as ValueForm["swatchType"],
      priceAdjustmentEuros: v.priceAdjustmentCents != null ? (v.priceAdjustmentCents / 100).toFixed(2) : "",
      sortOrder: v.sortOrder, isActive: v.isActive,
    };
    setValForm(form);
    setValAttrId(attributeId); setValModal("edit");
  }

  async function saveVal() {
    setValSaving(true);
    const { priceAdjustmentEuros, ...rest } = valForm;
    const priceAdjustmentCents = priceAdjustmentEuros.trim()
      ? Math.round(parseFloat(priceAdjustmentEuros) * 100)
      : null;
    const body = {
      ...rest,
      displayValue: valForm.displayValue || null,
      swatchValue: valForm.swatchValue || null,
      swatchType: valForm.swatchType || null,
      priceAdjustmentCents,
    };
    const url    = valModal === "create" ? `/next-api/admin/shop/variant-attributes/${valAttrId}/values` : `/next-api/admin/shop/variant-attributes/${valAttrId}/values/${valEditId}`;
    const method = valModal === "create" ? "POST" : "PATCH";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const saved = await res.json();
      const entityId = valModal === "create" ? saved.id : valEditId!;
      await saveValTr(entityId, ["displayValue"]);
      toast.success(valModal === "create" ? "Value added" : "Value updated");
    } else {
      toast.error("Failed to save value");
    }
    setValSaving(false); setValModal(null); load();
  }

  async function deleteVal(attributeId: string, valueId: string) {
    if (!confirm("Delete this option value?")) return;
    const res = await fetch(`/next-api/admin/shop/variant-attributes/${attributeId}/values/${valueId}`, { method: "DELETE" });
    if (res.ok) toast.success("Value deleted");
    else toast.error("Failed to delete value");
    load();
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Variant Attributes</h1>
          <span className={styles.subtitle}>{attributes.length} attributes configured</span>
        </div>
        <button className={styles.newBtn} onClick={openAttrCreate}>+ New Attribute</button>
      </div>
      <p className={styles.description}>
        Define variation dimensions (Color, Size, Material…) and their allowed values. Products use these to build variant selectors.
      </p>

      {/* ── Table ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-label="Expand" />
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
            {loading ? (
              Array.from({ length: 4 }, (_, i) => (
                <tr key={i}>
                  {[28, 140, 100, 80, 50, 40, 70, 110].map((w, j) => (
                    <td key={j}><span className={styles.skeleton} style={{ height: 14, width: w, display: "block" }} /></td>
                  ))}
                </tr>
              ))
            ) : attributes.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}>🎛</span>
                    <span className={styles.emptyText}>No variant attributes yet</span>
                    <span className={styles.emptyHint}>Create your first attribute to enable product variants</span>
                  </div>
                </td>
              </tr>
            ) : (
              attributes.map(a => (
                <>
                  <tr key={a.id}>
                    <td>
                      <button
                        className={`${styles.expandBtn} ${expanded === a.id ? styles.expandBtnActive : ""}`}
                        onClick={() => setExpanded(e => e === a.id ? null : a.id)}
                        title={expanded === a.id ? "Collapse" : "Expand values"}
                      >
                        {expanded === a.id ? <ChevronDown size={14} strokeWidth={1.75} /> : "▸"}
                      </button>
                    </td>
                    <td>
                      <div className={styles.attrName} onClick={() => setExpanded(e => e === a.id ? null : a.id)}>
                        {a.name}
                      </div>
                      {a.adminLabel && <div className={styles.attrAdminLabel}>{a.adminLabel}</div>}
                    </td>
                    <td><span className={styles.attrSlug}>{a.slug}</span></td>
                    <td>
                      <span className={`${styles.displayBadge} ${DISPLAY_CLS[a.displayType] ?? ""}`}>
                        {DISPLAY_LABEL[a.displayType]}
                      </span>
                    </td>
                    <td>
                      <span className={styles.valueCount}>{a.optionValues?.length ?? 0}</span>
                    </td>
                    <td><span className={styles.sortOrder}>{a.sortOrder}</span></td>
                    <td>
                      <span className={`${styles.badge} ${a.isActive ? styles.badgeActive : styles.badgeInactive}`}>
                        {a.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={`${styles.actionBtn} ${styles.actionEdit}`} onClick={() => openAttrEdit(a)}>Edit</button>
                        <button className={`${styles.actionBtn} ${styles.actionDelete}`} onClick={() => deleteAttr(a.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>

                  {expanded === a.id && (
                    <tr key={`${a.id}-values`}>
                      <td colSpan={8} className={styles.valuesPanel}>
                        <div className={styles.valuesPanelInner}>
                          <div className={styles.valuesPanelHeader}>
                            <span className={styles.valuesPanelTitle}>Option values — {a.name}</span>
                            <button className={`${styles.actionBtn} ${styles.actionAdd}`} onClick={() => openValCreate(a.id)}>
                              + Add value
                            </button>
                          </div>

                          {a.optionValues && a.optionValues.length > 0 ? (
                            <table className={styles.valTable}>
                              <thead>
                                <tr>
                                  <th>Swatch</th>
                                  <th>Value</th>
                                  <th>Display label</th>
                                  <th>Price adj.</th>
                                  <th>Order</th>
                                  <th>Status</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...a.optionValues].sort((x, y) => x.sortOrder - y.sortOrder).map(v => (
                                  <tr key={v.id}>
                                    <td>
                                      {v.swatchType === "color" && v.swatchValue
                                        ? <span className={styles.swatchDot} style={{ background: v.swatchValue }} />
                                        : v.swatchType === "image" && v.swatchValue
                                          ? <span className={styles.swatchImgThumb} style={{ backgroundImage: `url(${v.swatchValue})` }} title="Image swatch" />
                                          : <span className={styles.swatchNone}>—</span>
                                      }
                                    </td>
                                    <td><span className={styles.valValue}>{v.value}</span></td>
                                    <td><span className={styles.valDisplay}>{v.displayValue ?? v.value}</span></td>
                                    <td>
                                      {v.priceAdjustmentCents != null
                                        ? <span className={styles.valAdjustment}>
                                            {v.priceAdjustmentCents >= 0 ? "+" : ""}€{(v.priceAdjustmentCents / 100).toFixed(2)}
                                          </span>
                                        : <span className={styles.swatchNone}>—</span>
                                      }
                                    </td>
                                    <td>{v.sortOrder}</td>
                                    <td>
                                      <span className={`${styles.valBadge} ${v.isActive ? styles.valBadgeActive : styles.valBadgeHidden}`}>
                                        {v.isActive ? "Active" : "Hidden"}
                                      </span>
                                    </td>
                                    <td>
                                      <div className={styles.actions}>
                                        <button className={`${styles.actionBtn} ${styles.actionEdit}`} onClick={() => openValEdit(v, a.id)}>Edit</button>
                                        <button className={`${styles.actionBtn} ${styles.actionDelete}`} onClick={() => deleteVal(a.id, v.id)}>Delete</button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className={styles.valEmpty}>No option values yet. Add one to enable structured variant selection.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Attribute modal ── */}
      {attrModal && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setAttrModal(null); }}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <h2 className={styles.modalTitle}>
                {attrModal === "create" ? "New Variant Attribute" : "Edit Attribute"}
              </h2>
              <button className={styles.modalClose} onClick={() => setAttrModal(null)}><X size={14} strokeWidth={2} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <BilingualField
                    label="Name"
                    field="name"
                    frRequired
                    frValue={attrForm.name}
                    frOnChange={v => setAttrForm(f => ({ ...f, name: v, slug: slugify(v) }))}
                    frPlaceholder="e.g. Couleur, Taille"
                    translations={attrTr}
                    onTranslationChange={setAttrTr}
                    overlayPlaceholder="e.g. Color, Size"
                  />
                </div>
                <div className={styles.formField}>
                  <label>Slug *</label>
                  <input value={attrForm.slug} onChange={e => setAttrForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" />
                </div>
                <div className={styles.formField}>
                  <label>Internal label <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0 }}>(admin only, optional)</span></label>
                  <input
                    value={attrForm.adminLabel}
                    onChange={e => setAttrForm(f => ({ ...f, adminLabel: e.target.value }))}
                    placeholder="e.g. Couleur (T-shirts)"
                  />
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
                  <input type="number" min={0} value={attrForm.sortOrder} onChange={e => setAttrForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
                </div>
                <div className={styles.formField}>
                  <label>Status</label>
                  <select value={attrForm.isActive ? "active" : "inactive"} onChange={e => setAttrForm(f => ({ ...f, isActive: e.target.value === "active" }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className={styles.modalFoot}>
              <button className={styles.cancelBtn} onClick={() => setAttrModal(null)}>Cancel</button>
              <button className={styles.saveBtn} disabled={attrSaving || !attrForm.name} onClick={saveAttr}>
                {attrSaving ? "Saving…" : attrModal === "create" ? "Create Attribute" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Option value modal ── */}
      {valModal && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setValModal(null); }}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <h2 className={styles.modalTitle}>
                {valModal === "create" ? "Add Option Value" : "Edit Option Value"}
              </h2>
              <button className={styles.modalClose} onClick={() => setValModal(null)}><X size={14} strokeWidth={2} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Value * <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0 }}>(machine key)</span></label>
                  <input value={valForm.value} onChange={e => setValForm(f => ({ ...f, value: e.target.value }))} placeholder="Black" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <BilingualField
                    label="Display label (optional)"
                    field="displayValue"
                    frValue={valForm.displayValue}
                    frOnChange={v => setValForm(f => ({ ...f, displayValue: v }))}
                    frPlaceholder="Noir"
                    translations={valTr}
                    onTranslationChange={setValTr}
                    overlayPlaceholder="Black"
                  />
                </div>
                <div className={styles.formField}>
                  <label>Swatch type</label>
                  <select
                    value={valForm.swatchType}
                    onChange={e => {
                      const t = e.target.value as ValueForm["swatchType"];
                      setValForm(f => ({ ...f, swatchType: t, swatchValue: "" }));
                    }}
                  >
                    <option value="">None</option>
                    <option value="color">Color (hex)</option>
                    <option value="image">Image</option>
                  </select>
                </div>
                <div className={styles.formField}>
                  <label>Swatch value</label>
                  {valForm.swatchType === "color" ? (
                    <div className={styles.swatchRow}>
                      <input
                        type="color"
                        className={styles.swatchColorInput}
                        value={valForm.swatchValue || "#000000"}
                        onChange={e => setValForm(f => ({ ...f, swatchValue: e.target.value }))}
                      />
                      <input
                        className={styles.swatchTextInput}
                        value={valForm.swatchValue}
                        onChange={e => setValForm(f => ({ ...f, swatchValue: e.target.value }))}
                        placeholder="#000000"
                      />
                    </div>
                  ) : valForm.swatchType === "image" ? (
                    <p className={styles.swatchImageHint}>
                      Image is set per product when linking this variation.
                    </p>
                  ) : (
                    <input
                      value={valForm.swatchValue}
                      onChange={e => setValForm(f => ({ ...f, swatchValue: e.target.value }))}
                      placeholder="—"
                      disabled
                    />
                  )}
                </div>
                <div className={styles.formField}>
                  <label>
                    Price adjustment (€)
                    <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0 }}> — optional, e.g. +5.00 or -2.50</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={valForm.priceAdjustmentEuros}
                    onChange={e => setValForm(f => ({ ...f, priceAdjustmentEuros: e.target.value }))}
                    placeholder="Leave blank for no adjustment"
                  />
                </div>
                <div className={styles.formField}>
                  <label>Sort order</label>
                  <input type="number" min={0} value={valForm.sortOrder} onChange={e => setValForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
                </div>
                <div className={styles.formField}>
                  <label>Status</label>
                  <select value={valForm.isActive ? "active" : "hidden"} onChange={e => setValForm(f => ({ ...f, isActive: e.target.value === "active" }))}>
                    <option value="active">Active</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>
            </div>
            <div className={styles.modalFoot}>
              <button className={styles.cancelBtn} onClick={() => setValModal(null)}>Cancel</button>
              <button className={styles.saveBtn} disabled={valSaving || !valForm.value} onClick={saveVal}>
                {valSaving ? "Saving…" : valModal === "create" ? "Add Value" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
