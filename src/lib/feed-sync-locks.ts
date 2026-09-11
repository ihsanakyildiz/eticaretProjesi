import "server-only";

import { prisma } from "@/lib/prisma";

export type FeedSyncLocks = {
  variantIds: Set<string>;
  productIds: Set<string>;
};

export async function loadFeedSyncLocks(): Promise<FeedSyncLocks> {
  try {
    const rows = await prisma.productVariant.findMany({
      where: { feedSyncLocked: true },
      select: { id: true, productId: true },
    });
    return {
      variantIds: new Set(rows.map((row) => row.id)),
      productIds: new Set(rows.map((row) => row.productId)),
    };
  } catch {
    return { variantIds: new Set(), productIds: new Set() };
  }
}

export function feedSyncUpdateLocks(
  hit: { productId: string; variantId?: string | null },
  locks: FeedSyncLocks,
  campaignPriceLocks: Set<string>,
) {
  const variantLocked = Boolean(hit.variantId && locks.variantIds.has(hit.variantId));
  return {
    lockPrices: campaignPriceLocks.has(hit.productId) || variantLocked,
    lockStock: variantLocked,
    lockSaleClose: locks.productIds.has(hit.productId),
  };
}

export function excludeFeedLockedProductFilter(productIds: Set<string>) {
  if (productIds.size === 0) return {};
  return { id: { notIn: [...productIds] } };
}
