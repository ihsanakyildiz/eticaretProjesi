import { Prisma, type ProductVisibility } from "@prisma/client";
import { isCampaignKind } from "@/lib/campaign-kinds";
import {
  buildCategoryTree,
  collectDescendantIds,
  flattenCategoryTree,
  type CategoryNodeBase,
} from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { campaignOfferLabel } from "@/lib/campaign-kinds";
import { toIsoOrNull } from "@/lib/product-sale";
import { DEFAULT_VARIANT_COMBINATION_KEY } from "@/lib/product-variants";

export type ProductRow = {
  id: string;
  title: string;
  slug: string;
  urlId: number;
  sku: string | null;
  image: string | null;
  isActive: boolean;
  availableForOrder: boolean;
  basePriceMinor: number;
  compareAtMinor: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  categoryName: string | null;
  brandName: string | null;
  supplierName: string | null;
  stockQuantity: number;
  variantCount: number;
  defaultVariantId: string | null;
  feedSyncLocked: boolean;
  createdAt: string;
  campaignName: string | null;
  campaignLabel: string | null;
};

export type ProductListVariantRow = {
  id: string;
  productId: string;
  title: string;
  sku: string;
  barcode: string | null;
  priceMinor: number;
  compareAtMinor: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  stockQuantity: number;
  image: string | null;
  isActive: boolean;
  isDefault: boolean;
  feedSyncLocked: boolean;
};

export const ADMIN_PRODUCTS_PAGE_SIZE = 40;
export const ADMIN_PRODUCT_NONE = "__none__";
const LOW_STOCK_MAX = 10;

export const ADMIN_PRODUCT_STATUSES = ["all", "active", "draft"] as const;
export const ADMIN_PRODUCT_SALES = ["all", "open", "closed"] as const;
export const ADMIN_PRODUCT_STOCKS = ["all", "in", "out", "low"] as const;
export const ADMIN_PRODUCT_IMAGES = ["all", "yes", "no"] as const;
export const ADMIN_PRODUCT_ADDED = ["all", "today", "7d", "30d"] as const;
export const ADMIN_PRODUCT_ON_SALES = ["all", "yes", "no"] as const;
export const ADMIN_PRODUCT_VISIBILITIES = [
  "all",
  "EVERYWHERE",
  "CATALOG",
  "SEARCH",
  "NONE",
] as const;

export type AdminProductStatus = (typeof ADMIN_PRODUCT_STATUSES)[number];
export type AdminProductSale = (typeof ADMIN_PRODUCT_SALES)[number];
export type AdminProductStock = (typeof ADMIN_PRODUCT_STOCKS)[number];
export type AdminProductImage = (typeof ADMIN_PRODUCT_IMAGES)[number];
export type AdminProductAdded = (typeof ADMIN_PRODUCT_ADDED)[number];
export type AdminProductOnSale = (typeof ADMIN_PRODUCT_ON_SALES)[number];
export type AdminProductVisibilityFilter = (typeof ADMIN_PRODUCT_VISIBILITIES)[number];

export type AdminProductListQuery = {
  q: string;
  code: string;
  categoryId: string;
  brandId: string;
  supplierId: string;
  status: AdminProductStatus;
  sale: AdminProductSale;
  stock: AdminProductStock;
  visibility: AdminProductVisibilityFilter;
  image: AdminProductImage;
  onSale: AdminProductOnSale;
  added: AdminProductAdded;
  page: number;
};

export type AdminProductListOption = {
  id: string;
  label: string;
  depth?: number;
};

export type AdminProductListLookups = {
  categories: AdminProductListOption[];
  brands: AdminProductListOption[];
  suppliers: AdminProductListOption[];
};

export type AdminProductListResult = {
  products: ProductRow[];
  query: AdminProductListQuery;
  lookups: AdminProductListLookups;
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

type SearchParamValue = string | string[] | undefined;
export type AdminProductSearchParams = Record<string, SearchParamValue>;

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function sanitizeSearch(raw: string) {
  return raw.trim().replace(/%/g, "").slice(0, 120);
}

function sanitizeId(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (value === ADMIN_PRODUCT_NONE) return ADMIN_PRODUCT_NONE;
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(value)) return "";
  return value;
}

