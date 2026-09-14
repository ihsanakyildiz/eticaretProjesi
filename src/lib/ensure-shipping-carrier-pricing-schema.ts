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

async function ensureShippingCarrierPricingSchemaOnce() {
  if (!(await columnExists("shipping_carriers", "pricingMode"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `shipping_carriers` ADD COLUMN `pricingMode` ENUM('FLAT', 'DESI') NOT NULL DEFAULT 'FLAT'",
    );
  }
  if (!(await columnExists("shipping_carriers", "flatPriceMinor"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `shipping_carriers` ADD COLUMN `flatPriceMinor` INTEGER NOT NULL DEFAULT 0",
    );
  }
  if (!(await columnExists("shipping_carriers", "freeShippingEnabled"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `shipping_carriers` ADD COLUMN `freeShippingEnabled` BOOLEAN NOT NULL DEFAULT false",
    );
  }
  if (!(await columnExists("shipping_carriers", "freeShippingMinSubtotalMinor"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `shipping_carriers` ADD COLUMN `freeShippingMinSubtotalMinor` INTEGER NOT NULL DEFAULT 0",
    );
  }
  if (!(await columnExists("shipping_carriers", "rateSettings"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `shipping_carriers` ADD COLUMN `rateSettings` LONGTEXT NULL",
    );
  }
}

export async function ensureShippingCarrierPricingSchema() {
  if (!ensurePromise) {
    ensurePromise = ensureShippingCarrierPricingSchemaOnce().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}
