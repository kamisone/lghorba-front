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

function readWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  useEffect(() => { setWishlist(readWishlist()); }, []);

  const toggle = useCallback((item: WishlistItem) => {
    setWishlist(prev => {
      const next = prev.some(i => i.productId === item.productId)
        ? prev.filter(i => i.productId !== item.productId)
        : [...prev, item];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
