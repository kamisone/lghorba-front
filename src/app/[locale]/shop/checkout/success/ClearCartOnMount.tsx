"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/components/shop/CartContext";

export default function ClearCartOnMount() {
  const { clearCart } = useCart();
  const cleared = useRef(false);

  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;
    clearCart();
  }, [clearCart]);

  return null;
}
