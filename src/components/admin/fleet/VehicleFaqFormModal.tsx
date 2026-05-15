"use client";

import { useState, useEffect, FormEvent } from "react";
import BilingualField from "./BilingualField";
import styles from "./VehicleFaqFormModal.module.css";

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
type TField = typeof TRANSLATABLE_FIELDS[number];

export default function VehicleFaqFormModal({ carId, faq, onClose, onSaved }: Props) {
  const isEdit = !!faq;

  const [frQuestion, setFrQuestion] = useState(faq?.question ?? "");
  const [frAnswer,   setFrAnswer]   = useState(faq?.answer   ?? "");
  const [enQuestion, setEnQuestion] = useState("");
  const [enAnswer,   setEnAnswer]   = useState("");
  const [enIds,      setEnIds]      = useState<Partial<Record<TField, string>>>({});
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  useEffect(() => {
    if (!faq?.id) return;
    fetch(`/next-api/translations/vehicle_faq/${faq.id}?lang=en`)
      .then(r => r.ok ? r.json() : [])
      .then((rows: { id: string; field: string; value: string }[]) => {
        const ids: Partial<Record<TField, string>> = {};
        for (const row of rows) {
          if (row.field === "question") { setEnQuestion(row.value); ids.question = row.id; }
          if (row.field === "answer")   { setEnAnswer(row.value);   ids.answer   = row.id; }
        }
        setEnIds(ids);
      })
      .catch(() => {});
  }, [faq?.id]);

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

      const toUpsert: { entityType: string; entityId: string; field: string; value: string; lang: string }[] = [];
      const toDelete: string[] = [];
      const enValues: Record<TField, string> = { question: enQuestion.trim(), answer: enAnswer.trim() };
      for (const field of TRANSLATABLE_FIELDS) {
        if (enValues[field]) {
          toUpsert.push({ entityType: "vehicle_faq", entityId: saved.id, field, value: enValues[field], lang: "en" });
        } else if (enIds[field]) {
          toDelete.push(enIds[field]!);
        }
      }
      await Promise.all([
        toUpsert.length
          ? fetch("/next-api/translations/bulk", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: toUpsert }),
            })
          : null,
        ...toDelete.map(id => fetch(`/next-api/translations/entry/${id}`, { method: "DELETE" })),
      ].filter(Boolean));

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
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.formBody}>
          <div className={styles.fields}>
            <BilingualField
              label="Question"
              frValue={frQuestion}
              frOnChange={setFrQuestion}
              frPlaceholder="ex. Comment récupérer le véhicule ?"
              enValue={enQuestion}
              enOnChange={setEnQuestion}
              enPlaceholder="e.g. How do I pick up the vehicle?"
              frRequired
            />
            <BilingualField
              label="Answer"
              frValue={frAnswer}
              frOnChange={setFrAnswer}
              frPlaceholder="ex. Le véhicule est disponible à l'adresse indiquée…"
              enValue={enAnswer}
              enOnChange={setEnAnswer}
              enPlaceholder="e.g. The vehicle is available at the address listed…"
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
