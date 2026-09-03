"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/components/site/cart/cart-provider";

export function OrderThanksClearCart() {
  const { ready, clearSelected } = useCart();
  const clearedRef = useRef(false);

  useEffect(() => {
    if (!ready || clearedRef.current) return;
    clearedRef.current = true;
    clearSelected();
  }, [ready, clearSelected]);

  return null;
}