function isInList<T extends string>(value: string, list: readonly T[]): value is T {
  return (list as readonly string[]).includes(value);
}

function isLikelyCuid(value: string) {
  return /^[a-z0-9]{20,32}$/.test(value);
}

export function emptyAdminProductListQuery(): AdminProductListQuery {
  return {
    q: "",
    code: "",
    categoryId: "",
    brandId: "",
    supplierId: "",
    status: "all",
    sale: "all",
    stock: "all",
    visibility: "all",
    image: "all",
    onSale: "all",
    added: "all",
    page: 1,
  };
}

export function parseAdminProductListQuery(
  searchParams: AdminProductSearchParams | { page?: string; q?: string },
): AdminProductListQuery {
  const params = searchParams as AdminProductSearchParams;
  const parsed = Number.parseInt(firstParam(params.page) || "1", 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const statusRaw = firstParam(params.status);
  const saleRaw = firstParam(params.sale);
  const stockRaw = firstParam(params.stock);
  const visibilityRaw = firstParam(params.visibility);
  const imageRaw = firstParam(params.image);
  const onSaleRaw = firstParam(params.onSale);
  const addedRaw = firstParam(params.added);

  return {
    q: sanitizeSearch(firstParam(params.q)),
    code: sanitizeSearch(firstParam(params.code)),
    categoryId: sanitizeId(firstParam(params.categoryId)),
    brandId: sanitizeId(firstParam(params.brandId)),
    supplierId: sanitizeId(firstParam(params.supplierId)),
    status: isInList(statusRaw, ADMIN_PRODUCT_STATUSES) ? statusRaw : "all",
    sale: isInList(saleRaw, ADMIN_PRODUCT_SALES) ? saleRaw : "all",
    stock: isInList(stockRaw, ADMIN_PRODUCT_STOCKS) ? stockRaw : "all",
    visibility: isInList(visibilityRaw, ADMIN_PRODUCT_VISIBILITIES) ? visibilityRaw : "all",
    image: isInList(imageRaw, ADMIN_PRODUCT_IMAGES) ? imageRaw : "all",
    onSale: isInList(onSaleRaw, ADMIN_PRODUCT_ON_SALES) ? onSaleRaw : "all",
    added: isInList(addedRaw, ADMIN_PRODUCT_ADDED) ? addedRaw : "all",
    page,
  };
}

export function adminProductListHasFilters(query: AdminProductListQuery) {
  return (
    Boolean(query.q) ||
    Boolean(query.code) ||
    Boolean(query.categoryId) ||
    Boolean(query.brandId) ||
    Boolean(query.supplierId) ||
    query.status !== "all" ||
    query.sale !== "all" ||
    query.stock !== "all" ||
    query.visibility !== "all" ||
    query.image !== "all" ||
    query.onSale !== "all" ||
    query.added !== "all"
  );
}

export function adminProductCatalogHref(query: AdminProductListQuery, page = query.page) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.code) params.set("code", query.code);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.brandId) params.set("brandId", query.brandId);
  if (query.supplierId) params.set("supplierId", query.supplierId);
  if (query.status !== "all") params.set("status", query.status);
  if (query.sale !== "all") params.set("sale", query.sale);
  if (query.stock !== "all") params.set("stock", query.stock);
  if (query.visibility !== "all") params.set("visibility", query.visibility);
  if (query.image !== "all") params.set("image", query.image);
  if (query.onSale !== "all") params.set("onSale", query.onSale);
  if (query.added !== "all") params.set("added", query.added);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
}

