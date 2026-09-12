import "server-only";

import type { Prisma } from "@prisma/client";
import { attachCatalogCampaigns } from "@/lib/campaigns";
import { collectDescendantIds } from "@/lib/category-tree";
import { unstable_cache, revalidateTag } from "next/cache";
import {
  isProductSectionRank,
  type ProductCategorySectionSource,
  type ProductSectionRank,
  type ProductSectionSource,
} from "@/lib/page-sections";
import { prisma } from "@/lib/prisma";
import { parsePerformance, productDataCacheSeconds } from "@/lib/performance";
import { getSettingsMap } from "@/lib/settings";
import { resolveCatalogListingConstraint } from "@/lib/catalog-listing-constraint";
import { ensureRankingSchema } from "@/lib/ensure-ranking-schema";
import { searchPlacementKeys } from "@/lib/product-ranking";
import { storefrontListingWhere, storefrontPublicProductWhere } from "@/lib/storefront-product-where";
import type {
  CatalogCategoryCard,
  CatalogListingFilters,
  CatalogProductCard,
  CatalogSort,
} from "@/lib/catalog-storefront";

export type { CatalogCategoryCard, CatalogListingFilters, CatalogProductCard, CatalogSaleUnit, CatalogSort } from "@/lib/catalog-storefront";
export {
  CATALOG_DEFAULT_SORT,
  CATALOG_SORTS,
  catalogBrandHref,
  catalogCardAvailability,
  catalogCardAvailabilityLabel,
  catalogCardHoverImage,
  catalogCardSchemaAvailability,
  catalogCardPrice,
  catalogCategoryHref,
  catalogProductHref,
  parseCatalogSort,
} from "@/lib/catalog-storefront";

export const CATALOG_CACHE_TAG = "products";
export const CATALOG_GRID_PAGE_SIZE = 24;
const CACHE_REVALIDATE = 60;

const productCardSelect = {
  id: true,
  urlId: true,
  title: true,
  slug: true,
  summary: true,
  image: true,
  basePriceMinor: true,
  compareAtMinor: true,
  saleStartsAt: true,
  saleEndsAt: true,
  taxRatePercent: true,
  showPrice: true,
  onSale: true,
  availableForOrder: true,
  outOfStockBehavior: true,
  saleUnit: true,
  createdAt: true,
  viewCount: true,
  clickCount: true,
  category: { select: { name: true, slug: true, urlId: true } },
  brand: { select: { name: true, slug: true, urlId: true } },
  images: {
    orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
    take: 2,
    select: { url: true, isCover: true },
  },
  variants: {
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
    take: 8,
    select: {
      priceMinor: true,
      compareAtMinor: true,
      saleStartsAt: true,
      saleEndsAt: true,
      stockQuantity: true,
      isDefault: true,
      trackInventory: true,
      allowBackorder: true,
    },
  },
} satisfies Prisma.ProductSelect;

type ProductCardRow = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

async function toCatalogCards(
  rows: Array<ProductCardRow | undefined>,
): Promise<CatalogProductCard[]> {
  const cards = rows.filter((row): row is ProductCardRow => Boolean(row)) as CatalogProductCard[];
  return attachCatalogCampaigns(cards);
}

export function bustCatalogCache() {
  revalidateTag(CATALOG_CACHE_TAG);
}

async function catalogCacheRevalidateSeconds() {
  try {
    const seconds = parsePerformance(await getSettingsMap()).htmlCacheSeconds;
    return seconds > 0 ? seconds : CACHE_REVALIDATE;
  } catch {
    return CACHE_REVALIDATE;
  }
}

async function productPageCacheOptions() {
  try {
    const perf = parsePerformance(await getSettingsMap());
    return {
      revalidate: productDataCacheSeconds(perf),
      relatedLimit: perf.productRelatedLimit,
      galleryLimit: perf.productGalleryLimit,
    };
  } catch {
    return {
      revalidate: CACHE_REVALIDATE,
      relatedLimit: 8,
      galleryLimit: 16,
    };
  }
}

