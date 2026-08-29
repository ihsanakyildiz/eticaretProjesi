export const CHECKOUT_STEPS = ["adres", "kargo", "odeme"] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export type CheckoutQuery = Record<string, string | string[] | undefined>;

export function firstSearchValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseCheckoutStep(value: string | null | undefined): CheckoutStep {
  switch (value) {
    case "adres":
    case "kargo":
    case "odeme":
      return value;
    default:
      return "adres";
  }
}

export function checkoutStepLabel(step: CheckoutStep): string {
  switch (step) {
    case "adres":
      return "Adres";
    case "kargo":
      return "Kargo";
    case "odeme":
      return "Ödeme";
    default: {
      const _exhaustive: never = step;
      return _exhaustive;
    }
  }
}

export function searchRecordToParams(query: CheckoutQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) params.append(key, item);
      }
    } else if (value) {
      params.set(key, value);
    }
  }
  return params;
}

export function checkoutStepHref(step: CheckoutStep, query: CheckoutQuery = {}) {
  const params = searchRecordToParams(query);
  params.set("adim", step);
  return `/odeme?${params.toString()}`;
}

export function clampCheckoutStep(
  requested: CheckoutStep,
  shippingId: string,
  carrierId: string,
): CheckoutStep {
  switch (requested) {
    case "adres":
      return "adres";
    case "kargo":
      return shippingId ? "kargo" : "adres";
    case "odeme":
      if (!shippingId) return "adres";
      if (!carrierId) return "kargo";
      return "odeme";
    default: {
      const _exhaustive: never = requested;
      return _exhaustive;
    }
  }
}
