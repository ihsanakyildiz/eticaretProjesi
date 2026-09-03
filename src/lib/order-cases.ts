import type { OrderStatusCode } from "@/lib/orders";

export const ORDER_CASE_KINDS = ["CANCEL", "RETURN"] as const;
export type OrderCaseKindCode = (typeof ORDER_CASE_KINDS)[number];

export const ORDER_CASE_STATUSES = [
  "REQUESTED",
  "REJECTED",
  "APPROVED",
  "AWAITING_RETURN",
  "RECEIVED",
  "COMPLETED",
] as const;
export type OrderCaseStatusCode = (typeof ORDER_CASE_STATUSES)[number];

export const ORDER_CASE_REASONS = [
  "CHANGED_MIND",
  "DEFECTIVE",
  "WRONG_ITEM",
  "DAMAGED",
  "NOT_DELIVERED",
  "OTHER",
] as const;
export type OrderCaseReasonCode = (typeof ORDER_CASE_REASONS)[number];

export const ORDER_RETURN_CONDITIONS = ["PENDING", "SELLABLE", "UNSALEABLE"] as const;
export type OrderReturnConditionCode = (typeof ORDER_RETURN_CONDITIONS)[number];

export const OPEN_ORDER_CASE_STATUSES: readonly OrderCaseStatusCode[] = [
  "REQUESTED",
  "APPROVED",
  "AWAITING_RETURN",
  "RECEIVED",
];

export type FulfillmentStage = "unpaid" | "paid_unshipped" | "in_transit" | "delivered" | "closed";

export function parseOrderCaseKind(value: string): OrderCaseKindCode {
  switch (value) {
    case "CANCEL":
    case "RETURN":
      return value;
    default:
      return "RETURN";
  }
}

export function parseOrderCaseStatus(value: string): OrderCaseStatusCode {
  switch (value) {
    case "REQUESTED":
    case "REJECTED":
    case "APPROVED":
    case "AWAITING_RETURN":
    case "RECEIVED":
    case "COMPLETED":
      return value;
    default:
      return "REQUESTED";
  }
}

export function parseOrderCaseReason(value: string): OrderCaseReasonCode {
  switch (value) {
    case "CHANGED_MIND":
    case "DEFECTIVE":
    case "WRONG_ITEM":
    case "DAMAGED":
    case "NOT_DELIVERED":
    case "OTHER":
      return value;
    default:
      return "OTHER";
  }
}

export function parseOrderReturnCondition(value: string): OrderReturnConditionCode {
  switch (value) {
    case "PENDING":
    case "SELLABLE":
    case "UNSALEABLE":
      return value;
    default:
      return "PENDING";
  }
}

