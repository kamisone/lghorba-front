"use client";

import { useCallback } from "react";

const MODAL_KEYS = ["modal", "id", "carId", "bookingId", "pricingId", "from", "to"];

export function useModalUrl() {
  const openModal = useCallback((name: string, extras: Record<string, string> = {}) => {
    const sp = new URLSearchParams(window.location.search);
    for (const key of MODAL_KEYS) sp.delete(key);
    sp.set("modal", name);
    for (const [k, v] of Object.entries(extras)) sp.set(k, v);
    window.history.replaceState(null, "", `${window.location.pathname}?${sp.toString()}`);
  }, []);

  const closeModal = useCallback(() => {
    const sp = new URLSearchParams(window.location.search);
    for (const key of MODAL_KEYS) sp.delete(key);
    const qs = sp.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, []);

  return { openModal, closeModal };
}
