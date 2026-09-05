import { formatMinorTl } from "@/lib/product-money";
import { fromDatetimeLocalValue, listPriceMinor } from "@/lib/product-sale";

export const CAMPAIGN_KINDS = [
  "PERCENT_OFF",
  "FIXED_OFF",
  "FREE_SHIPPING",
  "CART_PERCENT",
] as const;

export type CampaignKindCode = (typeof CAMPAIGN_KINDS)[number];

export const CAMPAIGN_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type CampaignStatusCode = (typeof CAMPAIGN_STATUSES)[number];

export type CampaignPhase = "scheduled" | "active" | "ended" | "disabled";

export type CampaignSearchProduct = {
  id: string;
  title: string;
  sku: string | null;
  image: string | null;
  brandName: string | null;
  busy: boolean;
};

export type CatalogCampaignBadge = {
  id: string;
  name: string;
  kind: CampaignKindCode;
  valueInt: number;
  label: string;
  endsAt: Date | null;
  countdown: boolean;
};

export type CatalogCampaignFacet = {
  id: string;
  name: string;
  label: string;
};

export type CampaignSnapshotVariant = {
  id: string;
  priceMinor: number;
  compareAtMinor: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
};

export type CampaignProductSnapshot = {
  product: {
    basePriceMinor: number;
    compareAtMinor: number | null;
    saleStartsAt: string | null;
    saleEndsAt: string | null;
    onSale: boolean;
    extraShippingMinor: number;
  };
  variants: CampaignSnapshotVariant[];
};

export function isCampaignKind(value: string): value is CampaignKindCode {
  return (CAMPAIGN_KINDS as readonly string[]).includes(value);
}

