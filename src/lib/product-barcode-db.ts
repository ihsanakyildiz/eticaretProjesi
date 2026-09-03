import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { draftBarcodeConflict, normalizeProductBarcode } from "@/lib/product-barcode";
import type { DuplicateBarcodeGroup, DuplicateBarcodeVariant } from "@/lib/product-barcode";

export type { DuplicateBarcodeGroup, DuplicateBarcodeVariant };

type DraftBarcodeInput = {
  id?: string;
  barcode?: string | null;
};

let duplicateCountCache: { at: number; count: number } | null = null;
let uniqueBarcodeIndexCache: { at: number; exists: boolean } | null = null;

async function hasUniqueBarcodeIndex(): Promise<boolean> {
  if (uniqueBarcodeIndexCache && Date.now() - uniqueBarcodeIndexCache.at < 10 * 60_000) {
    return uniqueBarcodeIndexCache.exists;
  }
  const rows = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) AS total
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'product_variants'
      AND index_name = 'product_variants_barcode_key'
      AND non_unique = 0
  `;
  const exists = Number(rows[0]?.total ?? 0) > 0;
  uniqueBarcodeIndexCache = { at: Date.now(), exists };
  return exists;
}

export async function countDuplicateBarcodes(): Promise<number> {
  if (duplicateCountCache && Date.now() - duplicateCountCache.at < 60_000) {
    return duplicateCountCache.count;
  }
  if (await hasUniqueBarcodeIndex()) {
    duplicateCountCache = { at: Date.now(), count: 0 };
    return 0;
  }
  const rows = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) AS total FROM (
      SELECT 1
      FROM product_variants
      WHERE \`barcode\` IS NOT NULL AND TRIM(\`barcode\`) <> ''
      GROUP BY UPPER(REPLACE(TRIM(\`barcode\`), ' ', ''))
      HAVING COUNT(*) > 1
    ) grouped
  `;
  const count = Number(rows[0]?.total ?? 0);
  duplicateCountCache = { at: Date.now(), count };
  return count;
}

export function invalidateDuplicateBarcodeCount() {
  duplicateCountCache = null;
}

