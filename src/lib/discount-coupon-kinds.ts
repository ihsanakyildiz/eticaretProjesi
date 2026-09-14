import { formatMinorTl } from "@/lib/product-money";
import { fromDatetimeLocalValue } from "@/lib/product-sale";

export const DISCOUNT_COUPON_KINDS = ["PERCENT", "FIXED"] as const;
export type DiscountCouponKindCode = (typeof DISCOUNT_COUPON_KINDS)[number];

export const DISCOUNT_COUPON_USAGES = ["UNLIMITED", "ONCE", "CUSTOMER"] as const;
export type DiscountCouponUsageCode = (typeof DISCOUNT_COUPON_USAGES)[number];

export const DISCOUNT_COUPON_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type DiscountCouponStatusCode = (typeof DISCOUNT_COUPON_STATUSES)[number];

export type DiscountCouponSearchProduct = {
  id: string;
  title: string;
  sku: string | null;
  image: string | null;
  brandName: string | null;
};

export type DiscountCouponCustomerOption = {
  id: string;
  label: string;
};

export function isDiscountCouponKind(value: string): value is DiscountCouponKindCode {
  return (DISCOUNT_COUPON_KINDS as readonly string[]).includes(value);
}

export function isDiscountCouponUsage(value: string): value is DiscountCouponUsageCode {
  return (DISCOUNT_COUPON_USAGES as readonly string[]).includes(value);
}

export function isDiscountCouponStatus(value: string): value is DiscountCouponStatusCode {
  return (DISCOUNT_COUPON_STATUSES as readonly string[]).includes(value);
}

export function discountCouponKindLabel(kind: DiscountCouponKindCode) {
  switch (kind) {
    case "PERCENT":
      return "Yüzde indirim";
    case "FIXED":
      return "Sabit tutar";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function discountCouponUsageLabel(usage: DiscountCouponUsageCode) {
  switch (usage) {
    case "UNLIMITED":
      return "Limitsiz";
    case "ONCE":
      return "Tek kullanım";
    case "CUSTOMER":
      return "Müşteriye özel";
    default: {
      const _exhaustive: never = usage;
      return _exhaustive;
    }
  }
}

export function discountCouponStatusLabel(status: DiscountCouponStatusCode) {
  switch (status) {
    case "ACTIVE":
      return "Aktif";
    case "DISABLED":
      return "Pasif";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function discountCouponOfferLabel(kind: DiscountCouponKindCode, valueInt: number) {
  switch (kind) {
    case "PERCENT":
      return `%${valueInt} indirim`;
    case "FIXED":
      return `${formatMinorTl(valueInt)} indirim`;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function normalizeDiscountCouponCode(raw: string) {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function parseDiscountCouponValue(
  kind: DiscountCouponKindCode,
  raw: string,
): { ok: true; valueInt: number } | { ok: false; error: string } {
  switch (kind) {
    case "PERCENT": {
      const percent = Number(String(raw).trim().replace(",", "."));
      if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
        return { ok: false, error: "İndirim oranı 1 ile 100 arasında olmalı." };
      }
      return { ok: true, valueInt: Math.round(percent) };
    }
    case "FIXED": {
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

export function discountCouponValueInput(kind: DiscountCouponKindCode, valueInt: number) {
  switch (kind) {
    case "PERCENT":
      return String(valueInt);
    case "FIXED":
      return valueInt % 100 === 0 ? String(valueInt / 100) : (valueInt / 100).toFixed(2);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function parseDiscountCouponWindow(input: {
  startsAt: string;
  endsAt: string;
}):
  | { ok: true; startsAt: Date | null; endsAt: Date | null }
  | { ok: false; error: string } {
  const startsAt = fromDatetimeLocalValue(input.startsAt);
  const endsAt = fromDatetimeLocalValue(input.endsAt);
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    return { ok: false, error: "Bitiş, başlangıçtan sonra olmalı." };
  }
  return { ok: true, startsAt, endsAt };
}

export function parseDiscountCouponMinSubtotal(
  raw: string,
): { ok: true; minSubtotalMinor: number } | { ok: false; error: string } {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed || trimmed === "0") return { ok: true, minSubtotalMinor: 0 };
  const normalized = trimmed.replace(/\s/g, "").replace(",", ".");
  const major = Number(normalized);
  if (!Number.isFinite(major) || major < 0) {
    return { ok: false, error: "Minimum sepet tutarı geçersiz." };
  }
  return { ok: true, minSubtotalMinor: Math.round(major * 100) };
}

export function discountCouponMinSubtotalInput(minSubtotalMinor: number) {
  if (minSubtotalMinor <= 0) return "";
  return minSubtotalMinor % 100 === 0
    ? String(minSubtotalMinor / 100)
    : (minSubtotalMinor / 100).toFixed(2);
}
