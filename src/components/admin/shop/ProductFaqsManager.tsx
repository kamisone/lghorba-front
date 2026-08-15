"use client";

import { useState } from "react";
import { GripVertical, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import BilingualField from "@/components/admin/BilingualField";
import SectionGenerateButton from "@/components/admin/SectionGenerateButton";
import { useSectionGenerate } from "@/hooks/useSectionGenerate";
import { AI_TARGET_LANGS, summarizeGenerateErrors, type SectionTranslationOutcome } from "@/lib/sectionTranslate";
import type { OverlayLang } from "@/hooks/useEntityTranslations";
import styles from "./ProductFaqsManager.module.css";

/** A product-specific FAQ entry shown near the bottom of the PDP and in FAQPage JSON-LD. */
export interface ProductFaq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
}

function genId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface Props {
  faqs: ProductFaq[];
  onChange: (faqs: ProductFaq[]) => void;
  translations: Record<OverlayLang, Record<string, string>>;
  setTranslation: (lang: OverlayLang, field: string, value: string) => void;
}

export default function ProductFaqsManager({ faqs, onChange, translations, setTranslation }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [itemError, setItemError] = useState<{ id: string; message: string } | null>(null);
  const generator = useSectionGenerate<SectionTranslationOutcome<{ question: string; answer: string }>>(
    "/next-api/shop/products/sections/faqs/translate",
  );

  function notify(next: ProductFaq[]) {
    onChange(next.map((f, i) => ({ ...f, sortOrder: i })));
  }

  async function generateItem(index: number) {
    const faq = faqs[index];
    const enQuestion = translations.en?.[`faq:${faq.id}:question`]?.trim();
    const enAnswer = translations.en?.[`faq:${faq.id}:answer`]?.trim();
    if (!enQuestion || !enAnswer) {
      setItemError({ id: faq.id, message: "Write the English question and answer first." });
      return;
    }
    setItemError(null);
    setGeneratingIds(prev => new Set(prev).add(faq.id));
    try {
      const outcome = await generator.generate({ question: enQuestion, answer: enAnswer });
      if (!outcome) {
        setItemError({ id: faq.id, message: "Generation failed — try again." });
        return;
      }
      // A failed language comes back as an empty string (see TranslationService) —
      // never let that blank out content the admin already wrote.
      if (outcome.result.fr.question || outcome.result.fr.answer) {
        update(index, { question: outcome.result.fr.question || faq.question, answer: outcome.result.fr.answer || faq.answer });
      }
      AI_TARGET_LANGS.forEach(lang => {
        if (outcome.result[lang].question) setTranslation(lang, `faq:${faq.id}:question`, outcome.result[lang].question);
        if (outcome.result[lang].answer) setTranslation(lang, `faq:${faq.id}:answer`, outcome.result[lang].answer);
      });
      const errorSummary = summarizeGenerateErrors(outcome.errors);
      if (errorSummary) setItemError({ id: faq.id, message: errorSummary });
    } finally {
      setGeneratingIds(prev => { const next = new Set(prev); next.delete(faq.id); return next; });
    }
  }

  function addFaq() {
    notify([...faqs, { id: genId(), question: "", answer: "", sortOrder: faqs.length, isActive: true }]);
  }

  function update(index: number, patch: Partial<ProductFaq>) {
    notify(faqs.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function remove(index: number) {
    notify(faqs.filter((_, i) => i !== index));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); return; }
    const next = [...faqs];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    notify(next);
  }

  return (
    <div>
      {faqs.length === 0 && (
        <p className={styles.empty}>No FAQs yet. Add common questions about this product.</p>
      )}

      <div className={styles.list}>
        {faqs.map((faq, i) => (
          <div
            key={faq.id}
            className={`${styles.card} ${dragIndex === i ? styles.cardDragging : ""} ${!faq.isActive ? styles.cardInactive : ""}`}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(i)}
            onDragEnd={() => setDragIndex(null)}
          >
            <div className={styles.cardHead}>
              <span className={styles.dragHandle}><GripVertical size={16} /></span>
              <span className={styles.cardTitle}>FAQ {i + 1}</span>
              <SectionGenerateButton
                onClick={() => generateItem(i)}
                generating={generatingIds.has(faq.id)}
                title="Write the English question/answer first, then generate the other languages"
              />
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => update(i, { isActive: !faq.isActive })}
                title={faq.isActive ? "Active — visible on product page" : "Inactive — hidden from product page"}
              >
                {faq.isActive ? <Eye size={15} /> : <EyeOff size={15} />}
                {faq.isActive ? "Active" : "Inactive"}
              </button>
              <button type="button" className={styles.removeBtn} onClick={() => remove(i)} title="Remove">
                <Trash2 size={15} />
              </button>
            </div>

            {itemError?.id === faq.id && (
              <p className={styles.itemError}>{itemError.message}</p>
            )}

            <div className={styles.cardBody}>
              <BilingualField
                label="Question"
                field={`faq:${faq.id}:question`}
                frValue={faq.question}
                frOnChange={val => update(i, { question: val })}
                frPlaceholder="e.g. How long does delivery take?"
                frRequired
                translations={translations}
                onTranslationChange={setTranslation}
                overlayPlaceholder="e.g. How long does delivery take?"
              />
              <BilingualField
                label="Answer"
                field={`faq:${faq.id}:answer`}
                frValue={faq.answer}
                frOnChange={val => update(i, { answer: val })}
                frPlaceholder="e.g. Orders ship within 2-3 business days."
                multiline
                rows={3}
                translations={translations}
                onTranslationChange={setTranslation}
                overlayPlaceholder="e.g. Orders ship within 2-3 business days."
              />
            </div>
          </div>
        ))}
      </div>

      <button type="button" className={styles.addBtn} onClick={addFaq}>
        <Plus size={16} />
        <span>Add FAQ</span>
      </button>

      <p className={styles.hint}>Drag to reorder · only active FAQs with both a question and an answer are shown on the product page.</p>
    </div>
  );
}
