/**
 * Satılabilir birim her zaman ProductVariant’tır.
 * combinationKey, bir üründe aynı seçim setinin ikinci SKU olmasını engeller.
 */
export type VariantSelectionInput = {
  attributeId: string;
  valueId: string;
};

export const DEFAULT_VARIANT_COMBINATION_KEY = "default";

export function buildVariantCombinationKey(
  selections: VariantSelectionInput[],
): string {
  if (selections.length === 0) return DEFAULT_VARIANT_COMBINATION_KEY;

  return [...selections]
    .sort((a, b) => a.attributeId.localeCompare(b.attributeId))
    .map((item) => `${item.attributeId}:${item.valueId}`)
    .join("|");
}

export function formatVariantTitle(valueNames: string[]): string {
  const names = valueNames.map((name) => name.trim()).filter(Boolean);
  return names.length > 0 ? names.join(" / ") : "Varsayılan";
}
