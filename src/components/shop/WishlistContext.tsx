"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface WishlistItem {
  productId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  priceCents: number | null;
}

interface WishlistContextValue {
  wishlist: WishlistItem[];
  toggle: (item: WishlistItem) => void;
  isWishlisted: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = "shop_wishlist";
const SESSION_TOKEN_KEY = "shop_wishlist_session_token";

function readWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getSessionToken(): string {
  let token = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

// Persists to the backend (admin analytics visibility — most-wishlisted
// products, non-converting wishlists) alongside the localStorage copy that
// actually drives this app's wishlist UI. Fire-and-forget: never blocks the
// toggle or breaks the UI if it fails.
function syncToBackend(added: boolean, productId: string): void {
  const sessionToken = getSessionToken();
  if (added) {
    fetch("/next-api/public/shop/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken, productId }),
    }).catch(() => {});
  } else {
    fetch(`/next-api/public/shop/wishlist/${productId}?sessionToken=${encodeURIComponent(sessionToken)}`, {
      method: "DELETE",
    }).catch(() => {});
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  useEffect(() => { setWishlist(readWishlist()); }, []);

  const toggle = useCallback((item: WishlistItem) => {
    setWishlist(prev => {
      const wasWishlisted = prev.some(i => i.productId === item.productId);
      const next = wasWishlisted
        ? prev.filter(i => i.productId !== item.productId)
        : [...prev, item];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      syncToBackend(!wasWishlisted, item.productId);
      return next;
    });
  }, []);

  const isWishlisted = useCallback(
    (productId: string) => wishlist.some(i => i.productId === productId),
    [wishlist],
  );

  return (
    <WishlistContext.Provider value={{ wishlist, toggle, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
