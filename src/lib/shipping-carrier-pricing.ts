import { parseMajorToMinor } from "@/lib/product-money";

export const SHIPPING_PRICING_MODES = ["FLAT", "DESI"] as const;
export type ShippingPricingModeCode = (typeof SHIPPING_PRICING_MODES)[number];

export const SHIPPING_CITY_OVERRIDE_MODES = ["FLAT", "MULTIPLIER"] as const;
export type ShippingCityOverrideMode = (typeof SHIPPING_CITY_OVERRIDE_MODES)[number];

export type ShippingDesiTier = {
  maxDesi: number;
  priceMinor: number;
};

export type ShippingCityOverride = {
  cities: string[];
  mode: ShippingCityOverrideMode;
  flatPriceMinor?: number;
  multiplier?: number;
};

export type ShippingRateSettings = {
  desiTiers: ShippingDesiTier[];
  overagePerDesiMinor: number;
  defaultDesiWhenMissing: number;
  cityOverrides: ShippingCityOverride[];
};

export type ShippingCarrierPricingInput = {
  pricingMode: ShippingPricingModeCode;
  flatPriceMinor: number;
  freeShippingEnabled: boolean;
  freeShippingMinSubtotalMinor: number;
  rateSettings: ShippingRateSettings | null;
};

export type ShippingDesiLineInput = {
  quantity: number;
  weightKg?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  depthCm?: number | null;
};

export const DEFAULT_SHIPPING_RATE_SETTINGS: ShippingRateSettings = {
  desiTiers: [
    { maxDesi: 1, priceMinor: 9900 },
    { maxDesi: 3, priceMinor: 12900 },
    { maxDesi: 5, priceMinor: 15900 },
  ],
  overagePerDesiMinor: 2500,
  defaultDesiWhenMissing: 1,
  cityOverrides: [],
};

