import "server-only";

import { Prisma } from "@prisma/client";
import {
  buildCategoryTree,
  collectDescendantIds,
  flattenCategoryTree,
  type CategoryNodeBase,
} from "@/lib/category-tree";
import {
  campaignChangesPrice,
  campaignChargeMinor,
  campaignKindLabel,
  campaignOfferLabel,
  campaignPhase,
  campaignValueInput,
  isCampaignKind,
  type CampaignKindCode,
  type CampaignProductSnapshot,
  type CampaignSearchProduct,
  type CampaignStatusCode,
  type CatalogCampaignBadge,
  type CatalogCampaignFacet,
} from "@/lib/campaign-kinds";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  STOREFRONT_LISTING_VISIBILITIES,
  storefrontListingWhere,
} from "@/lib/storefront-product-where";
import {
  clearedSaleWrite,
  listPriceMinor,
  productFieldsFromStoredSale,
  storedSaleWrite,
  toDatetimeLocalValue,
  toIsoOrNull,
} from "@/lib/product-sale";

const CATALOG_CACHE_TAG = "products";

function bustCatalogCache() {
  revalidateTag(CATALOG_CACHE_TAG);
}

export {
  applyCartPercentMinor,
  campaignAppliesInCart,
  campaignChangesPrice,
  campaignChargeMinor,
  campaignKindLabel,
  campaignOfferLabel,
  campaignPhase,
  campaignPhaseLabel,
  campaignWindowIsBusy,
  campaignWindowIsLive,
  parseCampaignValue,
  parseCampaignWindow,
  campaignValueInput,
} from "@/lib/campaign-kinds";
export type {
  CampaignKindCode,
  CampaignPhase,
  CampaignProductSnapshot,
  CampaignSearchProduct,
  CampaignStatusCode,
  CatalogCampaignBadge,
  CatalogCampaignFacet,
} from "@/lib/campaign-kinds";

const APPLY_BATCH = 80;
const ID_BATCH = 500;

export type CampaignTargetInput = {
  categoryIds: string[];
  brandIds: string[];
  productIds: string[];
  inStockOnly: boolean;
};

export type CampaignWriteInput = CampaignTargetInput & {
  name: string;
  kind: CampaignKindCode;
  valueInt: number;
  countdown: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

function uniqueIds(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

async function loadBusyCampaignProductIds(now = new Date(), ignoreCampaignId?: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ productId: string }>>`
      SELECT DISTINCT cp.productId
      FROM campaign_products cp
      INNER JOIN campaigns c ON c.id = cp.campaignId
      WHERE cp.restoredAt IS NULL
        AND c.status = 'ACTIVE'
        AND (c.endsAt IS NULL OR c.endsAt > ${now})
        ${ignoreCampaignId ? Prisma.sql`AND c.id <> ${ignoreCampaignId}` : Prisma.empty}
    `;
    return rows.map((row) => row.productId);
  } catch {
    return [];
  }
}

export async function busyProductWhere(
  now = new Date(),
  ignoreCampaignId?: string,
): Promise<Prisma.ProductWhereInput | null> {
  const busyIds = await loadBusyCampaignProductIds(now, ignoreCampaignId);
  if (busyIds.length === 0) return null;
  return { id: { in: busyIds } };
}

async function expandCategoryIds(categoryIds: string[]) {
  const ids = uniqueIds(categoryIds);
  if (ids.length === 0) return [];
  const rows = await prisma.productCategory.findMany({
    select: {
      id: true,
      parentId: true,
      name: true,
      slug: true,
      sortOrder: true,
      isActive: true,
    },
  });
  const expanded = new Set<string>();
  for (const id of ids) {
    for (const child of collectDescendantIds(rows as CategoryNodeBase[], id)) {
      expanded.add(child);
    }
  }
  return [...expanded];
}

export async function campaignTargetWhere(
  input: CampaignTargetInput,
  options: { excludeBusy?: boolean; now?: Date; ignoreCampaignId?: string } = {},
): Promise<Prisma.ProductWhereInput | { error: string }> {
  const categoryIds = await expandCategoryIds(input.categoryIds);
  const brandIds = uniqueIds(input.brandIds);
  const productIds = uniqueIds(input.productIds);
  if (categoryIds.length === 0 && brandIds.length === 0 && productIds.length === 0) {
    return { error: "Kategori, marka veya ürün seçin." };
  }

  const extra: Prisma.ProductWhereInput[] = [];
  if (categoryIds.length > 0) extra.push({ categoryId: { in: categoryIds } });
  if (brandIds.length > 0) extra.push({ brandId: { in: brandIds } });
  if (productIds.length > 0) extra.push({ id: { in: productIds } });
  if (input.inStockOnly) {
    extra.push({ variants: { some: { stockQuantity: { gt: 0 } } } });
  }
  if (options.excludeBusy !== false) {
    const busy = await busyProductWhere(options.now ?? new Date(), options.ignoreCampaignId);
    if (busy) extra.push({ NOT: busy });
  }
  return storefrontListingWhere(extra.length > 0 ? { AND: extra } : undefined);
}

