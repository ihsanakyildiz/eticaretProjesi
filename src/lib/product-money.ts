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
