import type { CatalogCampaignBadge } from "@/lib/campaign-kinds";
import type { ProductSaleUnit } from "@prisma/client";
import { isVariantPurchasable, type OutOfStockBehavior } from "@/lib/product-stock";
import { resolveSalePrice } from "@/lib/product-sale";
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
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  taxRatePercent: number;
  showPrice: boolean;
  onSale: boolean;
  availableForOrder: boolean;
  outOfStockBehavior: OutOfStockBehavior;
  saleUnit: ProductSaleUnit;
  createdAt: Date;
  viewCount: number;
  clickCount: number;
  category: { name: string; slug: string; urlId: number } | null;
  brand: { name: string; slug: string; urlId: number } | null;
  images: { url: string; isCover: boolean }[];
  variants: {
    priceMinor: number;
    compareAtMinor?: number | null;
    saleStartsAt: Date | null;
    saleEndsAt: Date | null;
    stockQuantity: number;
    isDefault: boolean;
    trackInventory: boolean;
    allowBackorder: boolean;
  }[];
  campaign?: CatalogCampaignBadge | null;
};

export type CatalogCategoryCard = {
  id: string;
  urlId: number;
  name: string;
  slug: string;
  image: string | null;
  productCount: number;
};

export type CatalogSort =
  | "onerilen"
  | "yeni"
  | "fiyat-artan"
  | "fiyat-azalan"
  | "cok-satan";

export const CATALOG_DEFAULT_SORT: CatalogSort = "onerilen";

export const CATALOG_SORTS: { value: CatalogSort; label: string }[] = [
  { value: "onerilen", label: "Önerilen" },
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
  campaignIds: string[];
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

export function catalogCardPrice(
  product: {
    basePriceMinor: number;
    compareAtMinor?: number | null;
    saleStartsAt?: Date | string | null;
    saleEndsAt?: Date | string | null;
    variants: Array<{
      priceMinor: number;
      compareAtMinor?: number | null;
      saleStartsAt?: Date | string | null;
      saleEndsAt?: Date | string | null;
      stockQuantity: number;
      isDefault: boolean;
      selectionCount?: number;
    }>;
  },
  now = new Date(),
) {
  const sellable = pickSellableVariants(product.variants);
  const defaultVariant =
    sellable.find((item) => item.isDefault) ?? sellable[0] ?? product.variants[0];
  const rawPrice =
    defaultVariant && defaultVariant.priceMinor > 0
      ? defaultVariant.priceMinor
      : product.basePriceMinor;
  const resolved = resolveSalePrice(
    {
      priceMinor: rawPrice,
      compareAtMinor:
        defaultVariant?.compareAtMinor != null
          ? defaultVariant.compareAtMinor
          : (product.compareAtMinor ?? null),
      saleStartsAt: defaultVariant?.saleStartsAt ?? product.saleStartsAt,
      saleEndsAt: defaultVariant?.saleEndsAt ?? product.saleEndsAt,
    },
    now,
  );
  const stockQuantity = (sellable.length > 0 ? sellable : product.variants).reduce(
    (sum, item) => sum + item.stockQuantity,
    0,
  );
  return {
    priceMinor: resolved.priceMinor,
    compareAtMinor: resolved.compareAtMinor,
    stockQuantity,
    onSale: resolved.onSale,
    saleEndsAt: resolved.onSale ? resolved.saleEndsAt : null,
  };
}

export function catalogCardAvailability(product: {
  availableForOrder: boolean;
  outOfStockBehavior?: OutOfStockBehavior | null;
  variants: Array<{
    stockQuantity: number;
    trackInventory?: boolean;
    allowBackorder?: boolean;
  }>;
}): "in_stock" | "preorder" | "out_of_stock" {
  if (!product.availableForOrder) return "out_of_stock";
  const variants = product.variants;
  if (variants.length === 0) return "in_stock";

  const anyPurchasable = variants.some((variant) =>
    isVariantPurchasable({
      trackInventory: variant.trackInventory !== false,
      stockQuantity: variant.stockQuantity,
      allowBackorder: Boolean(variant.allowBackorder),
      outOfStockBehavior: product.outOfStockBehavior,
    }),
  );
  if (!anyPurchasable) return "out_of_stock";

  const anyPhysical = variants.some(
    (variant) => variant.trackInventory === false || variant.stockQuantity > 0,
  );
  return anyPhysical ? "in_stock" : "preorder";
}

export function catalogCardAvailabilityLabel(
  availability: ReturnType<typeof catalogCardAvailability>,
): string {
  switch (availability) {
    case "in_stock":
      return "Stokta";
    case "preorder":
      return "Ön sipariş";
    case "out_of_stock":
      return "Tükendi";
    default: {
      const _exhaustive: never = availability;
      return _exhaustive;
    }
  }
}

export function catalogCardSchemaAvailability(
  availability: ReturnType<typeof catalogCardAvailability>,
): "InStock" | "PreOrder" | "OutOfStock" {
  switch (availability) {
    case "in_stock":
      return "InStock";
    case "preorder":
      return "PreOrder";
    case "out_of_stock":
      return "OutOfStock";
    default: {
      const _exhaustive: never = availability;
      return _exhaustive;
    }
  }
}

export function catalogCardHoverImage(product: CatalogProductCard): string | null {
  const hover = product.images.find((image) => !image.isCover) ?? product.images[1];
  if (!hover || hover.url === product.image) return null;
  return hover.url;
}

export function parseCatalogSort(raw: string | undefined): CatalogSort {
  switch (raw) {
    case "onerilen":
    case "yeni":
    case "fiyat-artan":
    case "fiyat-azalan":
    case "cok-satan":
      return raw;
    default:
      return CATALOG_DEFAULT_SORT;
  }
}