export async function previewCampaignTargets(
  input: CampaignTargetInput,
  options: { ignoreCampaignId?: string } = {},
) {
  const where = await campaignTargetWhere(input, { ignoreCampaignId: options.ignoreCampaignId });
  if ("error" in where) return where;
  const matchedWhere = await campaignTargetWhere(input, {
    excludeBusy: false,
    ignoreCampaignId: options.ignoreCampaignId,
  });
  if ("error" in matchedWhere) return matchedWhere;
  const [eligible, matched] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.count({ where: matchedWhere }),
  ]);
  return { eligible, matched, busy: Math.max(0, matched - eligible) };
}

export async function searchCampaignProducts(
  query: string,
  options: { ignoreCampaignId?: string } = {},
): Promise<CampaignSearchProduct[]> {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return [];
  const rows = await prisma.product.findMany({
    where: storefrontListingWhere({
      OR: [
        { title: { contains: q } },
        { sku: { contains: q } },
        { slug: { contains: q } },
        { variants: { some: { OR: [{ sku: { contains: q } }, { barcode: { contains: q } }] } } },
      ],
    }),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
    select: {
      id: true,
      title: true,
      sku: true,
      image: true,
      brand: { select: { name: true } },
    },
  });
  const busyIds = new Set(await loadBusyCampaignProductIds(new Date(), options.ignoreCampaignId));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    sku: row.sku,
    image: row.image,
    brandName: row.brand?.name ?? null,
    busy: busyIds.has(row.id),
  }));
}

function snapshotProduct(input: {
  basePriceMinor: number;
  compareAtMinor: number | null;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  onSale: boolean;
  extraShippingMinor: number;
  variants: Array<{
    id: string;
    priceMinor: number;
    compareAtMinor: number | null;
    saleStartsAt: Date | null;
    saleEndsAt: Date | null;
  }>;
}): CampaignProductSnapshot {
  return {
    product: {
      basePriceMinor: input.basePriceMinor,
      compareAtMinor: input.compareAtMinor,
      saleStartsAt: toIsoOrNull(input.saleStartsAt),
      saleEndsAt: toIsoOrNull(input.saleEndsAt),
      onSale: input.onSale,
      extraShippingMinor: input.extraShippingMinor,
    },
    variants: input.variants.map((variant) => ({
      id: variant.id,
      priceMinor: variant.priceMinor,
      compareAtMinor: variant.compareAtMinor,
      saleStartsAt: toIsoOrNull(variant.saleStartsAt),
      saleEndsAt: toIsoOrNull(variant.saleEndsAt),
    })),
  };
}

function parseSnapshot(raw: string): CampaignProductSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as CampaignProductSnapshot;
    if (!parsed?.product || !Array.isArray(parsed.variants)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function collectEligibleProductIds(where: Prisma.ProductWhereInput) {
  const ids: string[] = [];
  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.product.findMany({
      where,
      orderBy: { id: "asc" },
      take: ID_BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true },
    });
    if (rows.length === 0) break;
    for (const row of rows) ids.push(row.id);
    cursor = rows[rows.length - 1]?.id;
    if (rows.length < ID_BATCH) break;
  }
  return ids;
}

