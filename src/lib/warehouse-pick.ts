import "server-only";

import { prisma } from "@/lib/prisma";
import { compareLocationCodes, resolvePickLocation } from "@/lib/inventory-locations";
import type { WarehouseLine } from "@/lib/warehouse";

export async function loadOrderPickLines(orderId: string): Promise<WarehouseLine[]> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          variantTitle: true,
          sku: true,
          quantity: true,
          packedQuantity: true,
          image: true,
          variant: { select: { id: true, sku: true, barcode: true } },
          product: { select: { sku: true } },
        },
      },
    },
  });
  if (!order) return [];

  const variantIds = order.items.map((item) => item.variant?.id).filter((id): id is string => Boolean(id));
  const stocks = variantIds.length
    ? await prisma.warehouseStock.findMany({
        where: { variantId: { in: variantIds } },
        select: {
          variantId: true,
          quantity: true,
          warehouse: { select: { code: true, isDefault: true } },
          location: { select: { id: true, code: true, aisle: true, rack: true, shelf: true } },
        },
      })
    : [];
  const stocksByVariant = new Map<string, typeof stocks>();
  for (const row of stocks) {
    const list = stocksByVariant.get(row.variantId) ?? [];
    list.push(row);
    stocksByVariant.set(row.variantId, list);
  }

  return [...order.items]
    .map((item) => {
      const pick = item.variant?.id
        ? resolvePickLocation(
            (stocksByVariant.get(item.variant.id) ?? []).map((row) => ({
              quantity: row.quantity,
              warehouseCode: row.warehouse.code,
              isDefault: row.warehouse.isDefault,
              location: row.location,
            })),
          )
        : null;
      return {
        id: item.id,
        title: item.title,
        variantTitle: item.variantTitle,
        sku: item.sku || item.variant?.sku || item.product?.sku || null,
        barcode: item.variant?.barcode || null,
        quantity: item.quantity,
        packedQuantity: item.packedQuantity,
        image: item.image,
        locationCode: pick?.code ?? null,
        locationHint: pick?.hint ?? null,
      };
    })
    .sort((left, right) => compareLocationCodes(left.locationCode, right.locationCode));
}
