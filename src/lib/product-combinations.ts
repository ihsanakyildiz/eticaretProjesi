import {
  buildVariantCombinationKey,
  formatVariantTitle,
  type VariantSelectionInput,
} from "@/lib/product-variants";

export type CombinationValue = {
  attributeId: string;
  attributeName: string;
  valueId: string;
  valueName: string;
};

/** Tek seferde üretilebilecek SKU tavanı. Tablo sayfalı + filtreli çalışır. */
export const MAX_GENERATED_COMBINATIONS = 2500;

/** Bu eşiğin üstünde modal uyarı gösterir; üretim yine mümkündür. */
export const WARN_GENERATED_COMBINATIONS = 400;

export const COMBINATION_TABLE_PAGE_SIZE = 50;

export function formatCombinationTitle(values: CombinationValue[]): string {
  const parts = values
    .map((value) => {
      const attr = value.attributeName.trim();
      const name = value.valueName.trim();
      if (!attr || !name) return name || attr;
      return `${attr} - ${name}`;
    })
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : formatVariantTitle([]);
}

export function combinationCountFromGroupSizes(sizes: number[]): number {
  if (sizes.length === 0 || sizes.some((size) => size <= 0)) return 0;
  return sizes.reduce((total, size) => total * size, 1);
}

export function cartesianProduct<T>(groups: T[][]): T[][] {
  if (groups.length === 0) return [];
  return groups.reduce<T[][]>(
    (acc, group) => {
      if (group.length === 0) return [];
      const next: T[][] = [];
      for (const prefix of acc) {
        for (const item of group) {
          next.push([...prefix, item]);
        }
      }
      return next;
    },
    [[]],
  );
}

export function buildCombinationsFromValueGroups(groups: CombinationValue[][]): Array<{
  selections: VariantSelectionInput[];
  combinationKey: string;
  title: string;
}> {
  const rows = cartesianProduct(groups);
  return rows.map((values) => {
    const selections = values.map((value) => ({
      attributeId: value.attributeId,
      valueId: value.valueId,
    }));
    return {
      selections,
      combinationKey: buildVariantCombinationKey(selections),
      title: formatCombinationTitle(values),
    };
  });
}

export function pruneIncompleteCombinations<T extends { selections: Array<{ attributeId: string; valueId: string }> }>(
  variants: T[],
): T[] {
  const maxLen = Math.max(0, ...variants.map((item) => item.selections.length));
  if (maxLen <= 1) return variants;
  return variants.filter(
    (item) => item.selections.length === 0 || item.selections.length === maxLen,
  );
}

export function makeSkuCandidate(base: string, suffix: string) {
  const cleanBase = base.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "sku";
  const cleanSuffix = suffix.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  const joined = cleanSuffix ? `${cleanBase}-${cleanSuffix}` : cleanBase;
  return joined.slice(0, 80).toUpperCase();
}
