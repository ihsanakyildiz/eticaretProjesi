import type {
  ProductEstimatedDelivery,
  ProductOutOfStockBehavior,
  ProductSaleUnit,
  ProductVisibility,
} from "@prisma/client";

export const PRODUCT_EDITOR_TABS = [
  "details",
  "variants",
  "shipping",
  "pricing",
  "seo",
  "options",
] as const;

export type ProductEditorTabId = (typeof PRODUCT_EDITOR_TABS)[number];

export function isProductEditorTabId(value: string): value is ProductEditorTabId {
  return (PRODUCT_EDITOR_TABS as readonly string[]).includes(value);
}

export function productEditorTabLabel(id: ProductEditorTabId): string {
  switch (id) {
    case "details":
      return "Detaylar";
    case "variants":
      return "Varyantlar";
    case "shipping":
      return "Kargolama";
    case "pricing":
      return "Fiyatlandırma";
    case "seo":
      return "SEO";
    case "options":
      return "Seçenekler";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export const PRODUCT_VISIBILITIES = [
  "EVERYWHERE",
  "CATALOG",
  "SEARCH",
  "NONE",
] as const satisfies readonly ProductVisibility[];

export const PRODUCT_OUT_OF_STOCK_BEHAVIORS = [
  "DENY",
  "ALLOW",
  "DEFAULT",
] as const satisfies readonly ProductOutOfStockBehavior[];

export function isProductVisibility(value: string): value is ProductVisibility {
  return (PRODUCT_VISIBILITIES as readonly string[]).includes(value);
}

export function isProductOutOfStockBehavior(
  value: string,
): value is ProductOutOfStockBehavior {
  return (PRODUCT_OUT_OF_STOCK_BEHAVIORS as readonly string[]).includes(value);
}

export const PRODUCT_ESTIMATED_DELIVERIES = [
  "SAME_DAY",
  "DAYS_1_3",
  "DAYS_3_5",
  "DAYS_5_10",
] as const satisfies readonly ProductEstimatedDelivery[];

export function isProductEstimatedDelivery(
  value: string,
): value is ProductEstimatedDelivery {
  return (PRODUCT_ESTIMATED_DELIVERIES as readonly string[]).includes(value);
}

export const PRODUCT_SALE_UNITS = [
  "PIECE",
  "KG",
  "METER",
  "LITER",
  "PACK",
] as const satisfies readonly ProductSaleUnit[];

export function isProductSaleUnit(value: string): value is ProductSaleUnit {
  return (PRODUCT_SALE_UNITS as readonly string[]).includes(value);
}

export function productSaleUnitLabel(value: ProductSaleUnit): string {
  switch (value) {
    case "PIECE":
      return "Adet";
    case "KG":
      return "Kilogram";
    case "METER":
      return "Metre";
    case "LITER":
      return "Litre";
    case "PACK":
      return "Paket";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function productSaleUnitShort(value: ProductSaleUnit): string {
  switch (value) {
    case "PIECE":
      return "adet";
    case "KG":
      return "kg";
    case "METER":
      return "m";
    case "LITER":
      return "lt";
    case "PACK":
      return "paket";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function productEstimatedDeliveryLabel(value: ProductEstimatedDelivery): string {
  switch (value) {
    case "SAME_DAY":
      return "Aynı Gün Kargo";
    case "DAYS_1_3":
      return "1 - 3 Gün Arası";
    case "DAYS_3_5":
      return "3 - 5 Gün Arası";
    case "DAYS_5_10":
      return "5 - 10 Gün Arası";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function productVisibilityLabel(value: ProductVisibility): string {
  switch (value) {
    case "EVERYWHERE":
      return "Her yerde";
    case "CATALOG":
      return "Sadece katalogda";
    case "SEARCH":
      return "Sadece aramalarda";
    case "NONE":
      return "Hiçbir yerde";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export type ProductFeatureDraft = {
  filterId: string;
  valueId?: string | null;
  numberValue?: number | null;
  booleanValue?: boolean | null;
};

export type ProductVariantDraft = {
  id?: string;
  clientKey: string;
  sku: string;
  barcode?: string;
  title: string;
  priceMinor: number;
  compareAtMinor?: number | null;
  stockQuantity: number;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  isDefault: boolean;
  isActive: boolean;
  image?: string | null;
  imageRemoved?: boolean;
  /** Yalnızca tarayıcı; JSON’a yazılmaz */
  imageFile?: File;
  combinationKey: string;
  selections: Array<{ attributeId: string; valueId: string }>;
};

export function serializeProductVariants(variants: ProductVariantDraft[]): ProductVariantDraft[] {
  return variants.map((item) => ({
    ...item,
    imageFile: undefined,
  }));
}

export type ProductImageDraft = {
  id?: string;
  url?: string;
  isCover: boolean;
  sortOrder: number;
  alt?: string | null;
  hasFile?: boolean;
  preview?: string;
  remove?: boolean;
};

export type ProductAttachmentDraft = {
  id?: string;
  url?: string;
  name: string;
  sortOrder: number;
  hasFile?: boolean;
};
