"use server";

import { hydrateCart } from "@/lib/checkout";
import { normalizeCartLines, type CartLine } from "@/lib/cart";
import { syncStorefrontCartFromHydrated } from "@/lib/storefront-cart-sync";
import type { HydratedCart } from "@/lib/checkout-types";

export async function resolveCartAction(raw: CartLine[], couponCode?: string | null) {
  const cart = await hydrateCart(normalizeCartLines(raw), {
    couponCode: couponCode ?? null,
  });
  void syncStorefrontCartFromHydrated(cart).catch(() => undefined);
  return cart;
}

export async function resolveCartCouponAction(raw: CartLine[], couponCode?: string | null) {
  const cart = await hydrateCart(normalizeCartLines(raw), {
    couponCode: couponCode ?? null,
  });
  return {
    coupon: cart.coupon,
    couponError: cart.couponError,
  };
}

export async function syncEmptyCartAction() {
  const empty: HydratedCart = {
    lines: [],
    productsMinor: 0,
    taxMinor: 0,
    extraShippingMinor: 0,
    chargeableDesi: 0,
    campaignFreeShipping: false,
    coupon: null,
    couponError: null,
  };
  await syncStorefrontCartFromHydrated(empty).catch(() => undefined);
}
