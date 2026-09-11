import "server-only";

import { prisma } from "@/lib/prisma";

export type FeedSyncLocks = {
  variantIds: Set<string>;
  productIds: Set<string>;
};

let ensurePromise: Promise<void> | null = null;

async function ensureFeedSyncLockedColumnOnce() {
  const columns = await prisma.$queryRaw<Array<{ COLUMN_NAME: string }>>`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'product_variants'
      AND COLUMN_NAME = 'feedSyncLocked'
  `;
  if (columns.length > 0) return;

  await prisma.$executeRawUnsafe(
    "ALTER TABLE `product_variants` ADD COLUMN `feedSyncLocked` BOOLEAN NOT NULL DEFAULT false",
  );
  try {
    await prisma.$executeRawUnsafe(
      "CREATE INDEX `product_variants_feedSyncLocked_idx` ON `product_variants`(`feedSyncLocked`)",
    );
  } catch {
    /* dizin zaten varsa veya paylaşımlı hosting izin vermezse liste yine açılır */
  }
}

/** Canlıda `db push` atlanırsa ürün listesi P2022 ile düşmesin. */
export async function ensureFeedSyncLockedColumn() {
  if (!ensurePromise) {
    ensurePromise = ensureFeedSyncLockedColumnOnce().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}

export async function loadFeedSyncLocks(): Promise<FeedSyncLocks> {
  try {
    await ensureFeedSyncLockedColumn();
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
