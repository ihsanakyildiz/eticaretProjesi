/** Warehouse scan and catalog uniqueness share the same barcode key. */
export function normalizeProductBarcode(value: string | null | undefined): string | null {
  const normalized = (value ?? "").replace(/\s+/g, "").trim().toUpperCase();
  return normalized ? normalized.slice(0, 64) : null;
}

/** EAN-13 check digit for the first 12 digits. */
export function ean13CheckDigit(digits12: string): string {
  const body = digits12.replace(/\D/g, "").slice(0, 12).padStart(12, "0");
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(body[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

/**
 * Internal store barcode (EAN-13).
 * Prefix 200 = GS1 restricted circulation / in-store marking.
 */
export function buildInternalEan13(seedDigits: string): string {
  const raw = seedDigits.replace(/\D/g, "");
  const body = `200${raw}`.replace(/\D/g, "").slice(0, 12).padEnd(12, "0");
  return `${body}${ean13CheckDigit(body)}`;
}

/** Client/server candidate — uniqueness must still be verified against DB. */
export function inventProductBarcodeCandidate(now = Date.now()): string {
  const timePart = String(now % 1_000_000_000).padStart(9, "0");
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return buildInternalEan13(`${timePart}${rand}`);
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
