import type { CartLine } from "@/lib/cart";
import type { HydratedCart, HydratedCartLine } from "@/lib/checkout-types";

let inflight: { key: string; promise: Promise<HydratedCart> } | null = null;

export const CART_HYDRATE_CACHE_KEY = "eticaret.cart.hydrated.v1";

export function cartLinesKey(lines: CartLine[]) {
  return JSON.stringify(lines);
}

export function readHydratedCartCache(lines: CartLine[]): HydratedCart | null {
  if (typeof window === "undefined" || lines.length === 0) return null;
  try {
    const raw = window.sessionStorage.getItem(CART_HYDRATE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key?: unknown; cart?: HydratedCart };
    if (!parsed.cart || !Array.isArray(parsed.cart.lines)) return null;
    if (parsed.key === cartLinesKey(lines)) return parsed.cart;
    return applyLineQuantities(parsed.cart, lines);
  } catch {
    return null;
  }
}

export function writeHydratedCartCache(lines: CartLine[], cart: HydratedCart) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    CART_HYDRATE_CACHE_KEY,
    JSON.stringify({ key: cartLinesKey(lines), cart }),
  );
}

export function loadHydratedCart(
  lines: CartLine[],
  fetchCart: (lines: CartLine[]) => Promise<HydratedCart>,
): Promise<HydratedCart> {
  const key = cartLinesKey(lines);
  if (inflight?.key === key) return inflight.promise;
  const promise = fetchCart(lines)
    .then((cart) => {
      writeHydratedCartCache(lines, cart);
      return cart;
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
  inflight = { key, promise };
  return promise;
}

export function applyLineQuantities(cart: HydratedCart, lines: CartLine[]): HydratedCart | null {
  if (cart.lines.length !== lines.length) return null;
  const quantityById = new Map(lines.map((line) => [line.variantId, line.quantity]));
  const nextLines: HydratedCartLine[] = [];
  for (const line of cart.lines) {
    const quantity = quantityById.get(line.variantId);
    if (quantity == null) return null;
    if (quantity === line.quantity) {
      nextLines.push(line);
      continue;
    }
    nextLines.push({
      ...line,
      quantity,
      totalMinor: line.unitPriceMinor * quantity,
      savingsMinor:
        line.quantity > 0 ? Math.round((line.savingsMinor / line.quantity) * quantity) : 0,
    });
  }
  return {
    ...cart,
    lines: nextLines,
    productsMinor: nextLines.reduce((sum, line) => sum + line.totalMinor, 0),
  };
}
