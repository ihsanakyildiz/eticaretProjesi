import "server-only";

import { prisma } from "@/lib/prisma";

let ensurePromise: Promise<void> | null = null;

async function ensureCardCampaignBannerColumnOnce() {
  const columns = await prisma.$queryRaw<Array<{ COLUMN_NAME: string }>>`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cards'
      AND COLUMN_NAME = 'isCampaignBanner'
  `;
  if (columns.length > 0) return;

  await prisma.$executeRawUnsafe(
    "ALTER TABLE `cards` ADD COLUMN `isCampaignBanner` BOOLEAN NOT NULL DEFAULT false",
  );
}

/** Canlıda `db push` atlanırsa kart sorguları P2022 ile düşmesin. */
export async function ensureCardCampaignBannerColumn() {
  if (!ensurePromise) {
    ensurePromise = ensureCardCampaignBannerColumnOnce().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}
