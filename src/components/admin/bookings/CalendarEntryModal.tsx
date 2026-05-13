"use client";

import { useEffect, useRef, useState } from "react";
import type { CarPricing } from "../fleet/PricingModal";
import styles from "./CalendarEntryModal.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AvailabilityBlock {
  id: string;
  carId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  notes: string | null;
}

export type CalendarEntryMode =
  | { mode: "create";       carId: string; startDate: string; endDate: string }
  | { mode: "edit-pricing"; carId: string; pricing: CarPricing }
  | { mode: "edit-avail";   carId: string; block: AvailabilityBlock };

interface Overlap {
  id: string;
  startDate: string;
  endDate: string;
  pricePerDay: number;
  label: string | null;
}

interface Props {
  entry: CalendarEntryMode;
  carName: string;
  overlaps?: Overlap[];
  onSavePricing: (data: { startDate: string; endDate: string; pricePerDay: number; label: string | null }) => Promise<void>;
  onDeletePricing?: () => Promise<void>;
  onSaveAvail: (data: { startDate: string; endDate: string; reason: string | null; notes: string | null }) => Promise<void>;
  onDeleteAvail?: () => Promise<void>;
  onClose: () => void;
}

const AVAIL_REASONS = [
  "Maintenance",
  "Repair",
  "Cleaning",
  "Operational block",
  "Manual unavailability",
] as const;

