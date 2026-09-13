import "server-only";

import { OrderStatus, type Prisma } from "@prisma/client";
import { isAdvancedInventoryEnabled } from "@/lib/advanced-inventory";
import {
  consumeAvailableStock,
  restoreOrderStockToWarehouses,
} from "@/lib/inventory";
import {
  clearOrderItemReservationsAfterShip,
  onOrderBecamePayable,
  orderStatusHoldsWarehouseReservation,
  releaseOrderWarehouseReservations,
} from "@/lib/order-warehouse-reservation";
import { allowsOrderWhenOutOfStock, StockShortageError } from "@/lib/product-stock";

export { StockShortageError };

type Tx = Prisma.TransactionClient;

async function deductTrackedStock(
  tx: Tx,
  input: { variantId: string; quantity: number; title: string; orderId?: string },
) {
  if (input.quantity <= 0) return;

  const variant = await tx.productVariant.findUnique({
    where: { id: input.variantId },
    select: {
      id: true,
      trackInventory: true,
      allowBackorder: true,
      product: { select: { title: true, outOfStockBehavior: true } },
    },
  });
  if (!variant) {
    throw new StockShortageError(input.title || "Ürün");
  }
  if (!variant.trackInventory) return;

  try {
    await consumeAvailableStock(tx, {
      variantId: variant.id,
      quantity: input.quantity,
      title: variant.product.title || input.title,
      orderId: input.orderId ?? null,
      note: "Sipariş rezervasyonu",
    });
  } catch (error) {
    if (error instanceof StockShortageError) throw error;
    const allowNegative = allowsOrderWhenOutOfStock(
      variant.product.outOfStockBehavior,
      variant.allowBackorder,
    );
    if (!allowNegative) {
      throw new StockShortageError(variant.product.title || input.title || "Ürün");
    }
    throw error;
  }
}

async function restoreTrackedStock(
  tx: Tx,
  input: { orderId: string; variantId: string | null; quantity: number },
) {
  if (!input.variantId || input.quantity <= 0) return;
  const variant = await tx.productVariant.findUnique({
    where: { id: input.variantId },
    select: { id: true, trackInventory: true },
  });
  if (!variant?.trackInventory) return;
  await restoreOrderStockToWarehouses(tx, {
    orderId: input.orderId,
    variantId: variant.id,
    quantity: input.quantity,
  });
}

export async function reserveOrderStock(tx: Tx, orderId: string) {
  if (await isAdvancedInventoryEnabled()) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });
    if (!order) return;
    if (!orderStatusHoldsWarehouseReservation(order.status)) return;
    await onOrderBecamePayable(tx, orderId);
    await tx.order.update({
      where: { id: orderId },
      data: { stockReserved: true },
    });
    return;
  }

  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      stockReserved: true,
      items: { select: { variantId: true, quantity: true, title: true } },
    },
  });
  if (!order || order.stockReserved) return;

  const lines = [...order.items].sort((a, b) =>
    String(a.variantId ?? "").localeCompare(String(b.variantId ?? "")),
  );
  for (const item of lines) {
    if (!item.variantId) continue;
    await deductTrackedStock(tx, {
      variantId: item.variantId,
      quantity: item.quantity,
      title: item.title,
      orderId: order.id,
    });
  }

  await tx.order.update({
    where: { id: order.id },
    data: { stockReserved: true },
  });
}

export async function releaseOrderStock(tx: Tx, orderId: string) {
  if (await isAdvancedInventoryEnabled()) {
    await releaseOrderWarehouseReservations(tx, orderId);
    await tx.order.update({
      where: { id: orderId },
      data: { stockReserved: false },
    });
    return;
  }

  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      stockReserved: true,
      items: { select: { variantId: true, quantity: true } },
    },
  });
  if (!order?.stockReserved) return;

  for (const item of order.items) {
    await restoreTrackedStock(tx, {
      orderId: order.id,
      variantId: item.variantId,
      quantity: item.quantity,
    });
  }

  await tx.order.update({
    where: { id: order.id },
    data: { stockReserved: false },
  });
}