async function applyChunk(
  campaign: {
    id: string;
    kind: CampaignKindCode;
    valueInt: number;
    startsAt: Date | null;
    endsAt: Date | null;
  },
  productIds: string[],
  options: { persist?: "insert" | "none"; requireListed?: boolean } = {},
) {
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      isActive: true,
      availableForOrder: true,
      visibility: true,
      basePriceMinor: true,
      compareAtMinor: true,
      saleStartsAt: true,
      saleEndsAt: true,
      onSale: true,
      extraShippingMinor: true,
      variants: {
        select: {
          id: true,
          isDefault: true,
          sortOrder: true,
          priceMinor: true,
          compareAtMinor: true,
          saleStartsAt: true,
          saleEndsAt: true,
        },
      },
    },
  });

  const persist = options.persist ?? "insert";
  const requireListed = options.requireListed ?? true;
  let applied = 0;
  let skipped = 0;
  for (const product of products) {
    if (
      requireListed &&
      (!product.isActive ||
        !product.availableForOrder ||
        !(STOREFRONT_LISTING_VISIBILITIES as readonly string[]).includes(product.visibility))
    ) {
      skipped += 1;
      continue;
    }
    const snapshot = snapshotProduct(product);
    const writes: Prisma.PrismaPromise<unknown>[] = [];

    if (campaignChangesPrice(campaign.kind)) {
      if (product.variants.length === 0) {
        skipped += 1;
        continue;
      }
      let changed = false;
      for (const variant of product.variants) {
        const listMinor = listPriceMinor(variant);
        const chargeMinor = campaignChargeMinor(campaign.kind, campaign.valueInt, listMinor);
        if (chargeMinor == null || chargeMinor >= listMinor) continue;
        changed = true;
        writes.push(
          prisma.productVariant.update({
            where: { id: variant.id },
            data: storedSaleWrite({
              listMinor,
              chargeMinor,
              saleStartsAt: campaign.startsAt,
              saleEndsAt: campaign.endsAt,
            }),
          }),
        );
      }
      if (!changed) {
        skipped += 1;
        continue;
      }
      const defaultVariant =
        product.variants.find((row) => row.isDefault) ?? product.variants[0]!;
      const listMinor = listPriceMinor(defaultVariant);
      const chargeMinor = campaignChargeMinor(campaign.kind, campaign.valueInt, listMinor);
      if (chargeMinor != null && chargeMinor < listMinor) {
        writes.push(
          prisma.product.update({
            where: { id: product.id },
            data: productFieldsFromStoredSale({
              priceMinor: chargeMinor,
              compareAtMinor: listMinor,
              saleStartsAt: campaign.startsAt,
              saleEndsAt: campaign.endsAt,
            }),
          }),
        );
      }
    } else if (campaign.kind === "FREE_SHIPPING" && product.extraShippingMinor > 0) {
      writes.push(
        prisma.product.update({
          where: { id: product.id },
          data: { extraShippingMinor: 0 },
        }),
      );
    }

    if (persist === "insert") {
      writes.push(
        prisma.$executeRaw`
          INSERT INTO campaign_products (id, campaignId, productId, snapshotJson, restoredAt, createdAt)
          VALUES (${crypto.randomUUID()}, ${campaign.id}, ${product.id}, ${JSON.stringify(snapshot)}, NULL, NOW(3))
          ON DUPLICATE KEY UPDATE snapshotJson = VALUES(snapshotJson), restoredAt = NULL
        `,
      );
    }
    if (writes.length === 0) {
      applied += 1;
      continue;
    }
    await prisma.$transaction(writes);
    applied += 1;
  }
  return { applied, skipped };
}

