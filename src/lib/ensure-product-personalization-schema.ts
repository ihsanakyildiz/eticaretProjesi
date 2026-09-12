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

async function ensureProductPersonalizationSchemaOnce() {
  if (!(await tableExists("product_personalization_fields"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`product_personalization_fields\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`productId\` VARCHAR(191) NOT NULL,
        \`kind\` ENUM('TEXT', 'IMAGE') NOT NULL,
        \`label\` VARCHAR(191) NOT NULL,
        \`required\` BOOLEAN NOT NULL DEFAULT true,
        \`sortOrder\` INTEGER NOT NULL DEFAULT 0,
        \`maxLength\` INTEGER NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`product_personalization_fields_productId_sortOrder_idx\` (\`productId\`, \`sortOrder\`),
        CONSTRAINT \`product_personalization_fields_productId_fkey\`
          FOREIGN KEY (\`productId\`) REFERENCES \`products\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  if (!(await columnExists("order_items", "personalizationJson"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `order_items` ADD COLUMN `personalizationJson` LONGTEXT NULL",
    );
  }
}

export async function ensureProductPersonalizationSchema() {
  if (!ensurePromise) {
    ensurePromise = ensureProductPersonalizationSchemaOnce().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}
