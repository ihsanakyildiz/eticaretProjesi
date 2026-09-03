export class StockShortageError extends Error {
  readonly productTitle: string;

  constructor(productTitle: string) {
    super(`Yetersiz stok: ${productTitle}`);
    this.name = "StockShortageError";
    this.productTitle = productTitle;
  }
}

export type OutOfStockBehavior = "DENY" | "ALLOW" | "DEFAULT";

export function allowsOrderWhenOutOfStock(
  behavior: OutOfStockBehavior | null | undefined,
  variantAllowBackorder: boolean,
): boolean {
  if (variantAllowBackorder) return true;
  switch (behavior) {
    case "ALLOW":
      return true;
    case "DENY":
    case "DEFAULT":
    case null:
    case undefined:
      return false;
    default: {
      const _exhaustive: never = behavior;
      return _exhaustive;
    }
  }
}

export function isVariantPurchasable(opts: {
  trackInventory: boolean;
  stockQuantity: number;
  neededQuantity?: number;
  allowBackorder: boolean;
  outOfStockBehavior?: OutOfStockBehavior | null;
}): boolean {
  if (!opts.trackInventory) return true;
  const needed = Math.max(1, opts.neededQuantity ?? 1);
  if (opts.stockQuantity >= needed) return true;
  return allowsOrderWhenOutOfStock(opts.outOfStockBehavior, opts.allowBackorder);
}
