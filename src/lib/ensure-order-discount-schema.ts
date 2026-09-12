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

async function ensureOrderDiscountSchemaOnce() {
  if (!(await columnExists("orders", "discountMinor"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `orders` ADD COLUMN `discountMinor` INTEGER NOT NULL DEFAULT 0",
    );
  }
  if (!(await columnExists("order_items", "compareAtMinor"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `order_items` ADD COLUMN `compareAtMinor` INTEGER NULL",
    );
  }
}

export async function ensureOrderDiscountSchema() {
  if (!ensurePromise) {
    ensurePromise = ensureOrderDiscountSchemaOnce().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}
