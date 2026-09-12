import { taxIncludedMinor } from "@/lib/product-money";
import { resolveSalePrice } from "@/lib/product-sale";

export type OrderDiscountLineInput = {
  unitPriceMinor: number;
  quantity: number;
  totalMinor?: number;
  compareAtMinor?: number | null;
};

export type OrderLineDiscount = {
  compareAtMinor: number | null;
  unitOffMinor: number;
  savingsMinor: number;
  percent: number;
};

export function readStoredCompareAt(item: object) {
  if (!("compareAtMinor" in item)) return null;
  const value = item.compareAtMinor;
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

export function readStoredDiscountMinor(order: object) {
  if (!("discountMinor" in order)) return 0;
  const value = order.discountMinor;
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
}

export function snapshotCompareAtMinor(
  listInclMinor: number | null | undefined,
  unitInclMinor: number,
) {
  if (listInclMinor == null || !Number.isFinite(listInclMinor)) return null;
  const list = Math.round(listInclMinor);
  const unit = Math.round(unitInclMinor);
  return list > unit ? list : null;
}

export function orderLineDiscount(input: OrderDiscountLineInput): OrderLineDiscount {
  const unit = Math.max(0, Math.round(input.unitPriceMinor));
  const quantity = Math.max(0, Math.round(input.quantity));
  const compare = snapshotCompareAtMinor(input.compareAtMinor, unit);
  const unitOffMinor = compare != null ? compare - unit : 0;
  return {
    compareAtMinor: compare,
    unitOffMinor,
    savingsMinor: unitOffMinor * quantity,
    percent: compare != null && compare > 0 ? Math.round((unitOffMinor / compare) * 100) : 0,
  };
}

export function orderDiscountSummary(items: OrderDiscountLineInput[]) {
  let listMinor = 0;
  let paidMinor = 0;
  let discountMinor = 0;
  for (const item of items) {
    const line = orderLineDiscount(item);
    const quantity = Math.max(0, Math.round(item.quantity));
    const paid =
      item.totalMinor != null
        ? Math.max(0, Math.round(item.totalMinor))
        : item.unitPriceMinor * quantity;
    listMinor += (line.compareAtMinor ?? item.unitPriceMinor) * quantity;
    paidMinor += paid;
    discountMinor += line.savingsMinor;
  }
  return {
    listMinor,
    paidMinor,
    discountMinor,
    percent: listMinor > 0 && discountMinor > 0 ? Math.round((discountMinor / listMinor) * 100) : 0,
  };
}

export function saleListInclMinor(input: {
  priceExclMinor: number;
  compareAtExclMinor?: number | null;
  saleStartsAt?: Date | string | null;
  saleEndsAt?: Date | string | null;
  taxRatePercent: number;
}) {
  const resolved = resolveSalePrice({
    priceMinor: input.priceExclMinor,
    compareAtMinor: input.compareAtExclMinor,
    saleStartsAt: input.saleStartsAt,
    saleEndsAt: input.saleEndsAt,
  });
  if (resolved.compareAtMinor == null || resolved.compareAtMinor <= resolved.priceMinor) {
    return null;
  }
  return taxIncludedMinor(resolved.compareAtMinor, input.taxRatePercent);
}
