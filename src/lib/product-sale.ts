export type SalePriceInput = {
  priceMinor: number;
  compareAtMinor?: number | null;
  saleStartsAt?: Date | string | null;
  saleEndsAt?: Date | string | null;
};

export type ResolvedSalePrice = {
  priceMinor: number;
  compareAtMinor: number | null;
  onSale: boolean;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  scheduled: boolean;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDatetimeLocalValue(value: Date | string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): Date | null {
  const raw = value.trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function listPriceMinor(input: SalePriceInput) {
  const price = Math.max(0, Math.round(input.priceMinor));
  const compare =
    input.compareAtMinor == null || !Number.isFinite(input.compareAtMinor)
      ? null
      : Math.max(0, Math.round(input.compareAtMinor));
  if (compare != null && compare > price) return compare;
  return price;
}

export function resolveSalePrice(input: SalePriceInput, now = new Date()): ResolvedSalePrice {
  const charge = Math.max(0, Math.round(input.priceMinor));
  const compare =
    input.compareAtMinor == null || !Number.isFinite(input.compareAtMinor)
      ? null
      : Math.max(0, Math.round(input.compareAtMinor));
  const start = toDate(input.saleStartsAt);
  const end = toDate(input.saleEndsAt);
  const hasDiscount = compare != null && compare > charge;
  const empty = {
    priceMinor: charge,
    compareAtMinor: null,
    onSale: false,
    saleStartsAt: start,
    saleEndsAt: end,
    scheduled: false,
  };

  if (!hasDiscount) return empty;

  const timestamp = now.getTime();
  if (start && timestamp < start.getTime()) {
    return {
      priceMinor: compare,
      compareAtMinor: null,
      onSale: false,
      saleStartsAt: start,
      saleEndsAt: end,
      scheduled: true,
    };
  }
  if (end && timestamp >= end.getTime()) {
    return {
      priceMinor: compare,
      compareAtMinor: null,
      onSale: false,
      saleStartsAt: start,
      saleEndsAt: end,
      scheduled: false,
    };
  }

  return {
    priceMinor: charge,
    compareAtMinor: compare,
    onSale: true,
    saleStartsAt: start,
    saleEndsAt: end,
    scheduled: false,
  };
}

export function saleCountdownParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { days, hours, minutes, seconds, total };
}

export function hasStoredCampaign(input: SalePriceInput) {
  const charge = Math.max(0, Math.round(input.priceMinor));
  const compare =
    input.compareAtMinor == null || !Number.isFinite(input.compareAtMinor)
      ? null
      : Math.max(0, Math.round(input.compareAtMinor));
  return Boolean((compare != null && compare > charge) || toDate(input.saleStartsAt) || toDate(input.saleEndsAt));
}

export function parseSaleWindow(input: { timed: boolean; startsAt: string; endsAt: string }):
  | { ok: true; saleStartsAt: Date | null; saleEndsAt: Date | null }
  | { ok: false; error: string } {
  if (!input.timed) return { ok: true, saleStartsAt: null, saleEndsAt: null };
  const start = fromDatetimeLocalValue(input.startsAt);
  const end = fromDatetimeLocalValue(input.endsAt);
  if (!end) return { ok: false, error: "Kampanya bitiş tarihini seçin." };
  if (start && end.getTime() <= start.getTime()) {
    return { ok: false, error: "Bitiş, başlangıçtan sonra olmalı." };
  }
  if (end.getTime() <= Date.now()) {
    return { ok: false, error: "Bitiş tarihi gelecekte olmalı." };
  }
  return { ok: true, saleStartsAt: start, saleEndsAt: end };
}

export function storedSaleWrite(input: {
  listMinor: number;
  chargeMinor: number;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
}) {
  return {
    priceMinor: input.chargeMinor,
    compareAtMinor: input.listMinor,
    saleStartsAt: input.saleStartsAt,
    saleEndsAt: input.saleEndsAt,
  };
}

export function clearedSaleWrite(listMinor: number) {
  return {
    priceMinor: listMinor,
    compareAtMinor: null as number | null,
    saleStartsAt: null as Date | null,
    saleEndsAt: null as Date | null,
  };
}

export function productFieldsFromStoredSale(stored: SalePriceInput) {
  const start = toDate(stored.saleStartsAt);
  const end = toDate(stored.saleEndsAt);
  return {
    basePriceMinor: Math.max(0, Math.round(stored.priceMinor)),
    compareAtMinor: stored.compareAtMinor ?? null,
    saleStartsAt: start,
    saleEndsAt: end,
    onSale: resolveSalePrice(stored).onSale,
  };
}

export function ratioChargeMinor(listMinor: number, listRef: number, chargeRef: number) {
  if (listMinor <= 0) return 0;
  if (listRef <= 0) return Math.min(chargeRef, Math.max(0, listMinor - 1));
  const charge = Math.round((listMinor * chargeRef) / listRef);
  if (charge <= 0) return 1;
  if (charge >= listMinor) return Math.max(0, listMinor - 1);
  return charge;
}

export function toIsoOrNull(value: Date | string | null | undefined) {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}