function listingCacheKey(filters: CatalogListingFilters, page: number) {
  return JSON.stringify({
    p: Math.max(1, page),
    s: filters.sort,
    c: [...(filters.categoryIds ?? [])].sort(),
    b: [...filters.brandSlugs].sort(),
    f: [...filters.filterValueIds].sort(),
    k: [...(filters.campaignIds ?? [])].sort(),
    min: filters.minMajor,
    max: filters.maxMajor,
    q: filters.query ?? "",
  });
}

function listingWhere(extra?: Prisma.ProductWhereInput): Prisma.ProductWhereInput {
  return storefrontListingWhere(extra);
}

export type CatalogUrlRef = {
  slug: string;
  urlId: number;
};

async function findByUrlIdOrSlug<T extends { slug: string; urlId: number }>(
  urlId: number | null | undefined,
  slug: string,
  byUrlId: () => Promise<T | null>,
  bySlug: () => Promise<T | null>,
) {
  if (urlId != null && Number.isFinite(urlId) && urlId > 0) {
    const found = await byUrlId();
    if (found) return found;
  }
  return bySlug();
}

export function findCatalogCategoryRef(slug: string, urlId?: number | null) {
  return findByUrlIdOrSlug(
    urlId,
    slug,
    () =>
      prisma.productCategory.findFirst({
        where: { urlId: urlId!, isActive: true },
        select: { slug: true, urlId: true },
      }),
    () =>
      prisma.productCategory.findFirst({
        where: { slug, isActive: true },
        select: { slug: true, urlId: true },
      }),
  );
}

export function findCatalogBrandRef(slug: string, urlId?: number | null) {
  return findByUrlIdOrSlug(
    urlId,
    slug,
    () =>
      prisma.brand.findFirst({
        where: { urlId: urlId!, isActive: true },
        select: { slug: true, urlId: true },
      }),
    () =>
      prisma.brand.findFirst({
        where: { slug, isActive: true },
        select: { slug: true, urlId: true },
      }),
  );
}

export function findCatalogProductRef(slug: string, urlId?: number | null) {
  return findByUrlIdOrSlug(
    urlId,
    slug,
    () =>
      prisma.product.findFirst({
        where: storefrontPublicProductWhere({ urlId: urlId! }),
        select: { slug: true, urlId: true },
      }),
    () =>
      prisma.product.findFirst({
        where: storefrontPublicProductWhere({ slug }),
        select: { slug: true, urlId: true },
      }),
  );
}

