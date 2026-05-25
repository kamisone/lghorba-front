"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./ProductVariantSelector.module.css";

export interface AvailabilityAttribute {
  id: string;
  name: string;
  slug: string;
  displayType: "swatch" | "button" | "dropdown";
  sortOrder: number;
  defaultOptionValueId: string | null;
  optionValues: Array<{
    id: string;
    value: string;
    displayValue: string | null;
    swatchValue: string | null;
    swatchType: "color" | "image" | null;
    sortOrder: number;
  }>;
}

export interface AvailabilityVariant {
  id: string;
  sku: string | null;
  title: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  variantSlug: string | null;
  featuredMediaUrl: string | null;
  optionValueIds: string[];
  available: boolean;
  inStock: boolean;
}

export interface AvailabilityMatrix {
  attributes: AvailabilityAttribute[];
  variants: AvailabilityVariant[];
}

interface Props {
  matrix: AvailabilityMatrix;
  initialVariantSlug?: string | null;
  onVariantChange?: (variant: AvailabilityVariant | null) => void;
}

type OptionState = "selected" | "available" | "oos" | "unavailable";

export default function ProductVariantSelector({ matrix, initialVariantSlug, onVariantChange }: Props) {
  const ovToAttr = useMemo(() => {
    const map = new Map<string, string>();
    for (const attr of matrix.attributes) {
      for (const ov of attr.optionValues) map.set(ov.id, attr.id);
    }
    return map;
  }, [matrix]);

  const initialSel = useMemo((): Record<string, string> => {
    if (initialVariantSlug) {
      const candidate = matrix.variants.find(v => v.variantSlug === initialVariantSlug);
      if (!candidate) return {};
      const sel: Record<string, string> = {};
      for (const ovId of candidate.optionValueIds) {
        const attrId = ovToAttr.get(ovId);
        if (attrId) sel[attrId] = ovId;
      }
      return sel;
    }

    // Build per-attribute defaults from admin-configured defaultOptionValueId,
    // falling back to the first option value for attributes without a default.
    const defaultSel: Record<string, string> = {};
    for (const attr of matrix.attributes) {
      const preferred = attr.defaultOptionValueId ?? attr.optionValues[0]?.id;
      if (preferred) defaultSel[attr.id] = preferred;
    }

    // Verify a variant exists for this combination; if not, fall back to first available variant.
    if (Object.keys(defaultSel).length === matrix.attributes.length) {
      const defaultValues = Object.values(defaultSel);
      const hasMatch = matrix.variants.some(v =>
        defaultValues.every(ovId => v.optionValueIds.includes(ovId))
      );
      if (hasMatch) return defaultSel;
    }

    const fallback = matrix.variants.find(v => v.available && v.inStock) ?? matrix.variants[0];
    if (!fallback) return {};
    const sel: Record<string, string> = {};
    for (const ovId of fallback.optionValueIds) {
      const attrId = ovToAttr.get(ovId);
      if (attrId) sel[attrId] = ovId;
    }
    return sel;
  }, [initialVariantSlug, matrix, ovToAttr]);

  const [sel, setSel] = useState<Record<string, string>>(initialSel);

  const currentVariant = useMemo((): AvailabilityVariant | null => {
    const selValues = Object.values(sel);
    if (selValues.length !== matrix.attributes.length) return null;
    return matrix.variants.find(v =>
      selValues.every(sId => v.optionValueIds.includes(sId))
    ) ?? null;
  }, [sel, matrix]);

  useEffect(() => {
    onVariantChange?.(currentVariant);
  }, [currentVariant, onVariantChange]);

  function optionState(attrId: string, ovId: string): OptionState {
    if (sel[attrId] === ovId) return "selected";
    const hypothetical = { ...sel, [attrId]: ovId };
    const hvValues = Object.values(hypothetical);
    const matches = matrix.variants.filter(v =>
      hvValues.every(sId => v.optionValueIds.includes(sId))
    );
    if (matches.length === 0) return "unavailable";
    if (matches.some(v => v.available && v.inStock)) return "available";
    return "oos";
  }

  function pick(attrId: string, ovId: string) {
    if (optionState(attrId, ovId) === "unavailable") return;
    setSel(prev => ({ ...prev, [attrId]: ovId }));
  }

  if (!matrix.attributes.length) return null;

  return (
    <div className={styles.root}>
      {matrix.attributes.map(attr => {
        const selectedOv = attr.optionValues.find(ov => ov.id === sel[attr.id]);
        return (
          <div key={attr.id} className={styles.attrGroup}>
            <div className={styles.attrLabel}>
              {attr.name}
              {selectedOv && (
                <span className={styles.attrSelected}>
                  {" — "}{selectedOv.displayValue ?? selectedOv.value}
                </span>
              )}
            </div>

            {attr.displayType === "dropdown" ? (
              <select
                className={styles.attrSelect}
                value={sel[attr.id] ?? ""}
                onChange={e => pick(attr.id, e.target.value)}
              >
                <option value="" disabled>Select {attr.name}</option>
                {attr.optionValues.map(ov => {
                  const state = optionState(attr.id, ov.id);
                  return (
                    <option key={ov.id} value={ov.id} disabled={state === "unavailable"}>
                      {ov.displayValue ?? ov.value}
                      {state === "oos" ? " (out of stock)" : ""}
                    </option>
                  );
                })}
              </select>
            ) : attr.displayType === "swatch" ? (
              <div className={styles.optionRow}>
                {attr.optionValues.map(ov => {
                  const state = optionState(attr.id, ov.id);
                  const bgStyle = ov.swatchValue
                    ? { background: ov.swatchType === "color" ? ov.swatchValue : `url(${ov.swatchValue}) center/cover` }
                    : undefined;
                  return (
                    <button
                      key={ov.id}
                      onClick={() => pick(attr.id, ov.id)}
                      disabled={state === "unavailable"}
                      title={ov.displayValue ?? ov.value}
                      aria-label={ov.displayValue ?? ov.value}
                      aria-pressed={state === "selected"}
                      className={[
                        styles.swatchBtn,
                        state === "selected"   ? styles.optionSelected   : "",
                        state === "oos"        ? styles.optionOos        : "",
                        state === "unavailable"? styles.optionUnavailable: "",
                      ].join(" ")}
                    >
                      <span className={styles.swatchBtnInner} style={bgStyle} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={styles.optionRow}>
                {attr.optionValues.map(ov => {
                  const state = optionState(attr.id, ov.id);
                  return (
                    <button
                      key={ov.id}
                      onClick={() => pick(attr.id, ov.id)}
                      disabled={state === "unavailable"}
                      aria-pressed={state === "selected"}
                      className={[
                        styles.sizeBtn,
                        state === "selected"   ? styles.optionSelected   : "",
                        state === "oos"        ? styles.optionOos        : "",
                        state === "unavailable"? styles.optionUnavailable: "",
                      ].join(" ")}
                    >
                      {ov.displayValue ?? ov.value}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
