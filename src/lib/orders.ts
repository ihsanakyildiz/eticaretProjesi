export const ORDER_STATUSES = [
  "AWAITING_PAYMENT",
  "PAYMENT_ACCEPTED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELED",
  "PAYMENT_ERROR",
  "REFUNDED",
] as const;
export type OrderStatusCode = (typeof ORDER_STATUSES)[number];

export const ORDER_PAYMENT_METHODS = [
  "BANK_WIRE",
  "CREDIT_CARD",
  "CASH_ON_DELIVERY",
  "OTHER",
] as const;
export type OrderPaymentMethodCode = (typeof ORDER_PAYMENT_METHODS)[number];

export const ORDER_DOCUMENT_KINDS = ["INVOICE", "DELIVERY_SLIP"] as const;
export type OrderDocumentKindCode = (typeof ORDER_DOCUMENT_KINDS)[number];

export function parseOrderStatus(value: string): OrderStatusCode {
  switch (value) {
    case "AWAITING_PAYMENT":
    case "PAYMENT_ACCEPTED":
    case "PROCESSING":
    case "SHIPPED":
    case "DELIVERED":
    case "CANCELED":
    case "PAYMENT_ERROR":
    case "REFUNDED":
      return value;
    default:
      return "AWAITING_PAYMENT";
  }
}

export function parseOrderPaymentMethod(value: string): OrderPaymentMethodCode {
  switch (value) {
    case "BANK_WIRE":
    case "CREDIT_CARD":
    case "CASH_ON_DELIVERY":
    case "OTHER":
      return value;
    default:
      return "BANK_WIRE";
  }
}

export function orderStatusLabel(status: OrderStatusCode): string {
  switch (status) {
    case "AWAITING_PAYMENT":
      return "Havale ile ödeme bekleniyor";
    case "PAYMENT_ACCEPTED":
      return "Ödeme kabul edildi";
    case "PROCESSING":
      return "Hazırlanıyor";
    case "SHIPPED":
      return "Kargoya verildi";
    case "DELIVERED":
      return "Teslim edildi";
    case "CANCELED":
      return "İptal edildi";
    case "PAYMENT_ERROR":
      return "Ödeme hatası";
    case "REFUNDED":
      return "İade edildi";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function orderPaymentMethodLabel(method: OrderPaymentMethodCode): string {
  switch (method) {
    case "BANK_WIRE":
      return "Havale / EFT";
    case "CREDIT_CARD":
      return "Kredi kartı";
    case "CASH_ON_DELIVERY":
      return "Kapıda ödeme";
    case "OTHER":
      return "Diğer";
    default: {
      const _exhaustive: never = method;
      return _exhaustive;
    }
  }
}

export function orderStatusColor(status: OrderStatusCode): string {
  switch (status) {
    case "AWAITING_PAYMENT":
      return "#405189";
    case "PAYMENT_ACCEPTED":
      return "#0ab39c";
    case "PROCESSING":
      return "#f59e0b";
    case "SHIPPED":
      return "#0284c7";
    case "DELIVERED":
      return "#047857";
    case "CANCELED":
      return "#64748b";
    case "PAYMENT_ERROR":
      return "#e11d48";
    case "REFUNDED":
      return "#7c3aed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function orderStatusBadgeClass(status: OrderStatusCode): string {
  switch (status) {
    case "AWAITING_PAYMENT":
      return "bg-[#405189] text-white";
    case "PAYMENT_ACCEPTED":
      return "bg-[#0ab39c] text-white";
    case "PROCESSING":
      return "bg-amber-500 text-white";
    case "SHIPPED":
      return "bg-sky-600 text-white";
    case "DELIVERED":
      return "bg-emerald-700 text-white";
    case "CANCELED":
      return "bg-slate-500 text-white";
    case "PAYMENT_ERROR":
      return "bg-rose-600 text-white";
    case "REFUNDED":
      return "bg-violet-600 text-white";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function generateOrderReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let value = "";
  for (let index = 0; index < 9; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}

export function parseOrderDocumentKind(value: string): OrderDocumentKindCode {
  switch (value) {
    case "INVOICE":
    case "DELIVERY_SLIP":
      return value;
    default:
      return "INVOICE";
  }
}

export function orderDocumentKindLabel(kind: OrderDocumentKindCode): string {
  switch (kind) {
    case "INVOICE":
      return "Fatura";
    case "DELIVERY_SLIP":
      return "İrsaliye";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function formatOrderDocumentNumber(kind: OrderDocumentKindCode, number: number): string {
  const padded = String(number).padStart(4, "0");
  switch (kind) {
    case "INVOICE":
      return `FAT-${padded}`;
    case "DELIVERY_SLIP":
      return `IRS-${padded}`;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function formatOrderDate(iso: string): string {
  return formatOrderDateTime(iso).slice(0, 10);
}

export function formatWeightKg(value: number): string {
  return `${value.toLocaleString("tr-TR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} kg`;
}

export function formatOrderDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function customerInitialsName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();
  if (!first && !last) return "—";
  const initial = first ? `${first[0]}.` : "";
  return [initial, last.toLocaleUpperCase("tr-TR")].filter(Boolean).join(" ");
}
