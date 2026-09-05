import "server-only";

import { expireEndedCampaigns } from "@/lib/campaigns";
import { bustCatalogCache } from "@/lib/catalog-products";
import { prisma } from "@/lib/prisma";
import {
  clearedSaleWrite,
  listPriceMinor,
  productFieldsFromStoredSale,
} from "@/lib/product-sale";

const BATCH = 80;

export async function expireEndedProductSales(now = new Date()) {
  await expireEndedCampaigns(now);
  const due = await prisma.productVariant.findMany({
    where: { saleEndsAt: { lte: now } },
    select: {
      id: true,
      productId: true,
      priceMinor: true,
      compareAtMinor: true,
    },
    take: 400,
  });
  if (due.length === 0) return { expired: 0 };

  const productIds = new Set<string>();
  for (let i = 0; i < due.length; i += BATCH) {
    const chunk = due.slice(i, i + BATCH);
    await prisma.$transaction(
      chunk.map((row) =>
        prisma.productVariant.update({
          where: { id: row.id },
          data: clearedSaleWrite(listPriceMinor(row)),
        }),
      ),
    );
    for (const row of chunk) productIds.add(row.productId);
  }

  const ids = [...productIds];
  const variants = await prisma.productVariant.findMany({
    where: { productId: { in: ids } },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
    select: {
      productId: true,
      isDefault: true,
      priceMinor: true,
      compareAtMinor: true,
      saleStartsAt: true,
      saleEndsAt: true,
    },
  });
  const byProduct = new Map<string, (typeof variants)[number]>();
  for (const row of variants) {
    const current = byProduct.get(row.productId);
    if (!current || row.isDefault) byProduct.set(row.productId, row);
  }

  await prisma.$transaction(
    ids.flatMap((productId) => {
      const variant = byProduct.get(productId);
      if (!variant) return [];
      return [
        prisma.product.update({
          where: { id: productId },
          data: productFieldsFromStoredSale(variant),
        }),
      ];
    }),
  );

  bustCatalogCache();
  return { expired: due.length };
}

export async function syncProductSaleFromDefault(productId: string) {
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
    select: {
      isDefault: true,
      priceMinor: true,
      compareAtMinor: true,
      saleStartsAt: true,
      saleEndsAt: true,
    },
  });
  const variant = variants.find((row) => row.isDefault) ?? variants[0];
  if (!variant) return;
  await prisma.product.update({
    where: { id: productId },
    data: productFieldsFromStoredSale(variant),
  });
}
