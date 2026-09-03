export type StockLocationParts = {
  code?: string | null;
  aisle?: string | null;
  rack?: string | null;
  shelf?: string | null;
};

function cleanPart(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 16);
}

export function normalizeLocationCode(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9._-]/g, "")
    .slice(0, 32);
}

export function buildLocationCode(parts: StockLocationParts) {
  const manual = normalizeLocationCode(parts.code);
  if (manual) return manual;
  const joined = [cleanPart(parts.aisle), cleanPart(parts.rack), cleanPart(parts.shelf)]
    .filter(Boolean)
    .join("-");
  return normalizeLocationCode(joined);
}

export function locationHint(parts: StockLocationParts) {
  const bits: string[] = [];
  if (cleanPart(parts.aisle)) bits.push(`Koridor ${cleanPart(parts.aisle)}`);
  if (cleanPart(parts.rack)) bits.push(`Raf ${cleanPart(parts.rack)}`);
  if (cleanPart(parts.shelf)) bits.push(`Göz ${cleanPart(parts.shelf)}`);
  return bits.join(" · ");
}

export function compareLocationCodes(left?: string | null, right?: string | null) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, "tr", { numeric: true, sensitivity: "base" });
}

export type PickLocationStock = {
  quantity: number;
  warehouseCode: string;
  isDefault: boolean;
  location: {
    id: string;
    code: string;
    aisle: string | null;
    rack: string | null;
    shelf: string | null;
  } | null;
};

export function resolvePickLocation(rows: PickLocationStock[]) {
  const ranked = [...rows].sort((left, right) => {
    if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
    const leftHas = left.quantity > 0 ? 1 : 0;
    const rightHas = right.quantity > 0 ? 1 : 0;
    return rightHas - leftHas;
  });
  const chosen = ranked.find((row) => row.location) ?? null;
  if (!chosen?.location) return null;
  return {
    locationId: chosen.location.id,
    code: chosen.location.code,
    hint: locationHint(chosen.location),
    warehouseCode: chosen.warehouseCode,
  };
}

export function padLocationNumber(value: number, width = 2) {
  return String(value).padStart(width, "0");
}