export const getCachedCatalogCategoryIndex = unstable_cache(
  async () => {
    const [categories, counts] = await Promise.all([
      prisma.productCategory.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          urlId: true,
          parentId: true,
          name: true,
          slug: true,
          sortOrder: true,
          isActive: true,
          image: true,
        },
      }),
      prisma.product.groupBy({
        by: ["categoryId"],
        where: listingWhere({ categoryId: { not: null } }),
        _count: { _all: true },
      }),
    ]);
    const countByCategoryId = new Map(
      counts.flatMap((row) =>
        row.categoryId ? [[row.categoryId, row._count._all] as const] : [],
      ),
    );

    return categories.map((category) => {
      const ids = collectDescendantIds(categories, category.id);
      let productCount = 0;
      for (const id of ids) {
        productCount += countByCategoryId.get(id) ?? 0;
      }
      return { ...category, productCount };
    });
  },
    ["catalog-category-index-v4"],
  { tags: [CATALOG_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
);

export const getCachedCatalogBrandIndex = unstable_cache(
  async () => {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        urlId: true,
        name: true,
        slug: true,
        logo: true,
        _count: {
          select: {
            products: {
              where: listingWhere(),
            },
          },
        },
      },
    });
    return brands
      .map((brand) => ({
        id: brand.id,
        urlId: brand.urlId,
        name: brand.name,
        slug: brand.slug,
        logo: brand.logo,
        productCount: brand._count.products,
      }))
      .filter((brand) => brand.productCount > 0);
  },
  ["catalog-brand-index-v3"],
  { tags: [CATALOG_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
);

export async function getCachedCatalogCategoryPage(slug: string) {
  const revalidate = await catalogCacheRevalidateSeconds();
  return unstable_cache(
    async () => {
      const category = await prisma.productCategory.findFirst({
        where: { slug, isActive: true },
        select: {
          id: true,
          urlId: true,
          parentId: true,
          name: true,
          slug: true,
          description: true,
          image: true,
          seoTitle: true,
          seoDescription: true,
        },
      });
      if (!category) return null;
      return { category };
    },
    ["catalog-category-meta-v1", slug],
    { tags: [CATALOG_CACHE_TAG, "site"], revalidate },
  )();
}

export async function getCachedCatalogBrandPage(slug: string) {
  const revalidate = await catalogCacheRevalidateSeconds();
  return unstable_cache(
    async () => {
      const brand = await prisma.brand.findFirst({
        where: { slug, isActive: true },
        select: {
          id: true,
          urlId: true,
          name: true,
          slug: true,
          tagline: true,
          description: true,
          logo: true,
          banner: true,
          seoTitle: true,
          seoDescription: true,
        },
      });
      if (!brand) return null;
      return { brand };
    },
    ["catalog-brand-meta-v1", slug],
    { tags: [CATALOG_CACHE_TAG, "site"], revalidate },
  )();
}

export async function getCachedCatalogProduct(slug: string) {
  const { revalidate, relatedLimit, galleryLimit } = await productPageCacheOptions();
  return unstable_cache(
    async () => {
      const product = await prisma.product.findFirst({
        where: storefrontPublicProductWhere({ slug }),
        include: {
          category: { select: { id: true, urlId: true, name: true, slug: true } },
          brand: { select: { id: true, urlId: true, name: true, slug: true, logo: true } },
          images: {
            orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
            take: galleryLimit,
            select: { id: true, url: true, alt: true, isCover: true },
          },
          attachments: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, url: true, name: true },
          },
          filterAssignments: {
            include: {
              filter: { select: { id: true, name: true, unit: true, inputType: true } },
              value: { select: { id: true, name: true } },
            },
          },
          variants: {
            where: { isActive: true },
            orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
            select: {
              id: true,
              title: true,
              sku: true,
              priceMinor: true,
              compareAtMinor: true,
              saleStartsAt: true,
              saleEndsAt: true,
              stockQuantity: true,
              trackInventory: true,
              allowBackorder: true,
              isDefault: true,
              image: true,
              selections: {
                select: {
                  attributeId: true,
                  valueId: true,
                  attribute: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      sortOrder: true,
                      displayType: true,
                    },
                  },
                  value: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      sortOrder: true,
                      colorHex: true,
                      image: true,
                    },
                  },
                },
              },
            },
          },
          relatedFrom: {
            take: Math.max(0, relatedLimit),
            orderBy: { sortOrder: "asc" },
            where: {
              related: storefrontListingWhere(),
            },
            include: {
              related: { select: productCardSelect },
            },
          },
        },
      });
      if (!product) return null;

      const related = await fillRelatedCatalogCards(
        product,
        await toCatalogCards(product.relatedFrom.map((row) => row.related)),
        relatedLimit,
      );
      const [withCampaign] = await attachCatalogCampaigns([{ id: product.id }]);
      return {
        ...product,
        campaign: withCampaign?.campaign ?? null,
        related,
      };
    },
    ["catalog-product-v12", slug, String(relatedLimit), String(galleryLimit)],
    { tags: [CATALOG_CACHE_TAG, "site"], revalidate },
  )();
}

const SOLD_STATUSES = [
  "PAYMENT_ACCEPTED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
] as const;

export type ProductSectionQuery = {
  source: ProductSectionSource;
  rank?: ProductSectionRank;
  limit: number;
  categoryId?: string | null;
  brandId?: string | null;
  filterValueId?: string | null;
  categoryIds?: string[];
  brandIds?: string[];
  filterValueIds?: string[];
  productIds?: string[];
};

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.map((item) => item?.trim()).filter((item): item is string => Boolean(item)))];
}

