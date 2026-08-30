"use client";

import { useEffect } from "react";
import { useCart } from "@/components/site/cart/cart-provider";

export function OrderThanksClearCart() {
  const { clearSelected } = useCart();
  useEffect(() => {
    clearSelected();
  }, [clearSelected]);
  return null;
}
