import type { CartLine } from "@/lib/cart";
import type { HydratedCart, HydratedCartLine } from "@/lib/checkout-types";

let inflight: { key: string; promise: Promise<HydratedCart> } | null = null;

export const CART_HYDRATE_CACHE_KEY = "eticaret.cart.hydrated.v2";

export function cartLinesKey(lines: CartLine[]) {
  return JSON.stringify(lines.map((line) => [line.variantId, line.quantity]));
}

export function readHydratedCartCache(lines: CartLine[]): HydratedCart | null {
  if (typeof window === "undefined" || lines.length === 0) return null;
  try {
    const raw = window.sessionStorage.getItem(CART_HYDRATE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key?: unknown; cart?: HydratedCart };
    if (!parsed.cart || !Array.isArray(parsed.cart.lines)) return null;
    if (parsed.key !== cartLinesKey(lines)) {
      return applyLineQuantities(parsed.cart, lines);
    }
    if (!cacheCoversLines(parsed.cart, lines)) return null;
    return parsed.cart;
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

function cacheCoversLines(cart: HydratedCart, lines: CartLine[]): boolean {
  if (cart.lines.length === 0 && lines.length > 0) return false;
  const ids = new Set(cart.lines.map((line) => line.variantId));
  return lines.every((line) => ids.has(line.variantId));
}

export function applyLineQuantities(cart: HydratedCart, lines: CartLine[]): HydratedCart | null {
  if (!cacheCoversLines(cart, lines)) return null;
  const quantityById = new Map(lines.map((line) => [line.variantId, line.quantity]));
  const nextLines: HydratedCartLine[] = [];
  for (const line of cart.lines) {
    const quantity = quantityById.get(line.variantId);
    if (quantity == null) continue;
    if (quantity === line.quantity) {
      nextLines.push(line);
      continue;
    }
    nextLines.push({
      ...line,
      quantity,
      totalMinor: line.available ? line.unitPriceMinor * quantity : 0,
      savingsMinor:
        line.quantity > 0 ? Math.round((line.savingsMinor / line.quantity) * quantity) : 0,
    });
  }
  const sellable = nextLines.filter((line) => line.available);
  return {
    ...cart,
    lines: nextLines,
    productsMinor: sellable.reduce((sum, line) => sum + line.totalMinor, 0),
  };
}