async function expandCategoryIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const catalog = await prisma.productCategory.findMany({
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
    for (const childId of collectDescendantIds(catalog, id)) {
      expanded.add(childId);
    }
  }
  return [...expanded];
}

async function extraMerchWhere(query: ProductSectionQuery): Promise<Prisma.ProductWhereInput> {
  const extra: Prisma.ProductWhereInput = {};
  const categoryIds = uniqueIds([
    ...(query.categoryIds ?? []),
    query.categoryId,
  ]);
  if (categoryIds.length > 0) {
    extra.categoryId = { in: await expandCategoryIds(categoryIds) };
  }
  const brandIds = uniqueIds([...(query.brandIds ?? []), query.brandId]);
  if (brandIds.length > 0) {
    extra.brandId = { in: brandIds };
  }
  const filterValueIds = uniqueIds([
    ...(query.filterValueIds ?? []),
    query.filterValueId,
  ]);
  if (filterValueIds.length > 0) {
    extra.filterAssignments = { some: { valueId: { in: filterValueIds } } };
  }
  return extra;
}

function merchQueryKind(
  query: ProductSectionQuery,
): Exclude<ProductSectionSource, "CATEGORY" | "BRAND" | "FILTER"> {
  switch (query.source) {
    case "CATEGORY":
    case "BRAND":
    case "FILTER":
      return query.rank && isProductSectionRank(query.rank) ? query.rank : "NEW";
    case "NEW":
    case "BEST_SELLERS":
    case "MOST_CLICKED":
    case "MOST_VIEWED":
    case "ON_SALE":
    case "RECENTLY_VIEWED":
    case "MANUAL":
      return query.source;
    default: {
      const _exhaustive: never = query.source;
      return _exhaustive;
    }
  }
}

async function bestSellerIds(limit: number, extra: Prisma.ProductWhereInput) {
  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      order: { status: { in: [...SOLD_STATUSES] } },
      product: listingWhere(extra),
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });
  return grouped
    .map((row) => row.productId)
    .filter((id): id is string => Boolean(id));
}

