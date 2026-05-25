"use client";

import { useEffect, useState } from "react";
import styles from "./VariantAttributes.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { useEntityTranslations } from "@/hooks/useEntityTranslations";

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
  name: string; nameEn: string; slug: string;
  displayType: "swatch" | "button" | "dropdown";
  sortOrder: number; isActive: boolean;
}

interface ValueForm {
  value: string; displayValue: string; displayValueEn: string; swatchValue: string;
  swatchType: "color" | "image" | "";
  sortOrder: number; isActive: boolean;
}

const ATTR_EMPTY: AttrForm  = { name: "", nameEn: "", slug: "", displayType: "button", sortOrder: 0, isActive: true };
const VALUE_EMPTY: ValueForm = { value: "", displayValue: "", displayValueEn: "", swatchValue: "", swatchType: "", sortOrder: 0, isActive: true };

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

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

  const attrTranslations = useEntityTranslations("shop_variant_attribute", attrEditId);
  const valTranslations  = useEntityTranslations("shop_variation_option",  valEditId);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/next-api/admin/shop/variant-attributes");
      if (res.ok) setAttributes(await res.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  // Sync EN translations into form fields once the hook loads them
  useEffect(() => {
    if (attrModal === "edit" && attrTranslations.enValues["name"] !== undefined) {
      setAttrForm(f => ({ ...f, nameEn: attrTranslations.enValues["name"] ?? "" }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrTranslations.enValues]);

  useEffect(() => {
    if (valModal === "edit" && valTranslations.enValues["displayValue"] !== undefined) {
      setValForm(f => ({ ...f, displayValueEn: valTranslations.enValues["displayValue"] ?? "" }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valTranslations.enValues]);

  function openAttrCreate() { setAttrForm(ATTR_EMPTY); setAttrEditId(null); setAttrModal("create"); }
  function openAttrEdit(a: VariantAttribute) {
    setAttrEditId(a.id);
    setAttrForm({ name: a.name, nameEn: "", slug: a.slug, displayType: a.displayType, sortOrder: a.sortOrder, isActive: a.isActive });
    setAttrModal("edit");
  }

  async function saveAttr() {
    setAttrSaving(true);
    const { nameEn, ...rest } = attrForm;
    const body = { ...rest, slug: attrForm.slug || slugify(attrForm.name) };
    const url    = attrModal === "create" ? "/next-api/admin/shop/variant-attributes" : `/next-api/admin/shop/variant-attributes/${attrEditId}`;
    const method = attrModal === "create" ? "POST" : "PATCH";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const saved = await res.json();
      const entityId = attrModal === "create" ? saved.id : attrEditId!;
      // Save EN translation for name
      const enItems = nameEn.trim()
        ? [{ entityType: "shop_variant_attribute", entityId, field: "name", lang: "en", value: nameEn.trim() }]
        : [];
      if (enItems.length) {
        await fetch("/next-api/translations/bulk", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: enItems }),
        });
      } else if (attrTranslations.enIds["name"]) {
        await fetch(`/next-api/translations/entry/${attrTranslations.enIds["name"]}`, { method: "DELETE" });
      }
      toast.success(attrModal === "create" ? "Attribute created" : "Attribute updated");
    } else {
      toast.error("Failed to save attribute");
    }
    setAttrSaving(false); setAttrModal(null); load();
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
    setValForm({ value: v.value, displayValue: v.displayValue ?? "", displayValueEn: "", swatchValue: v.swatchValue ?? "", swatchType: v.swatchType ?? "", sortOrder: v.sortOrder, isActive: v.isActive });
    setValAttrId(attributeId); setValModal("edit");
  }

  async function saveVal() {
    setValSaving(true);
    const { displayValueEn, ...rest } = valForm;
    const body = { ...rest, displayValue: valForm.displayValue || null, swatchValue: valForm.swatchValue || null, swatchType: valForm.swatchType || null };
    const url    = valModal === "create" ? `/next-api/admin/shop/variant-attributes/${valAttrId}/values` : `/next-api/admin/shop/variant-attributes/${valAttrId}/values/${valEditId}`;
    const method = valModal === "create" ? "POST" : "PATCH";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const saved = await res.json();
      const entityId = valModal === "create" ? saved.id : valEditId!;
      const enItems = displayValueEn.trim()
        ? [{ entityType: "shop_variation_option", entityId, field: "displayValue", lang: "en", value: displayValueEn.trim() }]
        : [];
      if (enItems.length) {
        await fetch("/next-api/translations/bulk", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: enItems }),
        });
      } else if (valTranslations.enIds["displayValue"]) {
        await fetch(`/next-api/translations/entry/${valTranslations.enIds["displayValue"]}`, { method: "DELETE" });
      }
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
                        {expanded === a.id ? "▾" : "▸"}
                      </button>
                    </td>
                    <td>
                      <div className={styles.attrName} onClick={() => setExpanded(e => e === a.id ? null : a.id)}>
                        {a.name}
                      </div>
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
                                        : <span className={styles.swatchNone}>—</span>
                                      }
                                    </td>
                                    <td><span className={styles.valValue}>{v.value}</span></td>
                                    <td><span className={styles.valDisplay}>{v.displayValue ?? v.value}</span></td>
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
              <button className={styles.modalClose} onClick={() => setAttrModal(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>🇫🇷 Name (FR) *</label>
                  <input
                    value={attrForm.name}
                    onChange={e => setAttrForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                    placeholder="e.g. Couleur, Taille"
                  />
                </div>
                <div className={styles.formField}>
                  <label>🇬🇧 Name (EN)</label>
                  <input
                    value={attrForm.nameEn}
                    onChange={e => setAttrForm(f => ({ ...f, nameEn: e.target.value }))}
                    placeholder="e.g. Color, Size"
                  />
                </div>
                <div className={styles.formField}>
                  <label>Slug *</label>
                  <input value={attrForm.slug} onChange={e => setAttrForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" />
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
              <button className={styles.modalClose} onClick={() => setValModal(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Value * <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0 }}>(machine key)</span></label>
                  <input value={valForm.value} onChange={e => setValForm(f => ({ ...f, value: e.target.value }))} placeholder="Black" />
                </div>
                <div className={styles.formField}>
                  <label>🇫🇷 Display label (FR) <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
                  <input value={valForm.displayValue} onChange={e => setValForm(f => ({ ...f, displayValue: e.target.value }))} placeholder="Noir" />
                </div>
                <div className={styles.formField}>
                  <label>🇬🇧 Display label (EN)</label>
                  <input value={valForm.displayValueEn} onChange={e => setValForm(f => ({ ...f, displayValueEn: e.target.value }))} placeholder="Black" />
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
                  ) : (
                    <input
                      value={valForm.swatchValue}
                      onChange={e => setValForm(f => ({ ...f, swatchValue: e.target.value }))}
                      placeholder={valForm.swatchType === "image" ? "swatches/black-texture.jpg" : "—"}
                      disabled={!valForm.swatchType}
                    />
                  )}
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