export async function createAndApplyCampaign(input: CampaignWriteInput) {
  const name = input.name.trim().slice(0, 191);
  if (name.length < 2) return { error: "Kampanya adı en az 2 karakter olmalı." };
  const where = await campaignTargetWhere(input);
  if ("error" in where) return where;
  const productIds = await collectEligibleProductIds(where);
  if (productIds.length === 0) {
    return { error: "Seçilen filtrelere uyan vitrin ürünü yok. Kategori ve marka kesişiminde satıştaki ürün olmayabilir veya ürünler zaten başka bir kampanyada." };
  }

  const campaignId = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO campaigns
      (id, name, kind, valueInt, status, countdown, startsAt, endsAt, inStockOnly, createdAt, updatedAt)
    VALUES
      (${campaignId}, ${name}, ${input.kind}, ${input.valueInt}, 'ACTIVE', ${input.countdown}, ${input.startsAt}, ${input.endsAt}, ${input.inStockOnly}, NOW(3), NOW(3))
  `;
  for (const categoryId of uniqueIds(input.categoryIds)) {
    await prisma.$executeRaw`
      INSERT INTO campaign_categories (campaignId, categoryId)
      VALUES (${campaignId}, ${categoryId})
    `;
  }
  for (const brandId of uniqueIds(input.brandIds)) {
    await prisma.$executeRaw`
      INSERT INTO campaign_brands (campaignId, brandId)
      VALUES (${campaignId}, ${brandId})
    `;
  }
  const campaign = {
    id: campaignId,
    kind: input.kind,
    valueInt: input.valueInt,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  };

  let applied = 0;
  let skipped = 0;
  for (let i = 0; i < productIds.length; i += APPLY_BATCH) {
    const chunk = productIds.slice(i, i + APPLY_BATCH);
    const result = await applyChunk(
      {
        id: campaign.id,
        kind: campaign.kind,
        valueInt: campaign.valueInt,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
      },
      chunk,
    );
    applied += result.applied;
    skipped += result.skipped;
  }

  if (applied === 0) {
    await prisma.$executeRaw`DELETE FROM campaigns WHERE id = ${campaign.id}`;
    return { error: "Kampanya uygulanacak uygun ürün bulunamadı." };
  }

  bustCatalogCache();
  return { id: campaign.id, applied, skipped };
}

function sameIdSet(left: string[], right: string[]) {
  const a = uniqueIds(left).sort();
  const b = uniqueIds(right).sort();
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

type CampaignProductItem = { id: string; productId: string; snapshotJson: string };

async function loadUnrestoredCampaignItems(campaignId: string, productIds?: string[]) {
  const ids = productIds ? uniqueIds(productIds) : [];
  if (productIds && ids.length === 0) return [];
  return prisma.$queryRaw<CampaignProductItem[]>`
    SELECT id, productId, snapshotJson
    FROM campaign_products
    WHERE campaignId = ${campaignId}
      AND restoredAt IS NULL
      ${ids.length > 0 ? Prisma.sql`AND productId IN (${Prisma.join(ids)})` : Prisma.empty}
  `;
}

async function restoreCampaignItems(
  items: CampaignProductItem[],
  options: { markRestored?: boolean } = {},
) {
  const now = new Date();
  for (let i = 0; i < items.length; i += APPLY_BATCH) {
    const chunk = items.slice(i, i + APPLY_BATCH);
    for (const item of chunk) {
      const snapshot = parseSnapshot(item.snapshotJson);
      const writes: Prisma.PrismaPromise<unknown>[] = [];
      if (snapshot) {
        writes.push(
          prisma.product.update({
            where: { id: item.productId },
            data: {
              basePriceMinor: snapshot.product.basePriceMinor,
              compareAtMinor: snapshot.product.compareAtMinor,
              saleStartsAt: snapshot.product.saleStartsAt
                ? new Date(snapshot.product.saleStartsAt)
                : null,
              saleEndsAt: snapshot.product.saleEndsAt
                ? new Date(snapshot.product.saleEndsAt)
                : null,
              onSale: snapshot.product.onSale,
              extraShippingMinor: snapshot.product.extraShippingMinor,
            },
          }),
        );
        for (const variant of snapshot.variants) {
          writes.push(
            prisma.productVariant.update({
              where: { id: variant.id },
              data: {
                priceMinor: variant.priceMinor,
                compareAtMinor: variant.compareAtMinor,
                saleStartsAt: variant.saleStartsAt ? new Date(variant.saleStartsAt) : null,
                saleEndsAt: variant.saleEndsAt ? new Date(variant.saleEndsAt) : null,
              },
            }),
          );
        }
      } else {
        const variants = await prisma.productVariant.findMany({
          where: { productId: item.productId },
          select: { id: true, priceMinor: true, compareAtMinor: true },
        });
        for (const variant of variants) {
          writes.push(
            prisma.productVariant.update({
              where: { id: variant.id },
              data: clearedSaleWrite(listPriceMinor(variant)),
            }),
          );
        }
      }
      if (options.markRestored !== false) {
        writes.push(
          prisma.$executeRaw`UPDATE campaign_products SET restoredAt = ${now} WHERE id = ${item.id}`,
        );
      }
      if (writes.length > 0) await prisma.$transaction(writes);
    }
  }
  return items.length;
}

async function restoreCampaignProducts(campaignId: string) {
  return restoreCampaignItems(await loadUnrestoredCampaignItems(campaignId));
}

async function replaceCampaignTargets(campaignId: string, input: CampaignTargetInput) {
  await prisma.$executeRaw`DELETE FROM campaign_categories WHERE campaignId = ${campaignId}`;
  await prisma.$executeRaw`DELETE FROM campaign_brands WHERE campaignId = ${campaignId}`;
  for (const categoryId of uniqueIds(input.categoryIds)) {
    await prisma.$executeRaw`
      INSERT INTO campaign_categories (campaignId, categoryId)
      VALUES (${campaignId}, ${categoryId})
    `;
  }
  for (const brandId of uniqueIds(input.brandIds)) {
    await prisma.$executeRaw`
      INSERT INTO campaign_brands (campaignId, brandId)
      VALUES (${campaignId}, ${brandId})
    `;
  }
}

export async function updateAndReapplyCampaign(campaignId: string, input: CampaignWriteInput) {
  const id = campaignId.trim();
  if (!id) return { error: "Kampanya bulunamadı." };
  const name = input.name.trim().slice(0, 191);
  if (name.length < 2) return { error: "Kampanya adı en az 2 karakter olmalı." };

  const existing = await prisma.$queryRaw<
    Array<{
      id: string;
      status: string;
      inStockOnly: number | boolean;
    }>
  >`SELECT id, status, inStockOnly FROM campaigns WHERE id = ${id} LIMIT 1`;
  const campaign = existing[0];
  if (!campaign) return { error: "Kampanya bulunamadı." };
  if (campaign.status === "DISABLED") {
    return { error: "Bitmiş kampanya düzenlenemez. Yeni kampanya oluşturun." };
  }

  const [storedCategories, storedBrands, currentItems] = await Promise.all([
    prisma.$queryRaw<Array<{ categoryId: string }>>`
      SELECT categoryId FROM campaign_categories WHERE campaignId = ${id}
    `,
    prisma.$queryRaw<Array<{ brandId: string }>>`
      SELECT brandId FROM campaign_brands WHERE campaignId = ${id}
    `,
    loadUnrestoredCampaignItems(id),
  ]);
  const currentIds = currentItems.map((item) => item.productId);
  const storedManualIds =
    storedCategories.length === 0 && storedBrands.length === 0 ? currentIds : [];
  const targetChanged =
    !sameIdSet(
      storedCategories.map((row) => row.categoryId),
      input.categoryIds,
    ) ||
    !sameIdSet(
      storedBrands.map((row) => row.brandId),
      input.brandIds,
    ) ||
    !sameIdSet(storedManualIds, input.productIds) ||
    Boolean(campaign.inStockOnly) !== input.inStockOnly;

  const where = await campaignTargetWhere(input, { ignoreCampaignId: id });
  if ("error" in where) return where;
  let nextIds = await collectEligibleProductIds(where);
  if (nextIds.length === 0) {
    if (currentIds.length === 0 || targetChanged) {
      return {
        error:
          "Seçilen filtrelere uyan vitrin ürünü yok. Kategori ve marka kesişiminde satıştaki ürün olmayabilir veya ürünler zaten başka bir kampanyada.",
      };
    }
    nextIds = currentIds;
  }

  const nextSet = new Set(nextIds);
  const currentSet = new Set(currentIds);
  const removeIds = currentIds.filter((productId) => !nextSet.has(productId));
  const keepIds = currentIds.filter((productId) => nextSet.has(productId));
  const addIds = nextIds.filter((productId) => !currentSet.has(productId));

  const offer = {
    id,
    kind: input.kind,
    valueInt: input.valueInt,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  };

  if (removeIds.length > 0) {
    await restoreCampaignItems(await loadUnrestoredCampaignItems(id, removeIds));
  }

  let applied = 0;
  let skipped = 0;
  if (keepIds.length > 0) {
    await restoreCampaignItems(await loadUnrestoredCampaignItems(id, keepIds), {
      markRestored: false,
    });
    for (let i = 0; i < keepIds.length; i += APPLY_BATCH) {
      const result = await applyChunk(offer, keepIds.slice(i, i + APPLY_BATCH), {
        persist: "none",
        requireListed: false,
      });
      applied += result.applied;
      skipped += result.skipped;
    }
  }
  for (let i = 0; i < addIds.length; i += APPLY_BATCH) {
    const result = await applyChunk(offer, addIds.slice(i, i + APPLY_BATCH));
    applied += result.applied;
    skipped += result.skipped;
  }

  await prisma.$executeRaw`
    UPDATE campaigns
    SET
      name = ${name},
      kind = ${input.kind},
      valueInt = ${input.valueInt},
      countdown = ${input.countdown},
      startsAt = ${input.startsAt},
      endsAt = ${input.endsAt},
      inStockOnly = ${input.inStockOnly},
      status = 'ACTIVE',
      updatedAt = NOW(3)
    WHERE id = ${id}
  `;
  await replaceCampaignTargets(id, input);
  bustCatalogCache();
  return {
    id,
    applied,
    skipped,
    removed: removeIds.length,
    added: addIds.length,
  };
}

export async function endCampaign(campaignId: string, disable = true) {
  const rows = await prisma.$queryRaw<Array<{ id: string; status: string; endsAt: Date | null }>>`
    SELECT id, status, endsAt FROM campaigns WHERE id = ${campaignId} LIMIT 1
  `;
  const campaign = rows[0];
  if (!campaign) return { error: "Kampanya bulunamadı." };
  const restored = await restoreCampaignProducts(campaign.id);
  const endsAt =
    campaign.endsAt && campaign.endsAt.getTime() <= Date.now() ? campaign.endsAt : new Date();
  const status = disable ? "DISABLED" : campaign.status;
  await prisma.$executeRaw`
    UPDATE campaigns SET status = ${status}, endsAt = ${endsAt}, updatedAt = NOW(3)
    WHERE id = ${campaign.id}
  `;
  bustCatalogCache();
  return { restored };
}

export async function expireEndedCampaigns(now = new Date()) {
  const due = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT DISTINCT c.id
    FROM campaigns c
    INNER JOIN campaign_products cp ON cp.campaignId = c.id
    WHERE c.status = 'ACTIVE'
      AND c.endsAt IS NOT NULL
      AND c.endsAt <= ${now}
      AND cp.restoredAt IS NULL
    LIMIT 40
  `.catch(() => []);
  let restored = 0;
  for (const row of due) {
    restored += await restoreCampaignProducts(row.id);
  }
  if (restored > 0) bustCatalogCache();
  return { campaigns: due.length, restored };
}