export async function getProductsBySource(
  query: ProductSectionQuery,
): Promise<CatalogProductCard[]> {
  const limit = Math.max(1, Math.min(48, query.limit));
  const extra = await extraMerchWhere(query);
  const kind = merchQueryKind(query);

  switch (kind) {
    case "RECENTLY_VIEWED":
      return [];
    case "MANUAL": {
      const ids = (query.productIds ?? []).slice(0, limit);
      if (ids.length === 0) return [];
      const rows = await prisma.product.findMany({
        where: listingWhere({ id: { in: ids } }),
        select: productCardSelect,
      });
      const byId = new Map(rows.map((row) => [row.id, row]));
      return await toCatalogCards(ids.map((id) => byId.get(id)));
    }
    case "BEST_SELLERS": {
      const ids = await bestSellerIds(limit, extra);
      if (ids.length === 0) {
        return await toCatalogCards(
          await prisma.product.findMany({
            where: listingWhere(extra),
            orderBy: [{ clickCount: "desc" }, { createdAt: "desc" }],
            take: limit,
            select: productCardSelect,
          }),
        );
      }
      const rows = await prisma.product.findMany({
        where: listingWhere({ id: { in: ids } }),
        select: productCardSelect,
      });
      const byId = new Map(rows.map((row) => [row.id, row]));
      return await toCatalogCards(ids.map((id) => byId.get(id)));
    }
    case "MOST_CLICKED":
      return await toCatalogCards(
        await prisma.product.findMany({
          where: listingWhere(extra),
          orderBy: [{ clickCount: "desc" }, { createdAt: "desc" }],
          take: limit,
          select: productCardSelect,
        }),
      );
    case "MOST_VIEWED":
      return await toCatalogCards(
        await prisma.product.findMany({
          where: listingWhere(extra),
          orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
          take: limit,
          select: productCardSelect,
        }),
      );
    case "ON_SALE":
      return await toCatalogCards(
        await prisma.product.findMany({
          where: listingWhere({
            ...extra,
            OR: [{ onSale: true }, { compareAtMinor: { gt: 0 } }],
          }),
          orderBy: [{ createdAt: "desc" }],
          take: limit,
          select: productCardSelect,
        }),
      );
    case "NEW":
      return await toCatalogCards(
        await prisma.product.findMany({
          where: listingWhere(extra),
          orderBy: [{ createdAt: "desc" }, { sortOrder: "asc" }],
          take: limit,
          select: productCardSelect,
        }),
      );
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export async function getCatalogProductsByIds(ids: string[]): Promise<CatalogProductCard[]> {
  const unique = [...new Set(ids)].slice(0, 24);
  if (unique.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: listingWhere({ id: { in: unique } }),
    select: productCardSelect,
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return await toCatalogCards(unique.map((id) => byId.get(id)));
}

export async function getProductCategoriesBySource(query: {
  source: ProductCategorySectionSource;
  limit: number;
  parentId?: string | null;
  categoryIds?: string[];
}): Promise<CatalogCategoryCard[]> {
  const limit = Math.max(1, Math.min(48, query.limit));
  const index = await getCachedCatalogCategoryIndex();
  const toCard = (row: (typeof index)[number]): CatalogCategoryCard => ({
    id: row.id,
    urlId: row.urlId,
    name: row.name,
    slug: row.slug,
    image: row.image,
    productCount: row.productCount,
  });

  switch (query.source) {
    case "MANUAL": {
      const ids = [...new Set(query.categoryIds ?? [])].slice(0, limit);
      if (ids.length === 0) return [];
      const byId = new Map(index.map((row) => [row.id, row]));
      return ids
        .map((id) => byId.get(id))
        .filter((row): row is (typeof index)[number] => Boolean(row))
        .map(toCard);
    }
    case "ROOTS": {
      const roots = index.filter((row) => !row.parentId);
      const list = roots.length > 0 ? roots : index;
      return list.slice(0, limit).map(toCard);
    }
    case "CHILDREN": {
      const parentId = query.parentId?.trim();
      if (!parentId) return [];
      const direct = index.filter((row) => row.parentId === parentId);
      if (direct.length > 0) return direct.slice(0, limit).map(toCard);
      const descendantIds = collectDescendantIds(index, parentId);
      descendantIds.delete(parentId);
      const nested = index.filter((row) => descendantIds.has(row.id));
      if (nested.length > 0) return nested.slice(0, limit).map(toCard);
      const parent = index.find((row) => row.id === parentId);
      return parent ? [toCard(parent)] : [];
    }
    case "ALL":
      return index.slice(0, limit).map(toCard);
    default: {
      const _exhaustive: never = query.source;
      return _exhaustive;
    }
  }
}

function listingOrderBy(sort: CatalogSort): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "onerilen":
      return [{ rankScore: "desc" }, { clickCount: "desc" }, { createdAt: "desc" }];
    case "yeni":
      return [{ createdAt: "desc" }, { sortOrder: "asc" }];
    case "fiyat-artan":
      return [{ basePriceMinor: "asc" }, { createdAt: "desc" }];
    case "fiyat-azalan":
      return [{ basePriceMinor: "desc" }, { createdAt: "desc" }];
    case "cok-satan":
      return [{ clickCount: "desc" }, { createdAt: "desc" }];
    default: {
      const _exhaustive: never = sort;
      return _exhaustive;
    }
  }
}

async function fillRelatedCatalogCards(
  product: { id: string; categoryId: string | null; brandId: string | null },
  related: CatalogProductCard[],
  limit: number,
): Promise<CatalogProductCard[]> {
  if (related.length >= limit) return related;
  await ensureRankingSchema().catch(() => undefined);
  const exclude = [product.id, ...related.map((item) => item.id)];
  const affinity: Prisma.ProductWhereInput[] = [];
  if (product.categoryId) affinity.push({ categoryId: product.categoryId });
  if (product.brandId) affinity.push({ brandId: product.brandId });
  const rows = await prisma.product.findMany({
    where: listingWhere({
      id: { notIn: exclude },
      ...(affinity.length > 0 ? { OR: affinity } : {}),
    }),
    orderBy: listingOrderBy("onerilen"),
    take: limit - related.length,
    select: productCardSelect,
  });
  return [...related, ...(await toCatalogCards(rows))];
}

async function loadPlacementBoosts(filters: CatalogListingFilters) {
  await ensureRankingSchema().catch(() => undefined);
  const categoryIds = filters.categoryIds ?? [];
  const terms = searchPlacementKeys(filters.query ?? "");
  const clauses: Prisma.ProductPlacementWhereInput[] = [];
  if (categoryIds.length > 0) {
    clauses.push({
      kind: "CATEGORY",
      isActive: true,
      boost: { gt: 0 },
      categoryId: { in: categoryIds },
    });
  }
  if (terms.length > 0) {
    clauses.push({
      kind: "SEARCH",
      isActive: true,
      boost: { gt: 0 },
      searchTerm: { in: terms },
    });
  }
  if (clauses.length === 0) return new Map<string, number>();
  try {
    const rows = await prisma.productPlacement.findMany({
      where: { OR: clauses },
      select: { productId: true, boost: true },
      take: 200,
    });
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.productId, Math.max(map.get(row.productId) ?? 0, row.boost));
    }
    return map;
  } catch {
    return new Map<string, number>();
  }
}

