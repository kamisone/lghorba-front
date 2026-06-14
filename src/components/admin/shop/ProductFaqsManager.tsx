"use client";

import { useState } from "react";
import { GripVertical, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import BilingualField from "@/components/admin/BilingualField";
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
  enValues: Record<string, string>;
  setEn: (field: string, value: string) => void;
}

export default function ProductFaqsManager({ faqs, onChange, enValues, setEn }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function notify(next: ProductFaq[]) {
    onChange(next.map((f, i) => ({ ...f, sortOrder: i })));
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

            <div className={styles.cardBody}>
              <BilingualField
                label="Question"
                frValue={faq.question}
                frOnChange={val => update(i, { question: val })}
                frPlaceholder="e.g. How long does delivery take?"
                frRequired
                enValue={enValues[`faq:${faq.id}:question`] ?? ""}
                enOnChange={val => setEn(`faq:${faq.id}:question`, val)}
                enPlaceholder="e.g. How long does delivery take?"
              />
              <BilingualField
                label="Answer"
                frValue={faq.answer}
                frOnChange={val => update(i, { answer: val })}
                frPlaceholder="e.g. Orders ship within 2-3 business days."
                multiline
                rows={3}
                enValue={enValues[`faq:${faq.id}:answer`] ?? ""}
                enOnChange={val => setEn(`faq:${faq.id}:answer`, val)}
                enPlaceholder="e.g. Orders ship within 2-3 business days."
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
