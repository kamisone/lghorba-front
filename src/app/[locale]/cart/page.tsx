"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/shop/CartContext";
import PromoCodeInput from "@/components/shop/PromoCodeInput";
import PriceBreakdown from "@/components/shop/PriceBreakdown";
import { getTranslations } from "@/lib/i18n";
import styles from "./Cart.module.css";

function centsToEuros(c: number) { return (c / 100).toFixed(2); }

export default function CartPage({ params }: { params: { locale: string } }) {
  const { cart, updateItem, removeItem, loading, mutating, validateCoupon, appliedCoupon, setAppliedCoupon } = useCart();
  const { locale } = params;
  const t = getTranslations(locale).shop;

  if (loading && !cart) {
    return (
      <div className={styles.container}>
        <h1 className={styles.heading}>{t.cartPageTitle}</h1>
        <p style={{ color: "var(--color-text-muted)" }}>{t.loading}</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>{t.cartEmpty}</h2>
        <Link href={`/${locale}/shop`} className={styles.continueBtn}>{t.browseProducts}</Link>
      </div>
    );
  }

  const previewDiscount = appliedCoupon?.discountCents ?? 0;
  const previewTotal    = Math.max(0, cart.subtotalCents - previewDiscount);

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>{t.cartPageTitle}</h1>
      <div className={styles.layout}>
        <div className={styles.items}>
          {cart.items.map(item => (
            <div key={item.id} className={styles.item}>
              <div className={styles.itemImage}>
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.titleSnapshot} fill sizes="80px" style={{ objectFit: "cover" }} />
                ) : <div className={styles.imagePlaceholder} />}
              </div>
              <div className={styles.itemDetails}>
                <p className={styles.itemTitle}>{item.titleSnapshot}</p>
                {item.skuSnapshot && <p className={styles.itemSku}>{t.skuLabel} {item.skuSnapshot}</p>}
                <p className={styles.itemPrice}>€{centsToEuros(item.unitPriceCents)}</p>
              </div>
              <div className={styles.itemQty}>
                <button onClick={() => updateItem(item.id, item.quantity - 1)} disabled={mutating}>−</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateItem(item.id, item.quantity + 1)} disabled={mutating}>+</button>
              </div>
              <div className={styles.itemTotal}>€{centsToEuros(item.lineTotalCents)}</div>
              <button onClick={() => removeItem(item.id)} className={styles.removeBtn} disabled={mutating}>✕</button>
            </div>
          ))}
        </div>

        <div className={styles.summary}>
          <h3>{t.orderSummary}</h3>

          <PriceBreakdown
            subtotalCents={cart.subtotalCents}
            couponDiscountCents={previewDiscount}
            couponCode={appliedCoupon?.code}
            totalCents={previewTotal}
          />

          <div className={styles.couponSection}>
            <PromoCodeInput
              onValidate={validateCoupon}
              onApply={(code, result) => setAppliedCoupon({ code, discountCents: result.discountCents, type: result.type })}
              onRemove={() => setAppliedCoupon(null)}
              appliedCode={appliedCoupon?.code}
              appliedDiscountCents={appliedCoupon?.discountCents}
            />
          </div>

          {appliedCoupon && (
            <p className={styles.couponNote}>
              {t.savingsPrefix}€{centsToEuros(appliedCoupon.discountCents)}{t.savingsSuffix}
            </p>
          )}

          <Link href={`/${locale}/checkout`} className={styles.checkoutBtn}>
            {t.proceedToCheckout}
          </Link>
          <Link href={`/${locale}/shop`} className={styles.continueLink}>
            {t.continueShoppingLink}
          </Link>
        </div>
      </div>
    </div>
  );
}