export type LiveProductCampaign = {
  productId: string;
  id: string;
  kind: CampaignKindCode;
  valueInt: number;
  name: string;
  countdown: boolean;
  endsAt: Date | null;
};

type CampaignSqlRow = {
  productId: string;
  id: string;
  name: string;
  kind: string;
  valueInt: number;
  countdown: number | boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  status: string;
};

async function loadCampaignSqlRows(productIds: string[], now: Date, liveOnly: boolean) {
  const ids = uniqueIds(productIds);
  if (ids.length === 0) return [];
  try {
    return await prisma.$queryRaw<CampaignSqlRow[]>`
      SELECT
        cp.productId,
        c.id,
        c.name,
        c.kind,
        c.valueInt,
        c.countdown,
        c.startsAt,
        c.endsAt,
        c.status
      FROM campaign_products cp
      INNER JOIN campaigns c ON c.id = cp.campaignId
      WHERE cp.productId IN (${Prisma.join(ids)})
        AND cp.restoredAt IS NULL
        AND c.status = 'ACTIVE'
        AND (c.endsAt IS NULL OR c.endsAt > ${now})
        ${liveOnly ? Prisma.sql`AND (c.startsAt IS NULL OR c.startsAt <= ${now})` : Prisma.empty}
    `;
  } catch {
    return [];
  }
}

