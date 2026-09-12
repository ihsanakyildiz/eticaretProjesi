import {
  cartLineKey,
  normalizePersonalization,
  type CartPersonalization,
} from "@/lib/product-personalization";

export const CART_STORAGE_KEY = "eticaret.cart.v1";

export type CartLine = {
  /** Aynı varyant + farklı kişiselleştirme ayırt edilir */
  lineKey: string;
  variantId: string;
  quantity: number;
  /** Son görülen birim fiyat (KDV dahil, kuruş). Fiyat değişimini tespit etmek için. */
  unitPriceMinor?: number;
  personalization?: CartPersonalization;
};

export function normalizeCartLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const byKey = new Map<string, CartLine>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const variantId = String((item as { variantId?: unknown }).variantId ?? "").trim();
    const quantity = Number((item as { quantity?: unknown }).quantity);
    if (!variantId || !Number.isFinite(quantity) || quantity <= 0) continue;
    const personalization = normalizePersonalization(
      (item as { personalization?: unknown }).personalization,
    );
    const explicitKey = String((item as { lineKey?: unknown }).lineKey ?? "").trim();
    const lineKey = explicitKey || cartLineKey(variantId, personalization);
    const parsedPrice = Number((item as { unitPriceMinor?: unknown }).unitPriceMinor);
    const unitPriceMinor =
      Number.isFinite(parsedPrice) && parsedPrice > 0 ? Math.round(parsedPrice) : undefined;
    const previous = byKey.get(lineKey);
    byKey.set(lineKey, {
      lineKey,
      variantId,
      quantity: (previous?.quantity ?? 0) + Math.trunc(quantity),
      unitPriceMinor: unitPriceMinor ?? previous?.unitPriceMinor,
      personalization: personalization ?? previous?.personalization,
    });
  }
  return [...byKey.values()];
}

export function cartItemCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function upsertCartLine(
  lines: CartLine[],
  variantId: string,
  quantity: number,
  unitPriceMinor?: number,
  personalization?: CartPersonalization,
): CartLine[] {
  const id = variantId.trim();
  const qty = Math.max(1, Math.trunc(quantity));
  if (!id) return lines;
  const lineKey = cartLineKey(id, personalization);
  const current = lines.find((line) => line.lineKey === lineKey);
  const next = lines.filter((line) => line.lineKey !== lineKey);
  next.push({
    lineKey,
    variantId: id,
    quantity: qty,
    unitPriceMinor:
      unitPriceMinor != null && unitPriceMinor > 0
        ? Math.round(unitPriceMinor)
        : current?.unitPriceMinor,
    personalization: personalization ?? current?.personalization,
  });
  return next;
}

export function addCartLine(
  lines: CartLine[],
  variantId: string,
  quantity: number,
  unitPriceMinor?: number,
  personalization?: CartPersonalization,
): CartLine[] {
  const lineKey = cartLineKey(variantId, personalization);
  const current = lines.find((line) => line.lineKey === lineKey)?.quantity ?? 0;
  return upsertCartLine(lines, variantId, current + quantity, unitPriceMinor, personalization);
}

export function setCartLineQuantity(lines: CartLine[], lineKey: string, quantity: number): CartLine[] {
  const key = lineKey.trim();
  if (!key) return lines;
  if (quantity <= 0) return lines.filter((line) => line.lineKey !== key);
  const current = lines.find((line) => line.lineKey === key);
  if (!current) return lines;
  return upsertCartLine(
    lines,
    current.variantId,
    quantity,
    current.unitPriceMinor,
    current.personalization,
  );
}

export function removeCartLine(lines: CartLine[], lineKey: string): CartLine[] {
  const key = lineKey.trim();
  if (!key) return lines;
  return lines.filter((line) => line.lineKey !== key);
}