function daysBetween(a: string, b: string) {
  const ms = new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

function fmt(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

// ── Pricing form ───────────────────────────────────────────────────────────────

function PricingForm({
  initStart, initEnd, pricing, overlaps,
  onSave, onDelete, onClose,
}: {
  initStart: string; initEnd: string;
  pricing?: CarPricing; overlaps: Overlap[];
  onSave: Props["onSavePricing"]; onDelete?: Props["onDeletePricing"]; onClose: () => void;
}) {
  const [startDate, setStartDate] = useState(initStart);
  const [endDate,   setEndDate]   = useState(initEnd);
  const [price,     setPrice]     = useState(pricing ? String(Number(pricing.pricePerDay).toFixed(2)) : "");
  const [label,     setLabel]     = useState(pricing?.label ?? "");
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [error,     setError]     = useState("");
  const priceRef = useRef<HTMLInputElement>(null);
  useEffect(() => { priceRef.current?.focus(); }, []);

  const dateError = startDate > endDate;
  const days = dateError ? 0 : daysBetween(startDate, endDate);

  const handleSave = async () => {
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) { setError("Price must be a positive number."); return; }
    if (dateError) { setError("End date must be ≥ start date."); return; }
    setSaving(true); setError("");
    try { await onSave({ startDate, endDate, pricePerDay: p, label: label.trim() || null }); }
    catch (e) { setError(e instanceof Error ? e.message : "Save failed."); setSaving(false); }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true); setError("");
    try { await onDelete(); }
    catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); setDeleting(false); }
  };

  return (
    <div className={styles.tabBody}>
      <div className={styles.dateRow}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>From</span>
          <input type="date" className={styles.input} value={startDate} onChange={e => setStartDate(e.target.value)} />
        </label>
        <span className={styles.dateSep}>→</span>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>To (inclusive)</span>
          <input type="date" className={styles.input} value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
        </label>
        {!dateError && days > 0 && <span className={styles.dayCount}>{days} day{days !== 1 ? "s" : ""}</span>}
      </div>

      <div className={styles.fieldsRow}>
        <label className={`${styles.field} ${styles.fieldPrice}`}>
          <span className={styles.fieldLabel}>Price / day (€)</span>
          <input ref={priceRef} type="number" min="0.01" step="0.01" className={styles.input}
            value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
        </label>
        <label className={`${styles.field} ${styles.fieldFlex}`}>
          <span className={styles.fieldLabel}>Label <span className={styles.optional}>(optional)</span></span>
          <input type="text" className={styles.input} value={label}
            onChange={e => setLabel(e.target.value)} placeholder="e.g. Summer promo…" maxLength={100} />
        </label>
      </div>

      {!dateError && days > 0 && price && !isNaN(parseFloat(price)) && (
        <p className={styles.preview}>
          Total: <strong>€{(parseFloat(price) * days).toFixed(2)}</strong>
          <span className={styles.previewMeta}> ({days} day{days !== 1 ? "s" : ""} × €{parseFloat(price).toFixed(2)})</span>
        </p>
      )}

      {overlaps.length > 0 && (
        <div className={styles.overlapWarn}>
          <span className={styles.warnIcon}>⚠</span>
          <span>Overlaps with {overlaps.length} existing rule{overlaps.length > 1 ? "s" : ""}. They will coexist.</span>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        {onDelete && (
          <button className={styles.deleteBtn} onClick={handleDelete} disabled={deleting || saving}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
        <button className={styles.cancelBtn} onClick={onClose} disabled={saving || deleting}>Cancel</button>
        <button className={styles.saveBtn} onClick={handleSave}
          disabled={saving || deleting || dateError || !price}>
          {saving ? "Saving…" : pricing ? "Save changes" : "Create rule"}
        </button>
      </div>
    </div>
  );
}

// ── Availability form ─────────────────────────────────────────────────────────

function AvailForm({
  initStart, initEnd, block, onSave, onDelete, onClose,
}: {
  initStart: string; initEnd: string; block?: AvailabilityBlock;
  onSave: Props["onSaveAvail"]; onDelete?: Props["onDeleteAvail"]; onClose: () => void;
}) {
  const [startDate, setStartDate] = useState(initStart);
  const [endDate,   setEndDate]   = useState(initEnd);
  const [reason,    setReason]    = useState(block?.reason ?? "");
  const [notes,     setNotes]     = useState(block?.notes ?? "");
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [error,     setError]     = useState("");

  const dateError = startDate > endDate;
  const days = dateError ? 0 : daysBetween(startDate, endDate);

  const handleSave = async () => {
    if (dateError) { setError("End date must be ≥ start date."); return; }
    setSaving(true); setError("");
    try { await onSave({ startDate, endDate, reason: reason.trim() || null, notes: notes.trim() || null }); }
    catch (e) { setError(e instanceof Error ? e.message : "Save failed."); setSaving(false); }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true); setError("");
    try { await onDelete(); }
    catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); setDeleting(false); }
  };

  return (
    <div className={styles.tabBody}>
      <div className={styles.availBanner}>
        <span className={styles.availIcon}>🚫</span>
        <span>This will block the vehicle from being booked during the selected period.</span>
      </div>

      <div className={styles.dateRow}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>From</span>
          <input type="date" className={styles.input} value={startDate} onChange={e => setStartDate(e.target.value)} />
        </label>
        <span className={styles.dateSep}>→</span>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>To (inclusive)</span>
          <input type="date" className={styles.input} value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
        </label>
        {!dateError && days > 0 && <span className={styles.dayCount}>{days} day{days !== 1 ? "s" : ""}</span>}
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Reason <span className={styles.optional}>(optional)</span></span>
        <select className={styles.input} value={reason} onChange={e => setReason(e.target.value)}>
          <option value="">— Select a reason —</option>
          {AVAIL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Internal notes <span className={styles.optional}>(optional)</span></span>
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any additional context for the team…"
          rows={3}
          maxLength={2000}
        />
      </label>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        {onDelete && (
          <button className={styles.deleteBtn} onClick={handleDelete} disabled={deleting || saving}>
            {deleting ? "Deleting…" : "Delete block"}
          </button>
        )}
        <button className={styles.cancelBtn} onClick={onClose} disabled={saving || deleting}>Cancel</button>
        <button className={styles.saveBtnRed} onClick={handleSave}
          disabled={saving || deleting || dateError}>
          {saving ? "Saving…" : block ? "Save changes" : "Block vehicle"}
        </button>
      </div>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export default function CalendarEntryModal({
  entry, carName, overlaps = [], onSavePricing, onDeletePricing, onSaveAvail, onDeleteAvail, onClose,
}: Props) {
  const isCreate      = entry.mode === "create";
  const isEditPricing = entry.mode === "edit-pricing";
  const isEditAvail   = entry.mode === "edit-avail";

  const [tab, setTab] = useState<"pricing" | "avail">(isEditAvail ? "avail" : "pricing");

  const initStart = isCreate     ? entry.startDate
    : isEditPricing              ? entry.pricing.startDate
    : entry.block.startDate;
  const initEnd   = isCreate     ? entry.endDate
    : isEditPricing              ? entry.pricing.endDate
    : entry.block.endDate;

  const title = isCreate       ? "New calendar entry"
    : isEditPricing            ? "Edit pricing rule"
    : "Edit availability block";

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.sub}>{carName}</p>
            {isCreate && <p className={styles.subDates}>{fmt(initStart)} → {fmt(initEnd)}</p>}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tabs (only in create mode) */}
        {isCreate && (
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === "pricing" ? styles.tabActive : ""}`}
              onClick={() => setTab("pricing")}
            >
              💰 Pricing rule
            </button>
            <button
              className={`${styles.tab} ${tab === "avail" ? styles.tabActive : ""}`}
              onClick={() => setTab("avail")}
            >
              🚫 Availability block
            </button>
          </div>
        )}

        {/* Content */}
        {(tab === "pricing" || isEditPricing) && (
          <PricingForm
            initStart={initStart}
            initEnd={initEnd}
            pricing={isEditPricing ? entry.pricing : undefined}
            overlaps={overlaps}
            onSave={onSavePricing}
            onDelete={isEditPricing ? onDeletePricing : undefined}
            onClose={onClose}
          />
        )}
        {(tab === "avail" || isEditAvail) && (
          <AvailForm
            initStart={initStart}
            initEnd={initEnd}
            block={isEditAvail ? entry.block : undefined}
            onSave={onSaveAvail}
            onDelete={isEditAvail ? onDeleteAvail : undefined}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
