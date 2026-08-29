"use client";

import { useEffect } from "react";
import { useCart } from "@/components/site/cart/cart-provider";

export function OrderThanksClearCart() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