export function orderCaseKindLabel(kind: OrderCaseKindCode): string {
  switch (kind) {
    case "CANCEL":
      return "İptal";
    case "RETURN":
      return "İade";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function orderCaseStatusLabel(status: OrderCaseStatusCode): string {
  switch (status) {
    case "REQUESTED":
      return "Talep alındı";
    case "REJECTED":
      return "Reddedildi";
    case "APPROVED":
      return "Onaylandı";
    case "AWAITING_RETURN":
      return "Ürün bekleniyor";
    case "RECEIVED":
      return "Depoya geldi";
    case "COMPLETED":
      return "Tamamlandı";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function orderCaseReasonLabel(reason: OrderCaseReasonCode): string {
  switch (reason) {
    case "CHANGED_MIND":
      return "Vazgeçtim / fikrimi değiştirdim";
    case "DEFECTIVE":
      return "Kusurlu / arızalı ürün";
    case "WRONG_ITEM":
      return "Yanlış ürün gönderildi";
    case "DAMAGED":
      return "Hasarlı teslimat";
    case "NOT_DELIVERED":
      return "Teslim edilmedi / kayıp";
    case "OTHER":
      return "Diğer";
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

export function orderReturnConditionLabel(condition: OrderReturnConditionCode): string {
  switch (condition) {
    case "PENDING":
      return "Kontrol bekliyor";
    case "SELLABLE":
      return "Satılabilir";
    case "UNSALEABLE":
      return "Satılamaz";
    default: {
      const _exhaustive: never = condition;
      return _exhaustive;
    }
  }
}

export function orderCaseStatusBadgeClass(status: OrderCaseStatusCode): string {
  switch (status) {
    case "REQUESTED":
      return "bg-amber-50 text-amber-800";
    case "REJECTED":
      return "bg-rose-50 text-rose-800";
    case "APPROVED":
      return "bg-sky-50 text-sky-800";
    case "AWAITING_RETURN":
      return "bg-indigo-50 text-indigo-800";
    case "RECEIVED":
      return "bg-cyan-50 text-cyan-800";
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-800";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function isOpenOrderCaseStatus(status: OrderCaseStatusCode): boolean {
  switch (status) {
    case "REQUESTED":
    case "APPROVED":
    case "AWAITING_RETURN":
    case "RECEIVED":
      return true;
    case "REJECTED":
    case "COMPLETED":
      return false;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function fulfillmentStage(status: OrderStatusCode): FulfillmentStage {
  switch (status) {
    case "AWAITING_PAYMENT":
    case "PAYMENT_ERROR":
      return "unpaid";
    case "PAYMENT_ACCEPTED":
    case "PROCESSING":
      return "paid_unshipped";
    case "SHIPPED":
      return "in_transit";
    case "DELIVERED":
      return "delivered";
    case "CANCELED":
    case "REFUNDED":
      return "closed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function goodsHaveLeftWarehouse(status: OrderStatusCode): boolean {
  const stage = fulfillmentStage(status);
  return stage === "in_transit" || stage === "delivered";
}

export function canOpenCancelCase(status: OrderStatusCode): boolean {
  const stage = fulfillmentStage(status);
  return stage === "unpaid" || stage === "paid_unshipped";
}

export function canOpenReturnCase(status: OrderStatusCode): boolean {
  return goodsHaveLeftWarehouse(status);
}

export function caseKindForOrderStatus(status: OrderStatusCode): OrderCaseKindCode | null {
  if (canOpenCancelCase(status)) return "CANCEL";
  if (canOpenReturnCase(status)) return "RETURN";
  return null;
}

export function statusChangeBlockedByFulfillment(
  current: OrderStatusCode,
  next: OrderStatusCode,
): string | null {
  if (next === "CANCELED" && goodsHaveLeftWarehouse(current)) {
    return "Kargoya verilmiş veya teslim edilmiş sipariş doğrudan iptal edilemez. İade sürecini kullanın; ürün depoya gelmeden ödeme iade edilmez.";
  }
  if (next === "REFUNDED" && goodsHaveLeftWarehouse(current)) {
    return "Kargo veya teslim sonrası doğrudan “İade edildi” seçilemez. Ürün depoya gelip kontrol edilmeden ödeme ve stok hareketi yapılmaz.";
  }
  return null;
}

export type OrderCaseItemView = {
  id: string;
  orderItemId: string;
  title: string;
  variantTitle: string | null;
  quantity: number;
  condition: OrderReturnConditionCode;
  restockQuantity: number;
};

export type OrderCaseEventView = {
  id: string;
  status: OrderCaseStatusCode;
  note: string | null;
  createdAt: string;
};

export type OrderCaseView = {
  id: string;
  code: string;
  kind: OrderCaseKindCode;
  status: OrderCaseStatusCode;
  reason: OrderCaseReasonCode;
  source: "CUSTOMER" | "STAFF";
  customerNote: string | null;
  staffNote: string | null;
  rejectReason: string | null;
  refundAmountMinor: number | null;
  returnless: boolean;
  returnCarrierName: string | null;
  returnTrackingNumber: string | null;
  receivedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  items: OrderCaseItemView[];
  events: OrderCaseEventView[];
};
