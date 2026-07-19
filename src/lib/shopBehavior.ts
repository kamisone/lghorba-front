"use client";

// Internal admin-analytics behavior tracking — independent of Meta Pixel/CAPI
// (see back/src/commerce/behavior/). Only the two client-only signals with no
// natural backend mutation to hook into (product views, searches) are sent
// from here; cart/checkout events are logged server-side from their own
// authoritative flows.

function getCartToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("shop_cart_token");
}

/** Fire-and-forget — never blocks the UI, failures are silently swallowed. */
export function trackShopBehavior(
  eventType: "product_view" | "search",
  data: { productId?: string; searchQuery?: string; resultCount?: number },
): void {
  if (typeof window === "undefined") return;
  fetch("/next-api/public/shop/behavior/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType, cartToken: getCartToken(), ...data }),
  }).catch(() => {});
}
