import type {
  ProductAttributeDisplayType,
  ProductFilterInputType,
  ProductFilterKind,
  ProductFilterSystemKey,
} from "@prisma/client";
import {
  collectDescendantIds,
  type CategoryNodeBase,
} from "@/lib/category-tree";
import { isValidColorHex } from "@/lib/product-attributes";

export const PRODUCT_FILTER_KINDS = [
  "CUSTOM",
  "VARIANT",
  "SYSTEM",
] as const satisfies readonly ProductFilterKind[];

export const PRODUCT_FILTER_SYSTEM_KEYS = [
  "BRAND",
  "PRICE",
  "AVAILABILITY",
] as const satisfies readonly ProductFilterSystemKey[];

export const PRODUCT_FILTER_INPUT_TYPES = [
  "MULTI_SELECT",
  "SWATCH",
  "BOOLEAN",
  "RANGE",
] as const satisfies readonly ProductFilterInputType[];

export type ProductFilterKindValue = (typeof PRODUCT_FILTER_KINDS)[number];
export type ProductFilterSystemKeyValue = (typeof PRODUCT_FILTER_SYSTEM_KEYS)[number];
export type ProductFilterInputTypeValue = (typeof PRODUCT_FILTER_INPUT_TYPES)[number];

export function isProductFilterKind(value: string): value is ProductFilterKindValue {
  return (PRODUCT_FILTER_KINDS as readonly string[]).includes(value);
}

export function isProductFilterSystemKey(
  value: string,
): value is ProductFilterSystemKeyValue {
  return (PRODUCT_FILTER_SYSTEM_KEYS as readonly string[]).includes(value);
}

export function isProductFilterInputType(
  value: string,
): value is ProductFilterInputTypeValue {
  return (PRODUCT_FILTER_INPUT_TYPES as readonly string[]).includes(value);
}

