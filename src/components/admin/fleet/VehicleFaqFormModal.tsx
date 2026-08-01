"use client";

import { useState, FormEvent } from "react";
import BilingualField from "./BilingualField";
import { useEntityTranslations } from "@/hooks/useEntityTranslations";
import styles from "./VehicleFaqFormModal.module.css";
import { X } from "lucide-react";

export interface VehicleFaq {
  id: string;
  question: string;
  answer: string;
  position: number;
  isVisible: boolean;
}

interface Props {
  carId: string;
  faq?: VehicleFaq;
  onClose: () => void;
  onSaved: () => void;
}

const TRANSLATABLE_FIELDS = ["question", "answer"] as const;

export default function VehicleFaqFormModal({ carId, faq, onClose, onSaved }: Props) {
  const isEdit = !!faq;

  const [frQuestion, setFrQuestion] = useState(faq?.question ?? "");
  const [frAnswer,   setFrAnswer]   = useState(faq?.answer   ?? "");
  const { translations, setTranslation, saveTranslations } = useEntityTranslations("vehicle_faq", faq?.id ?? null);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!frQuestion.trim() || !frAnswer.trim()) return;
    setSaving(true);
    setError("");
    try {
      const body = { entityType: "car", entityId: carId, question: frQuestion, answer: frAnswer };
      const url    = isEdit ? `/next-api/vehicle-faqs/${faq!.id}` : "/next-api/vehicle-faqs";
      const method = isEdit ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const saved: VehicleFaq = await res.json();

      await saveTranslations(saved.id, [...TRANSLATABLE_FIELDS]);

      onSaved();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{isEdit ? "Edit FAQ" : "Add FAQ"}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={14} strokeWidth={2} /></button>
        </div>

        <form onSubmit={handleSubmit} className={styles.formBody}>
          <div className={styles.fields}>
            <BilingualField
              label="Question"
              field="question"
              frValue={frQuestion}
              frOnChange={setFrQuestion}
              frPlaceholder="ex. Comment récupérer le véhicule ?"
              translations={translations}
              onTranslationChange={setTranslation}
              overlayPlaceholder="e.g. How do I pick up the vehicle?"
              frRequired
            />
            <BilingualField
              label="Answer"
              field="answer"
              frValue={frAnswer}
              frOnChange={setFrAnswer}
              frPlaceholder="ex. Le véhicule est disponible à l'adresse indiquée…"
              translations={translations}
              onTranslationChange={setTranslation}
              overlayPlaceholder="e.g. The vehicle is available at the address listed…"
              multiline
              rows={4}
              frRequired
            />

            {error && <p className={styles.error}>{error}</p>}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={saving || !frQuestion.trim() || !frAnswer.trim()}
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add FAQ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
