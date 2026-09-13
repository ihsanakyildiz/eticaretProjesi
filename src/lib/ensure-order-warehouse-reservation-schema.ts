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

async function ensureOrderWarehouseReservationSchemaOnce() {
  if (!(await columnExists("orders", "allItemsWarehouseReserved"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `orders` ADD COLUMN `allItemsWarehouseReserved` BOOLEAN NOT NULL DEFAULT false",
    );
  }
  if (!(await columnExists("order_items", "reservedQuantity"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `order_items` ADD COLUMN `reservedQuantity` INTEGER NOT NULL DEFAULT 0",
    );
  }
  if (!(await columnExists("order_items", "warehouseReservedAt"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `order_items` ADD COLUMN `warehouseReservedAt` DATETIME(3) NULL",
    );
  }
}

export async function ensureOrderWarehouseReservationSchema() {
  if (!ensurePromise) {
    ensurePromise = ensureOrderWarehouseReservationSchemaOnce().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}
