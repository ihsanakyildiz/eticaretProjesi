export const CART_STORAGE_KEY = "eticaret.cart.v1";

export type CartLine = {
  variantId: string;
  quantity: number;
};

export function normalizeCartLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const byVariant = new Map<string, number>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const variantId = String((item as { variantId?: unknown }).variantId ?? "").trim();
    const quantity = Number((item as { quantity?: unknown }).quantity);
    if (!variantId || !Number.isFinite(quantity) || quantity <= 0) continue;
    byVariant.set(variantId, (byVariant.get(variantId) ?? 0) + Math.trunc(quantity));
  }
  return [...byVariant.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
}

export function cartItemCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function upsertCartLine(lines: CartLine[], variantId: string, quantity: number): CartLine[] {
  const id = variantId.trim();
  const qty = Math.max(1, Math.trunc(quantity));
  if (!id) return lines;
  const next = lines.filter((line) => line.variantId !== id);
  next.push({ variantId: id, quantity: qty });
  return next;
}

export function addCartLine(lines: CartLine[], variantId: string, quantity: number): CartLine[] {
  const current = lines.find((line) => line.variantId === variantId)?.quantity ?? 0;
  return upsertCartLine(lines, variantId, current + quantity);
}