export function isShippingPricingMode(value: string): value is ShippingPricingModeCode {
  return (SHIPPING_PRICING_MODES as readonly string[]).includes(value);
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeCityName(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

export function parseShippingRateSettings(raw: string | null | undefined): ShippingRateSettings {
  if (!raw?.trim()) return { ...DEFAULT_SHIPPING_RATE_SETTINGS, desiTiers: [...DEFAULT_SHIPPING_RATE_SETTINGS.desiTiers], cityOverrides: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<ShippingRateSettings>;
    const tiers = Array.isArray(parsed.desiTiers)
      ? parsed.desiTiers
          .map((tier) => {
            const maxDesi = asFiniteNumber(tier?.maxDesi);
            const priceMinor = asFiniteNumber(tier?.priceMinor);
            if (maxDesi == null || maxDesi <= 0 || priceMinor == null || priceMinor < 0) return null;
            return { maxDesi, priceMinor: Math.round(priceMinor) };
          })
          .filter((tier): tier is ShippingDesiTier => tier != null)
          .sort((a, b) => a.maxDesi - b.maxDesi)
      : [];
    const cityOverrides: ShippingCityOverride[] = [];
    if (Array.isArray(parsed.cityOverrides)) {
      for (const row of parsed.cityOverrides) {
        const cities = Array.isArray(row?.cities)
          ? row.cities.map((city) => String(city ?? "").trim()).filter(Boolean)
          : [];
        if (cities.length === 0) continue;
        const mode: ShippingCityOverrideMode =
          row?.mode === "MULTIPLIER" ? "MULTIPLIER" : "FLAT";
        const flatPriceMinor = asFiniteNumber(row?.flatPriceMinor);
        const multiplier = asFiniteNumber(row?.multiplier);
        cityOverrides.push({
          cities,
          mode,
          flatPriceMinor:
            flatPriceMinor != null && flatPriceMinor >= 0 ? Math.round(flatPriceMinor) : 0,
          multiplier: multiplier != null && multiplier > 0 ? multiplier : 1,
        });
      }
    }
    const overage = asFiniteNumber(parsed.overagePerDesiMinor);
    const defaultDesi = asFiniteNumber(parsed.defaultDesiWhenMissing);
    return {
      desiTiers: tiers.length > 0 ? tiers : [...DEFAULT_SHIPPING_RATE_SETTINGS.desiTiers],
      overagePerDesiMinor:
        overage != null && overage >= 0
          ? Math.round(overage)
          : DEFAULT_SHIPPING_RATE_SETTINGS.overagePerDesiMinor,
      defaultDesiWhenMissing:
        defaultDesi != null && defaultDesi > 0
          ? defaultDesi
          : DEFAULT_SHIPPING_RATE_SETTINGS.defaultDesiWhenMissing,
      cityOverrides,
    };
  } catch {
    return {
      ...DEFAULT_SHIPPING_RATE_SETTINGS,
      desiTiers: [...DEFAULT_SHIPPING_RATE_SETTINGS.desiTiers],
      cityOverrides: [],
    };
  }
}

export function serializeShippingRateSettings(settings: ShippingRateSettings): string {
  return JSON.stringify({
    desiTiers: settings.desiTiers
      .map((tier) => ({
        maxDesi: tier.maxDesi,
        priceMinor: Math.round(tier.priceMinor),
      }))
      .sort((a, b) => a.maxDesi - b.maxDesi),
    overagePerDesiMinor: Math.max(0, Math.round(settings.overagePerDesiMinor)),
    defaultDesiWhenMissing: Math.max(0.1, settings.defaultDesiWhenMissing),
    cityOverrides: settings.cityOverrides.map((row) => ({
      cities: row.cities,
      mode: row.mode,
      flatPriceMinor: Math.max(0, Math.round(row.flatPriceMinor ?? 0)),
      multiplier: row.multiplier != null && row.multiplier > 0 ? row.multiplier : 1,
    })),
  });
}

export function volumetricDesi(input: {
  widthCm?: number | null;
  heightCm?: number | null;
  depthCm?: number | null;
}): number | null {
  const w = asFiniteNumber(input.widthCm);
  const h = asFiniteNumber(input.heightCm);
  const d = asFiniteNumber(input.depthCm);
  if (w == null || h == null || d == null || w <= 0 || h <= 0 || d <= 0) return null;
  return (w * h * d) / 3000;
}

export function lineChargeableDesi(
  line: ShippingDesiLineInput,
  defaultDesiWhenMissing: number,
): number {
  const qty = Math.max(1, Math.floor(line.quantity) || 1);
  const weight = asFiniteNumber(line.weightKg);
  const volume = volumetricDesi(line);
  let unit = 0;
  if (weight != null && weight > 0) unit = Math.max(unit, weight);
  if (volume != null && volume > 0) unit = Math.max(unit, volume);
  if (unit <= 0) unit = Math.max(0.1, defaultDesiWhenMissing);
  return unit * qty;
}

export function chargeableDesiFromLines(
  lines: ShippingDesiLineInput[],
  defaultDesiWhenMissing = DEFAULT_SHIPPING_RATE_SETTINGS.defaultDesiWhenMissing,
): number {
  if (lines.length === 0) return 0;
  const total = lines.reduce(
    (sum, line) => sum + lineChargeableDesi(line, defaultDesiWhenMissing),
    0,
  );
  return Math.round(total * 1000) / 1000;
}

function priceFromDesiTiers(desi: number, settings: ShippingRateSettings): number {
  const chargeable = Math.max(0, desi);
  const tiers = [...settings.desiTiers].sort((a, b) => a.maxDesi - b.maxDesi);
  for (const tier of tiers) {
    if (chargeable <= tier.maxDesi) return Math.max(0, tier.priceMinor);
  }
  const last = tiers[tiers.length - 1];
  if (!last) return 0;
  const extra = Math.max(0, chargeable - last.maxDesi);
  const extraUnits = Math.ceil(extra);
  return Math.max(0, last.priceMinor + extraUnits * Math.max(0, settings.overagePerDesiMinor));
}

function applyCityOverride(baseMinor: number, city: string, settings: ShippingRateSettings): number {
  const needle = normalizeCityName(city);
  if (!needle) return baseMinor;
  for (const row of settings.cityOverrides) {
    const hit = row.cities.some((name) => normalizeCityName(name) === needle);
    if (!hit) continue;
    if (row.mode === "FLAT") return Math.max(0, Math.round(row.flatPriceMinor ?? 0));
    const multiplier = row.multiplier != null && row.multiplier > 0 ? row.multiplier : 1;
    return Math.max(0, Math.round(baseMinor * multiplier));
  }
  return baseMinor;
}

export function quoteShippingCarrierPrice(input: {
  carrier: ShippingCarrierPricingInput;
  chargeableDesi?: number;
  lines?: ShippingDesiLineInput[];
  city?: string | null;
  productsMinor: number;
  extraShippingMinor: number;
}): number {
  const { carrier, city, productsMinor, extraShippingMinor } = input;

  if (carrier.freeShippingEnabled) {
    const min = Math.max(0, carrier.freeShippingMinSubtotalMinor);
    if (min <= 0 || productsMinor >= min) return 0;
  }

  const settings = carrier.rateSettings ?? parseShippingRateSettings(null);
  const chargeableDesi =
    input.lines && input.lines.length > 0
      ? chargeableDesiFromLines(input.lines, settings.defaultDesiWhenMissing)
      : (input.chargeableDesi ?? 0);

  let base = 0;
  switch (carrier.pricingMode) {
    case "FLAT":
      base = Math.max(0, carrier.flatPriceMinor);
      break;
    case "DESI":
      base = priceFromDesiTiers(chargeableDesi, settings);
      break;
    default: {
      const _exhaustive: never = carrier.pricingMode;
      return _exhaustive;
    }
  }

  base = applyCityOverride(base, city ?? "", settings);
  return Math.max(0, base + Math.max(0, extraShippingMinor));
}

export function shippingPricingModeLabel(mode: ShippingPricingModeCode) {
  switch (mode) {
    case "FLAT":
      return "Sabit tutar";
    case "DESI":
      return "Desi / ağırlık";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function shippingCarrierPricingSummary(carrier: {
  pricingMode: ShippingPricingModeCode | string;
  freeShippingEnabled: boolean;
  flatPriceMinor?: number;
}) {
  if (carrier.freeShippingEnabled) return "Bedava kargo";
  if (carrier.pricingMode === "DESI") return "Desi tablosu";
  return "Sabit tutar";
}

/** Form alanlarından rateSettings üret */
export function parseShippingRateSettingsFromForm(formData: FormData): {
  ok: true;
  settings: ShippingRateSettings;
} | { ok: false; error: string } {
  const defaultDesiRaw = String(formData.get("defaultDesiWhenMissing") ?? "1").trim();
  const defaultDesi = Number(defaultDesiRaw.replace(",", "."));
  if (!Number.isFinite(defaultDesi) || defaultDesi <= 0) {
    return { ok: false, error: "Varsayılan desi geçersiz." };
  }

  const overageMinor =
    parseMajorToMinor(String(formData.get("overagePerDesiMajor") ?? "0")) ?? 0;
  if (overageMinor < 0) return { ok: false, error: "Aşım desi ücreti geçersiz." };

  const maxDesiList = formData.getAll("desiTierMax").map((v) => String(v ?? "").trim());
  const priceList = formData.getAll("desiTierPriceMajor").map((v) => String(v ?? "").trim());
  const desiTiers: ShippingDesiTier[] = [];
  for (let i = 0; i < Math.max(maxDesiList.length, priceList.length); i += 1) {
    const maxRaw = maxDesiList[i] ?? "";
    const priceRaw = priceList[i] ?? "";
    if (!maxRaw && !priceRaw) continue;
    const maxDesi = Number(maxRaw.replace(",", "."));
    const priceMinor = parseMajorToMinor(priceRaw);
    if (!Number.isFinite(maxDesi) || maxDesi <= 0 || priceMinor == null || priceMinor < 0) {
      return { ok: false, error: `Desi dilimi #${i + 1} geçersiz.` };
    }
    desiTiers.push({ maxDesi, priceMinor });
  }
  desiTiers.sort((a, b) => a.maxDesi - b.maxDesi);

  const cityCount = Number.parseInt(String(formData.get("cityOverrideCount") ?? "0"), 10) || 0;
  const cityOverrides: ShippingCityOverride[] = [];
  for (let i = 0; i < cityCount; i += 1) {
    const citiesRaw = String(formData.get(`cityOverrideCities_${i}`) ?? "");
    const cities = citiesRaw
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cities.length === 0) continue;
    const modeRaw = String(formData.get(`cityOverrideMode_${i}`) ?? "FLAT");
    const mode: ShippingCityOverrideMode = modeRaw === "MULTIPLIER" ? "MULTIPLIER" : "FLAT";
    if (mode === "FLAT") {
      const flat = parseMajorToMinor(String(formData.get(`cityOverrideFlatMajor_${i}`) ?? "0"));
      if (flat == null || flat < 0) {
        return { ok: false, error: `Şehir farkı #${i + 1} tutarı geçersiz.` };
      }
      cityOverrides.push({ cities, mode, flatPriceMinor: flat, multiplier: 1 });
    } else {
      const multiplier = Number(
        String(formData.get(`cityOverrideMultiplier_${i}`) ?? "1").replace(",", "."),
      );
      if (!Number.isFinite(multiplier) || multiplier <= 0) {
        return { ok: false, error: `Şehir farkı #${i + 1} çarpanı geçersiz.` };
      }
      cityOverrides.push({ cities, mode, flatPriceMinor: 0, multiplier });
    }
  }

  return {
    ok: true,
    settings: {
      desiTiers:
        desiTiers.length > 0 ? desiTiers : [...DEFAULT_SHIPPING_RATE_SETTINGS.desiTiers],
      overagePerDesiMinor: overageMinor,
      defaultDesiWhenMissing: defaultDesi,
      cityOverrides,
    },
  };
}

export function rateSettingsToFormValues(settings: ShippingRateSettings) {
  return {
    desiTiers: settings.desiTiers.map((tier) => ({
      maxDesi: String(tier.maxDesi),
      priceMajor:
        tier.priceMinor % 100 === 0
          ? String(tier.priceMinor / 100)
          : (tier.priceMinor / 100).toFixed(2),
    })),
    overagePerDesiMajor:
      settings.overagePerDesiMinor % 100 === 0
        ? String(settings.overagePerDesiMinor / 100)
        : (settings.overagePerDesiMinor / 100).toFixed(2),
    defaultDesiWhenMissing: String(settings.defaultDesiWhenMissing),
    cityOverrides: settings.cityOverrides.map((row) => ({
      cities: row.cities,
      mode: row.mode,
      flatMajor:
        (row.flatPriceMinor ?? 0) % 100 === 0
          ? String((row.flatPriceMinor ?? 0) / 100)
          : ((row.flatPriceMinor ?? 0) / 100).toFixed(2),
      multiplier: String(row.multiplier ?? 1),
    })),
  };
}
