import {
  OrderAddressKind,
  OrderDocumentKind,
  OrderPaymentMethod,
  OrderStatus,
  type Prisma,
} from "@prisma/client";
import { orderDiscountSummary, snapshotCompareAtMinor } from "@/lib/order-discount";
import { taxExcludedMinor, taxIncludedMinor } from "@/lib/product-money";
import {
  generateOrderReference,
  parseOrderDocumentKind,
  parseOrderPaymentMethod,
  parseOrderStatus,
  type OrderDocumentKindCode,
  type OrderPaymentMethodCode,
  type OrderStatusCode,
} from "@/lib/orders";

export function prismaOrderStatus(status: OrderStatusCode): OrderStatus {
  switch (status) {
    case "AWAITING_PAYMENT":
      return OrderStatus.AWAITING_PAYMENT;
    case "PAYMENT_ACCEPTED":
      return OrderStatus.PAYMENT_ACCEPTED;
    case "PROCESSING":
      return OrderStatus.PROCESSING;
    case "SHIPPED":
      return OrderStatus.SHIPPED;
    case "DELIVERED":
      return OrderStatus.DELIVERED;
    case "CANCELED":
      return OrderStatus.CANCELED;
    case "PAYMENT_ERROR":
      return OrderStatus.PAYMENT_ERROR;
    case "REFUNDED":
      return OrderStatus.REFUNDED;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function prismaPaymentMethod(method: OrderPaymentMethodCode): OrderPaymentMethod {
  switch (method) {
    case "BANK_WIRE":
      return OrderPaymentMethod.BANK_WIRE;
    case "CREDIT_CARD":
      return OrderPaymentMethod.CREDIT_CARD;
    case "CASH_ON_DELIVERY":
      return OrderPaymentMethod.CASH_ON_DELIVERY;
    case "OTHER":
      return OrderPaymentMethod.OTHER;
    default: {
      const _exhaustive: never = method;
      return _exhaustive;
    }
  }
}

export function prismaDocumentKind(kind: OrderDocumentKindCode): OrderDocumentKind {
  switch (kind) {
    case "INVOICE":
      return OrderDocumentKind.INVOICE;
    case "DELIVERY_SLIP":
      return OrderDocumentKind.DELIVERY_SLIP;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export async function nextDocumentNumber(tx: Prisma.TransactionClient, kind: OrderDocumentKindCode) {
  const last = await tx.orderDocument.aggregate({
    where: { kind: prismaDocumentKind(kind) },
    _max: { number: true },
  });
  return (last._max.number ?? 0) + 1;
}

export function parseWeightKg(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 1000) / 1000;
}

export async function nextOrderNo(tx: Prisma.TransactionClient) {
  const last = await tx.order.aggregate({ _max: { orderNo: true } });
  return (last._max.orderNo ?? 0) + 1;
}

export async function uniqueOrderReference(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const reference = generateOrderReference();
    const existing = await tx.order.findUnique({
      where: { reference },
      select: { id: true },
    });
    if (!existing) return reference;
  }
  return `${generateOrderReference()}${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

export function snapshotAddress(
  kind: OrderAddressKind,
  address: {
    firstName: string;
    lastName: string;
    company: string | null;
    taxOffice: string | null;
    taxNumber: string | null;
    phone: string | null;
    line1: string;
    line2: string | null;
    district: string | null;
    city: string;
    neighborhood: string | null;
    postalCode: string | null;
    country: string;
    isCorporateInvoice: boolean;
  },
) {
  return {
    kind,
    firstName: address.firstName,
    lastName: address.lastName,
    company: address.isCorporateInvoice ? address.company : null,
    taxOffice: address.isCorporateInvoice ? address.taxOffice : null,
    taxNumber: address.isCorporateInvoice ? address.taxNumber : null,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    district: address.district,
    city: address.city,
    neighborhood: address.neighborhood,
    postalCode: address.postalCode,
    country: address.country,
    isCorporateInvoice: address.isCorporateInvoice,
  };
}

export function pricedLine(input: {
  priceExclMinor: number;
  taxRatePercent: number;
  quantity: number;
}) {
  const unitIncl = taxIncludedMinor(input.priceExclMinor, input.taxRatePercent);
  return pricedLineFromIncl({
    unitInclMinor: unitIncl,
    taxRatePercent: input.taxRatePercent,
    quantity: input.quantity,
  });
}

export function pricedLineFromIncl(input: {
  unitInclMinor: number;
  taxRatePercent: number;
  quantity: number;
}) {
  const totalIncl = input.unitInclMinor * input.quantity;
  const totalExcl = taxExcludedMinor(totalIncl, input.taxRatePercent);
  return {
    unitPriceMinor: input.unitInclMinor,
    totalMinor: totalIncl,
    taxMinor: totalIncl - totalExcl,
  };
}

export async function recalculateOrderTotals(tx: Prisma.TransactionClient, orderId: string) {
  const [order, items] = await Promise.all([
    tx.order.findUnique({ where: { id: orderId }, select: { shippingMinor: true } }),
    tx.orderItem.findMany({
      where: { orderId },
      select: {
        totalMinor: true,
        taxRatePercent: true,
        unitPriceMinor: true,
        quantity: true,
        compareAtMinor: true,
      },
    }),
  ]);
  if (!order) throw new Error("ORDER");

  const productsMinor = items.reduce((sum, item) => sum + item.totalMinor, 0);
  const taxMinor = items.reduce((sum, item) => {
    const excl = taxExcludedMinor(item.totalMinor, item.taxRatePercent);
    return sum + (item.totalMinor - excl);
  }, 0);
  const { discountMinor } = orderDiscountSummary(items);

  await tx.order.update({
    where: { id: orderId },
    data: {
      productsMinor,
      taxMinor,
      discountMinor,
      totalMinor: productsMinor + order.shippingMinor,
    },
  });
}

export { snapshotCompareAtMinor };

export { parseOrderDocumentKind, parseOrderPaymentMethod, parseOrderStatus };
