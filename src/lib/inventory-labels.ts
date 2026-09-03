import {
  StockDocumentKind,
  StockDocumentStatus,
  StockMovementKind,
} from "@prisma/client";

export const STOCK_DOCUMENT_KINDS = [
  "GOODS_RECEIPT",
  "PURCHASE_INVOICE",
  "GOODS_ISSUE",
  "TRANSFER",
  "ADJUSTMENT",
  "COUNT",
  "SUPPLIER_RETURN",
  "CUSTOMER_RETURN",
] as const;

export type StockDocumentKindCode = (typeof STOCK_DOCUMENT_KINDS)[number];

export const STOCK_DOCUMENT_STATUSES = ["DRAFT", "CONFIRMED", "CANCELED"] as const;
export type StockDocumentStatusCode = (typeof STOCK_DOCUMENT_STATUSES)[number];

export function parseStockDocumentKind(value: string): StockDocumentKindCode | null {
  switch (value) {
    case "GOODS_RECEIPT":
    case "PURCHASE_INVOICE":
    case "GOODS_ISSUE":
    case "TRANSFER":
    case "ADJUSTMENT":
    case "COUNT":
    case "SUPPLIER_RETURN":
    case "CUSTOMER_RETURN":
      return value;
    default:
      return null;
  }
}

export function parseStockDocumentStatus(value: string): StockDocumentStatusCode | null {
  switch (value) {
    case "DRAFT":
    case "CONFIRMED":
    case "CANCELED":
      return value;
    default:
      return null;
  }
}

export function stockDocumentKindLabel(kind: StockDocumentKindCode): string {
  switch (kind) {
    case "GOODS_RECEIPT":
      return "Giriş irsaliyesi";
    case "PURCHASE_INVOICE":
      return "Alış faturası";
    case "GOODS_ISSUE":
      return "Çıkış irsaliyesi";
    case "TRANSFER":
      return "Depo transferi";
    case "ADJUSTMENT":
      return "Stok düzeltme";
    case "COUNT":
      return "Sayım";
    case "SUPPLIER_RETURN":
      return "Tedarikçi iadesi";
    case "CUSTOMER_RETURN":
      return "Müşteri iadesi";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function stockDocumentKindHref(kind: StockDocumentKindCode): string {
  switch (kind) {
    case "GOODS_RECEIPT":
      return "/admin/inventory/receipts";
    case "PURCHASE_INVOICE":
      return "/admin/inventory/invoices";
    case "GOODS_ISSUE":
      return "/admin/inventory/issues";
    case "TRANSFER":
      return "/admin/inventory/transfers";
    case "ADJUSTMENT":
      return "/admin/inventory/adjustments";
    case "COUNT":
      return "/admin/inventory/counts";
    case "SUPPLIER_RETURN":
      return "/admin/inventory/supplier-returns";
    case "CUSTOMER_RETURN":
      return "/admin/inventory/customer-returns";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function stockDocumentNumberPrefix(kind: StockDocumentKindCode): string {
  switch (kind) {
    case "GOODS_RECEIPT":
      return "GIR";
    case "PURCHASE_INVOICE":
      return "FAT";
    case "GOODS_ISSUE":
      return "CKS";
    case "TRANSFER":
      return "TRS";
    case "ADJUSTMENT":
      return "DZT";
    case "COUNT":
      return "SAY";
    case "SUPPLIER_RETURN":
      return "TIA";
    case "CUSTOMER_RETURN":
      return "MIA";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function stockDocumentStatusLabel(status: StockDocumentStatusCode): string {
  switch (status) {
    case "DRAFT":
      return "Taslak";
    case "CONFIRMED":
      return "Onaylı";
    case "CANCELED":
      return "İptal";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function stockMovementKindLabel(kind: StockMovementKind): string {
  switch (kind) {
    case StockMovementKind.OPENING:
      return "Açılış";
    case StockMovementKind.RECEIPT:
      return "Giriş";
    case StockMovementKind.ISSUE:
      return "Çıkış";
    case StockMovementKind.TRANSFER_OUT:
      return "Transfer çıkış";
    case StockMovementKind.TRANSFER_IN:
      return "Transfer giriş";
    case StockMovementKind.ADJUSTMENT:
      return "Düzeltme";
    case StockMovementKind.COUNT:
      return "Sayım";
    case StockMovementKind.SALE:
      return "Satış";
    case StockMovementKind.CUSTOMER_RETURN:
      return "Müşteri iadesi";
    case StockMovementKind.SUPPLIER_RETURN:
      return "Tedarikçi iadesi";
    case StockMovementKind.CATALOG:
      return "Katalog";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function documentKindNeedsTarget(kind: StockDocumentKindCode): boolean {
  return kind === "TRANSFER";
}

export function documentKindNeedsSupplier(kind: StockDocumentKindCode): boolean {
  switch (kind) {
    case "GOODS_RECEIPT":
    case "PURCHASE_INVOICE":
    case "SUPPLIER_RETURN":
      return true;
    case "GOODS_ISSUE":
    case "TRANSFER":
    case "ADJUSTMENT":
    case "COUNT":
    case "CUSTOMER_RETURN":
      return false;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function documentQuantityHint(kind: StockDocumentKindCode): string {
  switch (kind) {
    case "COUNT":
      return "Sayılan adet";
    case "ADJUSTMENT":
      return "Fark (+ giriş / − çıkış)";
    case "GOODS_RECEIPT":
    case "PURCHASE_INVOICE":
    case "GOODS_ISSUE":
    case "TRANSFER":
    case "SUPPLIER_RETURN":
    case "CUSTOMER_RETURN":
      return "Adet";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function prismaStockDocumentKind(kind: StockDocumentKindCode): StockDocumentKind {
  switch (kind) {
    case "GOODS_RECEIPT":
      return StockDocumentKind.GOODS_RECEIPT;
    case "PURCHASE_INVOICE":
      return StockDocumentKind.PURCHASE_INVOICE;
    case "GOODS_ISSUE":
      return StockDocumentKind.GOODS_ISSUE;
    case "TRANSFER":
      return StockDocumentKind.TRANSFER;
    case "ADJUSTMENT":
      return StockDocumentKind.ADJUSTMENT;
    case "COUNT":
      return StockDocumentKind.COUNT;
    case "SUPPLIER_RETURN":
      return StockDocumentKind.SUPPLIER_RETURN;
    case "CUSTOMER_RETURN":
      return StockDocumentKind.CUSTOMER_RETURN;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function prismaStockDocumentStatus(status: StockDocumentStatusCode): StockDocumentStatus {
  switch (status) {
    case "DRAFT":
      return StockDocumentStatus.DRAFT;
    case "CONFIRMED":
      return StockDocumentStatus.CONFIRMED;
    case "CANCELED":
      return StockDocumentStatus.CANCELED;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function stockDocumentKindFromPrisma(kind: StockDocumentKind): StockDocumentKindCode {
  return kind;
}

export function stockDocumentStatusFromPrisma(status: StockDocumentStatus): StockDocumentStatusCode {
  return status;
}
