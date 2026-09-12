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

async function indexExists(table: string, indexName: string) {
  const rows = await prisma.$queryRaw<Array<{ INDEX_NAME: string }>>`
    SELECT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${table}
      AND INDEX_NAME = ${indexName}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function tableExists(table: string) {
  const rows = await prisma.$queryRaw<Array<{ TABLE_NAME: string }>>`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${table}
  `;
  return rows.length > 0;
}

async function ensureRankingSchemaOnce() {
  if (!(await columnExists("products", "boostScore"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `products` ADD COLUMN `boostScore` INTEGER NOT NULL DEFAULT 0",
    );
  }
  if (!(await columnExists("products", "rankScore"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `products` ADD COLUMN `rankScore` INTEGER NOT NULL DEFAULT 0",
    );
  }
  if (!(await indexExists("products", "products_isActive_rankScore_idx"))) {
    await prisma.$executeRawUnsafe(
      "CREATE INDEX `products_isActive_rankScore_idx` ON `products`(`isActive`, `rankScore`)",
    );
  }
  if (!(await indexExists("products", "products_rankScore_idx"))) {
    await prisma.$executeRawUnsafe(
      "CREATE INDEX `products_rankScore_idx` ON `products`(`rankScore`)",
    );
  }

  if (!(await tableExists("product_placements"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`product_placements\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`productId\` VARCHAR(191) NOT NULL,
        \`kind\` ENUM('CATEGORY', 'SEARCH') NOT NULL,
        \`scopeKey\` VARCHAR(200) NOT NULL,
        \`categoryId\` VARCHAR(191) NULL,
        \`searchTerm\` VARCHAR(160) NOT NULL DEFAULT '',
        \`boost\` INTEGER NOT NULL DEFAULT 0,
        \`isActive\` BOOLEAN NOT NULL DEFAULT true,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`product_placements_productId_scopeKey_key\` (\`productId\`, \`scopeKey\`),
        INDEX \`product_placements_kind_categoryId_isActive_idx\` (\`kind\`, \`categoryId\`, \`isActive\`),
        INDEX \`product_placements_kind_searchTerm_isActive_idx\` (\`kind\`, \`searchTerm\`, \`isActive\`),
        CONSTRAINT \`product_placements_productId_fkey\` FOREIGN KEY (\`productId\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`product_placements_categoryId_fkey\` FOREIGN KEY (\`categoryId\`) REFERENCES \`product_categories\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  await prisma.$executeRawUnsafe(`
    UPDATE \`products\`
    SET \`rankScore\` = COALESCE(\`boostScore\`, 0) * 1000
      + FLOOR(LN(1 + \`clickCount\`) * 80 + LN(1 + \`viewCount\`) * 20)
    WHERE \`rankScore\` = 0
      AND (\`clickCount\` > 0 OR \`viewCount\` > 0 OR COALESCE(\`boostScore\`, 0) > 0)
  `);
}

/** Canlıda migrate atlanırsa sıralama sorguları P2022 ile düşmesin. */
export async function ensureRankingSchema() {
  if (!ensurePromise) {
    ensurePromise = ensureRankingSchemaOnce().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}
