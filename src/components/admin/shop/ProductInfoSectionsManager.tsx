"use client";

import { useState } from "react";
import { GripVertical, Trash2, Plus } from "lucide-react";
import BilingualField from "@/components/admin/BilingualField";
import styles from "./ProductInfoSectionsManager.module.css";

/** A structured, translatable spec block shown on the product page (Composition, Care, Target audience...). */
export interface ProductInfoSection {
  id: string;
  key: string;
  label: string;
  value: string;
  sortOrder: number;
}

const PRESET_KEYS: { key: string; label: string }[] = [
  { key: "composition",      label: "Composition" },
  { key: "care",              label: "Care instructions" },
  { key: "target_audience",   label: "Target audience" },
  { key: "dimensions",        label: "Dimensions" },
  { key: "material",          label: "Material" },
  { key: "usage",             label: "Usage" },
  { key: "additional_info",   label: "Additional information" },
  { key: "custom",            label: "Custom" },
];

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface Props {
  sections: ProductInfoSection[];
  onChange: (sections: ProductInfoSection[]) => void;
  enValues: Record<string, string>;
  setEn: (field: string, value: string) => void;
}

export default function ProductInfoSectionsManager({ sections, onChange, enValues, setEn }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function notify(next: ProductInfoSection[]) {
    onChange(next.map((s, i) => ({ ...s, sortOrder: i })));
  }

  function addSection() {
    notify([...sections, { id: genId(), key: "custom", label: "", value: "", sortOrder: sections.length }]);
  }

  function update(index: number, patch: Partial<ProductInfoSection>) {
    notify(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function remove(index: number) {
    notify(sections.filter((_, i) => i !== index));
  }

  function handlePresetChange(index: number, key: string) {
    const preset = PRESET_KEYS.find(p => p.key === key);
    const section = sections[index];
    const patch: Partial<ProductInfoSection> = { key };
    if (preset && key !== "custom" && !section.label.trim()) patch.label = preset.label;
    update(index, patch);
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); return; }
    const next = [...sections];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    notify(next);
  }

  return (
    <div>
      <p className={styles.label}>Specification sections</p>

      {sections.length === 0 && (
        <p className={styles.empty}>No sections yet. Add "Composition", "Care instructions", "Target audience"...</p>
      )}

      <div className={styles.list}>
        {sections.map((section, i) => (
          <div
            key={section.id}
            className={`${styles.card} ${dragIndex === i ? styles.cardDragging : ""}`}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(i)}
            onDragEnd={() => setDragIndex(null)}
          >
            <div className={styles.cardHead}>
              <span className={styles.dragHandle}><GripVertical size={16} /></span>
              <select
                className={styles.select}
                value={section.key}
                onChange={e => handlePresetChange(i, e.target.value)}
              >
                {PRESET_KEYS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
              <button type="button" className={styles.removeBtn} onClick={() => remove(i)} title="Remove">
                <Trash2 size={15} />
              </button>
            </div>

            <div className={styles.cardBody}>
              <BilingualField
                label="Section title"
                frValue={section.label}
                frOnChange={val => update(i, { label: val })}
                frPlaceholder="e.g. Composition"
                frRequired
                enValue={enValues[`infoSection:${section.id}:label`] ?? ""}
                enOnChange={val => setEn(`infoSection:${section.id}:label`, val)}
                enPlaceholder="e.g. Composition"
              />
              <BilingualField
                label="Content"
                frValue={section.value}
                frOnChange={val => update(i, { value: val })}
                frPlaceholder="e.g. 100% organic cotton"
                multiline
                rows={3}
                enValue={enValues[`infoSection:${section.id}:value`] ?? ""}
                enOnChange={val => setEn(`infoSection:${section.id}:value`, val)}
                enPlaceholder="e.g. 100% organic cotton"
              />
            </div>
          </div>
        ))}
      </div>

      <button type="button" className={styles.addBtn} onClick={addSection}>
        <Plus size={16} />
        <span>Add section</span>
      </button>

      <p className={styles.hint}>Drag to reorder · only non-empty sections are shown on the product page.</p>
    </div>
  );
}
