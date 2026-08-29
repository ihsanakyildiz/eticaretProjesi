import type { ProductSaleUnit } from "@prisma/client";
import {
  publicProductBrandHref,
  publicProductCategoryHref,
  publicProductHref,
} from "@/lib/public-urls";
import type { UrlStructure } from "@/lib/url-structure";

export type CatalogSaleUnit = ProductSaleUnit;

export type CatalogProductCard = {
  id: string;
  urlId: number;
  title: string;
  slug: string;
  summary: string | null;
  image: string | null;
  basePriceMinor: number;
  compareAtMinor: number | null;
  taxRatePercent: number;
  showPrice: boolean;
  onSale: boolean;
  availableForOrder: boolean;
  saleUnit: ProductSaleUnit;
  createdAt: Date;
  viewCount: number;
  clickCount: number;
  category: { name: string; slug: string; urlId: number } | null;
  brand: { name: string; slug: string; urlId: number } | null;
  images: { url: string; isCover: boolean }[];
  variants: {
    priceMinor: number;
    stockQuantity: number;
    isDefault: boolean;
    trackInventory: boolean;
  }[];
};

export type CatalogCategoryCard = {
  id: string;
  urlId: number;
  name: string;
  slug: string;
  image: string | null;
  productCount: number;
};

export type CatalogSort = "yeni" | "fiyat-artan" | "fiyat-azalan" | "cok-satan";

export const CATALOG_SORTS: { value: CatalogSort; label: string }[] = [
  { value: "yeni", label: "En yeni" },
  { value: "cok-satan", label: "Çok satan" },
  { value: "fiyat-artan", label: "Fiyat (artan)" },
  { value: "fiyat-azalan", label: "Fiyat (azalan)" },
];

export type CatalogListingFilters = {
  sort: CatalogSort;
  brandSlugs: string[];
  minMajor: number | null;
  maxMajor: number | null;
  filterValueIds: string[];
  categoryIds?: string[];
  query?: string | null;
};

export function catalogProductHref(
  slug: string,
  structure?: UrlStructure,
  urlId?: number | null,
) {
  return publicProductHref(slug, structure, urlId);
}

export function catalogCategoryHref(
  slug: string,
  structure?: UrlStructure,
  urlId?: number | null,
) {
  return publicProductCategoryHref(slug, structure, urlId);
}

export function catalogBrandHref(
  slug: string,
  structure?: UrlStructure,
  urlId?: number | null,
) {
  return publicProductBrandHref(slug, structure, urlId);
}

export function pickSellableVariants<
  T extends { priceMinor: number; isDefault: boolean; selectionCount?: number },
>(variants: T[]): T[] {
  const maxSel = Math.max(0, ...variants.map((item) => item.selectionCount ?? 0));
  const complete =
    maxSel > 1
      ? variants.filter((item) => (item.selectionCount ?? 0) === maxSel)
      : variants;
  const pool = complete.length > 0 ? complete : variants;
  const priced = pool.filter((item) => item.priceMinor > 0);
  return priced.length > 0 ? priced : pool;
}

export function catalogCardPrice(product: {
  basePriceMinor: number;
  variants: Array<{
    priceMinor: number;
    stockQuantity: number;
    isDefault: boolean;
    selectionCount?: number;
  }>;
}) {
  const sellable = pickSellableVariants(product.variants);
  const defaultVariant =
    sellable.find((item) => item.isDefault) ?? sellable[0] ?? product.variants[0];
  const priceMinor =
    defaultVariant && defaultVariant.priceMinor > 0
      ? defaultVariant.priceMinor
      : product.basePriceMinor;
  const stockQuantity = (sellable.length > 0 ? sellable : product.variants).reduce(
    (sum, item) => sum + item.stockQuantity,
    0,
  );
  return { priceMinor, stockQuantity };
}

export function catalogCardHoverImage(product: CatalogProductCard): string | null {
  const hover = product.images.find((image) => !image.isCover) ?? product.images[1];
  if (!hover || hover.url === product.image) return null;
  return hover.url;
}

export function parseCatalogSort(raw: string | undefined): CatalogSort {
  switch (raw) {
    case "yeni":
    case "fiyat-artan":
    case "fiyat-azalan":
    case "cok-satan":
      return raw;
    default:
      return "yeni";
  }
}
