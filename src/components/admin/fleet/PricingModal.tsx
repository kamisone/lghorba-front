"use client";

import { useEffect, useRef, useState } from "react";
import { X, ArrowRight, AlertTriangle } from "lucide-react";
import styles from "./PricingModal.module.css";

export interface CarPricing {
  id: string;
  carId: string;
  startDate: string;
  endDate: string;
  pricePerDay: number;
  label: string | null;
}

interface Overlap {
  id: string;
  startDate: string;
  endDate: string;
  pricePerDay: number;
  label: string | null;
}

interface Props {
  mode: "create" | "edit";
  carName: string;
  carId: string;
  startDate: string;
  endDate: string;
  pricing?: CarPricing;
  overlaps: Overlap[];
  onSave: (data: { startDate: string; endDate: string; pricePerDay: number; label: string | null }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

function daysBetween(a: string, b: string) {
  const ms = new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

function fmt(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

export default function PricingModal({
  mode, carName, carId: _carId, startDate: initStart, endDate: initEnd,
  pricing, overlaps, onSave, onDelete, onClose,
}: Props) {
  const [startDate, setStartDate] = useState(initStart);
  const [endDate, setEndDate]     = useState(initEnd);
  const [price, setPrice]         = useState(
    pricing ? String(Number(pricing.pricePerDay).toFixed(2)) : "",
  );
  const [label, setLabel]         = useState(pricing?.label ?? "");
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState("");

  const priceRef = useRef<HTMLInputElement>(null);
  useEffect(() => { priceRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const dateError = startDate > endDate;
  const days = dateError ? 0 : daysBetween(startDate, endDate);

  const handleSave = async () => {
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) { setError("Price must be a positive number."); return; }
    if (dateError) { setError("End date must be ≥ start date."); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({ startDate, endDate, pricePerDay: p, label: label.trim() || null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    setError("");
    try { await onDelete(); }
    catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); setDeleting(false); }
  };

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              {mode === "create" ? "New pricing rule" : "Edit pricing rule"}
            </h2>
            <p className={styles.sub}>{carName}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={16} strokeWidth={1.75} /></button>
        </div>

        {/* Date row */}
        <div className={styles.dateRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>From</span>
            <input type="date" className={styles.input} value={startDate}
              onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <span className={styles.dateSep}><ArrowRight size={14} strokeWidth={1.75} /></span>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>To (inclusive)</span>
            <input type="date" className={styles.input} value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)} />
          </label>
          {!dateError && days > 0 && (
            <span className={styles.dayCount}>{days} day{days !== 1 ? "s" : ""}</span>
          )}
        </div>

        {/* Price + label */}
        <div className={styles.fieldsRow}>
          <label className={`${styles.field} ${styles.fieldPrice}`}>
            <span className={styles.fieldLabel}>Price / day (€)</span>
            <input
              ref={priceRef}
              type="number"
              min="0.01"
              step="0.01"
              className={styles.input}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className={`${styles.field} ${styles.fieldLabel_}`}>
            <span className={styles.fieldLabel}>Label <span className={styles.optional}>(optional)</span></span>
            <input
              type="text"
              className={styles.input}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Weekend rate, Summer promo…"
              maxLength={100}
            />
          </label>
        </div>

        {/* Total preview */}
        {!dateError && days > 0 && price && !isNaN(parseFloat(price)) && (
          <p className={styles.preview}>
            Total: <strong>€{(parseFloat(price) * days).toFixed(2)}</strong>
            <span className={styles.previewMeta}> ({days} day{days !== 1 ? "s" : ""} × €{parseFloat(price).toFixed(2)})</span>
          </p>
        )}

        {/* Overlap warning */}
        {overlaps.length > 0 && (
          <div className={styles.overlapWarn}>
            <span className={styles.warnIcon}><AlertTriangle size={14} strokeWidth={1.75} /></span>
            <span>
              Overlaps with {overlaps.length} existing rule{overlaps.length > 1 ? "s" : ""}{": "}
              {overlaps.map((o, i) => (
                <span key={o.id}>
                  {i > 0 ? ", " : ""}
                  <em>{fmt(o.startDate)}–{fmt(o.endDate)} (€{Number(o.pricePerDay).toFixed(2)}{o.label ? ` · ${o.label}` : ""})</em>
                </span>
              ))}
              . They will coexist.
            </span>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        {/* Actions */}
        <div className={styles.actions}>
          {mode === "edit" && onDelete && (
            <button className={styles.deleteBtn} onClick={handleDelete} disabled={deleting || saving}>
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving || deleting}>
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || deleting || dateError || !price}
          >
            {saving ? "Saving…" : mode === "create" ? "Create rule" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
