export const CART_STORAGE_KEY = "eticaret.cart.v1";

export type CartLine = {
  variantId: string;
  quantity: number;
  /** Son görülen birim fiyat (KDV dahil, kuruş). Fiyat değişimini tespit etmek için. */
  unitPriceMinor?: number;
};

export function normalizeCartLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const byVariant = new Map<string, CartLine>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const variantId = String((item as { variantId?: unknown }).variantId ?? "").trim();
    const quantity = Number((item as { quantity?: unknown }).quantity);
    if (!variantId || !Number.isFinite(quantity) || quantity <= 0) continue;
    const parsedPrice = Number((item as { unitPriceMinor?: unknown }).unitPriceMinor);
    const unitPriceMinor =
      Number.isFinite(parsedPrice) && parsedPrice > 0 ? Math.round(parsedPrice) : undefined;
    const previous = byVariant.get(variantId);
    byVariant.set(variantId, {
      variantId,
      quantity: (previous?.quantity ?? 0) + Math.trunc(quantity),
      unitPriceMinor: unitPriceMinor ?? previous?.unitPriceMinor,
    });
  }
  return [...byVariant.values()];
}

export function cartItemCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function upsertCartLine(
  lines: CartLine[],
  variantId: string,
  quantity: number,
  unitPriceMinor?: number,
): CartLine[] {
  const id = variantId.trim();
  const qty = Math.max(1, Math.trunc(quantity));
  if (!id) return lines;
  const current = lines.find((line) => line.variantId === id);
  const next = lines.filter((line) => line.variantId !== id);
  next.push({
    variantId: id,
    quantity: qty,
    unitPriceMinor:
      unitPriceMinor != null && unitPriceMinor > 0
        ? Math.round(unitPriceMinor)
        : current?.unitPriceMinor,
  });
  return next;
}

export function addCartLine(
  lines: CartLine[],
  variantId: string,
  quantity: number,
  unitPriceMinor?: number,
): CartLine[] {
  const current = lines.find((line) => line.variantId === variantId)?.quantity ?? 0;
  return upsertCartLine(lines, variantId, current + quantity, unitPriceMinor);
}