export function adminProductStatusLabel(value: AdminProductStatus) {
  switch (value) {
    case "all":
      return "Tüm durumlar";
    case "active":
      return "Çevrimiçi";
    case "draft":
      return "Taslak";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function adminProductSaleLabel(value: AdminProductSale) {
  switch (value) {
    case "all":
      return "Tüm satışlar";
    case "open":
      return "Satışa açık";
    case "closed":
      return "Satışa kapalı";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function adminProductStockLabel(value: AdminProductStock) {
  switch (value) {
    case "all":
      return "Tüm stoklar";
    case "in":
      return "Stokta var";
    case "out":
      return "Stokta yok";
    case "low":
      return "Az stok (1–10)";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function adminProductImageLabel(value: AdminProductImage) {
  switch (value) {
    case "all":
      return "Tüm görseller";
    case "yes":
      return "Görseli var";
    case "no":
      return "Görseli yok";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function adminProductAddedLabel(value: AdminProductAdded) {
  switch (value) {
    case "all":
      return "Tüm tarihler";
    case "today":
      return "Bugün eklenen";
    case "7d":
      return "Son 7 gün";
    case "30d":
      return "Son 30 gün";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function adminProductOnSaleLabel(value: AdminProductOnSale) {
  switch (value) {
    case "all":
      return "İndirim fark etmez";
    case "yes":
      return "İndirimde";
    case "no":
      return "İndirimsiz";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function adminProductVisibilityLabel(value: AdminProductVisibilityFilter) {
  switch (value) {
    case "all":
      return "Tüm görünürlükler";
    case "EVERYWHERE":
      return "Her yerde";
    case "CATALOG":
      return "Yalnızca katalog";
    case "SEARCH":
      return "Yalnızca arama";
    case "NONE":
      return "Gizli";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

function searchTokens(q: string) {
  return q
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 6);
}

function numericUrlId(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function textSearchWhere(token: string): Prisma.ProductWhereInput {
  const clauses: Prisma.ProductWhereInput[] = [
    { title: { contains: token } },
    { slug: { contains: token } },
    { sku: { contains: token } },
    { externalId: { contains: token } },
    { mpn: { contains: token } },
    { gtin: { contains: token } },
    { upc: { contains: token } },
    { isbn: { contains: token } },
    { category: { name: { contains: token } } },
    { brand: { name: { contains: token } } },
    { supplier: { name: { contains: token } } },
    {
      variants: {
        some: {
          OR: [
            { sku: { contains: token } },
            { barcode: { contains: token } },
            { title: { contains: token } },
          ],
        },
      },
    },
  ];
  const urlId = numericUrlId(token);
  if (urlId != null) clauses.push({ urlId });
  if (isLikelyCuid(token)) clauses.push({ id: token });
  return { OR: clauses };
}

function identityWhere(code: string): Prisma.ProductWhereInput {
  const compact = code.replace(/\s+/g, "");
  const clauses: Prisma.ProductWhereInput[] = [
    { sku: { contains: code } },
    { externalId: { contains: code } },
    { mpn: { contains: code } },
    { gtin: { contains: code } },
    { upc: { contains: code } },
    { isbn: { contains: code } },
    {
      variants: {
        some: {
          OR: [{ sku: { contains: code } }, { barcode: { contains: code } }],
        },
      },
    },
  ];
  if (compact && compact !== code) {
    clauses.push(
      { sku: { contains: compact } },
      { gtin: { contains: compact } },
      { upc: { contains: compact } },
      {
        variants: {
          some: {
            OR: [{ sku: { contains: compact } }, { barcode: { contains: compact } }],
          },
        },
      },
    );
  }
  const urlId = numericUrlId(compact || code);
  if (urlId != null) clauses.push({ urlId });
  if (isLikelyCuid(compact || code)) clauses.push({ id: compact || code });
  return { OR: clauses };
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfDaysAgo(days: number) {
  const date = startOfToday();
  date.setDate(date.getDate() - days);
  return date;
}

function addedSince(added: AdminProductAdded) {
  switch (added) {
    case "all":
      return null;
    case "today":
      return startOfToday();
    case "7d":
      return startOfDaysAgo(6);
    case "30d":
      return startOfDaysAgo(29);
    default: {
      const _exhaustive: never = added;
      return _exhaustive;
    }
  }
}

function stockWhere(stock: AdminProductStock): Prisma.ProductWhereInput | null {
  switch (stock) {
    case "all":
      return null;
    case "in":
      return { variants: { some: { stockQuantity: { gt: 0 } } } };
    case "out":
      return { NOT: { variants: { some: { stockQuantity: { gt: 0 } } } } };
    case "low":
      return {
        AND: [
          { variants: { some: { stockQuantity: { gt: 0 } } } },
          { NOT: { variants: { some: { stockQuantity: { gt: LOW_STOCK_MAX } } } } },
        ],
      };
    default: {
      const _exhaustive: never = stock;
      return _exhaustive;
    }
  }
}

function imageWhere(image: AdminProductImage): Prisma.ProductWhereInput | null {
  switch (image) {
    case "all":
      return null;
    case "yes":
      return { AND: [{ image: { not: null } }, { NOT: { image: "" } }] };
    case "no":
      return { OR: [{ image: null }, { image: "" }] };
    default: {
      const _exhaustive: never = image;
      return _exhaustive;
    }
  }
}

function productListWhere(
  query: AdminProductListQuery,
  categoryRows: CategoryNodeBase[],
): Prisma.ProductWhereInput {
  const parts: Prisma.ProductWhereInput[] = [];
  const tokens = searchTokens(query.q);
  if (tokens.length === 1) {
    parts.push(textSearchWhere(tokens[0]!));
  } else if (tokens.length > 1) {
    parts.push({ AND: tokens.map((token) => textSearchWhere(token)) });
  } else if (query.q && query.q.length === 1) {
    parts.push(textSearchWhere(query.q));
  }

  if (query.code) parts.push(identityWhere(query.code));

  if (query.categoryId === ADMIN_PRODUCT_NONE) {
    parts.push({ categoryId: null });
  } else if (query.categoryId) {
    const ids = [...collectDescendantIds(categoryRows, query.categoryId)];
    parts.push({ categoryId: { in: ids } });
  }

  if (query.brandId === ADMIN_PRODUCT_NONE) parts.push({ brandId: null });
  else if (query.brandId) parts.push({ brandId: query.brandId });

  if (query.supplierId === ADMIN_PRODUCT_NONE) parts.push({ supplierId: null });
  else if (query.supplierId) parts.push({ supplierId: query.supplierId });

  if (query.status === "active") parts.push({ isActive: true });
  if (query.status === "draft") parts.push({ isActive: false });

  if (query.sale === "open") parts.push({ availableForOrder: true });
  if (query.sale === "closed") parts.push({ availableForOrder: false });

  const stock = stockWhere(query.stock);
  if (stock) parts.push(stock);

  if (query.visibility !== "all") {
    parts.push({ visibility: query.visibility as ProductVisibility });
  }

  const image = imageWhere(query.image);
  if (image) parts.push(image);

  if (query.onSale === "yes") parts.push({ onSale: true });
  if (query.onSale === "no") parts.push({ onSale: false });

  const since = addedSince(query.added);
  if (since) parts.push({ createdAt: { gte: since } });

  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0]!;
  return { AND: parts };
}

const productListOrderBy: Prisma.ProductOrderByWithRelationInput[] = [
  { createdAt: "desc" },
  { id: "desc" },
];

let lookupsCache: {
  at: number;
  categoryRows: CategoryNodeBase[];
  lookups: AdminProductListLookups;
} | null = null;
let unfilteredCountCache: { at: number; total: number } | null = null;

async function loadLookupsAndCategories(force = false) {
  if (!force && lookupsCache && Date.now() - lookupsCache.at < 30_000) {
    return lookupsCache;
  }
  const [categoryRows, brands, suppliers] = await Promise.all([
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
    prisma.supplier.findMany({
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const lookups: AdminProductListLookups = {
    categories: flattenCategoryTree(buildCategoryTree(categoryRows)).map((category) => ({
      id: category.id,
      label: category.name,
      depth: category.depth,
    })),
    brands: brands.map((brand) => ({ id: brand.id, label: brand.name })),
    suppliers: suppliers.map((supplier) => ({ id: supplier.id, label: supplier.name })),
  };

  lookupsCache = { at: Date.now(), categoryRows, lookups };
  return lookupsCache;
}

export async function loadAdminProductPage(
  query: AdminProductListQuery,
): Promise<AdminProductListResult> {
  const pageSize = ADMIN_PRODUCTS_PAGE_SIZE;
  const needsCategoryTree = Boolean(query.categoryId) && query.categoryId !== ADMIN_PRODUCT_NONE;
  const lookupsTask = loadLookupsAndCategories();
  const categoryRows = needsCategoryTree ? (await lookupsTask).categoryRows : [];
  const where = productListWhere(query, categoryRows);
  const requestedPage = Math.max(1, query.page);
  const productSelect = {
    id: true,
    title: true,
    slug: true,
    urlId: true,
    sku: true,
    image: true,
    isActive: true,
    availableForOrder: true,
    basePriceMinor: true,
    compareAtMinor: true,
    saleStartsAt: true,
    saleEndsAt: true,
    createdAt: true,
    category: { select: { name: true } },
    brand: { select: { name: true } },
    supplier: { select: { name: true } },
  } as const;

  const useCountCache = !adminProductListHasFilters(query);
  const cachedTotal =
    useCountCache && unfilteredCountCache && Date.now() - unfilteredCountCache.at < 30_000
      ? unfilteredCountCache.total
      : null;

  const [lookupsResult, countedTotal, initialProducts] = await Promise.all([
    lookupsTask,
    cachedTotal == null ? prisma.product.count({ where }) : Promise.resolve(cachedTotal),
    prisma.product.findMany({
      where,
      orderBy: productListOrderBy,
      skip: (requestedPage - 1) * pageSize,
      take: pageSize,
      select: productSelect,
    }),
  ]);
  const lookups = lookupsResult.lookups;
  const total = countedTotal;
  if (useCountCache) unfilteredCountCache = { at: Date.now(), total };
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const products =
    initialProducts.length > 0 || total === 0 || page === requestedPage
      ? initialProducts
      : await prisma.product.findMany({
          where,
          orderBy: productListOrderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: productSelect,
        });

  const productIds = products.map((product) => product.id);
  const [variantStats, defaultVariants, campaignNames] =
    productIds.length === 0
      ? [[], [], new Map<string, { name: string; label: string }>()]
      : await Promise.all([
          prisma.productVariant.groupBy({
            by: ["productId"],
            where: { productId: { in: productIds } },
            _count: { _all: true },
            _sum: { stockQuantity: true },
          }),
          prisma.productVariant.findMany({
            where: {
              productId: { in: productIds },
              OR: [{ isDefault: true }, { combinationKey: DEFAULT_VARIANT_COMBINATION_KEY }],
            },
            select: { id: true, productId: true, isDefault: true, feedSyncLocked: true },
          }),
          prisma
            .$queryRaw<
              Array<{ productId: string; name: string; kind: string; valueInt: number }>
            >`
              SELECT cp.productId, c.name, c.kind, c.valueInt
              FROM campaign_products cp
              INNER JOIN campaigns c ON c.id = cp.campaignId
              WHERE cp.productId IN (${Prisma.join(productIds)})
                AND cp.restoredAt IS NULL
                AND c.status = 'ACTIVE'
                AND (c.endsAt IS NULL OR c.endsAt > NOW(3))
            `
            .then((rows) => {
              const map = new Map<string, { name: string; label: string }>();
              for (const row of rows) {
                if (map.has(row.productId) || !isCampaignKind(row.kind)) continue;
                map.set(row.productId, {
                  name: row.name,
                  label: campaignOfferLabel(row.kind, row.valueInt),
                });
              }
              return map;
            })
            .catch(() => new Map<string, { name: string; label: string }>()),
        ]);
  const statsByProduct = new Map(
    variantStats.map((row) => [
      row.productId,
      { stock: row._sum.stockQuantity ?? 0, variants: row._count._all },
    ]),
  );
  const defaultVariantByProduct = new Map<string, string>();
  const defaultFeedLockByProduct = new Map<string, boolean>();
  for (const row of defaultVariants) {
    if (row.isDefault) {
      defaultVariantByProduct.set(row.productId, row.id);
      defaultFeedLockByProduct.set(row.productId, row.feedSyncLocked);
    }
  }
  for (const row of defaultVariants) {
    if (!defaultVariantByProduct.has(row.productId)) {
      defaultVariantByProduct.set(row.productId, row.id);
      defaultFeedLockByProduct.set(row.productId, row.feedSyncLocked);
    }
  }

  return {
    query: { ...query, page },
    lookups,
    total,
    page,
    pageCount,
    pageSize,
    products: products.map((product) => {
      const stats = statsByProduct.get(product.id);
      return {
        id: product.id,
        title: product.title,
        slug: product.slug,
        urlId: product.urlId,
        sku: product.sku,
        image: product.image,
        isActive: product.isActive,
        availableForOrder: product.availableForOrder,
        basePriceMinor: product.basePriceMinor,
        compareAtMinor: product.compareAtMinor,
        saleStartsAt: toIsoOrNull(product.saleStartsAt),
        saleEndsAt: toIsoOrNull(product.saleEndsAt),
        categoryName: product.category?.name ?? null,
        brandName: product.brand?.name ?? null,
        supplierName: product.supplier?.name ?? null,
        stockQuantity: stats?.stock ?? 0,
        variantCount: stats?.variants ?? 0,
        defaultVariantId: defaultVariantByProduct.get(product.id) ?? null,
        feedSyncLocked: defaultFeedLockByProduct.get(product.id) ?? false,
        createdAt: product.createdAt.toISOString(),
        campaignName: campaignNames.get(product.id)?.name ?? null,
        campaignLabel: campaignNames.get(product.id)?.label ?? null,
      };
    }),
  };
}

const productListVariantSelect = {
  id: true,
  productId: true,
  title: true,
  sku: true,
  barcode: true,
  priceMinor: true,
  compareAtMinor: true,
  saleStartsAt: true,
  saleEndsAt: true,
  stockQuantity: true,
  image: true,
  isActive: true,
  isDefault: true,
  feedSyncLocked: true,
  combinationKey: true,
} as const;

function toProductListVariantRow(
  row: {
    id: string;
    productId: string;
    title: string;
    sku: string;
    barcode: string | null;
    priceMinor: number;
    compareAtMinor: number | null;
    saleStartsAt: Date | null;
    saleEndsAt: Date | null;
    stockQuantity: number;
    image: string | null;
    isActive: boolean;
    isDefault: boolean;
    feedSyncLocked: boolean;
    combinationKey: string;
  },
): ProductListVariantRow {
  return {
    id: row.id,
    productId: row.productId,
    title: row.title,
    sku: row.sku,
    barcode: row.barcode,
    priceMinor: row.priceMinor,
    compareAtMinor: row.compareAtMinor,
    saleStartsAt: toIsoOrNull(row.saleStartsAt),
    saleEndsAt: toIsoOrNull(row.saleEndsAt),
    stockQuantity: row.stockQuantity,
    image: row.image,
    isActive: row.isActive,
    isDefault: row.isDefault,
    feedSyncLocked: row.feedSyncLocked,
  };
}

export async function loadProductListVariants(
  productId: string,
): Promise<ProductListVariantRow[] | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) return null;

  const rows = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: [{ sortOrder: "asc" }, { isDefault: "desc" }, { title: "asc" }],
    select: productListVariantSelect,
  });
  const combinations = rows.filter(
    (row) => row.combinationKey !== DEFAULT_VARIANT_COMBINATION_KEY,
  );
  return (combinations.length > 0 ? combinations : rows).map(toProductListVariantRow);
}
