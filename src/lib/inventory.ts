import "server-only";

import {
  Prisma,
  StockMovementKind,
  type PrismaClient,
} from "@prisma/client";
import { allowsOrderWhenOutOfStock, StockShortageError } from "@/lib/product-stock";
import { prisma } from "@/lib/prisma";

export const DEFAULT_STOCK_WAREHOUSE_ID = "cminvwarehouse000000merkez";
export const DEFAULT_STOCK_WAREHOUSE_CODE = "MERKEZ";

export type InventoryClient = Prisma.TransactionClient | PrismaClient;

export class InventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryError";
  }
}

export type ApplyStockDeltaInput = {
  warehouseId: string;
  variantId: string;
  delta: number;
  kind: StockMovementKind;
  allowNegative?: boolean;
  documentId?: string | null;
  orderId?: string | null;
  note?: string | null;
  createdById?: string | null;
};

export async function ensureDefaultStockWarehouse(db: InventoryClient = prisma) {
  const existing = await db.stockWarehouse.findFirst({
    where: { isDefault: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  if (existing) return existing;

  const byId = await db.stockWarehouse.findUnique({
    where: { id: DEFAULT_STOCK_WAREHOUSE_ID },
  });
  if (byId) {
    return db.stockWarehouse.update({
      where: { id: byId.id },
      data: { isDefault: true, isActive: true },
    });
  }

  return db.stockWarehouse.create({
    data: {
      id: DEFAULT_STOCK_WAREHOUSE_ID,
      code: DEFAULT_STOCK_WAREHOUSE_CODE,
      name: "Merkez Depo",
      isActive: true,
      isDefault: true,
      sortOrder: 0,
    },
  });
}

export async function getDefaultStockWarehouse(db: InventoryClient = prisma) {
  const warehouse = await db.stockWarehouse.findFirst({
    where: { isDefault: true, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  if (warehouse) return warehouse;
  return ensureDefaultStockWarehouse(db);
}

export async function sumWarehouseOnHand(db: InventoryClient, variantId: string) {
  const agg = await db.warehouseStock.aggregate({
    where: { variantId },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

export async function syncVariantStockFromWarehouses(db: InventoryClient, variantId: string) {
  const total = await sumWarehouseOnHand(db, variantId);
  await db.productVariant.update({
    where: { id: variantId },
    data: { stockQuantity: total },
  });
  return total;
}

export async function getWarehouseOnHand(
  db: InventoryClient,
  warehouseId: string,
  variantId: string,
) {
  const row = await db.warehouseStock.findUnique({
    where: { warehouseId_variantId: { warehouseId, variantId } },
    select: { quantity: true },
  });
  return row?.quantity ?? 0;
}

export async function applyStockDelta(db: InventoryClient, input: ApplyStockDeltaInput) {
  if (input.delta === 0) {
    return getWarehouseOnHand(db, input.warehouseId, input.variantId);
  }

  const warehouse = await db.stockWarehouse.findUnique({
    where: { id: input.warehouseId },
    select: { id: true, isActive: true, name: true },
  });
  if (!warehouse) throw new InventoryError("Depo bulunamadı.");

  const variant = await db.productVariant.findUnique({
    where: { id: input.variantId },
    select: { id: true, trackInventory: true },
  });
  if (!variant) throw new InventoryError("Varyant bulunamadı.");
  if (!variant.trackInventory) {
    return getWarehouseOnHand(db, input.warehouseId, input.variantId);
  }

  const current = await getWarehouseOnHand(db, input.warehouseId, input.variantId);
  const next = current + input.delta;
  if (next < 0 && !input.allowNegative) {
    throw new InventoryError(`${warehouse.name} deposunda yetersiz stok.`);
  }

  await db.warehouseStock.upsert({
    where: { warehouseId_variantId: { warehouseId: input.warehouseId, variantId: input.variantId } },
    create: {
      warehouseId: input.warehouseId,
      variantId: input.variantId,
      quantity: next,
      reservedQuantity: 0,
    },
    update: { quantity: next },
  });

  await db.stockMovement.create({
    data: {
      warehouseId: input.warehouseId,
      variantId: input.variantId,
      documentId: input.documentId ?? null,
      orderId: input.orderId ?? null,
      kind: input.kind,
      quantity: input.delta,
      balanceAfter: next,
      note: input.note ? input.note.slice(0, 255) : null,
      createdById: input.createdById ?? null,
    },
  });

  await syncVariantStockFromWarehouses(db, input.variantId);
  return next;
}

/** Katalog / XML / ürün formu: toplam stoku varsayılan depodaki farkla eşitler. */
export async function writeCatalogStock(
  db: InventoryClient,
  variantId: string,
  catalogQty: number,
  options?: { createdById?: string | null; note?: string },
) {
  const qty = Math.max(0, Math.round(catalogQty));
  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, trackInventory: true },
  });
  if (!variant?.trackInventory) {
    await db.productVariant.update({
      where: { id: variantId },
      data: { stockQuantity: qty },
    });
    return;
  }

  const onHand = await sumWarehouseOnHand(db, variantId);
  const delta = qty - onHand;
  if (delta === 0) {
    await syncVariantStockFromWarehouses(db, variantId);
    return;
  }

  const warehouse = await getDefaultStockWarehouse(db);
  await applyStockDelta(db, {
    warehouseId: warehouse.id,
    variantId,
    delta,
    kind: StockMovementKind.CATALOG,
    allowNegative: delta < 0,
    note: options?.note ?? "Katalog stok güncellemesi",
    createdById: options?.createdById ?? null,
  });
}

export async function seedWarehouseStockForNewVariants(
  db: InventoryClient,
  variants: { id: string; stockQuantity: number }[],
  note = "İçe aktarma",
) {
  const rows = variants.filter((item) => item.stockQuantity !== 0);
  if (rows.length === 0) return;
  const warehouse = await getDefaultStockWarehouse(db);
  await db.warehouseStock.createMany({
    data: rows.map((item) => ({
      warehouseId: warehouse.id,
      variantId: item.id,
      quantity: item.stockQuantity,
      reservedQuantity: 0,
    })),
    skipDuplicates: true,
  });
  await db.stockMovement.createMany({
    data: rows.map((item) => ({
      warehouseId: warehouse.id,
      variantId: item.id,
      kind: StockMovementKind.CATALOG,
      quantity: item.stockQuantity,
      balanceAfter: item.stockQuantity,
      note,
    })),
  });
}

export async function consumeAvailableStock(
  db: InventoryClient,
  input: {
    variantId: string;
    quantity: number;
    title: string;
    orderId?: string | null;
    createdById?: string | null;
    note?: string | null;
  },
) {
  if (input.quantity <= 0) return;

  const variant = await db.productVariant.findUnique({
    where: { id: input.variantId },
    select: {
      id: true,
      trackInventory: true,
      allowBackorder: true,
      product: { select: { title: true, outOfStockBehavior: true } },
    },
  });
  if (!variant) throw new StockShortageError(input.title || "Ürün");
  if (!variant.trackInventory) return;

  const allowNegative = allowsOrderWhenOutOfStock(
    variant.product.outOfStockBehavior,
    variant.allowBackorder,
  );

  const warehouses = await db.stockWarehouse.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  const list = warehouses.length > 0 ? warehouses : [await getDefaultStockWarehouse(db)];

  let remaining = input.quantity;
  for (const warehouse of list) {
    if (remaining <= 0) break;
    const onHand = await getWarehouseOnHand(db, warehouse.id, input.variantId);
    const take = Math.min(Math.max(0, onHand), remaining);
    if (take <= 0) continue;
    await applyStockDelta(db, {
      warehouseId: warehouse.id,
      variantId: input.variantId,
      delta: -take,
      kind: StockMovementKind.SALE,
      orderId: input.orderId ?? null,
      note: input.note ?? "Sipariş rezervasyonu",
      createdById: input.createdById ?? null,
    });
    remaining -= take;
  }

  if (remaining <= 0) return;

  if (!allowNegative) {
    throw new StockShortageError(variant.product.title || input.title || "Ürün");
  }

  const fallback = list[0] ?? (await getDefaultStockWarehouse(db));
  await applyStockDelta(db, {
    warehouseId: fallback.id,
    variantId: input.variantId,
    delta: -remaining,
    kind: StockMovementKind.SALE,
    allowNegative: true,
    orderId: input.orderId ?? null,
    note: input.note ?? "Sipariş rezervasyonu (eksi bakiye)",
    createdById: input.createdById ?? null,
  });
}

export async function restoreOrderStockToWarehouses(
  db: InventoryClient,
  input: { orderId: string; variantId: string; quantity: number; createdById?: string | null },
) {
  if (input.quantity <= 0) return;

  const sales = await db.stockMovement.findMany({
    where: {
      orderId: input.orderId,
      variantId: input.variantId,
      kind: StockMovementKind.SALE,
    },
    orderBy: { createdAt: "desc" },
    select: { warehouseId: true, quantity: true },
  });

  const takenByWarehouse = new Map<string, number>();
  for (const row of sales) {
    if (row.quantity >= 0) continue;
    takenByWarehouse.set(
      row.warehouseId,
      (takenByWarehouse.get(row.warehouseId) ?? 0) + Math.abs(row.quantity),
    );
  }

  let remaining = input.quantity;
  for (const [warehouseId, taken] of takenByWarehouse) {
    if (remaining <= 0) break;
    const give = Math.min(taken, remaining);
    if (give <= 0) continue;
    await applyStockDelta(db, {
      warehouseId,
      variantId: input.variantId,
      delta: give,
      kind: StockMovementKind.CUSTOMER_RETURN,
      orderId: input.orderId,
      note: "Sipariş stok iadesi",
      createdById: input.createdById ?? null,
    });
    remaining -= give;
  }

  if (remaining <= 0) return;

  const warehouse = await getDefaultStockWarehouse(db);
  await applyStockDelta(db, {
    warehouseId: warehouse.id,
    variantId: input.variantId,
    delta: remaining,
    kind: StockMovementKind.CUSTOMER_RETURN,
    orderId: input.orderId,
    note: "Sipariş stok iadesi",
    createdById: input.createdById ?? null,
  });
}
