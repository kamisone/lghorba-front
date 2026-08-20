"use client";

import { Check } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";
import { getTranslations } from "@/lib/i18n";
import type { AvailabilityMatrix, OptionState } from "./ProductVariantSelector";
import styles from "./StickyVariantSelector.module.css";

type ResolveStatus = "idle" | "loading" | "available" | "out_of_stock" | "unavailable";

interface Props {
  matrix: AvailabilityMatrix;
  sel: Record<string, string>;
  optionState: (attrId: string, ovId: string) => OptionState;
  onPick: (attrId: string, ovId: string) => void;
  /** Controls the enter/exit animation and whether this is reachable by keyboard/SR when hidden. */
  visible: boolean;
  /** Same real-time availability state the inline stock badge uses — see ShopProductDetail.tsx's resolveStatus. */
  resolveStatus: ResolveStatus;
}

/**
 * Sticky fallback variation selector for phone screens — a compact duplicate
 * of ProductVariantSelector, shown only while the real one (inline in
 * .details) is scrolled out of view (see the IntersectionObserver in
 * ShopProductDetail.tsx). Renders every attribute type the real selector
 * supports (swatch/button/dropdown), not just color/image swatches, so it's
 * a genuine fallback rather than a partial one.
 *
 * Shares ProductVariantSelector's own selection state via the same
 * onSelectionChange/pick-handle plumbing the real selector exposes — there
 * is exactly one source of truth for `sel`, so picking here and picking in
 * the real selector can never diverge.
 */
export default function StickyVariantSelector({ matrix, sel, optionState, onPick, visible, resolveStatus }: Props) {
  const locale = useLocale();
  const t = getTranslations(locale).shop;

  if (!matrix.attributes.length) return null;

  const stockLabel =
    resolveStatus === "available"    ? t.stockAvailable :
    resolveStatus === "out_of_stock" ? t.stockOutOfStock :
    resolveStatus === "unavailable"  ? t.stockUnavailable :
    resolveStatus === "loading"      ? t.stockChecking :
    null;

  return (
    <div
      className={`${styles.root} ${visible ? styles.rootVisible : ""}`}
      aria-hidden={!visible}
    >
      {stockLabel && (
        <div className={`${styles.stockRow} ${styles[`stock_${resolveStatus}`]}`}>
          <span className={styles.stockDot} aria-hidden="true" />
          <span>{stockLabel}</span>
        </div>
      )}

      {matrix.attributes.map(attr => {
        return (
          <div key={attr.id} className={styles.group}>
            <span className={styles.label}>{attr.name}</span>

            {attr.displayType === "dropdown" ? (
              <select
                className={styles.select}
                value={sel[attr.id] ?? ""}
                onChange={e => onPick(attr.id, e.target.value)}
                tabIndex={visible ? 0 : -1}
              >
                <option value="" disabled>{attr.name}</option>
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
            ) : (
              <div className={`${styles.row} ${attr.displayType === "swatch" ? styles.rowSwatch : styles.rowPill}`}>
                {attr.optionValues.map(ov => {
                  const state = optionState(attr.id, ov.id);
                  const isSwatch = attr.displayType === "swatch";
                  const isImage = ov.swatchType === "image";
                  const mediaValue = isImage ? ov.swatchUrl : ov.swatchValue;
                  const mediaStyle = isSwatch && mediaValue
                    ? { background: isImage ? `url(${mediaValue}) center/cover` : mediaValue }
                    : undefined;
                  return (
                    <button
                      key={ov.id}
                      type="button"
                      onClick={() => onPick(attr.id, ov.id)}
                      disabled={state === "unavailable"}
                      title={ov.displayValue ?? ov.value}
                      aria-label={ov.displayValue ?? ov.value}
                      aria-pressed={state === "selected"}
                      tabIndex={visible ? 0 : -1}
                      className={[
                        isSwatch ? styles.tile : styles.pill,
                        isSwatch ? (isImage ? styles.tileImage : styles.tileColor) : "",
                        state === "selected"    ? (isSwatch ? styles.tileSelected : styles.pillSelected)       : "",
                        state === "oos"         ? styles.optionOos         : "",
                        state === "unavailable" ? styles.optionUnavailable : "",
                      ].join(" ")}
                    >
                      {isSwatch ? (
                        <>
                          <span className={isImage ? styles.tileMediaImage : styles.tileMediaColor} style={mediaStyle} />
                          {state === "selected" && (
                            <span className={styles.check} aria-hidden="true">
                              <Check size={9} strokeWidth={3} />
                            </span>
                          )}
                        </>
                      ) : (
                        ov.displayValue ?? ov.value
                      )}
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