export async function findDuplicateBarcodeGroups(input?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ groups: DuplicateBarcodeGroup[]; total: number; page: number; pageCount: number }> {
  const pageSize = Math.min(50, Math.max(10, input?.pageSize ?? 25));
  const needle = (input?.q ?? "").trim();
  const like = needle ? `%${needle.replace(/[%_]/g, "")}%` : null;
  const matchSql = like
    ? Prisma.sql`
        AND UPPER(REPLACE(TRIM(d.barcode), ' ', '')) IN (
          SELECT UPPER(REPLACE(TRIM(v.barcode), ' ', ''))
          FROM product_variants v
          INNER JOIN products p ON p.id = v.productId
          WHERE v.barcode IS NOT NULL AND TRIM(v.barcode) <> ''
            AND (
              UPPER(REPLACE(TRIM(v.barcode), ' ', '')) LIKE ${like}
              OR v.sku LIKE ${like}
              OR p.title LIKE ${like}
            )
        )
      `
    : Prisma.empty;

  const totals = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) AS total FROM (
      SELECT UPPER(REPLACE(TRIM(d.barcode), ' ', '')) AS barcodeKey
      FROM product_variants d
      WHERE d.barcode IS NOT NULL AND TRIM(d.barcode) <> ''
      ${matchSql}
      GROUP BY UPPER(REPLACE(TRIM(d.barcode), ' ', ''))
      HAVING COUNT(*) > 1
    ) grouped
  `;
  const total = Number(totals[0]?.total ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pageCount, Math.max(1, input?.page ?? 1));
  const offset = (page - 1) * pageSize;
  if (total === 0) return { groups: [], total, page, pageCount };

  const keys = await prisma.$queryRaw<Array<{ barcodeKey: string; variantCount: bigint }>>`
    SELECT UPPER(REPLACE(TRIM(d.barcode), ' ', '')) AS barcodeKey, COUNT(*) AS variantCount
    FROM product_variants d
    WHERE d.barcode IS NOT NULL AND TRIM(d.barcode) <> ''
    ${matchSql}
    GROUP BY UPPER(REPLACE(TRIM(d.barcode), ' ', ''))
    HAVING COUNT(*) > 1
    ORDER BY variantCount DESC, barcodeKey ASC
    LIMIT ${pageSize} OFFSET ${offset}
  `;
  if (keys.length === 0) return { groups: [], total, page, pageCount };

  const keyList = keys.map((row) => row.barcodeKey);
  const variants = await prisma.$queryRaw<
    Array<{
      id: string;
      sku: string;
      title: string;
      barcode: string | null;
      productId: string;
      productTitle: string;
      barcodeKey: string;
    }>
  >`
    SELECT
      v.id,
      v.sku,
      v.title,
      v.barcode,
      v.productId,
      p.title AS productTitle,
      UPPER(REPLACE(TRIM(v.barcode), ' ', '')) AS barcodeKey
    FROM product_variants v
    INNER JOIN products p ON p.id = v.productId
    WHERE v.barcode IS NOT NULL
      AND TRIM(v.barcode) <> ''
      AND UPPER(REPLACE(TRIM(v.barcode), ' ', '')) IN (${Prisma.join(keyList)})
    ORDER BY barcodeKey ASC, v.sku ASC
  `;

  const grouped = new Map<string, DuplicateBarcodeVariant[]>();
  for (const variant of variants) {
    const list = grouped.get(variant.barcodeKey) ?? [];
    list.push({
      id: variant.id,
      sku: variant.sku,
      title: variant.title,
      barcode: variant.barcode,
      productId: variant.productId,
      productTitle: variant.productTitle,
    });
    grouped.set(variant.barcodeKey, list);
  }

  return {
    total,
    page,
    pageCount,
    groups: keys
      .map((row) => ({
        barcode: row.barcodeKey,
        count: Number(row.variantCount),
        variants: grouped.get(row.barcodeKey) ?? [],
      }))
      .filter((group) => group.variants.length > 1),
  };
}

export async function findBarcodeOwner(
  barcode: string | null | undefined,
  excludeVariantIds: string[] = [],
): Promise<DuplicateBarcodeVariant | null> {
  const normalized = normalizeProductBarcode(barcode);
  if (!normalized) return null;

  const excludeSql =
    excludeVariantIds.length > 0
      ? Prisma.sql`AND v.id NOT IN (${Prisma.join(excludeVariantIds)})`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      sku: string;
      title: string;
      barcode: string | null;
      productId: string;
      productTitle: string;
    }>
  >`
    SELECT v.id, v.sku, v.title, v.barcode, v.productId, p.title AS productTitle
    FROM product_variants v
    INNER JOIN products p ON p.id = v.productId
    WHERE v.barcode IS NOT NULL
      AND TRIM(v.barcode) <> ''
      AND UPPER(REPLACE(TRIM(v.barcode), ' ', '')) = ${normalized}
      ${excludeSql}
    LIMIT 1
  `;

  const owner = rows[0];
  if (!owner) return null;
  return {
    id: owner.id,
    sku: owner.sku,
    title: owner.title,
    barcode: owner.barcode,
    productId: owner.productId,
    productTitle: owner.productTitle,
  };
}

export async function uniqueBarcodeOrNull(
  barcode: string | null | undefined,
  excludeVariantId?: string,
): Promise<string | null> {
  const normalized = normalizeProductBarcode(barcode);
  if (!normalized) return null;
  const owner = await findBarcodeOwner(normalized, excludeVariantId ? [excludeVariantId] : []);
  return owner ? null : normalized;
}

export async function variantDraftBarcodeError(
  drafts: DraftBarcodeInput[],
  options?: { excludeVariantIds?: string[] },
): Promise<string | null> {
  const local = draftBarcodeConflict(drafts);
  if (local) return local;

  const wanted = [
    ...new Set(
      drafts
        .map((draft) => normalizeProductBarcode(draft.barcode))
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  if (wanted.length === 0) return null;

  for (const barcode of wanted) {
    const owner = await findBarcodeOwner(barcode, options?.excludeVariantIds ?? []);
    if (owner) {
      return `Barkod ${barcode} başka bir varyantta kayıtlı (${owner.productTitle} · ${owner.sku}).`;
    }
  }
  return null;
}

export async function ensureProductBarcodeUniqueIndex(): Promise<boolean> {
  invalidateDuplicateBarcodeCount();
  const duplicates = await countDuplicateBarcodes();
  if (duplicates > 0) return false;
  try {
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX product_variants_barcode_key ON product_variants (\`barcode\`)
    `;
  } catch {
    return false;
  }
  try {
    await prisma.$executeRaw`DROP INDEX product_variants_barcode_idx ON product_variants`;
  } catch {
    // Non-unique index may already be gone.
  }
  return true;
}