export function productFilterKindLabel(kind: ProductFilterKind): string {
  switch (kind) {
    case "CUSTOM":
      return "Özel özellik";
    case "VARIANT":
      return "Varyant";
    case "SYSTEM":
      return "Sistem";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function productFilterKindButtonHint(kind: ProductFilterKind): string {
  switch (kind) {
    case "CUSTOM":
      return "Malzeme, yaka tipi";
    case "VARIANT":
      return "Beden, renk";
    case "SYSTEM":
      return "Marka, fiyat, stok — otomatik";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function productFilterKindHint(kind: ProductFilterKind): string {
  switch (kind) {
    case "CUSTOM":
      return "SKU üretmez. Malzeme, cinsiyet, yaka tipi gibi ürün özellikleridir — marka buraya yazılmaz.";
    case "VARIANT":
      return "Mevcut beden/renk eksenini vitrin filtresi olarak kullanır. Değerler tekrar yazılmaz.";
    case "SYSTEM":
      return "Marka, fiyat ve stok. Markalar sayfasındaki kayıtlar otomatik gelir; yeniden eklenmez.";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function productFilterSystemKeyLabel(key: ProductFilterSystemKey): string {
  switch (key) {
    case "BRAND":
      return "Marka";
    case "PRICE":
      return "Fiyat";
    case "AVAILABILITY":
      return "Stok durumu";
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function productFilterInputTypeLabel(type: ProductFilterInputType): string {
  switch (type) {
    case "MULTI_SELECT":
      return "Çoklu seçim";
    case "SWATCH":
      return "Renk / swatch";
    case "BOOLEAN":
      return "Evet / hayır";
    case "RANGE":
      return "Aralık";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function productFilterInputTypeHint(type: ProductFilterInputType): string {
  switch (type) {
    case "MULTI_SELECT":
      return "Aynı grupta VEYA, diğer filtrelerle VE (Amazon / Magento).";
    case "SWATCH":
      return "Renk veya desen noktası. Aynı grupta VEYA.";
    case "BOOLEAN":
      return "Su geçirmez, stokta var gibi tek anahtar.";
    case "RANGE":
      return "Fiyat veya sayısal spec için min–max kaydırıcı.";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function inputTypeForVariantDisplay(
  displayType: ProductAttributeDisplayType,
): ProductFilterInputType {
  switch (displayType) {
    case "TEXT":
      return "MULTI_SELECT";
    case "COLOR":
      return "SWATCH";
    case "IMAGE":
      return "SWATCH";
    default: {
      const _exhaustive: never = displayType;
      return _exhaustive;
    }
  }
}

export function inputTypeForSystemKey(
  key: ProductFilterSystemKey,
): ProductFilterInputType {
  switch (key) {
    case "BRAND":
      return "MULTI_SELECT";
    case "PRICE":
      return "RANGE";
    case "AVAILABILITY":
      return "BOOLEAN";
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function defaultSlugForSystemKey(key: ProductFilterSystemKey): string {
  switch (key) {
    case "BRAND":
      return "marka";
    case "PRICE":
      return "fiyat";
    case "AVAILABILITY":
      return "stok";
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function defaultNameForSystemKey(key: ProductFilterSystemKey): string {
  return productFilterSystemKeyLabel(key);
}

export function filterUsesCustomValues(inputType: ProductFilterInputType, kind: ProductFilterKind) {
  if (kind !== "CUSTOM") return false;
  return inputType === "MULTI_SELECT" || inputType === "SWATCH";
}

export type FilterCategoryScope = {
  appliesGlobally: boolean;
  inheritToChildren: boolean;
  assignedCategoryIds: string[];
};

/** Atanan kategoriler + isteğe bağlı alt ağaç */
export function categoryIdsCoveredByFilter(
  items: CategoryNodeBase[],
  scope: FilterCategoryScope,
): Set<string> {
  if (scope.appliesGlobally) {
    return new Set(items.map((item) => item.id));
  }

  const covered = new Set<string>();
  for (const id of scope.assignedCategoryIds) {
    if (scope.inheritToChildren) {
      for (const descendantId of collectDescendantIds(items, id)) {
        covered.add(descendantId);
      }
    } else {
      covered.add(id);
    }
  }
  return covered;
}

export function filterAppliesToCategory(
  items: CategoryNodeBase[],
  scope: FilterCategoryScope,
  categoryId: string | null,
): boolean {
  if (scope.appliesGlobally) return true;
  if (!categoryId) return false;
  return categoryIdsCoveredByFilter(items, scope).has(categoryId);
}

export type StorefrontFilterSelection = {
  filterSlug: string;
  valueSlugs?: string[];
  booleanValue?: boolean;
  min?: number;
  max?: number;
};

/**
 * Vitrin URL sözleşmesi:
 * MULTI_SELECT/SWATCH: ?{slug}=siyah,mavi
 * BOOLEAN: ?{slug}=1
 * RANGE: ?{slug}_min=100&{slug}_max=500
 */
export function parseStorefrontFilterParams(
  searchParams: URLSearchParams,
  filters: Array<{ slug: string; inputType: ProductFilterInputType }>,
): StorefrontFilterSelection[] {
  const selections: StorefrontFilterSelection[] = [];

  for (const filter of filters) {
    switch (filter.inputType) {
      case "MULTI_SELECT":
      case "SWATCH": {
        const raw = searchParams.get(filter.slug)?.trim();
        if (!raw) break;
        const valueSlugs = raw
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        if (valueSlugs.length) {
          selections.push({ filterSlug: filter.slug, valueSlugs });
        }
        break;
      }
      case "BOOLEAN": {
        const raw = searchParams.get(filter.slug)?.trim().toLowerCase();
        if (raw === "1" || raw === "true" || raw === "evet") {
          selections.push({ filterSlug: filter.slug, booleanValue: true });
        } else if (raw === "0" || raw === "false" || raw === "hayir") {
          selections.push({ filterSlug: filter.slug, booleanValue: false });
        }
        break;
      }
      case "RANGE": {
        const minRaw = searchParams.get(`${filter.slug}_min`)?.trim();
        const maxRaw = searchParams.get(`${filter.slug}_max`)?.trim();
        const min = minRaw ? Number(minRaw) : undefined;
        const max = maxRaw ? Number(maxRaw) : undefined;
        const hasMin = min !== undefined && Number.isFinite(min);
        const hasMax = max !== undefined && Number.isFinite(max);
        if (hasMin || hasMax) {
          selections.push({
            filterSlug: filter.slug,
            min: hasMin ? min : undefined,
            max: hasMax ? max : undefined,
          });
        }
        break;
      }
      default: {
        const _exhaustive: never = filter.inputType;
        return _exhaustive;
      }
    }
  }

  return selections;
}

export function assertSwatchColor(colorHex: string | null | undefined, required: boolean) {
  const value = colorHex?.trim() ?? "";
  if (!value) {
    return required ? "Renk kodu zorunludur." : null;
  }
  if (!isValidColorHex(value)) return "Geçerli bir hex renk girin (#RGB veya #RRGGBB).";
  return null;
}
