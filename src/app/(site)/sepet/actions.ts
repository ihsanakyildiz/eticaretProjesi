"use server";

import { hydrateCart } from "@/lib/checkout";
import { normalizeCartLines, type CartLine } from "@/lib/cart";
import { syncStorefrontCartFromHydrated } from "@/lib/storefront-cart-sync";
import type { HydratedCart } from "@/lib/checkout-types";

export async function resolveCartAction(raw: CartLine[]) {
  const cart = await hydrateCart(normalizeCartLines(raw));
  void syncStorefrontCartFromHydrated(cart).catch(() => undefined);
  return cart;
}

export async function syncEmptyCartAction() {
  const empty: HydratedCart = {
    lines: [],
    productsMinor: 0,
    taxMinor: 0,
    extraShippingMinor: 0,
  };
  await syncStorefrontCartFromHydrated(empty).catch(() => undefined);
}
