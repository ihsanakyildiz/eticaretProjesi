"use server";

import { hydrateCart } from "@/lib/checkout";
import { normalizeCartLines, type CartLine } from "@/lib/cart";

export async function resolveCartAction(raw: CartLine[]) {
  return hydrateCart(normalizeCartLines(raw));
}
