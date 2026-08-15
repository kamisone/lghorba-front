"use client";

import { useState } from "react";
import { GripVertical, Trash2, Plus } from "lucide-react";
import BilingualField from "@/components/admin/BilingualField";
import SectionGenerateButton from "@/components/admin/SectionGenerateButton";
import { useSectionGenerate } from "@/hooks/useSectionGenerate";
import { AI_TARGET_LANGS, summarizeGenerateErrors, type SectionTranslationOutcome } from "@/lib/sectionTranslate";
import type { OverlayLang } from "@/hooks/useEntityTranslations";
import styles from "./ProductInfoSectionsManager.module.css";

/** A structured, translatable spec block shown on the product page (Composition, Care, Target audience...). */
export interface ProductInfoSection {
  id: string;
  key: string;
  label: string;
  value: string;
  sortOrder: number;
}

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface Props {
  sections: ProductInfoSection[];
  onChange: (sections: ProductInfoSection[]) => void;
  translations: Record<OverlayLang, Record<string, string>>;
  setTranslation: (lang: OverlayLang, field: string, value: string) => void;
}

export default function ProductInfoSectionsManager({ sections, onChange, translations, setTranslation }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [itemError, setItemError] = useState<{ id: string; message: string } | null>(null);
  const generator = useSectionGenerate<SectionTranslationOutcome<{ label: string; value: string }>>(
    "/next-api/shop/products/sections/info-sections/translate",
  );

  function notify(next: ProductInfoSection[]) {
    onChange(next.map((s, i) => ({ ...s, sortOrder: i })));
  }

  async function generateItem(index: number) {
    const section = sections[index];
    const enLabel = translations.en?.[`infoSection:${section.id}:label`]?.trim();
    const enValue = translations.en?.[`infoSection:${section.id}:value`]?.trim();
    if (!enLabel || !enValue) {
      setItemError({ id: section.id, message: "Write the English title and content first." });
      return;
    }
    setItemError(null);
    setGeneratingIds(prev => new Set(prev).add(section.id));
    try {
      const outcome = await generator.generate({ label: enLabel, value: enValue });
      if (!outcome) {
        setItemError({ id: section.id, message: "Generation failed — try again." });
        return;
      }
      // A failed language comes back as an empty string (see TranslationService) —
      // never let that blank out content the admin already wrote.
      if (outcome.result.fr.label || outcome.result.fr.value) {
        update(index, { label: outcome.result.fr.label || section.label, value: outcome.result.fr.value || section.value });
      }
      AI_TARGET_LANGS.forEach(lang => {
        if (outcome.result[lang].label) setTranslation(lang, `infoSection:${section.id}:label`, outcome.result[lang].label);
        if (outcome.result[lang].value) setTranslation(lang, `infoSection:${section.id}:value`, outcome.result[lang].value);
      });
      const errorSummary = summarizeGenerateErrors(outcome.errors);
      if (errorSummary) setItemError({ id: section.id, message: errorSummary });
    } finally {
      setGeneratingIds(prev => { const next = new Set(prev); next.delete(section.id); return next; });
    }
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
              <span className={styles.cardHeadLabel}>Specification</span>
              <SectionGenerateButton
                onClick={() => generateItem(i)}
                generating={generatingIds.has(section.id)}
                title="Write the English title/content first, then generate the other languages"
              />
              <button type="button" className={styles.removeBtn} onClick={() => remove(i)} title="Remove">
                <Trash2 size={15} />
              </button>
            </div>

            {itemError?.id === section.id && (
              <p className={styles.itemError}>{itemError.message}</p>
            )}

            <div className={styles.cardBody}>
              <BilingualField
                label="Section title"
                field={`infoSection:${section.id}:label`}
                frValue={section.label}
                frOnChange={val => update(i, { label: val })}
                frPlaceholder="e.g. Composition"
                frRequired
                translations={translations}
                onTranslationChange={setTranslation}
                overlayPlaceholder="e.g. Composition"
              />
              <BilingualField
                label="Content"
                field={`infoSection:${section.id}:value`}
                frValue={section.value}
                frOnChange={val => update(i, { value: val })}
                frPlaceholder="e.g. 100% organic cotton"
                multiline
                rows={3}
                translations={translations}
                onTranslationChange={setTranslation}
                overlayPlaceholder="e.g. 100% organic cotton"
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
