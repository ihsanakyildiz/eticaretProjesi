import "server-only";

import { StockMovementKind } from "@prisma/client";
import {
  applyStockDelta,
  getWarehouseOnHand,
  type InventoryClient,
} from "@/lib/inventory";
import {
  parseStockDocumentKind,
  prismaStockDocumentKind,
  stockDocumentNumberPrefix,
  type StockDocumentKindCode,
} from "@/lib/inventory-labels";

export async function nextStockDocumentNumber(
  db: InventoryClient,
  kind: StockDocumentKindCode,
) {
  const year = new Date().getFullYear();
  const prefix = `${stockDocumentNumberPrefix(kind)}-${year}-`;
  const last = await db.stockDocument.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const current = last?.number?.slice(prefix.length) ?? "0";
  const seq = Number.parseInt(current, 10);
  const next = Number.isFinite(seq) ? seq + 1 : 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}

export function documentAffectsStock(input: {
  kind: StockDocumentKindCode;
  relatedDocumentId?: string | null;
}): boolean {
  switch (input.kind) {
    case "PURCHASE_INVOICE":
      return !input.relatedDocumentId;
    case "GOODS_RECEIPT":
    case "GOODS_ISSUE":
    case "TRANSFER":
    case "ADJUSTMENT":
    case "COUNT":
    case "SUPPLIER_RETURN":
    case "CUSTOMER_RETURN":
      return true;
    default: {
      const _exhaustive: never = input.kind;
      return _exhaustive;
    }
  }
}

function movementKindForDocument(
  kind: StockDocumentKindCode,
  direction: "primary" | "target",
): StockMovementKind {
  switch (kind) {
    case "GOODS_RECEIPT":
    case "PURCHASE_INVOICE":
      return StockMovementKind.RECEIPT;
    case "GOODS_ISSUE":
      return StockMovementKind.ISSUE;
    case "TRANSFER":
      return direction === "target"
        ? StockMovementKind.TRANSFER_IN
        : StockMovementKind.TRANSFER_OUT;
    case "ADJUSTMENT":
      return StockMovementKind.ADJUSTMENT;
    case "COUNT":
      return StockMovementKind.COUNT;
    case "SUPPLIER_RETURN":
      return StockMovementKind.SUPPLIER_RETURN;
    case "CUSTOMER_RETURN":
      return StockMovementKind.CUSTOMER_RETURN;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function signedDeltaForLine(input: {
  kind: StockDocumentKindCode;
  quantity: number;
  countedOnHand?: number;
}): number {
  switch (input.kind) {
    case "GOODS_RECEIPT":
    case "PURCHASE_INVOICE":
    case "CUSTOMER_RETURN":
      return Math.abs(input.quantity);
    case "GOODS_ISSUE":
    case "SUPPLIER_RETURN":
    case "TRANSFER":
      return -Math.abs(input.quantity);
    case "ADJUSTMENT":
      return input.quantity;
    case "COUNT":
      return input.quantity - (input.countedOnHand ?? 0);
    default: {
      const _exhaustive: never = input.kind;
      return _exhaustive;
    }
  }
}

export async function applyConfirmedDocumentStock(
  db: InventoryClient,
  documentId: string,
  createdById?: string | null,
) {
  const document = await db.stockDocument.findUnique({
    where: { id: documentId },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!document) throw new Error("Belge bulunamadı.");

  const kind = parseStockDocumentKind(document.kind);
  if (!kind) throw new Error("Belge türü geçersiz.");
  if (!documentAffectsStock({ kind, relatedDocumentId: document.relatedDocumentId })) {
    return;
  }
  if (kind === "TRANSFER" && !document.targetWarehouseId) {
    throw new Error("Transfer için hedef depo seçin.");
  }
  if (kind === "TRANSFER" && document.targetWarehouseId === document.warehouseId) {
    throw new Error("Kaynak ve hedef depo aynı olamaz.");
  }

  for (const line of document.lines) {
    const onHand =
      kind === "COUNT"
        ? await getWarehouseOnHand(db, document.warehouseId, line.variantId)
        : undefined;
    const delta = signedDeltaForLine({
      kind,
      quantity: line.quantity,
      countedOnHand: onHand,
    });
    if (delta === 0) continue;

    await applyStockDelta(db, {
      warehouseId: document.warehouseId,
      variantId: line.variantId,
      delta,
      kind: movementKindForDocument(kind, "primary"),
      documentId: document.id,
      orderId: document.orderId,
      note: `${document.number}`,
      createdById: createdById ?? null,
    });

    if (kind === "TRANSFER" && document.targetWarehouseId) {
      await applyStockDelta(db, {
        warehouseId: document.targetWarehouseId,
        variantId: line.variantId,
        delta: Math.abs(delta),
        kind: movementKindForDocument(kind, "target"),
        documentId: document.id,
        note: `${document.number}`,
        createdById: createdById ?? null,
      });
    }
  }
}

export async function reverseConfirmedDocumentStock(
  db: InventoryClient,
  documentId: string,
  createdById?: string | null,
) {
  const movements = await db.stockMovement.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    select: {
      warehouseId: true,
      variantId: true,
      quantity: true,
      kind: true,
    },
  });

  for (const row of movements) {
    if (row.quantity === 0) continue;
    await applyStockDelta(db, {
      warehouseId: row.warehouseId,
      variantId: row.variantId,
      delta: -row.quantity,
      kind: row.kind,
      documentId,
      note: "Belge iptali",
      createdById: createdById ?? null,
    });
  }
}

export async function createDraftStockDocument(
  db: InventoryClient,
  input: {
    kind: StockDocumentKindCode;
    warehouseId: string;
    targetWarehouseId?: string | null;
    supplierId?: string | null;
    orderId?: string | null;
    relatedDocumentId?: string | null;
    externalNumber?: string | null;
    notes?: string | null;
    createdById?: string | null;
    documentDate?: Date;
  },
) {
  const number = await nextStockDocumentNumber(db, input.kind);
  return db.stockDocument.create({
    data: {
      kind: prismaStockDocumentKind(input.kind),
      status: "DRAFT",
      number,
      warehouseId: input.warehouseId,
      targetWarehouseId: input.targetWarehouseId ?? null,
      supplierId: input.supplierId ?? null,
      orderId: input.orderId ?? null,
      relatedDocumentId: input.relatedDocumentId ?? null,
      externalNumber: input.externalNumber ?? null,
      notes: input.notes ?? null,
      createdById: input.createdById ?? null,
      documentDate: input.documentDate ?? new Date(),
    },
  });
}

