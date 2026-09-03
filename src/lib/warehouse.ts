import type { OrderStatusCode } from "@/lib/orders";

export const WAREHOUSE_READY_STATUSES = ["PAYMENT_ACCEPTED", "PROCESSING"] as const;
export type WarehouseReadyStatus = (typeof WAREHOUSE_READY_STATUSES)[number];

export function isWarehouseReadyStatus(status: OrderStatusCode): boolean {
  switch (status) {
    case "PAYMENT_ACCEPTED":
    case "PROCESSING":
      return true;
    case "AWAITING_PAYMENT":
    case "SHIPPED":
    case "DELIVERED":
    case "CANCELED":
    case "PAYMENT_ERROR":
    case "REFUNDED":
      return false;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function isWarehouseShippedStatus(status: OrderStatusCode): boolean {
  switch (status) {
    case "SHIPPED":
      return true;
    case "AWAITING_PAYMENT":
    case "PAYMENT_ACCEPTED":
    case "PROCESSING":
    case "DELIVERED":
    case "CANCELED":
    case "PAYMENT_ERROR":
    case "REFUNDED":
      return false;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function normalizeScanCode(value: string): string {
  return value.replace(/\s+/g, "").trim().toUpperCase();
}

export function codesMatch(scanned: string, candidate: string | null | undefined): boolean {
  const left = normalizeScanCode(scanned);
  const right = normalizeScanCode(candidate ?? "");
  return Boolean(left) && left === right;
}

export function warehouseTrackingCode(orderNo: number, reference: string): string {
  const padded = String(orderNo).padStart(6, "0");
  return `ET${padded}${reference.replace(/[^A-Z0-9]/gi, "").slice(0, 8).toUpperCase()}`;
}

export type WarehouseLine = {
  id: string;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  packedQuantity: number;
  image: string | null;
  locationCode: string | null;
  locationHint: string | null;
};

export function lineIsPacked(line: WarehouseLine): boolean {
  return line.packedQuantity >= line.quantity;
}

export function orderIsFullyPacked(lines: WarehouseLine[]): boolean {
  return lines.length > 0 && lines.every(lineIsPacked);
}

export function duplicateLineBarcodes(lines: WarehouseLine[]): string[] {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const code = normalizeScanCode(line.barcode ?? "");
    if (!code) continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([code]) => code);
}

export function packedProgress(lines: WarehouseLine[]): { packed: number; total: number } {
  return {
    packed: lines.reduce((sum, line) => sum + Math.min(line.packedQuantity, line.quantity), 0),
    total: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

export function warehouseAddressLines(address: {
  firstName: string;
  lastName: string;
  company: string | null;
  isCorporateInvoice: boolean;
  line1: string;
  line2?: string | null;
  neighborhood: string | null;
  district: string | null;
  city: string;
  postalCode: string | null;
  country: string;
  phone: string | null;
}): string[] {
  return [
    `${address.firstName} ${address.lastName}`.trim(),
    address.isCorporateInvoice ? address.company : null,
    address.line1,
    address.line2 ?? null,
    [address.neighborhood, address.district, address.city].filter(Boolean).join(" / "),
    [address.postalCode, address.country].filter(Boolean).join(" "),
    address.phone,
  ].filter((line): line is string => Boolean(line?.trim()));
}
