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

const TRAFFIC_SOURCE_KEY = "shop_traffic_source";

/**
 * First-touch acquisition capture: `document.referrer` and `?utm_source=`
 * only mean anything at the visitor's actual landing — client-side route
 * changes never touch `document.referrer`, but a later full reload would
 * lose it, and a subsequent page's own `utm_source` (or lack of one) must
 * not overwrite the original campaign attribution. Persisted once, like
 * `shop_cart_token`, and resent on every event; the backend classifies it
 * into a platform label (see back/src/common/utils/platform.util.ts) so the
 * known-platform list can change without a frontend redeploy.
 */
function captureTrafficSource(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(TRAFFIC_SOURCE_KEY)) return;
  const utmSource = new URLSearchParams(window.location.search).get("utm_source");
  const referrer = document.referrer || null;
  if (!utmSource && !referrer) return;
  localStorage.setItem(TRAFFIC_SOURCE_KEY, JSON.stringify({ referrer, utmSource }));
}

/** Exported so cart mutations (CartContext.tsx) can resend the same first-touch attribution. */
export function getTrafficSource(): { referrer: string | null; utmSource: string | null } {
  if (typeof window === "undefined") return { referrer: null, utmSource: null };
  captureTrafficSource();
  try {
    const raw = localStorage.getItem(TRAFFIC_SOURCE_KEY);
    if (!raw) return { referrer: null, utmSource: null };
    const parsed = JSON.parse(raw);
    return { referrer: parsed.referrer ?? null, utmSource: parsed.utmSource ?? null };
  } catch {
    return { referrer: null, utmSource: null };
  }
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
    body: JSON.stringify({
      eventType,
      cartToken: getCartToken(),
      ...getTrafficSource(),
      ...data,
    }),
  }).catch(() => {});
}
