import "server-only";

import crypto from "node:crypto";
import { isSettingEnabled } from "@/lib/settings";
import { maxInstallmentFromSetting } from "@/lib/checkout-payments";

const PAYTR_TOKEN_URL = "https://www.paytr.com/odeme/api/get-token";

export type PaytrBasketLine = {
  name: string;
  unitPriceMinor: number;
  quantity: number;
};

export type PaytrTokenResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

type PaytrCredentials = {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
  testMode: boolean;
  maxInstallment: number;
};

export function getPaytrCredentials(settings: Record<string, string>): PaytrCredentials | null {
  const merchantId = settings.payment_paytr_merchant_id?.trim() ?? "";
  const merchantKey = settings.payment_paytr_merchant_key?.trim() ?? "";
  const merchantSalt = settings.payment_paytr_merchant_salt?.trim() ?? "";
  if (!merchantId || !merchantKey || !merchantSalt) return null;
  return {
    merchantId,
    merchantKey,
    merchantSalt,
    testMode: isSettingEnabled(settings, "payment_paytr_test_mode", true),
    maxInstallment: maxInstallmentFromSetting(settings.payment_paytr_max_installment, 12),
  };
}

function hmacBase64(value: string, key: string): string {
  return crypto.createHmac("sha256", key).update(value).digest("base64");
}

function formatPaytrUnitPrice(minor: number): string {
  return (Math.max(0, minor) / 100).toFixed(2);
}

export function formatPaytrPhone(phone: string | null | undefined): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length >= 12) return `0${digits.slice(2, 12)}`;
  if (digits.length >= 10) return digits.slice(-11).padStart(11, "0");
  return "05555555555";
}

function installmentParams(maxInstallment: number): { noInstallment: string; maxInstallment: string } {
  if (maxInstallment === 1) return { noInstallment: "1", maxInstallment: "0" };
  if (maxInstallment <= 0) return { noInstallment: "0", maxInstallment: "0" };
  return { noInstallment: "0", maxInstallment: String(maxInstallment) };
}

export async function createPaytrIframeToken(input: {
  settings: Record<string, string>;
  merchantOid: string;
  email: string;
  paymentAmountMinor: number;
  userIp: string;
  userName: string;
  userAddress: string;
  userPhone: string | null;
  merchantOkUrl: string;
  merchantFailUrl: string;
  items: PaytrBasketLine[];
  shippingMinor: number;
}): Promise<PaytrTokenResult> {
  const creds = getPaytrCredentials(input.settings);
  if (!creds) return { ok: false, error: "PayTR mağaza bilgileri tanımlı değil." };

  const basket: Array<[string, string, number]> = input.items.map((line) => [
    line.name.slice(0, 80) || "Ürün",
    formatPaytrUnitPrice(line.unitPriceMinor),
    line.quantity,
  ]);
  if (input.shippingMinor > 0) {
    basket.push(["Kargo", formatPaytrUnitPrice(input.shippingMinor), 1]);
  }
  const userBasket = Buffer.from(JSON.stringify(basket), "utf8").toString("base64");
  const paymentAmount = String(input.paymentAmountMinor);
  const currency = "TL";
  const testMode = creds.testMode ? "1" : "0";
  const { noInstallment, maxInstallment } = installmentParams(creds.maxInstallment);
  const timeoutLimit = "30";
  const debugOn = creds.testMode ? "1" : "0";

  const hashStr =
    creds.merchantId +
    input.userIp +
    input.merchantOid +
    input.email +
    paymentAmount +
    userBasket +
    noInstallment +
    maxInstallment +
    currency +
    testMode;
  const paytrToken = hmacBase64(hashStr + creds.merchantSalt, creds.merchantKey);

  const body = new URLSearchParams({
    merchant_id: creds.merchantId,
    user_ip: input.userIp,
    merchant_oid: input.merchantOid,
    email: input.email,
    payment_amount: paymentAmount,
    paytr_token: paytrToken,
    user_basket: userBasket,
    debug_on: debugOn,
    no_installment: noInstallment,
    max_installment: maxInstallment,
    user_name: input.userName.slice(0, 60),
    user_address: input.userAddress.slice(0, 400),
    user_phone: formatPaytrPhone(input.userPhone),
    merchant_ok_url: input.merchantOkUrl,
    merchant_fail_url: input.merchantFailUrl,
    timeout_limit: timeoutLimit,
    currency,
    test_mode: testMode,
    lang: "tr",
  });

  try {
    const response = await fetch(PAYTR_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const text = await response.text();
    let data: { status?: string; token?: string; reason?: string };
    try {
      data = JSON.parse(text) as { status?: string; token?: string; reason?: string };
    } catch {
      return { ok: false, error: text.slice(0, 300) || "PayTR yanıtı okunamadı." };
    }
    if (data.status !== "success" || !data.token) {
      return { ok: false, error: data.reason || "PayTR ödeme formu başlatılamadı." };
    }
    return { ok: true, token: data.token };
  } catch (error) {
    const message = error instanceof Error ? error.message : "PayTR bağlantısı başarısız.";
    return { ok: false, error: message };
  }
}

export function verifyPaytrNotifyHash(input: {
  merchantOid: string;
  status: string;
  totalAmount: string;
  hash: string;
  merchantKey: string;
  merchantSalt: string;
}): boolean {
  const expected = hmacBase64(
    input.merchantOid + input.merchantSalt + input.status + input.totalAmount,
    input.merchantKey,
  );
  const left = Buffer.from(expected);
  const right = Buffer.from(input.hash);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export async function refundPaytrPayment(input: {
  settings: Record<string, string>;
  merchantOid: string;
  amountMinor: number;
}): Promise<{ ok: true; refundedMinor: number } | { ok: false; error: string }> {
  const creds = getPaytrCredentials(input.settings);
  if (!creds) return { ok: false, error: "PayTR mağaza bilgileri tanımlı değil." };
  if (input.amountMinor <= 0) return { ok: false, error: "İade tutarı geçersiz." };

  const returnAmount = (input.amountMinor / 100).toFixed(2);
  const paytrToken = hmacBase64(
    `${creds.merchantId}${input.merchantOid}${returnAmount}${creds.merchantSalt}`,
    creds.merchantKey,
  );
  const body = new URLSearchParams({
    merchant_id: creds.merchantId,
    merchant_oid: input.merchantOid,
    return_amount: returnAmount,
    paytr_token: paytrToken,
  });

  try {
    const response = await fetch("https://www.paytr.com/odeme/iade", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const text = await response.text();
    let parsed: { status?: string; err_msg?: string } = {};
    try {
      parsed = JSON.parse(text) as { status?: string; err_msg?: string };
    } catch {
      return { ok: false, error: text.slice(0, 300) || "PayTR iade yanıtı okunamadı." };
    }
    if (String(parsed.status ?? "").toLowerCase() !== "success") {
      return { ok: false, error: parsed.err_msg || "PayTR iadesi başarısız." };
    }
    return { ok: true, refundedMinor: input.amountMinor };
  } catch (error) {
    const message = error instanceof Error ? error.message : "PayTR iadesi başarısız.";
    return { ok: false, error: message };
  }
}
