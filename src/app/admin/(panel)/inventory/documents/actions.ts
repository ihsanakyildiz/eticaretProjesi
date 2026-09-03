"use server";

import { StockDocumentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  applyConfirmedDocumentStock,
  createDraftStockDocument,
  reverseConfirmedDocumentStock,
} from "@/lib/inventory-documents";
import {
  documentKindNeedsSupplier,
  documentKindNeedsTarget,
  parseStockDocumentKind,
  stockDocumentKindHref,
  stockDocumentKindLabel,
  type StockDocumentKindCode,
} from "@/lib/inventory-labels";
import { findVariantByScan } from "@/lib/inventory-scan";
import { getDefaultStockWarehouse, getWarehouseOnHand } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/staff-permissions";

export type StockDocumentActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  documentId?: string;
  href?: string;
};

function revalidateInventory(documentId?: string, kind?: StockDocumentKindCode) {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/scan");
  revalidatePath("/admin/inventory/movements");
  if (kind) revalidatePath(stockDocumentKindHref(kind));
  if (documentId) {
    revalidatePath(`/admin/inventory/documents/${documentId}`);
    revalidatePath(`/admin/inventory/documents/${documentId}/print`);
  }
}

function emptyToNull(value: string, max = 191) {
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

export async function createStockDocumentAction(input: {
  kind: string;
  warehouseId?: string;
  targetWarehouseId?: string;
}): Promise<StockDocumentActionResult> {
  const gate = await requirePermission("inventory", "create");
  if (!gate.ok) return { ok: false, error: gate.error };

  const kind = parseStockDocumentKind(input.kind);
  if (!kind) return { ok: false, error: "Belge türü geçersiz." };

  const warehouseId =
    String(input.warehouseId ?? "").trim() || (await getDefaultStockWarehouse()).id;
  const warehouse = await prisma.stockWarehouse.findUnique({
    where: { id: warehouseId },
    select: { id: true, isActive: true },
  });
  if (!warehouse?.isActive) return { ok: false, error: "Kaynak depo bulunamadı." };

  let targetWarehouseId = String(input.targetWarehouseId ?? "").trim() || null;
  if (documentKindNeedsTarget(kind) && !targetWarehouseId) {
    const other = await prisma.stockWarehouse.findFirst({
      where: { isActive: true, id: { not: warehouse.id } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true },
    });
    targetWarehouseId = other?.id ?? null;
    if (!targetWarehouseId) {
      return { ok: false, error: "Transfer için en az iki aktif depo gerekir." };
    }
  }

  const document = await createDraftStockDocument(prisma, {
    kind,
    warehouseId: warehouse.id,
    targetWarehouseId,
    createdById: gate.session.user?.id ?? null,
  });
  revalidateInventory(document.id, kind);
  return {
    ok: true,
    documentId: document.id,
    href: `/admin/inventory/documents/${document.id}`,
    message: `${stockDocumentKindLabel(kind)} taslağı oluşturuldu.`,
  };
}

export async function updateStockDocumentMetaAction(input: {
  documentId: string;
  warehouseId: string;
  targetWarehouseId?: string;
  supplierId?: string;
  externalNumber?: string;
  documentDate?: string;
  notes?: string;
}): Promise<StockDocumentActionResult> {
  const gate = await requirePermission("inventory", "update");
  if (!gate.ok) return { ok: false, error: gate.error };

  const document = await prisma.stockDocument.findUnique({
    where: { id: input.documentId },
  });
  if (!document) return { ok: false, error: "Belge bulunamadı." };
  if (document.status !== StockDocumentStatus.DRAFT) {
    return { ok: false, error: "Yalnızca taslak belgeler düzenlenebilir." };
  }
  const kind = parseStockDocumentKind(document.kind);
  if (!kind) return { ok: false, error: "Belge türü geçersiz." };

  const warehouseId = String(input.warehouseId ?? "").trim();
  if (!warehouseId) return { ok: false, error: "Depo seçin." };
  const targetWarehouseId = emptyToNull(String(input.targetWarehouseId ?? ""));
  if (documentKindNeedsTarget(kind) && !targetWarehouseId) {
    return { ok: false, error: "Hedef depo seçin." };
  }
  if (targetWarehouseId && targetWarehouseId === warehouseId) {
    return { ok: false, error: "Kaynak ve hedef depo aynı olamaz." };
  }

  const dateRaw = String(input.documentDate ?? "").trim();
  const documentDate = dateRaw ? new Date(dateRaw) : document.documentDate;
  if (Number.isNaN(documentDate.getTime())) return { ok: false, error: "Tarih geçersiz." };

  await prisma.stockDocument.update({
    where: { id: document.id },
    data: {
      warehouseId,
      targetWarehouseId: documentKindNeedsTarget(kind) ? targetWarehouseId : null,
      supplierId: documentKindNeedsSupplier(kind)
        ? emptyToNull(String(input.supplierId ?? ""))
        : null,
      externalNumber: emptyToNull(String(input.externalNumber ?? ""), 64),
      notes: emptyToNull(String(input.notes ?? ""), 10_000),
      documentDate,
    },
  });
  revalidateInventory(document.id, kind);
  return { ok: true, message: "Belge bilgileri kaydedildi." };
}

export type ScannedStockLine = {
  id: string;
  variantId: string;
  quantity: number;
  unitCostMinor: number | null;
  notes: string | null;
  sku: string;
  barcode: string | null;
  title: string;
  productTitle: string;
  image: string | null;
  warehouseOnHand: number;
  locationId: string | null;
  locationCode: string | null;
};

export async function scanStockDocumentLineAction(input: {
  documentId: string;
  code: string;
  quantity?: number;
}): Promise<
  | {
      ok: true;
      scanned: string;
      addedQuantity: number;
      lineQuantity: number;
      variantTitle: string;
      line: ScannedStockLine;
    }
  | { ok: false; error: string; scanned?: string }
> {
  const gate = await requirePermission("inventory", "update");
  if (!gate.ok) return { ok: false, error: gate.error };

  const document = await prisma.stockDocument.findUnique({
    where: { id: input.documentId },
    select: { id: true, status: true, kind: true, warehouseId: true },
  });
  if (!document) return { ok: false, error: "Belge bulunamadı." };
  if (document.status !== StockDocumentStatus.DRAFT) {
    return { ok: false, error: "Onaylı belgeye satır eklenemez." };
  }
  const kind = parseStockDocumentKind(document.kind);
  if (!kind) return { ok: false, error: "Belge türü geçersiz." };

  const found = await findVariantByScan(input.code);
  if (!found.ok) return { ok: false, error: found.error, scanned: input.code };

  const allowNegative = kind === "ADJUSTMENT";
  const qty = Math.round(input.quantity ?? 1);
  if (!Number.isFinite(qty) || qty === 0 || (!allowNegative && qty < 0)) {
    return { ok: false, error: "Adet geçersiz." };
  }

  const saved = await prisma.$transaction(async (tx) => {
    const existing = await tx.stockDocumentLine.findFirst({
      where: { documentId: document.id, variantId: found.variant.id },
      select: { id: true, quantity: true, unitCostMinor: true, notes: true },
    });
    if (existing) {
      const next = existing.quantity + qty;
      if (kind !== "ADJUSTMENT" && kind !== "COUNT" && next <= 0) {
        await tx.stockDocumentLine.delete({ where: { id: existing.id } });
        return { ...existing, quantity: 0 };
      }
      const updated = await tx.stockDocumentLine.update({
        where: { id: existing.id },
        data: { quantity: { increment: qty } },
        select: { id: true, quantity: true, unitCostMinor: true, notes: true },
      });
      return updated;
    }
    const maxSort = await tx.stockDocumentLine.aggregate({
      where: { documentId: document.id },
      _max: { sortOrder: true },
    });
    return tx.stockDocumentLine.create({
      data: {
        documentId: document.id,
        variantId: found.variant.id,
        quantity: qty,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      select: { id: true, quantity: true, unitCostMinor: true, notes: true },
    });
  });

  const [warehouseOnHand, stock] = await Promise.all([
    getWarehouseOnHand(prisma, document.warehouseId, found.variant.id),
    prisma.warehouseStock.findUnique({
      where: {
        warehouseId_variantId: { warehouseId: document.warehouseId, variantId: found.variant.id },
      },
      select: { locationId: true, location: { select: { code: true } } },
    }),
  ]);
  revalidateInventory(document.id, kind);

  const line: ScannedStockLine = {
    id: saved.id,
    variantId: found.variant.id,
    quantity: saved.quantity,
    unitCostMinor: saved.unitCostMinor,
    notes: saved.notes,
    sku: found.variant.sku,
    barcode: found.variant.barcode,
    title: found.variant.title,
    productTitle: found.variant.productTitle,
    image: found.variant.image,
    warehouseOnHand,
    locationId: stock?.locationId ?? null,
    locationCode: stock?.location?.code ?? null,
  };

  return {
    ok: true,
    scanned: input.code,
    addedQuantity: qty,
    lineQuantity: saved.quantity,
    variantTitle: `${found.variant.productTitle}${found.variant.title ? ` / ${found.variant.title}` : ""}`,
    line,
  };
}

export async function updateStockDocumentLineAction(input: {
  lineId: string;
  quantity: number;
  unitCostMinor?: number | null;
  notes?: string | null;
}): Promise<StockDocumentActionResult> {
  const gate = await requirePermission("inventory", "update");
  if (!gate.ok) return { ok: false, error: gate.error };

  const line = await prisma.stockDocumentLine.findUnique({
    where: { id: input.lineId },
    include: { document: { select: { id: true, status: true, kind: true } } },
  });
  if (!line) return { ok: false, error: "Satır bulunamadı." };
  if (line.document.status !== StockDocumentStatus.DRAFT) {
    return { ok: false, error: "Yalnızca taslak belgeler düzenlenebilir." };
  }
  const kind = parseStockDocumentKind(line.document.kind);
  if (!kind) return { ok: false, error: "Belge türü geçersiz." };
  const allowNegative = kind === "ADJUSTMENT";
  if (!Number.isFinite(input.quantity) || input.quantity === 0) {
    return { ok: false, error: "Adet geçersiz." };
  }
  if (!allowNegative && input.quantity < 0) return { ok: false, error: "Adet negatif olamaz." };

  await prisma.stockDocumentLine.update({
    where: { id: line.id },
    data: {
      quantity: Math.round(input.quantity),
      unitCostMinor:
        input.unitCostMinor == null || !Number.isFinite(input.unitCostMinor)
          ? null
          : Math.max(0, Math.round(input.unitCostMinor)),
      notes: emptyToNull(String(input.notes ?? ""), 255),
    },
  });
  revalidateInventory(line.document.id, kind);
  return { ok: true, message: "Satır güncellendi." };
}

export async function deleteStockDocumentLineAction(lineId: string): Promise<StockDocumentActionResult> {
  const gate = await requirePermission("inventory", "update");
  if (!gate.ok) return { ok: false, error: gate.error };
  const line = await prisma.stockDocumentLine.findUnique({
    where: { id: lineId },
    include: { document: { select: { id: true, status: true, kind: true } } },
  });
  if (!line) return { ok: false, error: "Satır bulunamadı." };
  if (line.document.status !== StockDocumentStatus.DRAFT) {
    return { ok: false, error: "Yalnızca taslak belgeler düzenlenebilir." };
  }
  const kind = parseStockDocumentKind(line.document.kind);
  await prisma.stockDocumentLine.delete({ where: { id: line.id } });
  revalidateInventory(line.document.id, kind ?? undefined);
  return { ok: true, message: "Satır silindi." };
}

export async function confirmStockDocumentAction(documentId: string): Promise<StockDocumentActionResult> {
  const gate = await requirePermission("inventory", "update");
  if (!gate.ok) return { ok: false, error: gate.error };

  const document = await prisma.stockDocument.findUnique({
    where: { id: documentId },
    include: { lines: true },
  });
  if (!document) return { ok: false, error: "Belge bulunamadı." };
  if (document.status !== StockDocumentStatus.DRAFT) {
    return { ok: false, error: "Bu belge zaten işlenmiş." };
  }
  const kind = parseStockDocumentKind(document.kind);
  if (!kind) return { ok: false, error: "Belge türü geçersiz." };
  if (document.lines.length === 0) return { ok: false, error: "Belgede satır yok." };
  if (documentKindNeedsTarget(kind) && !document.targetWarehouseId) {
    return { ok: false, error: "Hedef depo seçin." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await applyConfirmedDocumentStock(tx, document.id, gate.session.user?.id ?? null);
      await tx.stockDocument.update({
        where: { id: document.id },
        data: {
          status: StockDocumentStatus.CONFIRMED,
          confirmedAt: new Date(),
          confirmedById: gate.session.user?.id ?? null,
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stok uygulanamadı.";
    return { ok: false, error: message };
  }

  revalidateInventory(document.id, kind);
  return { ok: true, message: "Belge onaylandı, stok güncellendi." };
}

export async function cancelStockDocumentAction(documentId: string): Promise<StockDocumentActionResult> {
  const gate = await requirePermission("inventory", "delete");
  if (!gate.ok) return { ok: false, error: gate.error };

  const document = await prisma.stockDocument.findUnique({ where: { id: documentId } });
  if (!document) return { ok: false, error: "Belge bulunamadı." };
  const kind = parseStockDocumentKind(document.kind);
  if (document.status === StockDocumentStatus.CANCELED) {
    return { ok: false, error: "Belge zaten iptal." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (document.status === StockDocumentStatus.CONFIRMED) {
        await reverseConfirmedDocumentStock(tx, document.id, gate.session.user?.id ?? null);
      }
      await tx.stockDocument.update({
        where: { id: document.id },
        data: { status: StockDocumentStatus.CANCELED, canceledAt: new Date() },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İptal edilemedi.";
    return { ok: false, error: message };
  }

  revalidateInventory(document.id, kind ?? undefined);
  return { ok: true, message: "Belge iptal edildi." };
}

export async function deleteDraftStockDocumentAction(documentId: string): Promise<StockDocumentActionResult> {
  const gate = await requirePermission("inventory", "delete");
  if (!gate.ok) return { ok: false, error: gate.error };
  const document = await prisma.stockDocument.findUnique({ where: { id: documentId } });
  if (!document) return { ok: false, error: "Belge bulunamadı." };
  if (document.status !== StockDocumentStatus.DRAFT) {
    return { ok: false, error: "Yalnızca taslak belgeler silinebilir." };
  }
  const kind = parseStockDocumentKind(document.kind);
  await prisma.stockDocument.delete({ where: { id: documentId } });
  revalidateInventory(undefined, kind ?? undefined);
  return { ok: true, href: kind ? stockDocumentKindHref(kind) : "/admin/inventory", message: "Taslak silindi." };
}

export async function createInvoiceFromReceiptAction(
  receiptId: string,
): Promise<StockDocumentActionResult> {
  const gate = await requirePermission("inventory", "create");
  if (!gate.ok) return { ok: false, error: gate.error };

  const receipt = await prisma.stockDocument.findUnique({
    where: { id: receiptId },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!receipt || receipt.kind !== "GOODS_RECEIPT") {
    return { ok: false, error: "Giriş irsaliyesi bulunamadı." };
  }
  if (receipt.status !== StockDocumentStatus.CONFIRMED) {
    return { ok: false, error: "Fatura yalnızca onaylı irsaliyeden kesilir." };
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await createDraftStockDocument(tx, {
      kind: "PURCHASE_INVOICE",
      warehouseId: receipt.warehouseId,
      supplierId: receipt.supplierId,
      relatedDocumentId: receipt.id,
      createdById: gate.session.user?.id ?? null,
    });
    if (receipt.lines.length > 0) {
      await tx.stockDocumentLine.createMany({
        data: receipt.lines.map((line) => ({
          documentId: created.id,
          variantId: line.variantId,
          quantity: line.quantity,
          unitCostMinor: line.unitCostMinor,
          notes: line.notes,
          sortOrder: line.sortOrder,
        })),
      });
    }
    return created;
  });

  revalidateInventory(invoice.id, "PURCHASE_INVOICE");
  return {
    ok: true,
    documentId: invoice.id,
    href: `/admin/inventory/documents/${invoice.id}`,
    message: "Alış faturası taslağı irsaliye satırlarından oluşturuldu. Stok tekrar hareket etmez.",
  };
}
