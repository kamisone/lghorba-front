"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n/useLocale";
import { getTranslations } from "@/lib/i18n";
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
    swatchUrl: string | null;
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
  /**
   * Fired whenever the per-attribute selection changes (including the initial
   * one derived on mount) — lets a companion UI elsewhere on the page (e.g.
   * the sticky mobile fallback selector, rendered from ShopProductDetail.tsx)
   * mirror the current selection and its available/oos/unavailable state
   * without duplicating this component's matching logic.
   */
  onSelectionChange?: (sel: Record<string, string>, optionState: (attrId: string, ovId: string) => OptionState) => void;
}

export type OptionState = "selected" | "available" | "oos" | "unavailable";

export interface ProductVariantSelectorHandle {
  /** Picks an option value for an attribute — same guarded logic as clicking
   *  a swatch/button here, exposed so the sticky fallback selector can drive
   *  this component's single source of truth instead of keeping a second,
   *  potentially-diverging copy of the matching logic. */
  pick: (attrId: string, ovId: string) => void;
}

const ProductVariantSelector = forwardRef<ProductVariantSelectorHandle, Props>(function ProductVariantSelector(
  { matrix, initialVariantSlug, onVariantChange, onSelectionChange }: Props,
  ref,
) {
  const locale = useLocale();
  const t = getTranslations(locale).shop;

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

    // For legacy variants (optionValueIds empty), skip matrix matching — just use defaults.
    const isStructured = matrix.variants.some(v => v.optionValueIds.length > 0);
    if (!isStructured) return defaultSel;

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

  // Legacy variants created before the structured option system have optionValueId = null,
  // which causes optionValueIds to be [] after filter(Boolean). In that case skip
  // availability filtering — treat every option as selectable.
  const hasStructuredOptions = useMemo(
    () => matrix.variants.some(v => v.optionValueIds.length > 0),
    [matrix],
  );

  const currentVariant = useMemo((): AvailabilityVariant | null => {
    if (!hasStructuredOptions) {
      // Legacy: can't match by optionValueIds — emit default/first variant so the
      // add-to-cart button has a valid variantId.
      return matrix.variants.find(v => v.inStock) ?? matrix.variants[0] ?? null;
    }
    const selValues = Object.values(sel);
    if (selValues.length !== matrix.attributes.length) return null;
    return matrix.variants.find(v =>
      selValues.every(sId => v.optionValueIds.includes(sId))
    ) ?? null;
  }, [sel, matrix, hasStructuredOptions]);

  useEffect(() => {
    onVariantChange?.(currentVariant);
  }, [currentVariant, onVariantChange]);

  function optionState(attrId: string, ovId: string): OptionState {
    if (sel[attrId] === ovId) return "selected";
    if (!hasStructuredOptions) return "available";
    const hypothetical = { ...sel, [attrId]: ovId };
    const hvValues = Object.values(hypothetical);
    const matches = matrix.variants.filter(v =>
      hvValues.every(sId => v.optionValueIds.includes(sId))
    );
    if (matches.length === 0) return "unavailable";
    if (matches.some(v => v.available && v.inStock)) return "available";
    return "oos";
  }

  useEffect(() => {
    onSelectionChange?.(sel, optionState);
    // optionState is redefined every render (closes over sel/matrix/hasStructuredOptions,
    // all already tracked below) — including it would just re-fire this identically.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, matrix, hasStructuredOptions, onSelectionChange]);

  // pick is a plain closure redefined every render over exactly these three
  // values (via optionState/setSel) — listing it too would just mean this
  // reruns on every render instead of only when the selection can actually
  // change what pick does.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useImperativeHandle(ref, () => ({ pick }), [sel, hasStructuredOptions, matrix]);

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
                      {state === "oos" ? ` ${t.variantOos}` : ""}
                    </option>
                  );
                })}
              </select>
            ) : attr.displayType === "swatch" ? (
              <div className={styles.optionRow}>
                {attr.optionValues.map(ov => {
                  const state = optionState(attr.id, ov.id);
                  const isImage = ov.swatchType === "image";
                  const displayValue = isImage ? ov.swatchUrl : ov.swatchValue;
                  const bgStyle = displayValue
                    ? { background: isImage
                          ? `url(${displayValue}) center/cover`
                          : displayValue }
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
                        isImage ? styles.swatchBtnImage : styles.swatchBtn,
                        state === "selected"    ? styles.optionSelected    : "",
                        state === "oos"         ? styles.optionOos         : "",
                        state === "unavailable" ? styles.optionUnavailable : "",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          isImage ? styles.swatchBtnImageInner : styles.swatchBtnInner,
                          isImage && state === "selected" ? styles.selectedCheck : "",
                        ].join(" ")}
                        style={bgStyle}
                      />
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
});

export default ProductVariantSelector;
