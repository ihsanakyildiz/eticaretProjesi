import "server-only";

import { OrderStatus, type Prisma } from "@prisma/client";
import { ensureOrderWarehouseReservationSchema } from "@/lib/ensure-order-warehouse-reservation-schema";
import { sumWarehouseOnHand, type InventoryClient } from "@/lib/inventory";

type Tx = Prisma.TransactionClient;
type Db = InventoryClient;

/** Rezervasyon kuyruğuna giren / tutan durumlar */
export const WAREHOUSE_RESERVATION_STATUSES: OrderStatus[] = [
  OrderStatus.PAYMENT_ACCEPTED,
  OrderStatus.PROCESSING,
];

export function orderStatusHoldsWarehouseReservation(status: OrderStatus) {
  return (
    status === OrderStatus.PAYMENT_ACCEPTED || status === OrderStatus.PROCESSING
  );
}

export async function sumOpenReservedQuantity(db: Db, variantId: string) {
  const agg = await db.orderItem.aggregate({
    where: {
      variantId,
      reservedQuantity: { gt: 0 },
      order: { status: { in: WAREHOUSE_RESERVATION_STATUSES } },
    },
    _sum: { reservedQuantity: true },
  });
  return agg._sum.reservedQuantity ?? 0;
}

export async function freeWarehouseQty(db: Db, variantId: string) {
  const physical = await sumWarehouseOnHand(db, variantId);
  const reserved = await sumOpenReservedQuantity(db, variantId);
  return Math.max(0, physical - reserved);
}

/** Vitrin / 24 Saatte Kargo: serbest depo = fiziksel − açık rezervasyonlar */
export async function syncVariantSellableStock(db: Db, variantId: string) {
  const free = await freeWarehouseQty(db, variantId);
  await db.productVariant.update({
    where: { id: variantId },
    data: { stockQuantity: free },
  });
  return free;
}

export async function syncOrderReservationFlags(db: Db, orderId: string) {
  await ensureOrderWarehouseReservationSchema().catch(() => undefined);
  const items = await db.orderItem.findMany({
    where: { orderId },
    select: {
      quantity: true,
      reservedQuantity: true,
      variantId: true,
      variant: { select: { trackInventory: true } },
    },
  });
  const allReserved = items.every((item) => {
    if (!item.variantId || item.variant?.trackInventory === false) return true;
    return item.reservedQuantity >= item.quantity;
  });
  await db.order.update({
    where: { id: orderId },
    data: { allItemsWarehouseReserved: allReserved },
  });
  return allReserved;
}

async function setItemReservedQuantity(
  db: Db,
  item: { id: string; quantity: number; reservedQuantity: number },
  nextReserved: number,
) {
  const qty = Math.max(0, Math.min(item.quantity, Math.round(nextReserved)));
  const becameFull = qty >= item.quantity && item.quantity > 0 && item.reservedQuantity < item.quantity;
  await db.orderItem.update({
    where: { id: item.id },
    data: {
      reservedQuantity: qty,
      ...(qty === 0
        ? { warehouseReservedAt: null }
        : becameFull
          ? { warehouseReservedAt: new Date() }
          : {}),
    },
  });
}

/**
 * Serbest depodan bu varyant için bekleyen kalemlere FIFO tahsis.
 */
export async function allocateReservationsForVariant(db: Db, variantId: string) {
  await ensureOrderWarehouseReservationSchema().catch(() => undefined);

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, trackInventory: true },
  });
  if (!variant?.trackInventory) return;

  let free = await freeWarehouseQty(db, variantId);
  if (free <= 0) {
    await syncVariantSellableStock(db, variantId);
    return;
  }

  const waiting = await db.orderItem.findMany({
    where: {
      variantId,
      order: { status: { in: WAREHOUSE_RESERVATION_STATUSES } },
    },
    orderBy: [{ order: { createdAt: "asc" } }, { createdAt: "asc" }],
    select: {
      id: true,
      orderId: true,
      quantity: true,
      reservedQuantity: true,
    },
  });

  const needy = waiting.filter((row) => row.reservedQuantity < row.quantity);
  const touchedOrders = new Set<string>();

  for (const item of needy) {
    if (free <= 0) break;
    const need = item.quantity - item.reservedQuantity;
    const give = Math.min(need, free);
    if (give <= 0) continue;
    await setItemReservedQuantity(db, item, item.reservedQuantity + give);
    free -= give;
    touchedOrders.add(item.orderId);
  }

  for (const orderId of touchedOrders) {
    await syncOrderReservationFlags(db, orderId);
  }
  await syncVariantSellableStock(db, variantId);
}