export async function loadLiveCampaignsByProductIds(
  productIds: string[],
  now = new Date(),
): Promise<Map<string, LiveProductCampaign>> {
  const map = new Map<string, LiveProductCampaign>();
  const rows = await loadCampaignSqlRows(productIds, now, true);
  for (const row of rows) {
    if (map.has(row.productId) || !isCampaignKind(row.kind)) continue;
    map.set(row.productId, {
      productId: row.productId,
      id: row.id,
      kind: row.kind,
      valueInt: row.valueInt,
      name: row.name,
      countdown: Boolean(row.countdown),
      endsAt: row.endsAt,
    });
  }
  return map;
}

export async function attachCatalogCampaigns<T extends { id: string }>(
  cards: T[],
): Promise<Array<T & { campaign: CatalogCampaignBadge | null }>> {
  const map = await loadLiveCampaignsByProductIds(cards.map((card) => card.id));
  return cards.map((card) => {
    const live = map.get(card.id);
    return {
      ...card,
      campaign: live
        ? {
            id: live.id,
            name: live.name,
            kind: live.kind,
            valueInt: live.valueInt,
            label: campaignOfferLabel(live.kind, live.valueInt),
            endsAt: live.countdown ? live.endsAt : null,
            countdown: live.countdown,
          }
        : null,
    };
  });
}

function listedProductSql() {
  return Prisma.sql`
    p.isActive = 1
    AND p.availableForOrder = 1
    AND p.visibility IN (${Prisma.join(STOREFRONT_LISTING_VISIBILITIES)})
  `;
}

export async function loadCampaignProductIds(campaignIds: string[], now = new Date()) {
  const ids = uniqueIds(campaignIds);
  if (ids.length === 0) return [];
  try {
    const rows = await prisma.$queryRaw<Array<{ productId: string }>>`
      SELECT DISTINCT cp.productId
      FROM campaign_products cp
      INNER JOIN campaigns c ON c.id = cp.campaignId
      INNER JOIN products p ON p.id = cp.productId
      WHERE cp.campaignId IN (${Prisma.join(ids)})
        AND cp.restoredAt IS NULL
        AND c.status = 'ACTIVE'
        AND (c.startsAt IS NULL OR c.startsAt <= ${now})
        AND (c.endsAt IS NULL OR c.endsAt > ${now})
        AND ${listedProductSql()}
    `;
    return rows.map((row) => row.productId);
  } catch {
    return [];
  }
}

export async function loadLiveCampaignFacets(input: {
  categoryIds?: string[];
  brandSlugs?: string[];
} = {}): Promise<CatalogCampaignFacet[]> {
  const categoryIds = uniqueIds(input.categoryIds ?? []);
  const brandSlugs = uniqueIds(input.brandSlugs ?? []);
  const now = new Date();
  try {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; name: string; kind: string; valueInt: number }>
    >`
      SELECT DISTINCT c.id, c.name, c.kind, c.valueInt, c.createdAt
      FROM campaigns c
      WHERE c.status = 'ACTIVE'
        AND (c.startsAt IS NULL OR c.startsAt <= ${now})
        AND (c.endsAt IS NULL OR c.endsAt > ${now})
        AND EXISTS (
          SELECT 1
          FROM campaign_products cp
          INNER JOIN products p ON p.id = cp.productId
          WHERE cp.campaignId = c.id
            AND cp.restoredAt IS NULL
            AND ${listedProductSql()}
            ${
              categoryIds.length > 0
                ? Prisma.sql`AND p.categoryId IN (${Prisma.join(categoryIds)})`
                : Prisma.empty
            }
            ${
              brandSlugs.length > 0
                ? Prisma.sql`AND p.brandId IN (SELECT id FROM brands WHERE slug IN (${Prisma.join(brandSlugs)}))`
                : Prisma.empty
            }
        )
      ORDER BY c.createdAt DESC
      LIMIT 24
    `;
    return rows.flatMap((row) => {
      if (!isCampaignKind(row.kind)) return [];
      return [{ id: row.id, name: row.name, label: campaignOfferLabel(row.kind, row.valueInt) }];
    });
  } catch {
    return [];
  }
}

