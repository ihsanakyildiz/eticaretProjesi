import "server-only";

import { isSettingEnabled } from "@/lib/settings";
import { isStripeConfigured } from "@/lib/stripe";
import type { CheckoutCardOption } from "@/lib/checkout-payment-choice";

export function isIyzicoConfigured(settings: Record<string, string>): boolean {
  if (!isSettingEnabled(settings, "payment_iyzico_enabled")) return false;
  return Boolean(settings.payment_iyzico_api_key?.trim() && settings.payment_iyzico_secret_key?.trim());
}

export function isPaytrConfigured(settings: Record<string, string>): boolean {
  if (!isSettingEnabled(settings, "payment_paytr_enabled")) return false;
  return Boolean(
    settings.payment_paytr_merchant_id?.trim() &&
      settings.payment_paytr_merchant_key?.trim() &&
      settings.payment_paytr_merchant_salt?.trim(),
  );
}

export function getCheckoutCardOptions(settings: Record<string, string>): CheckoutCardOption[] {
  const options: CheckoutCardOption[] = [];
  if (isIyzicoConfigured(settings)) {
    options.push({
      id: "IYZICO",
      title: "Kredi kartı (iyzico)",
      hint: "Kart bilgilerini siteden ayrılmadan girin; 3D Secure ve taksit formda açılır",
    });
  }
  if (isPaytrConfigured(settings)) {
    options.push({
      id: "PAYTR",
      title: "Kredi kartı (PayTR)",
      hint: "3D Secure ve taksit seçenekleri PayTR ödeme ekranında",
    });
  }
  if (isStripeConfigured()) {
    options.push({
      id: "STRIPE",
      title: "Kredi kartı (Stripe)",
      hint: "Uluslararası kartlar için güvenli Stripe ödeme sayfası",
    });
  }
  return options;
}

export function maxInstallmentFromSetting(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(12, Math.max(0, parsed));
}
