import "server-only";

import { prisma } from "@/lib/prisma";
import { isAdvancedInventoryEnabled } from "@/lib/advanced-inventory";
import { writeCatalogStock } from "@/lib/inventory";

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

async function ensureVariantSupplierStockSchemaOnce() {
  if (!(await columnExists("product_variants", "supplierStock"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `product_variants` ADD COLUMN `supplierStock` INTEGER NOT NULL DEFAULT 0",
    );
  }
}

export async function ensureVariantSupplierStockSchema() {
  if (!ensurePromise) {
    ensurePromise = ensureVariantSupplierStockSchemaOnce().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}

export async function setVariantSupplierStock(variantId: string, stock: number) {
  await ensureVariantSupplierStockSchema();
  const qty = Math.max(0, Math.round(Number(stock) || 0));
  await prisma.$executeRaw`
    UPDATE product_variants
    SET supplierStock = ${qty}
    WHERE id = ${variantId}
  `;
}

/**
 * XML/API stok senkronu.
 * Gelişmiş stok açıksa yalnızca tedarikçi stoğuna yazar (depo/satılabilir stoka dokunmaz).
 * Kapalıysa mevcut davranış: katalog/depo stoğuna yazar.
 */
export async function applyFeedVariantStock(
  variantId: string,
  stock: number,
  options: {
    note: string;
    advancedInventory?: boolean;
  },
) {
  const qty = Math.max(0, Math.round(Number(stock) || 0));
  const advanced =
    options.advancedInventory ?? (await isAdvancedInventoryEnabled());

  if (advanced) {
    await setVariantSupplierStock(variantId, qty);
    return { mode: "supplier" as const, quantity: qty };
  }

  await writeCatalogStock(prisma, variantId, qty, { note: options.note });
  return { mode: "catalog" as const, quantity: qty };
}

export function informationalTotalStock(warehouseStock: number, supplierStock: number) {
  return Math.max(0, warehouseStock) + Math.max(0, supplierStock);
}
