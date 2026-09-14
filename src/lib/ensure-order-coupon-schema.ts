import "server-only";

import { prisma } from "@/lib/prisma";

let ensurePromise: Promise<void> | null = null;

async function columnExists(table: string, column: string) {
  const rows = await prisma.$queryRaw<Array<{ COLUMN_NAME: string }>>`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${table}
      AND COLUMN_NAME = ${column}
  `;
  return rows.length > 0;
}

async function ensureOrderCouponSchemaOnce() {
  if (!(await columnExists("orders", "couponCode"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `orders` ADD COLUMN `couponCode` VARCHAR(64) NULL",
    );
  }
  if (!(await columnExists("orders", "couponDiscountMinor"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `orders` ADD COLUMN `couponDiscountMinor` INTEGER NOT NULL DEFAULT 0",
    );
  }
}

export async function ensureOrderCouponSchema() {
  if (!ensurePromise) {
    ensurePromise = ensureOrderCouponSchemaOnce().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}
