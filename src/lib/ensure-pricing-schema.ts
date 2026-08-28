import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

type ColumnRow = { COLUMN_NAME: string };

const REQUIRED_COLUMNS = [
  "slug",
  "detailContent",
  "coverImage",
  "purchasable",
  "stripePriceIdMonthly",
  "stripePriceIdYearly",
  "priceMonthlyDiscount",
  "priceYearlyDiscount",
  "priceType",
  "priceRangeMin",
  "priceRangeMax",
] as const;

let ensurePromise: Promise<void> | null = null;

async function listPricingPlanColumns(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<ColumnRow[]>`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pricing_plans'
  `;
  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function hasUniqueSlugIndex(): Promise<boolean> {
  const indexes = await prisma.$queryRaw<
    { INDEX_NAME: string; NON_UNIQUE: number }[]
  >`
    SELECT INDEX_NAME, NON_UNIQUE
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pricing_plans'
      AND COLUMN_NAME = 'slug'
  `;
  return indexes.some((row) => Number(row.NON_UNIQUE) === 0);
}

async function addColumnIfMissing(
  columns: Set<string>,
  name: string,
  ddl: string,
) {
  if (columns.has(name)) return;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`pricing_plans\` ADD COLUMN ${ddl}`,
  );
  columns.add(name);
}

/**
 * Üyelik/paket güncellemesinden kalan eksik kolonları (özellikle zorunlu unique slug)
 * güvenli şekilde ekler. `db push` mevcut satırlarda NOT NULL unique slug’da sık takılır.
 */
async function ensurePricingPlansTableOnce() {
  const columns = await listPricingPlanColumns();
  if (columns.size === 0) {
    // Tablo yoksa Prisma db push gerekir; burada oluşturmayız.
    return;
  }

  const missingRequired = REQUIRED_COLUMNS.some((name) => !columns.has(name));
  if (!missingRequired && (await hasUniqueSlugIndex())) {
    const emptySlug = await prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(*) AS c
      FROM \`pricing_plans\`
      WHERE \`slug\` IS NULL OR \`slug\` = ''
    `;
    if (Number(emptySlug[0]?.c ?? 0) === 0) {
      return;
    }
  }

  await addColumnIfMissing(columns, "slug", "`slug` VARCHAR(191) NULL");
  await addColumnIfMissing(
    columns,
    "detailContent",
    "`detailContent` LONGTEXT NULL",
  );
  await addColumnIfMissing(
    columns,
    "coverImage",
    "`coverImage` VARCHAR(500) NULL",
  );
  await addColumnIfMissing(
    columns,
    "purchasable",
    "`purchasable` BOOLEAN NOT NULL DEFAULT false",
  );
  await addColumnIfMissing(
    columns,
    "stripePriceIdMonthly",
    "`stripePriceIdMonthly` VARCHAR(191) NULL",
  );
  await addColumnIfMissing(
    columns,
    "stripePriceIdYearly",
    "`stripePriceIdYearly` VARCHAR(191) NULL",
  );
  await addColumnIfMissing(
    columns,
    "priceMonthlyDiscount",
    "`priceMonthlyDiscount` VARCHAR(80) NULL",
  );
  await addColumnIfMissing(
    columns,
    "priceYearlyDiscount",
    "`priceYearlyDiscount` VARCHAR(80) NULL",
  );
  await addColumnIfMissing(
    columns,
    "priceType",
    "`priceType` ENUM('FIXED','RANGE','QUOTE') NOT NULL DEFAULT 'FIXED'",
  );
  await addColumnIfMissing(
    columns,
    "priceRangeMin",
    "`priceRangeMin` VARCHAR(80) NULL",
  );
  await addColumnIfMissing(
    columns,
    "priceRangeMax",
    "`priceRangeMax` VARCHAR(80) NULL",
  );

  const plans = await prisma.$queryRaw<
    { id: string; name: string; slug: string | null }[]
  >`
    SELECT \`id\`, \`name\`, \`slug\` FROM \`pricing_plans\`
  `;

  const used = new Set(
    plans
      .map((plan) => plan.slug?.trim())
      .filter((value): value is string => Boolean(value)),
  );

  for (const plan of plans) {
    const current = plan.slug?.trim();
    if (current) continue;

    const base = slugify(plan.name) || slugify(plan.id) || "paket";
    let candidate = base;
    let i = 2;
    while (used.has(candidate)) {
      candidate = `${base}-${i}`;
      i += 1;
    }
    used.add(candidate);

    await prisma.$executeRaw`
      UPDATE \`pricing_plans\`
      SET \`slug\` = ${candidate}
      WHERE \`id\` = ${plan.id}
    `;
  }

  await prisma.$executeRaw`
    UPDATE \`pricing_plans\`
    SET \`slug\` = \`id\`
    WHERE \`slug\` IS NULL OR \`slug\` = ''
  `;

  await prisma.$executeRawUnsafe(
    "ALTER TABLE `pricing_plans` MODIFY COLUMN `slug` VARCHAR(191) NOT NULL",
  );

  if (!(await hasUniqueSlugIndex())) {
    await prisma.$executeRawUnsafe(
      "CREATE UNIQUE INDEX `pricing_plans_slug_key` ON `pricing_plans`(`slug`)",
    );
  }
}

export async function ensurePricingPlansTable() {
  if (!ensurePromise) {
    ensurePromise = ensurePricingPlansTableOnce().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}
