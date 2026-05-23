"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/useLocale";
import { getTranslations } from "@/lib/i18n";
import styles from "./PromoCodeInput.module.css";

export interface CouponResult {
  valid: boolean;
  discountCents: number;
  type: string;
  message?: string;
}

interface Props {
  onValidate: (code: string) => Promise<CouponResult>;
  onApply: (code: string, result: CouponResult) => void;
  onRemove: () => void;
  appliedCode?: string | null;
  appliedDiscountCents?: number;
  locked?: boolean;
}

function centsToEuros(c: number) { return (c / 100).toFixed(2); }

export default function PromoCodeInput({
  onValidate,
  onApply,
  onRemove,
  appliedCode,
  appliedDiscountCents,
  locked = false,
}: Props) {
  const locale = useLocale();
  const t = getTranslations(locale).shop;
  const [code, setCode]           = useState("");
  const [result, setResult]       = useState<CouponResult | null>(null);
  const [loading, setLoading]     = useState(false);

  async function handleApply() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await onValidate(trimmed);
      setResult(res);
      if (res.valid) {
        onApply(trimmed, res);
        setCode("");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    setCode("");
    setResult(null);
    onRemove();
  }

  if (appliedCode) {
    return (
      <div className={styles.root}>
        <p className={styles.label}>{t.promoCodeLabel}</p>
        <div className={styles.row}>
          <input
            className={`${styles.input} ${styles.inputValid}`}
            value={appliedCode}
            readOnly
            disabled
          />
          {!locked && (
            <button type="button" className={styles.removeBtn} onClick={handleRemove}>
              {t.promoRemove}
            </button>
          )}
        </div>
        {appliedDiscountCents !== undefined && appliedDiscountCents > 0 && (
          <div className={`${styles.feedback} ${styles.feedbackValid}`}>
            <em className={styles.feedbackIcon}>✓</em>
            {t.promoAppliedPrefix}€{centsToEuros(appliedDiscountCents)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <p className={styles.label}>{t.promoCodeLabel}</p>
      <div className={styles.row}>
        <input
          className={`${styles.input} ${result ? (result.valid ? styles.inputValid : styles.inputInvalid) : ""}`}
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setResult(null); }}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleApply(); } }}
          placeholder={t.promoEnterCode}
          disabled={loading || locked}
          maxLength={50}
        />
        <button
          type="button"
          className={styles.applyBtn}
          onClick={handleApply}
          disabled={!code.trim() || loading || locked}
        >
          {loading ? "…" : t.promoApply}
        </button>
      </div>
      {result && !result.valid && (
        <div className={`${styles.feedback} ${styles.feedbackInvalid}`}>
          <em className={styles.feedbackIcon}>✕</em>
          {result.message ?? t.promoInvalidCode}
        </div>
      )}
    </div>
  );
}
