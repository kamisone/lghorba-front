"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

interface WishlistContextValue {
  wishlist: string[]; // productIds
  toggle: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

function getSessionToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem("shop_wishlist_token");
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem("shop_wishlist_token", token);
  }
  return token;
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);

  const fetchWishlist = useCallback(async () => {
    const sessionToken = getSessionToken();
    const res = await fetch(`/next-api/public/shop/wishlist?sessionToken=${sessionToken}`);
    if (res.ok) {
      const data = await res.json();
      const ids = Array.isArray(data) ? data.map((i: any) => i.productId as string) : [];
      setWishlist(ids);
    }
  }, []);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const toggle = useCallback(async (productId: string) => {
    const sessionToken = getSessionToken();
    const already = wishlist.includes(productId);
    if (already) {
      await fetch(`/next-api/public/shop/wishlist/${productId}?sessionToken=${sessionToken}`, { method: "DELETE" });
      setWishlist(prev => prev.filter(id => id !== productId));
    } else {
      await fetch(`/next-api/public/shop/wishlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, productId }),
      });
      setWishlist(prev => [...prev, productId]);
    }
  }, [wishlist]);

  const isWishlisted = useCallback((productId: string) => wishlist.includes(productId), [wishlist]);

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