export async function allocateReservationsForVariants(db: Db, variantIds: string[]) {
  const unique = [...new Set(variantIds.filter(Boolean))];
  for (const variantId of unique) {
    await allocateReservationsForVariant(db, variantId);
  }
}

export async function onWarehouseStockIncreased(db: Db, variantIds: string[]) {
  await allocateReservationsForVariants(db, variantIds);
}

/** Sipariş ödenebilir / işlenebilir oldu: mümkün olduğunca rezerve et */
export async function onOrderBecamePayable(db: Db, orderId: string) {
  await ensureOrderWarehouseReservationSchema().catch(() => undefined);
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      items: {
        select: {
          id: true,
          variantId: true,
          quantity: true,
          reservedQuantity: true,
          variant: { select: { trackInventory: true } },
        },
      },
    },
  });
  if (!order || !orderStatusHoldsWarehouseReservation(order.status)) {
    await syncOrderReservationFlags(db, orderId);
    return;
  }

  const variantIds = new Set<string>();
  for (const item of order.items) {
    if (!item.variantId || item.variant?.trackInventory === false) continue;
    variantIds.add(item.variantId);
  }
  await allocateReservationsForVariants(db, [...variantIds]);
  await syncOrderReservationFlags(db, orderId);
}

/** Tüm kalem rezervasyonlarını bırak ve stoğu sıradakilere dağıt */
export async function releaseOrderWarehouseReservations(db: Db, orderId: string) {
  await ensureOrderWarehouseReservationSchema().catch(() => undefined);
  const items = await db.orderItem.findMany({
    where: { orderId, reservedQuantity: { gt: 0 } },
    select: { id: true, variantId: true, quantity: true, reservedQuantity: true },
  });
  const variantIds = new Set<string>();
  for (const item of items) {
    await setItemReservedQuantity(db, item, 0);
    if (item.variantId) variantIds.add(item.variantId);
  }
  await db.order.update({
    where: { id: orderId },
    data: { allItemsWarehouseReserved: false },
  });
  await allocateReservationsForVariants(db, [...variantIds]);
}

export async function setOrderItemWarehouseReserved(
  db: Db,
  itemId: string,
  reserved: boolean,
) {
  await ensureOrderWarehouseReservationSchema().catch(() => undefined);
  const item = await db.orderItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      orderId: true,
      variantId: true,
      quantity: true,
      reservedQuantity: true,
      order: { select: { status: true } },
      variant: { select: { trackInventory: true } },
    },
  });
  if (!item) throw new Error("Sipariş kalemi bulunamadı.");
  if (!orderStatusHoldsWarehouseReservation(item.order.status)) {
    throw new Error("Bu sipariş durumunda rezervasyon değiştirilemez.");
  }
  if (!item.variantId || item.variant?.trackInventory === false) {
    await setItemReservedQuantity(db, item, reserved ? item.quantity : 0);
    await syncOrderReservationFlags(db, item.orderId);
    return;
  }

  if (!reserved) {
    await setItemReservedQuantity(db, item, 0);
    await allocateReservationsForVariant(db, item.variantId);
    await syncOrderReservationFlags(db, item.orderId);
    return;
  }

  const need = item.quantity - item.reservedQuantity;
  if (need <= 0) {
    await syncOrderReservationFlags(db, item.orderId);
    return;
  }
  const free = await freeWarehouseQty(db, item.variantId);
  if (free < need) {
    throw new Error(
      `Serbest depo yetersiz (gerekli ${need}, serbest ${free}). Önce başka rezervasyonu kaldırın veya stok girin.`,
    );
  }
  await setItemReservedQuantity(db, item, item.quantity);
  await syncVariantSellableStock(db, item.variantId);
  await syncOrderReservationFlags(db, item.orderId);
}

/** Kargoya çıkınca fiziksel düşüm öncesi/sonrası: rezervasyon sayacını temizle */
export async function clearOrderItemReservationsAfterShip(db: Db, orderId: string) {
  await ensureOrderWarehouseReservationSchema().catch(() => undefined);
  const items = await db.orderItem.findMany({
    where: { orderId },
    select: { id: true, variantId: true, quantity: true, reservedQuantity: true },
  });
  const variantIds = new Set<string>();
  for (const item of items) {
    if (item.reservedQuantity > 0) {
      await db.orderItem.update({
        where: { id: item.id },
        data: { reservedQuantity: 0 },
      });
    }
    if (item.variantId) variantIds.add(item.variantId);
  }
  await db.order.update({
    where: { id: orderId },
    data: { allItemsWarehouseReserved: true },
  });
  for (const variantId of variantIds) {
    await syncVariantSellableStock(db, variantId);
  }
}
