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

