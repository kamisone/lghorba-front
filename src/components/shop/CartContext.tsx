"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { parseApiError, type CartMutationResult } from "@/lib/shop/stockError";
import { pixelTrack } from "@/lib/metaPixel";
import { getTrafficSource } from "@/lib/shopBehavior";

export interface AppliedCoupon {
  code: string;
  discountCents: number;
  type: string;
}

export interface CartItemOption {
  attributeId: string;
  attributeName: string;
  optionValueId: string | null;
  value: string;
  displayValue: string | null;
}

export interface CartItem {
  id: string;
  variantId: string;
  productId: string;
  productSlug: string | null;
  titleSnapshot: string;
  skuSnapshot: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  /** This product carries free delivery; one such item frees the whole basket. */
  freeShipping?: boolean;
  optionsSnapshot: CartItemOption[] | null;
}

export interface Cart {
  id: string;
  token: string;
  items: CartItem[];
  subtotalCents: number;
  itemCount: number;
  /** At least one item ships free, so the order does. Set by the backend. */
  freeShipping?: boolean;
}

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  mutating: boolean;
  addItem: (variantId: string, quantity?: number, selectedOptionValueIds?: string[]) => Promise<CartMutationResult>;
  updateItem: (itemId: string, quantity: number) => Promise<CartMutationResult>;
  removeItem: (itemId: string) => Promise<void>;
  validateCoupon: (code: string) => Promise<{ valid: boolean; discountCents: number; type: string; message?: string }>;
  token: string;
  refresh: () => Promise<void>;
  clearCart: () => void;
  appliedCoupon: AppliedCoupon | null;
  setAppliedCoupon: (c: AppliedCoupon | null) => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function getOrCreateToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem("shop_cart_token");
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem("shop_cart_token", token);
  }
  return token;
}

export function CartProvider({ children, locale = "fr" }: { children: React.ReactNode; locale?: string }) {
  const [token, setToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return getOrCreateToken();
  });
  const [cart, setCart]       = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Always-current cart ref for optimistic rollback without stale closures
  const cartRef = useRef<Cart | null>(null);
  useEffect(() => { cartRef.current = cart; }, [cart]);

  function applyCart(data: Cart) {
    if (data.token && data.token !== token) {
      localStorage.setItem("shop_cart_token", data.token);
      setToken(data.token);
    }
    setCart(data);
  }

  const langParam = locale !== "fr" ? `?lang=${locale}` : "";

  const fetchCart = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/next-api/public/shop/cart/${token}${langParam}`);
      if (res.ok) applyCart(await res.json());
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, langParam]);

  useEffect(() => {
    if (token) fetchCart();
  }, [token, fetchCart]);

  const addItem = useCallback(async (variantId: string, quantity = 1, selectedOptionValueIds?: string[]): Promise<CartMutationResult> => {
    setMutating(true);
    try {
      const res = await fetch(`/next-api/public/shop/cart/${token}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity, selectedOptionValueIds, ...getTrafficSource() }),
      });
      if (res.ok) {
        const data: Cart & { metaAddToCartEventId?: string } = await res.json();
        applyCart(data);
        // Meta Pixel: value/currency/ids only — never add customer PII here.
        // Value reflects what was just added (unit price × quantity added),
        // not the line's accumulated total. eventId is shared with the
        // server-side Conversions API call for this same action (dedup).
        const addedItem = data.items.find(i => i.variantId === variantId);
        pixelTrack("AddToCart", {
          content_type: "product",
          content_ids: [variantId],
          value: ((addedItem?.unitPriceCents ?? 0) * quantity) / 100,
          currency: "EUR",
          num_items: quantity,
        }, data.metaAddToCartEventId);
        return { ok: true };
      }
      const body = await res.json().catch(() => ({}));
      const { code, available } = parseApiError(body);
      return { ok: false, code, available };
    } catch {
      return { ok: false };
    } finally {
      setMutating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const updateItem = useCallback(async (itemId: string, quantity: number): Promise<CartMutationResult> => {
    const prevCart = cartRef.current;

    // Optimistic update
    setCart(current => {
      if (!current) return current;
      const item = current.items.find(i => i.id === itemId);
      if (!item) return current;
      const newLineTotal = item.unitPriceCents * quantity;
      return {
        ...current,
        items: current.items.map(i =>
          i.id === itemId ? { ...i, quantity, lineTotalCents: newLineTotal } : i
        ),
        itemCount: current.itemCount + (quantity - item.quantity),
        subtotalCents: current.subtotalCents + (newLineTotal - item.lineTotalCents),
      };
    });

    setMutating(true);
    try {
      const res = await fetch(`/next-api/public/shop/cart/${token}/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity, ...getTrafficSource() }),
      });
      if (res.ok) {
        applyCart(await res.json());
        return { ok: true };
      }
      setCart(prevCart);
      const body = await res.json().catch(() => ({}));
      const { code, available } = parseApiError(body);
      return { ok: false, code, available };
    } catch {
      setCart(prevCart);
      return { ok: false };
    } finally {
      setMutating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const removeItem = useCallback(async (itemId: string) => {
    const prevCart = cartRef.current;

    // Optimistic update
    setCart(current => {
      if (!current) return current;
      const item = current.items.find(i => i.id === itemId);
      if (!item) return current;
      return {
        ...current,
        items: current.items.filter(i => i.id !== itemId),
        itemCount: current.itemCount - item.quantity,
        subtotalCents: current.subtotalCents - item.lineTotalCents,
      };
    });

    setMutating(true);
    try {
      const res = await fetch(`/next-api/public/shop/cart/${token}/items/${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) applyCart(await res.json());
      else setCart(prevCart);
    } catch {
      setCart(prevCart);
    } finally {
      setMutating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const validateCoupon = useCallback(async (code: string) => {
    const subtotalCents = cart?.subtotalCents ?? 0;
    const res = await fetch(`/next-api/public/shop/cart/${token}/validate-coupon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotalCents }),
    });
    return res.json();
  }, [token, cart]);

  const clearCart = useCallback(() => {
    const newToken = crypto.randomUUID();
    localStorage.setItem("shop_cart_token", newToken);
    setToken(newToken);
    setCart(null);
    setAppliedCoupon(null);
  }, []);

  const openDrawer  = useCallback(() => setIsDrawerOpen(true),  []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  return (
    <CartContext.Provider value={{
      cart, loading, mutating,
      addItem, updateItem, removeItem, validateCoupon,
      token, refresh: fetchCart, clearCart,
      appliedCoupon, setAppliedCoupon,
      isDrawerOpen, openDrawer, closeDrawer,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
