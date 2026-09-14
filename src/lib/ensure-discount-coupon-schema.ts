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

async function ensureDiscountCouponSchemaOnce() {
  if (!(await tableExists("discount_coupons"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`discount_coupons\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`code\` VARCHAR(64) NOT NULL,
        \`name\` VARCHAR(191) NULL,
        \`kind\` ENUM('PERCENT', 'FIXED') NOT NULL,
        \`valueInt\` INTEGER NOT NULL,
        \`usageMode\` ENUM('UNLIMITED', 'ONCE', 'CUSTOMER') NOT NULL,
        \`status\` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
        \`startsAt\` DATETIME(3) NULL,
        \`endsAt\` DATETIME(3) NULL,
        \`minSubtotalMinor\` INTEGER NOT NULL DEFAULT 0,
        \`customerId\` VARCHAR(191) NULL,
        \`redemptionCount\` INTEGER NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`discount_coupons_code_key\` (\`code\`),
        INDEX \`discount_coupons_status_startsAt_endsAt_idx\` (\`status\`, \`startsAt\`, \`endsAt\`),
        INDEX \`discount_coupons_customerId_idx\` (\`customerId\`),
        INDEX \`discount_coupons_createdAt_idx\` (\`createdAt\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`discount_coupons\`
      ADD CONSTRAINT \`discount_coupons_customerId_fkey\`
      FOREIGN KEY (\`customerId\`) REFERENCES \`users\`(\`id\`)
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }

  if (!(await tableExists("discount_coupon_categories"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`discount_coupon_categories\` (
        \`couponId\` VARCHAR(191) NOT NULL,
        \`categoryId\` VARCHAR(191) NOT NULL,
        PRIMARY KEY (\`couponId\`, \`categoryId\`),
        INDEX \`discount_coupon_categories_categoryId_idx\` (\`categoryId\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`discount_coupon_categories\`
      ADD CONSTRAINT \`discount_coupon_categories_couponId_fkey\`
      FOREIGN KEY (\`couponId\`) REFERENCES \`discount_coupons\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`discount_coupon_categories\`
      ADD CONSTRAINT \`discount_coupon_categories_categoryId_fkey\`
      FOREIGN KEY (\`categoryId\`) REFERENCES \`product_categories\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  if (!(await tableExists("discount_coupon_brands"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`discount_coupon_brands\` (
        \`couponId\` VARCHAR(191) NOT NULL,
        \`brandId\` VARCHAR(191) NOT NULL,
        PRIMARY KEY (\`couponId\`, \`brandId\`),
        INDEX \`discount_coupon_brands_brandId_idx\` (\`brandId\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`discount_coupon_brands\`
      ADD CONSTRAINT \`discount_coupon_brands_couponId_fkey\`
      FOREIGN KEY (\`couponId\`) REFERENCES \`discount_coupons\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`discount_coupon_brands\`
      ADD CONSTRAINT \`discount_coupon_brands_brandId_fkey\`
      FOREIGN KEY (\`brandId\`) REFERENCES \`brands\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  if (!(await tableExists("discount_coupon_products"))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`discount_coupon_products\` (
        \`couponId\` VARCHAR(191) NOT NULL,
        \`productId\` VARCHAR(191) NOT NULL,
        PRIMARY KEY (\`couponId\`, \`productId\`),
        INDEX \`discount_coupon_products_productId_idx\` (\`productId\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`discount_coupon_products\`
      ADD CONSTRAINT \`discount_coupon_products_couponId_fkey\`
      FOREIGN KEY (\`couponId\`) REFERENCES \`discount_coupons\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`discount_coupon_products\`
      ADD CONSTRAINT \`discount_coupon_products_productId_fkey\`
      FOREIGN KEY (\`productId\`) REFERENCES \`products\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }
}

export async function ensureDiscountCouponSchema() {
  if (!ensurePromise) {
    ensurePromise = ensureDiscountCouponSchemaOnce().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}
