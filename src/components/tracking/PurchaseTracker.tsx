"use client";

import { useEffect, useRef } from "react";
import { pixelTrack } from "@/lib/metaPixel";
import { ttqTrack } from "@/lib/tiktokPixel";

interface Props {
  orderNumber: string;
  totalCents: number;
  items: { id: string; title?: string | null; quantity: number; unitPriceCents: number }[];
}

/**
 * Fires the browser-side Purchase event once, on mount. `orderNumber` doubles as
 * the shared event ID with the server-side Conversions API call (see
 * back/src/marketing/meta-capi/), so Meta can deduplicate the pair.
 * Value/currency/ids only — never customer PII (name/email/phone/address).
 */
export default function PurchaseTracker({ orderNumber, totalCents, items }: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    pixelTrack("Purchase", {
      value: totalCents / 100,
      currency: "EUR",
      content_type: "product",
      content_ids: items.map(i => i.id),
      contents: items.map(i => ({ id: i.id, quantity: i.quantity, item_price: i.unitPriceCents / 100 })),
      num_items: items.reduce((n, i) => n + i.quantity, 0),
    }, orderNumber);
    // Same order number as the event ID — matches the backend's server-side
    // Purchase call (PAYMENT_SUCCEEDED listener) for TikTok's own dedup.
    // `contents` is a nested array per TikTok's own event spec.
    ttqTrack("Purchase", {
      contents: items.map(i => ({
        content_id: i.id,
        content_type: "product",
        content_name: i.title ?? undefined,
        quantity: i.quantity,
        price: i.unitPriceCents / 100,
      })),
      value: totalCents / 100,
      currency: "EUR",
    }, orderNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