async function recommendedCatalogListing(
  extra: Prisma.ProductWhereInput,
  filters: CatalogListingFilters,
  page: number,
): Promise<{ products: CatalogProductCard[]; total: number; merchandisedIds: string[] }> {
  const where = listingWhere(extra);
  const skip = (Math.max(1, page) - 1) * CATALOG_GRID_PAGE_SIZE;
  const boosts = await loadPlacementBoosts(filters);
  const boostedIds = [...boosts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([id]) => id);

  const [total, boostedRows] = await Promise.all([
    prisma.product.count({ where }),
    boostedIds.length > 0
      ? prisma.product.findMany({
          where: listingWhere({ ...extra, id: { in: boostedIds } }),
          select: productCardSelect,
        })
      : Promise.resolve([]),
  ]);

  const boostedById = new Map(boostedRows.map((row) => [row.id, row]));
  const merchandised = boostedIds
    .map((id) => boostedById.get(id))
    .filter((row): row is ProductCardRow => Boolean(row));
  const merchandisedIds = merchandised.map((row) => row.id);
  const merchandisedSet = new Set(merchandisedIds);

  if (skip < merchandised.length) {
    const head = merchandised.slice(skip, skip + CATALOG_GRID_PAGE_SIZE);
    const need = CATALOG_GRID_PAGE_SIZE - head.length;
    const organic =
      need > 0
        ? await prisma.product.findMany({
            where: listingWhere({
              ...extra,
              id: merchandisedSet.size > 0 ? { notIn: [...merchandisedSet] } : undefined,
            }),
            orderBy: listingOrderBy("onerilen"),
            take: need,
            select: productCardSelect,
          })
        : [];
    return {
      total,
      merchandisedIds,
      products: await toCatalogCards([...head, ...organic]),
    };
  }

  const products = await prisma.product.findMany({
    where: listingWhere({
      ...extra,
      id: merchandisedSet.size > 0 ? { notIn: [...merchandisedSet] } : undefined,
    }),
    orderBy: listingOrderBy("onerilen"),
    skip: skip - merchandised.length,
    take: CATALOG_GRID_PAGE_SIZE,
    select: productCardSelect,
  });
  return {
    total,
    merchandisedIds,
    products: await toCatalogCards(products),
  };
}