export function campaignKindLabel(kind: CampaignKindCode) {
  switch (kind) {
    case "PERCENT_OFF":
      return "Yüzde indirim";
    case "FIXED_OFF":
      return "Tutar indirimi";
    case "FREE_SHIPPING":
      return "Kargo bedava";
    case "CART_PERCENT":
      return "Sepette yüzde indirim";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function campaignOfferLabel(kind: CampaignKindCode, valueInt: number) {
  switch (kind) {
    case "PERCENT_OFF":
      return `%${valueInt} indirim`;
    case "FIXED_OFF":
      return `${formatMinorTl(valueInt)} indirim`;
    case "FREE_SHIPPING":
      return "Kargo bedava";
    case "CART_PERCENT":
      return `Sepette %${valueInt} indirim`;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function campaignPhaseLabel(phase: CampaignPhase) {
  switch (phase) {
    case "scheduled":
      return "Zamanlandı";
    case "active":
      return "Aktif";
    case "ended":
      return "Bitti";
    case "disabled":
      return "Durduruldu";
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function campaignPhase(
  input: {
    status: CampaignStatusCode;
    startsAt?: Date | string | null;
    endsAt?: Date | string | null;
  },
  now = new Date(),
): CampaignPhase {
  if (input.status === "DISABLED") return "disabled";
  const start = toDate(input.startsAt);
  const end = toDate(input.endsAt);
  const ts = now.getTime();
  if (end && ts >= end.getTime()) return "ended";
  if (start && ts < start.getTime()) return "scheduled";
  return "active";
}

export function campaignWindowIsLive(
  input: {
    status: CampaignStatusCode;
    startsAt?: Date | string | null;
    endsAt?: Date | string | null;
  },
  now = new Date(),
) {
  return campaignPhase(input, now) === "active";
}

export function campaignWindowIsBusy(
  input: {
    status: CampaignStatusCode;
    startsAt?: Date | string | null;
    endsAt?: Date | string | null;
  },
  now = new Date(),
) {
  const phase = campaignPhase(input, now);
  return phase === "active" || phase === "scheduled";
}

export function campaignChangesPrice(kind: CampaignKindCode) {
  switch (kind) {
    case "PERCENT_OFF":
    case "FIXED_OFF":
      return true;
    case "FREE_SHIPPING":
    case "CART_PERCENT":
      return false;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function campaignAppliesInCart(kind: CampaignKindCode) {
  switch (kind) {
    case "CART_PERCENT":
    case "FREE_SHIPPING":
      return true;
    case "PERCENT_OFF":
    case "FIXED_OFF":
      return false;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function campaignChargeMinor(
  kind: CampaignKindCode,
  valueInt: number,
  listMinor: number,
): number | null {
  if (listMinor <= 0) return null;
  switch (kind) {
    case "PERCENT_OFF": {
      const charge = Math.round((listMinor * (100 - valueInt)) / 100);
      if (charge <= 0) return 1;
      if (charge >= listMinor) return Math.max(1, listMinor - 1);
      return charge;
    }
    case "FIXED_OFF": {
      const charge = listMinor - valueInt;
      if (charge <= 0) return 1;
      if (charge >= listMinor) return Math.max(1, listMinor - 1);
      return charge;
    }
    case "FREE_SHIPPING":
    case "CART_PERCENT":
      return null;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function applyCartPercentMinor(priceMinor: number, percent: number) {
  if (priceMinor <= 0 || percent <= 0) return priceMinor;
  const charge = Math.round((priceMinor * (100 - percent)) / 100);
  if (charge <= 0) return 1;
  if (charge >= priceMinor) return Math.max(1, priceMinor - 1);
  return charge;
}

export function campaignCartPriceMinor(
  kind: CampaignKindCode,
  valueInt: number,
  listMinor: number,
): number | null {
  switch (kind) {
    case "CART_PERCENT": {
      if (listMinor <= 0) return null;
      const charge = applyCartPercentMinor(listMinor, valueInt);
      return charge < listMinor ? charge : null;
    }
    case "PERCENT_OFF":
    case "FIXED_OFF":
    case "FREE_SHIPPING":
      return null;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function parseCampaignValue(
  kind: CampaignKindCode,
  raw: string,
): { ok: true; valueInt: number } | { ok: false; error: string } {
  switch (kind) {
    case "FREE_SHIPPING":
      return { ok: true, valueInt: 0 };
    case "PERCENT_OFF":
    case "CART_PERCENT": {
      const percent = Number(String(raw).trim().replace(",", "."));
      if (!Number.isFinite(percent) || percent < 1 || percent > 90) {
        return { ok: false, error: "İndirim oranı 1 ile 90 arasında olmalı." };
      }
      return { ok: true, valueInt: Math.round(percent) };
    }
    case "FIXED_OFF": {
      const normalized = String(raw).trim().replace(/\s/g, "").replace(",", ".");
      const major = Number(normalized);
      if (!Number.isFinite(major) || major < 0.01) {
        return { ok: false, error: "İndirim tutarı en az 0,01 TL olmalı." };
      }
      return { ok: true, valueInt: Math.round(major * 100) };
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function campaignValueInput(kind: CampaignKindCode, valueInt: number) {
  switch (kind) {
    case "FREE_SHIPPING":
      return "";
    case "PERCENT_OFF":
    case "CART_PERCENT":
      return String(valueInt);
    case "FIXED_OFF":
      return valueInt % 100 === 0 ? String(valueInt / 100) : (valueInt / 100).toFixed(2);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function parseCampaignWindow(input: {
  countdown: boolean;
  startsAt: string;
  endsAt: string;
}):
  | { ok: true; startsAt: Date | null; endsAt: Date | null }
  | { ok: false; error: string } {
  if (!input.countdown) return { ok: true, startsAt: null, endsAt: null };
  const start = fromDatetimeLocalValue(input.startsAt);
  const end = fromDatetimeLocalValue(input.endsAt);
  if (!end) return { ok: false, error: "Geri sayım için bitiş tarihini seçin." };
  if (start && end.getTime() <= start.getTime()) {
    return { ok: false, error: "Bitiş, başlangıçtan sonra olmalı." };
  }
  if (end.getTime() <= Date.now()) {
    return { ok: false, error: "Bitiş tarihi gelecekte olmalı." };
  }
  return { ok: true, startsAt: start, endsAt: end };
}

export function pickLiveCampaignBadge(
  items: Array<{
    campaign: {
      id: string;
      name: string;
      kind: CampaignKindCode;
      valueInt: number;
      countdown: boolean;
      startsAt?: Date | string | null;
      endsAt?: Date | string | null;
      status: CampaignStatusCode;
    };
  }>,
  now = new Date(),
): CatalogCampaignBadge | null {
  for (const item of items) {
    if (!campaignWindowIsLive(item.campaign, now)) continue;
    return {
      id: item.campaign.id,
      name: item.campaign.name,
      kind: item.campaign.kind,
      valueInt: item.campaign.valueInt,
      label: campaignOfferLabel(item.campaign.kind, item.campaign.valueInt),
      endsAt: item.campaign.countdown ? toDate(item.campaign.endsAt) : null,
      countdown: item.campaign.countdown,
    };
  }
  return null;
}

export function campaignListPrice(input: {
  priceMinor: number;
  compareAtMinor?: number | null;
}) {
  return listPriceMinor(input);
}
