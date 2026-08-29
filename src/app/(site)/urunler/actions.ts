"use server";

import { prisma } from "@/lib/prisma";
import { getCatalogProductsByIds } from "@/lib/catalog-products";
import type { CatalogProductCard } from "@/lib/catalog-storefront";

export async function recordProductViewAction(productId: string) {
  const id = productId.trim();
  if (!id) return;
  await prisma.product.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => undefined);
}

export async function recordProductClickAction(productId: string) {
  const id = productId.trim();
  if (!id) return;
  await prisma.product.update({
    where: { id },
    data: { clickCount: { increment: 1 } },
  }).catch(() => undefined);
}

export async function getRecentlyViewedProductsAction(
  ids: string[],
): Promise<CatalogProductCard[]> {
  return getCatalogProductsByIds(ids);
}