export async function loadCampaignNamesByProductIds(
  productIds: string[],
  now = new Date(),
): Promise<Map<string, { name: string; label: string }>> {
  const map = new Map<string, { name: string; label: string }>();
  const rows = await loadCampaignSqlRows(productIds, now, false);
  for (const row of rows) {
    if (map.has(row.productId) || !isCampaignKind(row.kind)) continue;
    map.set(row.productId, {
      name: row.name,
      label: campaignOfferLabel(row.kind, row.valueInt),
    });
  }
  return map;
}

export type AdminCampaignListRow = {
  id: string;
  name: string;
  kind: CampaignKindCode;
  kindLabel: string;
  offerLabel: string;
  valueInt: number;
  status: CampaignStatusCode;
  phase: ReturnType<typeof campaignPhase>;
  countdown: boolean;
  startsAt: string | null;
  endsAt: string | null;
  productCount: number;
  listedProductCount: number;
  createdAt: string;
};

export async function loadAdminCampaignPage(page = 1, pageSize = 30) {
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * pageSize;
  const [countRows, rows] = await Promise.all([
    prisma.$queryRaw<Array<{ total: bigint | number }>>`SELECT COUNT(*) AS total FROM campaigns`,
    prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        kind: string;
        valueInt: number;
        status: string;
        countdown: number | boolean;
        startsAt: Date | null;
        endsAt: Date | null;
        createdAt: Date;
        productCount: bigint | number;
        listedProductCount: bigint | number;
      }>
    >`
      SELECT
        c.id,
        c.name,
        c.kind,
        c.valueInt,
        c.status,
        c.countdown,
        c.startsAt,
        c.endsAt,
        c.createdAt,
        (SELECT COUNT(*) FROM campaign_products cp WHERE cp.campaignId = c.id) AS productCount,
        (
          SELECT COUNT(*)
          FROM campaign_products cp
          INNER JOIN products p ON p.id = cp.productId
          WHERE cp.campaignId = c.id
            AND cp.restoredAt IS NULL
            AND p.isActive = 1
            AND p.availableForOrder = 1
            AND p.visibility IN ('EVERYWHERE', 'CATALOG')
        ) AS listedProductCount
      FROM campaigns c
      ORDER BY c.createdAt DESC, c.id DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
  ]);
  const total = Number(countRows[0]?.total ?? 0);
  const now = new Date();
  return {
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
    campaigns: rows.flatMap((row): AdminCampaignListRow[] => {
      if (!isCampaignKind(row.kind)) return [];
      const status: CampaignStatusCode = row.status === "DISABLED" ? "DISABLED" : "ACTIVE";
      return [
        {
          id: row.id,
          name: row.name,
          kind: row.kind,
          kindLabel: campaignKindLabel(row.kind),
          offerLabel: campaignOfferLabel(row.kind, row.valueInt),
          valueInt: row.valueInt,
          status,
          phase: campaignPhase({ status, startsAt: row.startsAt, endsAt: row.endsAt }, now),
          countdown: Boolean(row.countdown),
          startsAt: toIsoOrNull(row.startsAt),
          endsAt: toIsoOrNull(row.endsAt),
          productCount: Number(row.productCount),
          listedProductCount: Number(row.listedProductCount),
          createdAt: row.createdAt.toISOString(),
        },
      ];
    }),
  };
}

export async function loadAdminCampaignDetail(id: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      kind: string;
      valueInt: number;
      status: string;
      countdown: number | boolean;
      inStockOnly: number | boolean;
      startsAt: Date | null;
      endsAt: Date | null;
      createdAt: Date;
    }>
  >`SELECT * FROM campaigns WHERE id = ${id} LIMIT 1`;
  const campaign = rows[0];
  if (!campaign || !isCampaignKind(campaign.kind)) return null;
  const [categoryRows, brandRows, productRows, countRows, listedCountRows] = await Promise.all([
    prisma.$queryRaw<Array<{ name: string }>>`
      SELECT pc.name
      FROM campaign_categories cc
      INNER JOIN product_categories pc ON pc.id = cc.categoryId
      WHERE cc.campaignId = ${id}
    `,
    prisma.$queryRaw<Array<{ name: string }>>`
      SELECT b.name
      FROM campaign_brands cb
      INNER JOIN brands b ON b.id = cb.brandId
      WHERE cb.campaignId = ${id}
    `,
    prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        sku: string | null;
        image: string | null;
        brandName: string | null;
        restoredAt: Date | null;
      }>
    >`
      SELECT p.id, p.title, p.sku, p.image, b.name AS brandName, cp.restoredAt
      FROM campaign_products cp
      INNER JOIN products p ON p.id = cp.productId
      LEFT JOIN brands b ON b.id = p.brandId
      WHERE cp.campaignId = ${id}
      ORDER BY cp.createdAt ASC
      LIMIT 80
    `,
    prisma.$queryRaw<Array<{ total: bigint | number }>>`
      SELECT COUNT(*) AS total FROM campaign_products WHERE campaignId = ${id}
    `,
    prisma.$queryRaw<Array<{ total: bigint | number }>>`
      SELECT COUNT(*) AS total
      FROM campaign_products cp
      INNER JOIN products p ON p.id = cp.productId
      WHERE cp.campaignId = ${id}
        AND cp.restoredAt IS NULL
        AND p.isActive = 1
        AND p.availableForOrder = 1
        AND p.visibility IN ('EVERYWHERE', 'CATALOG')
    `,
  ]);
  const now = new Date();
  const status: CampaignStatusCode = campaign.status === "DISABLED" ? "DISABLED" : "ACTIVE";
  return {
    id: campaign.id,
    name: campaign.name,
    kind: campaign.kind,
    kindLabel: campaignKindLabel(campaign.kind),
    offerLabel: campaignOfferLabel(campaign.kind, campaign.valueInt),
    valueInt: campaign.valueInt,
    status,
    phase: campaignPhase({ status, startsAt: campaign.startsAt, endsAt: campaign.endsAt }, now),
    countdown: Boolean(campaign.countdown),
    inStockOnly: Boolean(campaign.inStockOnly),
    startsAt: toIsoOrNull(campaign.startsAt),
    endsAt: toIsoOrNull(campaign.endsAt),
    createdAt: campaign.createdAt.toISOString(),
    productCount: Number(countRows[0]?.total ?? 0),
    listedProductCount: Number(listedCountRows[0]?.total ?? 0),
    categories: categoryRows.map((row) => row.name),
    brands: brandRows.map((row) => row.name),
    products: productRows.map((row) => ({
      id: row.id,
      title: row.title,
      sku: row.sku,
      image: row.image,
      brandName: row.brandName,
      restored: Boolean(row.restoredAt),
    })),
  };
}

export type CampaignFormInitial = {
  id: string;
  name: string;
  kind: CampaignKindCode;
  value: string;
  countdown: boolean;
  startsAt: string;
  endsAt: string;
  inStockOnly: boolean;
  categoryIds: string[];
  brandIds: string[];
  products: CampaignSearchProduct[];
};

export async function loadAdminCampaignForm(id: string): Promise<CampaignFormInitial | null> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      kind: string;
      valueInt: number;
      status: string;
      countdown: number | boolean;
      inStockOnly: number | boolean;
      startsAt: Date | null;
      endsAt: Date | null;
    }>
  >`SELECT id, name, kind, valueInt, status, countdown, inStockOnly, startsAt, endsAt FROM campaigns WHERE id = ${id} LIMIT 1`;
  const campaign = rows[0];
  if (!campaign || !isCampaignKind(campaign.kind) || campaign.status === "DISABLED") return null;

  const [categoryRows, brandRows] = await Promise.all([
    prisma.$queryRaw<Array<{ categoryId: string }>>`
      SELECT categoryId FROM campaign_categories WHERE campaignId = ${id}
    `,
    prisma.$queryRaw<Array<{ brandId: string }>>`
      SELECT brandId FROM campaign_brands WHERE campaignId = ${id}
    `,
  ]);
  const categoryIds = categoryRows.map((row) => row.categoryId);
  const brandIds = brandRows.map((row) => row.brandId);
  let products: CampaignSearchProduct[] = [];
  if (categoryIds.length === 0 && brandIds.length === 0) {
    const productRows = await prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        sku: string | null;
        image: string | null;
        brandName: string | null;
      }>
    >`
      SELECT p.id, p.title, p.sku, p.image, b.name AS brandName
      FROM campaign_products cp
      INNER JOIN products p ON p.id = cp.productId
      LEFT JOIN brands b ON b.id = p.brandId
      WHERE cp.campaignId = ${id} AND cp.restoredAt IS NULL
      ORDER BY cp.createdAt ASC
      LIMIT 400
    `;
    products = productRows.map((row) => ({
      id: row.id,
      title: row.title,
      sku: row.sku,
      image: row.image,
      brandName: row.brandName,
      busy: false,
    }));
  }

  return {
    id: campaign.id,
    name: campaign.name,
    kind: campaign.kind,
    value: campaignValueInput(campaign.kind, campaign.valueInt),
    countdown: Boolean(campaign.countdown),
    startsAt: toDatetimeLocalValue(campaign.startsAt),
    endsAt: toDatetimeLocalValue(campaign.endsAt),
    inStockOnly: Boolean(campaign.inStockOnly),
    categoryIds,
    brandIds,
    products,
  };
}

export async function loadCampaignFormLookups() {
  const [categoryRows, brands] = await Promise.all([
    prisma.productCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        sortOrder: true,
        isActive: true,
      },
    }),
    prisma.brand.findMany({
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  return {
    categories: flattenCategoryTree(buildCategoryTree(categoryRows)).map((category) => ({
      id: category.id,
      label: category.name,
      depth: category.depth,
    })),
    brands: brands.map((brand) => ({ id: brand.id, label: brand.name })),
  };
}
