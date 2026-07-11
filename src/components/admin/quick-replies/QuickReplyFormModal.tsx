"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { X } from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";
import { categoryLabel, PLACEHOLDER_KEYS, type QuickReply } from "./types";
import styles from "./QuickReplyFormModal.module.css";

const BODY_MAX = 4000;
const NEW_CATEGORY = "__new__";
const GLOBAL_CAR = "";

interface CarOption {
  id: string;
  name: string;
  immatriculation?: string | null;
}

interface Props {
  reply?: QuickReply;
  /** Existing category slugs, used to populate the picker. */
  categories: string[];
  onClose: () => void;
  onSaved: (saved: QuickReply) => void;
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export default function QuickReplyFormModal({ reply, categories, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const isEdit = !!reply;

  const knownCategories = useMemo(() => {
    const set = new Set(["general", ...categories]);
    if (reply?.category) set.add(reply.category);
    return Array.from(set).sort();
  }, [categories, reply?.category]);

  const [title,       setTitle]       = useState(reply?.title ?? "");
  const [body,        setBody]        = useState(reply?.body ?? "");
  const [category,    setCategory]    = useState(reply?.category ?? "general");
  const [newCategory, setNewCategory] = useState("");
  const [carId,       setCarId]       = useState(reply?.carId ?? GLOBAL_CAR);
  const [cars,        setCars]        = useState<CarOption[]>([]);
  const [isActive,    setIsActive]    = useState(reply?.isActive ?? true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  // Fleet list for the car picker. On failure the picker just offers "All cars",
  // plus the currently linked car (if any) so editing never silently unlinks it.
  useEffect(() => {
    fetch("/next-api/cars", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : []))
      .then((data: CarOption[]) => setCars(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const carOptions = useMemo(() => {
    if (reply?.car && !cars.some(c => c.id === reply.car!.id)) {
      return [reply.car as CarOption, ...cars];
    }
    return cars;
  }, [cars, reply?.car]);

  const effectiveCategory = category === NEW_CATEGORY ? slugify(newCategory) : category;
  const valid =
    title.trim().length >= 2 &&
    body.trim().length >= 2 &&
    body.length <= BODY_MAX &&
    effectiveCategory.length > 0;

  const insertPlaceholder = (key: string) => {
    setBody(prev => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}{{${key}}}`);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      const url    = isEdit ? `/next-api/quick-replies/${reply!.id}` : "/next-api/quick-replies";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:    title.trim(),
          body:     body.trim(),
          category: effectiveCategory,
          isActive,
          carId:    carId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Request failed");
      }
      const saved: QuickReply = await res.json();
      toast.success(isEdit ? "Reply updated" : "Reply created");
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error && err.message !== "Request failed"
        ? err.message
        : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={isEdit ? "Edit reply" : "New reply"}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{isEdit ? "Edit reply" : "New reply"}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.formBody}>
          <div className={styles.fields}>

            <label className={styles.field}>
              <span className={styles.label}>Title</span>
              <input
                className={styles.input}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Check-in instructions"
                maxLength={150}
                autoFocus
                required
              />
            </label>

            <div className={styles.rowFields}>
              <label className={styles.field}>
                <span className={styles.label}>Category</span>
                <select
                  className={styles.input}
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {knownCategories.map(c => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                  <option value={NEW_CATEGORY}>+ New category…</option>
                </select>
              </label>

              {category === NEW_CATEGORY && (
                <label className={styles.field}>
                  <span className={styles.label}>New category name</span>
                  <input
                    className={styles.input}
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    placeholder="e.g. Check-in"
                    maxLength={64}
                    required
                  />
                </label>
              )}
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Show for</span>
              <select
                className={styles.input}
                value={carId}
                onChange={e => setCarId(e.target.value)}
              >
                <option value={GLOBAL_CAR}>All cars (global)</option>
                {carOptions.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.immatriculation ? ` — ${c.immatriculation}` : ""}
                  </option>
                ))}
              </select>
              <span className={styles.fieldHelp}>
                Global replies appear on every vehicle&apos;s Messages tab; car-linked replies only on that car&apos;s.
              </span>
            </label>

            <label className={styles.field}>
              <div className={styles.labelRow}>
                <span className={styles.label}>Message</span>
                <span className={`${styles.charCount} ${body.length > BODY_MAX ? styles.charCountOver : ""}`}>
                  {body.length}/{BODY_MAX}
                </span>
              </div>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Hello! Your vehicle {{car_name}} ({{plate}}) is ready for pickup…"
                rows={8}
                required
              />
            </label>

            <div className={styles.placeholderHint}>
              <span className={styles.placeholderHintText}>
                Placeholders are filled automatically when copied from a vehicle page:
              </span>
              <div className={styles.placeholderChips}>
                {PLACEHOLDER_KEYS.map(key => (
                  <button
                    key={key}
                    type="button"
                    className={styles.placeholderChip}
                    onClick={() => insertPlaceholder(key)}
                    title={`Insert {{${key}}}`}
                  >
                    {`{{${key}}}`}
                  </button>
                ))}
              </div>
            </div>

            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
              />
              <span>
                <span className={styles.toggleTitle}>Active</span>
                <span className={styles.toggleHelp}>Only active replies appear in the vehicle Replies tab</span>
              </span>
            </label>

            {error && <p className={styles.error}>{error}</p>}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={saving || !valid}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create reply"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
