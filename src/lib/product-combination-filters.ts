import { DEFAULT_VARIANT_COMBINATION_KEY } from "@/lib/product-variants";
import type { ProductVariantDraft } from "@/lib/product-editor";

export type CombinationAttributeFilter = {
  attributeId: string;
  name: string;
  values: Array<{ id: string; name: string; colorHex: string | null }>;
};

/** Boş dizi = o eksende filtre yok (tümü). Dolu = VEYA. Eksene arası VE. */
export type CombinationFilterMap = Record<string, string[]>;

export function usedAttributeValueIds(
  variants: Array<{ selections: Array<{ attributeId: string; valueId: string }> }>,
): Map<string, Set<string>> {
  const used = new Map<string, Set<string>>();
  for (const variant of variants) {
    for (const selection of variant.selections) {
      const set = used.get(selection.attributeId) ?? new Set<string>();
      set.add(selection.valueId);
      used.set(selection.attributeId, set);
    }
  }
  return used;
}

export function isRealCombination(variant: ProductVariantDraft): boolean {
  return (
    variant.combinationKey !== DEFAULT_VARIANT_COMBINATION_KEY &&
    variant.selections.length > 0
  );
}

export function variantMatchesCombinationFilters(
  variant: ProductVariantDraft,
  filters: CombinationFilterMap,
): boolean {
  for (const [attributeId, valueIds] of Object.entries(filters)) {
    if (!valueIds.length) continue;
    const hit = variant.selections.some(
      (selection) =>
        selection.attributeId === attributeId && valueIds.includes(selection.valueId),
    );
    if (!hit) return false;
  }
  return true;
}

export function combinationFilterIsActive(filters: CombinationFilterMap): boolean {
  return Object.values(filters).some((ids) => ids.length > 0);
}

export function combinationDisplayTitle(
  variant: { title: string; selections: Array<{ attributeId: string; valueId: string }> },
  attributes: Array<{
    id: string;
    name: string;
    values: Array<{ id: string; name: string }>;
  }>,
): string {
  if (!variant.selections.length) return variant.title;
  const parts = variant.selections.map((selection) => {
    const attribute = attributes.find((item) => item.id === selection.attributeId);
    const value = attribute?.values.find((item) => item.id === selection.valueId);
    if (attribute && value) return `${attribute.name} - ${value.name}`;
    return null;
  });
  if (parts.every(Boolean)) return parts.join(", ");
  return variant.title;
}

export function buildCombinationFilterAxes(
  variants: ProductVariantDraft[],
  attributes: Array<{
    id: string;
    name: string;
    values: Array<{ id: string; name: string; colorHex: string | null }>;
  }>,
): CombinationAttributeFilter[] {
  const used = usedAttributeValueIds(variants.filter(isRealCombination));

  const axes: CombinationAttributeFilter[] = [];
  for (const attribute of attributes) {
    const valueIds = used.get(attribute.id);
    if (!valueIds || valueIds.size === 0) continue;
    const values = attribute.values.filter((value) => valueIds.has(value.id));
    if (values.length === 0) continue;
    axes.push({
      attributeId: attribute.id,
      name: attribute.name,
      values,
    });
  }
  return axes;
}
