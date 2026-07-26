"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useCart } from "@/components/shop/CartContext";
import PromoCodeInput from "@/components/shop/PromoCodeInput";
import PriceBreakdown from "@/components/shop/PriceBreakdown";
import { getTranslations } from "@/lib/i18n";
import { formatStockError } from "@/lib/shop/stockError";
import styles from "./Cart.module.css";

function centsToEuros(c: number) { return (c / 100).toFixed(2); }

export default function CartPage({ params }: { params: { locale: string } }) {
  const { cart, updateItem, removeItem, loading, mutating, validateCoupon, appliedCoupon, setAppliedCoupon } = useCart();
  const { locale } = params;
  const t = getTranslations(locale).shop;

  const [pendingQtys, setPendingQtys]   = useState<Record<string, number>>({});
  const [itemErrors, setItemErrors]     = useState<Record<string, string>>({});
  const [itemMaxAvail, setItemMaxAvail] = useState<Record<string, number>>({});
  const debounceTimers                  = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => { Object.values(timers).forEach(clearTimeout); };
  }, []);

  const handleQtyChange = useCallback((itemId: string, displayQty: number, delta: 1 | -1) => {
    const next = displayQty + delta;

    if (next < 1) {
      setPendingQtys(prev => { const n = { ...prev }; delete n[itemId]; return n; });
      if (debounceTimers.current[itemId]) clearTimeout(debounceTimers.current[itemId]);
      removeItem(itemId);
      return;
    }
    const knownMax = itemMaxAvail[itemId];
    if (delta === 1 && knownMax !== undefined && next > knownMax) return;

    setItemErrors(prev => ({ ...prev, [itemId]: "" }));
    setPendingQtys(prev => ({ ...prev, [itemId]: next }));

    if (debounceTimers.current[itemId]) clearTimeout(debounceTimers.current[itemId]);
    debounceTimers.current[itemId] = setTimeout(async () => {
      const result = await updateItem(itemId, next);
      setPendingQtys(prev => { const n = { ...prev }; delete n[itemId]; return n; });
      if (result.ok) {
        setItemMaxAvail(prev => { const n = { ...prev }; delete n[itemId]; return n; });
      } else {
        setItemErrors(prev => ({ ...prev, [itemId]: formatStockError(result, t) }));
        if (typeof result.available === "number") {
          setItemMaxAvail(prev => ({ ...prev, [itemId]: result.available! }));
          if (result.available > 0 && next > result.available) {
            setPendingQtys(prev => ({ ...prev, [itemId]: result.available! }));
          }
        }
      }
    }, 350);
  }, [updateItem, removeItem, itemMaxAvail, t]);

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
          {cart.items.map(item => {
            const productHref = item.productSlug ? `/${locale}/shop/${item.productSlug}` : null;
            return (
            <div key={item.id} className={styles.item}>
              {productHref ? (
                <Link href={productHref} className={styles.itemImage}>
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.titleSnapshot} fill sizes="80px" style={{ objectFit: "cover" }} />
                  ) : <div className={styles.imagePlaceholder} />}
                </Link>
              ) : (
                <div className={styles.itemImage}>
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.titleSnapshot} fill sizes="80px" style={{ objectFit: "cover" }} />
                  ) : <div className={styles.imagePlaceholder} />}
                </div>
              )}
              <div className={styles.itemDetails}>
                {productHref ? (
                  <Link href={productHref} className={styles.itemTitleLink}>
                    <p className={styles.itemTitle}>{item.titleSnapshot}</p>
                  </Link>
                ) : (
                  <p className={styles.itemTitle}>{item.titleSnapshot}</p>
                )}
                {item.optionsSnapshot && item.optionsSnapshot.length > 0 && (
                  <p className={styles.itemOptions}>
                    {item.optionsSnapshot.map(o => `${o.attributeName}: ${o.displayValue ?? o.value}`).join(" · ")}
                  </p>
                )}
                {item.skuSnapshot && <p className={styles.itemSku}>{t.skuLabel} {item.skuSnapshot}</p>}
                <p className={styles.itemPrice}>€{centsToEuros(item.unitPriceCents)}</p>
              </div>
              <div className={styles.itemQtyCol}>
                <div className={styles.itemQty}>
                  {(() => {
                    const dQty  = pendingQtys[item.id] ?? item.quantity;
                    const atMax = itemMaxAvail[item.id] !== undefined && dQty >= itemMaxAvail[item.id];
                    return (
                      <>
                        <button onClick={() => handleQtyChange(item.id, dQty, -1)} disabled={mutating}>−</button>
                        <span>{dQty}</span>
                        <button onClick={() => handleQtyChange(item.id, dQty, 1)} disabled={mutating || atMax}>+</button>
                      </>
                    );
                  })()}
                </div>
                {itemErrors[item.id] && (
                  <p className={styles.itemQtyError}>{itemErrors[item.id]}</p>
                )}
              </div>
              <div className={styles.itemTotal}>€{centsToEuros(item.lineTotalCents)}</div>
              <button onClick={() => removeItem(item.id)} className={styles.removeBtn} disabled={mutating}><X size={14} strokeWidth={2} /></button>
            </div>
            );
          })}
        </div>

        <div className={styles.summary}>
          <h3>{t.orderSummary}</h3>

          <PriceBreakdown
            subtotalCents={cart.subtotalCents}
            freeShipping={cart.freeShipping}
            couponDiscountCents={previewDiscount}
            couponCode={appliedCoupon?.code}
            totalCents={previewTotal}
          />

          {cart.freeShipping && (
            <p className={styles.freeShippingNote}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 7h11v8H3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M14 10h3.5L21 13v2h-7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <circle cx="7" cy="17.5" r="1.8" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="17" cy="17.5" r="1.8" stroke="currentColor" strokeWidth="1.7" />
              </svg>
              {t.freeShippingCartNote}
            </p>
          )}

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

          <Link href={`/${locale}/shop/checkout`} className={styles.checkoutBtn}>
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
