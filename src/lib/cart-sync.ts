import type { CartLineIssueCode, CartNotice, HydratedCart } from "@/lib/checkout-types";

export function cartLineIssueLabel(issue: CartLineIssueCode): string {
  switch (issue) {
    case "MISSING":
      return "Bu ürün artık katalogda yok.";
    case "INACTIVE_VARIANT":
      return "Bu varyant satıştan kaldırıldı.";
    case "INACTIVE_PRODUCT":
      return "Bu ürün satıştan kaldırıldı.";
    case "HIDDEN":
      return "Bu ürün şu an vitrinde görünmüyor.";
    case "NOT_FOR_SALE":
      return "Bu ürün şu an siparişe kapalı.";
    case "OUT_OF_STOCK":
      return "Stokta yok. Sepetten çıkarabilir veya stoğu bekleyebilirsiniz.";
    case "NO_PRICE":
      return "Bu ürünün satış fiyatı tanımlı değil.";
    default: {
      const _exhaustive: never = issue;
      return _exhaustive;
    }
  }
}

export function cartLinesSignature(
  lines: Array<{ lineKey?: string; variantId: string; quantity: number }>,
): string {
  return JSON.stringify(
    lines.map((line) => [line.lineKey || line.variantId, line.variantId, line.quantity]),
  );
}

export function sameCartLines(
  left: Array<{
    lineKey?: string;
    variantId: string;
    quantity: number;
    unitPriceMinor?: number;
  }>,
  right: Array<{
    lineKey?: string;
    variantId: string;
    quantity: number;
    unitPriceMinor?: number;
  }>,
): boolean {
  if (left.length !== right.length) return false;
  return left.every((line, index) => {
    const other = right[index];
    return (
      other != null &&
      (line.lineKey || line.variantId) === (other.lineKey || other.variantId) &&
      line.variantId === other.variantId &&
      line.quantity === other.quantity &&
      (line.unitPriceMinor ?? 0) === (other.unitPriceMinor ?? 0)
    );
  });
}

export function mergeCartNotices(current: CartNotice[], incoming: CartNotice[]): CartNotice[] {
  if (incoming.length === 0) return current;
  const seen = new Set(current.map((item) => item.id));
  const next = [...current];
  for (const notice of incoming) {
    if (seen.has(notice.id)) continue;
    seen.add(notice.id);
    next.push(notice);
  }
  return next;
}

export function noticesFromHydratedCart(cart: HydratedCart): CartNotice[] {
  const notices: CartNotice[] = [];
  const removed = cart.lines.filter((line) => line.issue === "MISSING");
  if (removed.length === 1) {
    const line = removed[0]!;
    notices.push({
      id: `removed:${line.lineKey}`,
      kind: "removed",
      message: `"${line.title}" sepetten çıkarıldı çünkü artık satılmıyor.`,
    });
  } else if (removed.length > 1) {
    notices.push({
      id: `removed:batch:${removed.map((line) => line.lineKey).sort().join(",")}`,
      kind: "removed",
      message: `${removed.length} ürün sepetten çıkarıldı çünkü artık satılmıyor.`,
    });
  }

  const changed = cart.lines.filter((line) => line.priceChange);
  if (changed.length > 0) {
    const anyUp = changed.some(
      (line) => line.priceChange && line.priceChange.toMinor > line.priceChange.fromMinor,
    );
    notices.push({
      id: `price:${changed.map((line) => `${line.lineKey}:${line.priceChange?.toMinor}`).join(",")}`,
      kind: anyUp ? "price_up" : "price_down",
      message:
        changed.length === 1
          ? "Sepetinizdeki bir ürünün fiyatı değişti. Tutar güncel fiyata göre güncellendi."
          : `Sepetinizdeki ${changed.length} ürünün fiyatı değişti. Tutar güncel fiyatlara göre güncellendi.`,
    });
  }

  for (const line of cart.lines) {
    if (line.qtyAdjustedFrom == null || line.qtyAdjustedFrom === line.quantity) continue;
    notices.push({
      id: `qty:${line.lineKey}:${line.qtyAdjustedFrom}:${line.quantity}`,
      kind: "qty_adjusted",
      message: `"${line.title}" adedi stok nedeniyle ${line.qtyAdjustedFrom} → ${line.quantity} olarak güncellendi.`,
    });
  }

  return notices;
}
