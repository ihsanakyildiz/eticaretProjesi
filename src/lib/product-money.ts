export function parseMajorToMinor(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function formatMinorToMajorInput(minor: number): string {
  return (minor / 100).toFixed(2);
}

export function formatMinorTry(minor: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

export function formatMinorTl(minor: number): string {
  const major = minor / 100;
  const amount = Number.isInteger(major)
    ? major.toLocaleString("tr-TR")
    : major.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${amount} TL`;
}

export function taxIncludedMinor(exclMinor: number, taxPercent: number): number {
  const rate = Number.isFinite(taxPercent) ? taxPercent : 0;
  return Math.round(exclMinor * (1 + rate / 100));
}

export function taxExcludedMinor(inclMinor: number, taxPercent: number): number {
  const rate = Number.isFinite(taxPercent) ? taxPercent : 0;
  if (rate <= 0) return inclMinor;
  return Math.round(inclMinor / (1 + rate / 100));
}

export function marginMinor(exclMinor: number, costMinor: number): number {
  return exclMinor - costMinor;
}

export function marginRatePercent(exclMinor: number, costMinor: number): number | null {
  if (exclMinor <= 0) return null;
  return ((exclMinor - costMinor) / exclMinor) * 100;
}

/** Satış + isteğe bağlı indirimli → kayıt (müşteri öder / üstü çizili liste). */
export function toChargeAndListPrice(
  saleMinor: number,
  discountMinor: number | null | undefined,
): { chargeMinor: number; listMinor: number | null } {
  const sale = Math.max(0, Math.round(saleMinor));
  const discount =
    discountMinor == null || !Number.isFinite(discountMinor)
      ? null
      : Math.max(0, Math.round(discountMinor));
  if (discount != null && discount > 0 && discount < sale) {
    return { chargeMinor: discount, listMinor: sale };
  }
  return { chargeMinor: sale, listMinor: null };
}

/** Kayıtlı fiyatı admin alanlarına çevir (satış / indirimli). */
export function fromChargeAndListPrice(
  chargeMinor: number,
  listMinor: number | null | undefined,
): { saleMinor: number; discountMinor: number | null } {
  if (listMinor != null && listMinor > chargeMinor) {
    return { saleMinor: listMinor, discountMinor: chargeMinor };
  }
  return { saleMinor: chargeMinor, discountMinor: null };
}

/**
 * Excel / XML / API satırından kayıtlı fiyat.
 * İndirimli doluysa yeni model; değilse eski karşılaştırma (yüksekse liste, düşükse indirim).
 */
export function resolveImportedListPrices(input: {
  saleMinor: number | null | undefined;
  discountMinor?: number | null;
  compareAtMinor?: number | null;
}): { chargeMinor: number; listMinor: number | null } {
  const sale =
    input.saleMinor != null && Number.isFinite(input.saleMinor)
      ? Math.max(0, Math.round(input.saleMinor))
      : 0;
  const discount =
    input.discountMinor != null && Number.isFinite(input.discountMinor)
      ? Math.max(0, Math.round(input.discountMinor))
      : null;
  const compareAt =
    input.compareAtMinor != null && Number.isFinite(input.compareAtMinor)
      ? Math.max(0, Math.round(input.compareAtMinor))
      : null;

  if (discount != null && discount > 0) {
    return toChargeAndListPrice(sale, discount);
  }
  if (compareAt != null && compareAt > 0 && sale > 0) {
    if (compareAt > sale) return { chargeMinor: sale, listMinor: compareAt };
    if (compareAt < sale) return toChargeAndListPrice(sale, compareAt);
  }
  return { chargeMinor: sale, listMinor: null };
}
