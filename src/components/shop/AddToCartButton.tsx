"use client";

import { useState, useCallback } from "react";
import { useCart } from "./CartContext";
import { useLocale } from "@/lib/i18n/useLocale";
import { getTranslations } from "@/lib/i18n";
import { formatStockError } from "@/lib/shop/stockError";
import styles from "./AddToCartButton.module.css";

interface Props {
  variantId: string;
  initialQty?: number;
  size?: "sm" | "lg";
  className?: string;
  selectedOptionValueIds?: string[];
}

export default function AddToCartButton({ variantId, initialQty = 1, size = "lg", className, selectedOptionValueIds }: Props) {
  const { cart, addItem, updateItem, removeItem, mutating, openDrawer } = useCart();
  const locale = useLocale();
  const t = getTranslations(locale).shop;
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [addError, setAddError] = useState("");

  const cartItem = cart?.items.find(i => i.variantId === variantId) ?? null;

  const handleAdd = useCallback(async () => {
    setAdding(true);
    setAddError("");
    const result = await addItem(variantId, initialQty, selectedOptionValueIds);
    setAdding(false);
    if (result.ok) {
      setJustAdded(true);
      openDrawer();
      setTimeout(() => setJustAdded(false), 2200);
    } else {
      setAddError(formatStockError(result, t));
    }
  }, [variantId, initialQty, selectedOptionValueIds, addItem, openDrawer, t]);

  const handleDecrement = useCallback(async () => {
    if (!cartItem) return;
    setAddError("");
    if (cartItem.quantity <= 1) {
      await removeItem(cartItem.id);
    } else {
      await updateItem(cartItem.id, cartItem.quantity - 1);
    }
  }, [cartItem, updateItem, removeItem]);

  const handleIncrement = useCallback(async () => {
    if (!cartItem) return;
    setAddError("");
    const result = await updateItem(cartItem.id, cartItem.quantity + 1);
    if (!result.ok) setAddError(formatStockError(result, t));
  }, [cartItem, updateItem, t]);

  if (cartItem) {
    return (
      <div className={`${styles.addWrap} ${className ?? ""}`}>
        <div className={`${styles.stepper} ${styles[size]}`}>
          <button
            onClick={handleDecrement}
            disabled={mutating}
            className={styles.stepBtn}
            aria-label={cartItem.quantity === 1 ? t.removeFromCart : t.decreaseQty}
          >
            {cartItem.quantity === 1 ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            ) : "−"}
          </button>
          <span className={styles.qty}>{cartItem.quantity}</span>
          <button
            onClick={handleIncrement}
            disabled={mutating}
            className={styles.stepBtn}
            aria-label={t.increaseQty}
          >
            +
          </button>
        </div>
        {addError && <p className={styles.error}>{addError}</p>}
      </div>
    );
  }

  return (
    <div className={`${styles.addWrap} ${className ?? ""}`}>
      <button
        onClick={handleAdd}
        disabled={adding || mutating}
        className={`${styles.addBtn} ${styles[size]} ${justAdded ? styles.justAdded : ""}`}
        aria-label={t.addToCart}
      >
        {adding ? (
          <span className={styles.addingLabel}>
            <span className={styles.spinner} aria-hidden="true" />
            {t.adding}
          </span>
        ) : justAdded ? (
          <span className={styles.addedLabel}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {t.addedToCart}
          </span>
        ) : (
          t.addToCart
        )}
      </button>
      {addError && <p className={styles.error}>{addError}</p>}
    </div>
  );
}
