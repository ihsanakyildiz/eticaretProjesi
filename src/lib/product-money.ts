/**
 * Firma fiyat metni: 266.000 / 266,000 → 266; 1.234,56 / 1,234.56 → 1234.56;
 * 1.234.567 → 1234567. Tek ayırıcı her zaman ondalıktır.
 */
export function parseFeedMajor(raw: string): number | null {
  const compact = raw.trim();
  if (!compact) return null;
  let text = compact.replace(/[^\d,.\-]/g, "");
  if (!text || text === "-" || text === "." || text === ",") return null;

  const hasComma = text.includes(",");
  const hasDot = text.includes(".");

  if (hasComma && hasDot) {
    if (text.lastIndexOf(",") > text.lastIndexOf(".")) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (hasDot) {
    const parts = text.split(".");
    if (parts.length > 2 && parts.slice(1).every((part) => part.length === 3)) {
      text = parts.join("");
    }
  } else if (hasComma) {
    const parts = text.split(",");
    if (parts.length > 2 && parts.slice(1).every((part) => part.length === 3)) {
      text = parts.join("");
    } else {
      text = text.replace(",", ".");
    }
  }

  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function parseMajorToMinor(raw: string): number | null {
  const value = parseFeedMajor(raw);
  if (value == null) return null;
  return Math.round(value * 100);
}

export function formatMinorToMajorInput(minor: number): string {
  return (minor / 100).toFixed(2);
}

export function formatMinorTry(minor: number): string {
  return formatMinorTl(minor);
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
