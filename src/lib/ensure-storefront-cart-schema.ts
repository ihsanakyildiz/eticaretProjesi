import "server-only";

import { prisma } from "@/lib/prisma";

let ensurePromise: Promise<void> | null = null;

async function tableExists(table: string) {
  const rows = await prisma.$queryRaw<Array<{ TABLE_NAME: string }>>`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${table}
  `;
  return rows.length > 0;
}

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

async function indexExists(table: string, indexName: string) {
  const rows = await prisma.$queryRaw<Array<{ INDEX_NAME: string }>>`
    SELECT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${table}
      AND INDEX_NAME = ${indexName}
  `;
  return rows.length > 0;
}

async function ensureStorefrontCartSchemaOnce() {
  if (!(await tableExists("storefront_cart_lines"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`storefront_cart_lines\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`sessionKey\` VARCHAR(64) NOT NULL,
        \`productId\` VARCHAR(191) NOT NULL,
        \`variantId\` VARCHAR(191) NOT NULL,
        \`quantity\` INTEGER NOT NULL,
        \`unitPriceMinor\` INTEGER NOT NULL DEFAULT 0,
        \`couponCode\` VARCHAR(64) NULL,
        \`updatedAt\` DATETIME(3) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`storefront_cart_lines_sessionKey_variantId_key\` (\`sessionKey\`, \`variantId\`),
        INDEX \`storefront_cart_lines_productId_idx\` (\`productId\`),
        INDEX \`storefront_cart_lines_updatedAt_idx\` (\`updatedAt\`),
        INDEX \`storefront_cart_lines_couponCode_updatedAt_idx\` (\`couponCode\`, \`updatedAt\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    return;
  }

  if (!(await columnExists("storefront_cart_lines", "couponCode"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `storefront_cart_lines` ADD COLUMN `couponCode` VARCHAR(64) NULL",
    );
  }
  if (!(await indexExists("storefront_cart_lines", "storefront_cart_lines_couponCode_updatedAt_idx"))) {
    await prisma.$executeRawUnsafe(
      "CREATE INDEX `storefront_cart_lines_couponCode_updatedAt_idx` ON `storefront_cart_lines`(`couponCode`, `updatedAt`)",
    );
  }
}

export async function ensureStorefrontCartSchema() {
  if (!ensurePromise) {
    ensurePromise = ensureStorefrontCartSchemaOnce().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}
