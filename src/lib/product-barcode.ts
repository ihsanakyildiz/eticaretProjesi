/** Warehouse scan and catalog uniqueness share the same barcode key. */
export function normalizeProductBarcode(value: string | null | undefined): string | null {
  const normalized = (value ?? "").replace(/\s+/g, "").trim().toUpperCase();
  return normalized ? normalized.slice(0, 64) : null;
}

export function draftBarcodeConflict(
  drafts: Array<{ clientKey?: string; barcode?: string | null }>,
): string | null {
  const seen = new Map<string, number>();
  for (const draft of drafts) {
    const barcode = normalizeProductBarcode(draft.barcode);
    if (!barcode) continue;
    const previous = seen.get(barcode);
    if (previous != null) {
      return `Aynı barkod birden fazla varyantta kullanılamaz (${barcode}).`;
    }
    seen.set(barcode, 1);
  }
  return null;
}

export type DuplicateBarcodeVariant = {
  id: string;
  sku: string;
  title: string;
  barcode: string | null;
  productId: string;
  productTitle: string;
};

export type DuplicateBarcodeGroup = {
  barcode: string;
  count: number;
  variants: DuplicateBarcodeVariant[];
};
