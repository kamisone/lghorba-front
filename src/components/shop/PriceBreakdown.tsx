"use client";

import { useLocale } from "@/lib/i18n/useLocale";
import { getTranslations } from "@/lib/i18n";
import styles from "./PriceBreakdown.module.css";

function fmt(cents: number) { return `€${(cents / 100).toFixed(2)}`; }

export interface PriceBreakdownProps {
  subtotalCents: number;
  shippingCents?: number;
  freeShipping?: boolean;
  categoryDiscountCents?: number;
  categoryDiscountName?: string;
  couponDiscountCents?: number;
  couponCode?: string | null;
  taxCents?: number;
  totalCents: number;
  loading?: boolean;
}

export default function PriceBreakdown({
  subtotalCents,
  shippingCents,
  freeShipping,
  categoryDiscountCents = 0,
  categoryDiscountName,
  couponDiscountCents = 0,
  couponCode,
  taxCents = 0,
  totalCents,
  loading = false,
}: PriceBreakdownProps) {
  const locale = useLocale();
  const t = getTranslations(locale).shop;
  const shippingKnown = shippingCents !== undefined;
  const shippingFree  = freeShipping || shippingCents === 0;

  if (loading) {
    return (
      <div className={styles.root}>
        {[60, 90, 80].map((w, i) => (
          <div key={i} className={styles.row}>
            <span className={styles.skeleton} style={{ width: w }} />
            <span className={styles.skeleton} style={{ width: 50 }} />
          </div>
        ))}
        <div className={styles.total}>
          <span className={styles.skeleton} style={{ width: 50 }} />
          <span className={styles.skeleton} style={{ width: 70 }} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>

      <div className={styles.row}>
        <span className={styles.label}>{t.subtotal}</span>
        <span className={styles.value}>{fmt(subtotalCents)}</span>
      </div>

      {categoryDiscountCents > 0 && (
        <div className={`${styles.row} ${styles.rowDiscount}`}>
          <span className={styles.label}>
            {t.promotion}
            {categoryDiscountName && <em className={styles.sub}>{categoryDiscountName}</em>}
          </span>
          <span className={styles.value}>−{fmt(categoryDiscountCents)}</span>
        </div>
      )}

      {couponDiscountCents > 0 && (
        <div className={`${styles.row} ${styles.rowDiscount}`}>
          <span className={styles.label}>
            {t.coupon}
            {couponCode && <em className={styles.sub}>{couponCode}</em>}
          </span>
          <span className={styles.value}>−{fmt(couponDiscountCents)}</span>
        </div>
      )}

      <div className={`${styles.row} ${shippingFree ? styles.rowDiscount : styles.rowShipping}`}>
        <span className={styles.label}>{t.shipping}</span>
        <span className={styles.value}>
          {!shippingKnown
            ? <em style={{ fontWeight: 400, color: "var(--color-text-muted)", fontStyle: "normal" }}>{t.shippingCalc}</em>
            : shippingFree ? t.free : fmt(shippingCents!)}
        </span>
      </div>

      {taxCents > 0 && (
        <div className={styles.row}>
          <span className={styles.label}>{t.vat}</span>
          <span className={styles.value}>{fmt(taxCents)}</span>
        </div>
      )}

      <div className={styles.total}>
        <span className={styles.totalLabel}>{t.total}</span>
        <span className={styles.totalValue}>{fmt(totalCents)}</span>
      </div>

    </div>
  );
}