export async function getAffinityCatalogProducts(
  seedIds: string[],
  excludeIds: string[] = [],
  limit = 8,
): Promise<CatalogProductCard[]> {
  await ensureRankingSchema().catch(() => undefined);
  const uniqueSeeds = [...new Set(seedIds)].slice(0, 12);
  if (uniqueSeeds.length === 0) return [];
  const seeds = await prisma.product.findMany({
    where: { id: { in: uniqueSeeds } },
    select: { categoryId: true, brandId: true },
  });
  const categoryIds = uniqueIds(seeds.map((row) => row.categoryId));
  const brandIds = uniqueIds(seeds.map((row) => row.brandId));
  const exclude = [...new Set([...uniqueSeeds, ...excludeIds])].slice(0, 80);
  const affinity: Prisma.ProductWhereInput[] = [];
  if (categoryIds.length > 0) affinity.push({ categoryId: { in: categoryIds } });
  if (brandIds.length > 0) affinity.push({ brandId: { in: brandIds } });
  if (affinity.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: listingWhere({
      id: { notIn: exclude },
      OR: affinity,
    }),
    orderBy: listingOrderBy("onerilen"),
    take: Math.max(1, Math.min(12, limit)),
    select: productCardSelect,
  });
  return toCatalogCards(rows);
}

export async function getFilteredCatalogListing(
  filters: CatalogListingFilters,
  page: number,
): Promise<{ products: CatalogProductCard[]; total: number; merchandisedIds: string[] }> {
  const extra = await resolveCatalogListingConstraint(filters);
  const where = listingWhere(extra);
  const skip = (Math.max(1, page) - 1) * CATALOG_GRID_PAGE_SIZE;

  if (filters.sort === "onerilen") {
    return recommendedCatalogListing(extra, filters, page);
  }

  if (filters.sort === "cok-satan") {
    const rankedTake = skip + CATALOG_GRID_PAGE_SIZE;
    const ids = await bestSellerIds(rankedTake, extra);
    const pageIds = ids.slice(skip, skip + CATALOG_GRID_PAGE_SIZE);
    const [total, soldRows] = await Promise.all([
      prisma.product.count({ where }),
      pageIds.length > 0
        ? prisma.product.findMany({
            where: listingWhere({ ...extra, id: { in: pageIds } }),
            select: productCardSelect,
          })
        : Promise.resolve([]),
    ]);
    const byId = new Map(soldRows.map((row) => [row.id, row]));
    const ranked = await toCatalogCards(pageIds.map((id) => byId.get(id)));
    if (ranked.length >= CATALOG_GRID_PAGE_SIZE) {
      return { total, merchandisedIds: [], products: ranked.slice(0, CATALOG_GRID_PAGE_SIZE) };
    }
    if (total > ids.length) {
      const fallback = await prisma.product.findMany({
        where: listingWhere({
          ...extra,
          id: ids.length > 0 ? { notIn: ids } : undefined,
        }),
        orderBy: listingOrderBy("cok-satan"),
        skip: Math.max(0, skip - ids.length),
        take: CATALOG_GRID_PAGE_SIZE - ranked.length,
        select: productCardSelect,
      });
      return {
        total,
        merchandisedIds: [],
        products: [...ranked, ...(await toCatalogCards(fallback))],
      };
    }
    return { total, merchandisedIds: [], products: ranked };
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: listingOrderBy(filters.sort),
      skip,
      take: CATALOG_GRID_PAGE_SIZE,
      select: productCardSelect,
    }),
  ]);
  return { products: await toCatalogCards(products), total, merchandisedIds: [] };
}

export async function getCachedFilteredCatalogListing(
  filters: CatalogListingFilters,
  page: number,
): Promise<{ products: CatalogProductCard[]; total: number }> {
  const revalidate = await catalogCacheRevalidateSeconds();
  return unstable_cache(
    () => getFilteredCatalogListing(filters, page),
    ["catalog-listing-page-v8", listingCacheKey(filters, page)],
    { tags: [CATALOG_CACHE_TAG, "site"], revalidate },
  )();
}

export const getCachedCatalogBrandsForFacets = unstable_cache(
  async () =>
    prisma.brand.findMany({
      where: { isActive: true, products: { some: listingWhere() } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
  ["catalog-facet-brands"],
  { tags: [CATALOG_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
);

export const getCachedCatalogFilterFacets = unstable_cache(
  async () =>
    prisma.productFilter.findMany({
      where: { isActive: true, kind: "CUSTOM" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        values: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, slug: true },
        },
      },
    }),
  ["catalog-facet-filters"],
  { tags: [CATALOG_CACHE_TAG, "site"], revalidate: CACHE_REVALIDATE },
);