async function consumeWarehouseOnShip(tx: Tx, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      items: {
        select: {
          variantId: true,
          quantity: true,
          reservedQuantity: true,
          title: true,
        },
      },
    },
  });
  if (!order) return;

  for (const item of order.items) {
    if (!item.variantId) continue;
    const qty = item.reservedQuantity > 0 ? item.reservedQuantity : item.quantity;
    if (qty <= 0) continue;
    await consumeAvailableStock(tx, {
      variantId: item.variantId,
      quantity: qty,
      title: item.title,
      orderId: order.id,
      note: "Kargo — depo çıkışı",
    });
  }
  await clearOrderItemReservationsAfterShip(tx, orderId);
}

export async function syncOrderStockForStatus(tx: Tx, orderId: string, nextStatus: OrderStatus) {
  const advanced = await isAdvancedInventoryEnabled();

  switch (nextStatus) {
    case OrderStatus.CANCELED:
      await releaseOrderStock(tx, orderId);
      return;
    case OrderStatus.REFUNDED:
      return;
    case OrderStatus.AWAITING_PAYMENT:
    case OrderStatus.PAYMENT_ERROR:
      if (advanced) {
        await releaseOrderWarehouseReservations(tx, orderId);
        await tx.order.update({
          where: { id: orderId },
          data: { stockReserved: false },
        });
      }
      return;
    case OrderStatus.PAYMENT_ACCEPTED:
    case OrderStatus.PROCESSING: {
      // FIFO allocate açık sipariş durumuna bakar; önce hedef status yazılmalı
      const current = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });
      if (current && current.status !== nextStatus) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: nextStatus },
        });
      }
      await reserveOrderStock(tx, orderId);
      return;
    }
    case OrderStatus.SHIPPED:
    case OrderStatus.DELIVERED:
      if (advanced) {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: { status: true, stockReserved: true },
        });
        // Fiziksel düşüm yalnızca ilk kez kargoya geçerken
        if (order && order.status !== OrderStatus.SHIPPED && order.status !== OrderStatus.DELIVERED) {
          await consumeWarehouseOnShip(tx, orderId);
          await tx.order.update({
            where: { id: orderId },
            data: { stockReserved: true },
          });
        }
      } else {
        await reserveOrderStock(tx, orderId);
      }
      return;
    default: {
      const _exhaustive: never = nextStatus;
      return _exhaustive;
    }
  }
}

export async function restockOrderItemQuantities(
  tx: Tx,
  lines: { variantId: string | null; quantity: number }[],
  orderId: string,
) {
  if (await isAdvancedInventoryEnabled()) {
    // Gelişmiş stokta fiziksel düşüm kargoda; iade/restock klasik hareketle yapılır
    return;
  }
  for (const line of lines) {
    await restoreTrackedStock(tx, {
      orderId,
      variantId: line.variantId,
      quantity: line.quantity,
    });
  }
}

export async function markOrderStockReleased(tx: Tx, orderId: string) {
  await tx.order.update({
    where: { id: orderId },
    data: { stockReserved: false, allItemsWarehouseReserved: false },
  });
}

export async function applyReservedStockDelta(
  tx: Tx,
  input: { orderId: string; variantId: string | null; quantityDelta: number; title: string },
) {
  if (input.quantityDelta === 0 || !input.variantId) return;

  if (await isAdvancedInventoryEnabled()) {
    await onOrderBecamePayable(tx, input.orderId);
    return;
  }

  const order = await tx.order.findUnique({
    where: { id: input.orderId },
    select: { stockReserved: true },
  });
  if (!order?.stockReserved) return;

  if (input.quantityDelta > 0) {
    await deductTrackedStock(tx, {
      variantId: input.variantId,
      quantity: input.quantityDelta,
      title: input.title,
      orderId: input.orderId,
    });
    return;
  }

  await restoreTrackedStock(tx, {
    orderId: input.orderId,
    variantId: input.variantId,
    quantity: Math.abs(input.quantityDelta),
  });
}
