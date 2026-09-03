import "server-only";

import crypto from "node:crypto";
import { isSettingEnabled } from "@/lib/settings";
import { maxInstallmentFromSetting } from "@/lib/checkout-payments";

const IYZICO_LIVE = "https://api.iyzipay.com";
const IYZICO_SANDBOX = "https://sandbox-api.iyzipay.com";
const INIT_PATH = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
const RETRIEVE_PATH = "/payment/iyzipos/checkoutform/auth/ecom/detail";
const PAYMENT_DETAIL_PATH = "/payment/detail";
const CANCEL_PATH = "/payment/cancel";
const REFUND_PATH = "/payment/refund";
const REFUND_V2_PATH = "/v2/payment/refund";
const FALLBACK_IDENTITY = "11111111111";
const FALLBACK_GSM = "+905555555555";

export type IyzicoBasketLine = {
  id: string;
  name: string;
  category: string;
  priceMinor: number;
};

export type IyzicoAddressInput = {
  contactName: string;
  city: string;
  country: string;
  address: string;
  zipCode?: string | null;
};

export type IyzicoBuyerInput = {
  id: string;
  name: string;
  surname: string;
  email: string;
  identityNumber?: string | null;
  gsmNumber?: string | null;
  registrationAddress: string;
  city: string;
  country: string;
  zipCode?: string | null;
  ip: string;
};

export type IyzicoInitializeResult =
  | { ok: true; token: string; paymentPageUrl: string | null; checkoutFormContent: string | null }
  | { ok: false; error: string };

export type IyzicoRetrieveSuccess = {
  ok: true;
  paymentStatus: string;
  paymentId: string | null;
  conversationId: string | null;
  paidPriceMinor: number | null;
  fraudStatus: number | null;
  mdStatus: number | null;
};

export type IyzicoRetrieveResult = IyzicoRetrieveSuccess | { ok: false; error: string };

type IyzicoCredentials = {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  maxInstallment: number;
};

function formatIyzicoPrice(minor: number): string {
  return (Math.max(0, minor) / 100).toFixed(2);
}

function alignMinors(parts: number[], total: number): number[] {
  if (parts.length === 0) return [total];
  const next = [...parts];
  const sum = next.reduce((acc, value) => acc + value, 0);
  next[next.length - 1] += total - sum;
  return next;
}

export function formatIyzicoGsm(phone: string | null | undefined): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length >= 12) return `+${digits.slice(0, 12)}`;
  if (digits.startsWith("0") && digits.length >= 11) return `+90${digits.slice(1, 11)}`;
  if (digits.length === 10) return `+90${digits}`;
  return FALLBACK_GSM;
}

export function formatIyzicoIdentity(value: string | null | undefined): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 11) return digits;
  return FALLBACK_IDENTITY;
}

export function formatIyzicoCountry(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  const raw = trimmed.toLocaleLowerCase("tr-TR");
  if (!raw || raw === "tr" || raw.includes("türk") || raw.includes("turkey")) return "Turkey";
  return trimmed;
}

function iyzicoAuthorization(apiKey: string, secretKey: string, randomKey: string, uriPath: string, body: string) {
  const signature = crypto.createHmac("sha256", secretKey).update(randomKey + uriPath + body).digest("hex");
  const encoded = Buffer.from(`apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`, "utf8").toString(
    "base64",
  );
  return `IYZWSv2 ${encoded}`;
}

async function iyzicoPost<T>(creds: IyzicoCredentials, path: string, payload: Record<string, unknown>): Promise<T> {
  const body = JSON.stringify(payload);
  const randomKey = `${Date.now()}${crypto.randomBytes(8).toString("hex")}`;
  const response = await fetch(`${creds.baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: iyzicoAuthorization(creds.apiKey, creds.secretKey, randomKey, path, body),
      "x-iyzi-rnd": randomKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body,
  });
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 300) || `iyzico yanıtı okunamadı (${response.status}).`);
  }
}

export function getIyzicoCredentials(settings: Record<string, string>): IyzicoCredentials | null {
  const apiKey = settings.payment_iyzico_api_key?.trim() ?? "";
  const secretKey = settings.payment_iyzico_secret_key?.trim() ?? "";
  if (!apiKey || !secretKey) return null;
  return {
    apiKey,
    secretKey,
    baseUrl: isSettingEnabled(settings, "payment_iyzico_sandbox", true) ? IYZICO_SANDBOX : IYZICO_LIVE,
    maxInstallment: maxInstallmentFromSetting(settings.payment_iyzico_max_installment, 12),
  };
}

function enabledInstallments(maxInstallment: number): number[] | undefined {
  if (maxInstallment < 2) return undefined;
  const values: number[] = [];
  for (let n = 2; n <= maxInstallment; n += 1) values.push(n);
  return values;
}

type IyzicoApiResponse = {
  status?: string;
  errorMessage?: string;
  errorCode?: string;
  token?: string;
  paymentPageUrl?: string;
  checkoutFormContent?: string;
  paymentStatus?: string;
  paymentId?: string | number;
  conversationId?: string;
  paymentConversationId?: string;
  basketId?: string;
  paidPrice?: string | number;
  price?: string | number;
  fraudStatus?: number | string;
  mdStatus?: number | string;
  itemTransactions?: Array<{
    paymentTransactionId?: string | number;
    itemId?: string;
    paidPrice?: string | number;
    price?: string | number;
  }>;
};

function isIyzicoApiSuccess(status: string | undefined): boolean {
  return String(status ?? "").trim().toLowerCase() === "success";
}

function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function paymentStatusKey(value: string): string {
  return value.trim().toUpperCase();
}

export function isIyzicoPaymentDeclined(retrieved: IyzicoRetrieveSuccess): boolean {
  const status = paymentStatusKey(retrieved.paymentStatus);
  if (status === "FAILURE" || status === "FAILED") return true;
  return retrieved.fraudStatus === -1;
}

export function isIyzicoPaymentApproved(retrieved: IyzicoRetrieveSuccess): boolean {
  if (isIyzicoPaymentDeclined(retrieved)) return false;
  if (paymentStatusKey(retrieved.paymentStatus) === "SUCCESS") return true;
  return retrieved.mdStatus === 1;
}

function iyzicoError(data: IyzicoApiResponse, fallback: string): string {
  const code = String(data.errorCode ?? "").trim();
  const message = String(data.errorMessage ?? "").trim();
  switch (code) {
    case "10220":
      return "iyzico iadeyi reddetti (10220). Sandbox test ödemelerinde iptal/iade sık çalışmaz; iyzico paneli → İşlemler → İade Et ile deneyin. Canlıda bu kod bankanın iadeyi reddettiği anlamına gelir.";
    case "10223":
      return "iyzico aynı gün iade için gün sonu beklenmesini istiyor (10223). Yarın tekrar deneyin veya iyzico panelinden iptal edin.";
    case "5213":
      return "iyzico iade sebebi (reason) istiyor (5213). Talep tekrar denenebilir.";
    case "5086":
    case "5087":
      return "iyzico bu ödeme numarasını bu mağazaya ait bulamadı (ortam veya API anahtarı uyuşmuyor).";
    default:
      if (message && code) return `${message} (iyzico ${code})`;
      if (message) return message;
      if (code) return `iyzico ${code}`;
      return fallback;
  }
}

function iyzicoClientIp(ip: string): string {
  const trimmed = ip.trim();
  if (!trimmed || trimmed === "::1" || trimmed.toLowerCase() === "localhost") return "127.0.0.1";
  if (trimmed.toLowerCase().startsWith("::ffff:")) return iyzicoClientIp(trimmed.slice(7));
  if (trimmed.includes(":") && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(trimmed)) return "127.0.0.1";
  return trimmed;
}

export async function initializeIyzicoCheckoutForm(input: {
  settings: Record<string, string>;
  conversationId: string;
  callbackUrl: string;
  paidMinor: number;
  buyer: IyzicoBuyerInput;
  shipping: IyzicoAddressInput;
  billing: IyzicoAddressInput;
  items: IyzicoBasketLine[];
  shippingMinor: number;
}): Promise<IyzicoInitializeResult> {
  const creds = getIyzicoCredentials(input.settings);
  if (!creds) return { ok: false, error: "iyzico anahtarları tanımlı değil." };

  const lines: IyzicoBasketLine[] = [...input.items];
  if (input.shippingMinor > 0) {
    lines.push({
      id: "shipping",
      name: "Kargo",
      category: "Kargo",
      priceMinor: input.shippingMinor,
    });
  }
  const aligned = alignMinors(
    lines.map((line) => line.priceMinor),
    input.paidMinor,
  );
  const basketItems = lines.map((line, index) => ({
    id: line.id.slice(0, 64) || `item-${index + 1}`,
    price: formatIyzicoPrice(aligned[index] ?? 0),
    name: line.name.slice(0, 191) || "Ürün",
    category1: line.category.slice(0, 64) || "Genel",
    itemType: "PHYSICAL" as const,
  }));

  const installments = enabledInstallments(creds.maxInstallment);
  const payload: Record<string, unknown> = {
    locale: "tr",
    conversationId: input.conversationId,
    price: formatIyzicoPrice(input.paidMinor),
    paidPrice: formatIyzicoPrice(input.paidMinor),
    currency: "TRY",
    basketId: input.conversationId,
    paymentGroup: "PRODUCT",
    callbackUrl: input.callbackUrl,
    buyer: {
      id: input.buyer.id.slice(0, 64),
      name: input.buyer.name,
      surname: input.buyer.surname,
      identityNumber: formatIyzicoIdentity(input.buyer.identityNumber),
      email: input.buyer.email,
      gsmNumber: formatIyzicoGsm(input.buyer.gsmNumber),
      registrationAddress: input.buyer.registrationAddress,
      city: input.buyer.city,
      country: formatIyzicoCountry(input.buyer.country),
      zipCode: input.buyer.zipCode || undefined,
      ip: iyzicoClientIp(input.buyer.ip),
    },
    shippingAddress: {
      contactName: input.shipping.contactName,
      city: input.shipping.city,
      country: formatIyzicoCountry(input.shipping.country),
      address: input.shipping.address,
      zipCode: input.shipping.zipCode || undefined,
    },
    billingAddress: {
      contactName: input.billing.contactName,
      city: input.billing.city,
      country: formatIyzicoCountry(input.billing.country),
      address: input.billing.address,
      zipCode: input.billing.zipCode || undefined,
    },
    basketItems,
  };
  if (installments) payload.enabledInstallments = installments;

  try {
    const data = await iyzicoPost<IyzicoApiResponse>(creds, INIT_PATH, payload);
    if (!isIyzicoApiSuccess(data.status) || !data.token) {
      return { ok: false, error: iyzicoError(data, "iyzico ödeme formu başlatılamadı.") };
    }
    return {
      ok: true,
      token: data.token,
      paymentPageUrl: data.paymentPageUrl || null,
      checkoutFormContent: data.checkoutFormContent || null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "iyzico bağlantısı başarısız.";
    return { ok: false, error: message };
  }
}

function majorToMinor(value: string | number | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

function mapRetrieveResponse(data: IyzicoApiResponse, fallbackConversationId?: string): IyzicoRetrieveSuccess {
  return {
    ok: true,
    paymentStatus: String(data.paymentStatus ?? ""),
    paymentId: data.paymentId != null ? String(data.paymentId) : null,
    conversationId:
      data.paymentConversationId?.trim() ||
      data.basketId?.trim() ||
      fallbackConversationId?.trim() ||
      data.conversationId?.trim() ||
      null,
    paidPriceMinor: majorToMinor(data.paidPrice),
    fraudStatus: parseOptionalNumber(data.fraudStatus),
    mdStatus: parseOptionalNumber(data.mdStatus),
  };
}

export async function retrieveIyzicoCheckoutForm(input: {
  settings: Record<string, string>;
  token: string;
  conversationId?: string;
}): Promise<IyzicoRetrieveResult> {
  const creds = getIyzicoCredentials(input.settings);
  if (!creds) return { ok: false, error: "iyzico anahtarları tanımlı değil." };

  const payload: Record<string, unknown> = {
    locale: "tr",
    token: input.token,
  };
  if (input.conversationId) payload.conversationId = input.conversationId;

  try {
    const data = await iyzicoPost<IyzicoApiResponse>(creds, RETRIEVE_PATH, payload);
    if (!isIyzicoApiSuccess(data.status)) {
      return { ok: false, error: iyzicoError(data, "iyzico ödeme sonucu alınamadı.") };
    }
    return mapRetrieveResponse(data, input.conversationId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "iyzico bağlantısı başarısız.";
    return { ok: false, error: message };
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function retrieveIyzicoCheckoutFormWithRetry(input: {
  settings: Record<string, string>;
  token: string;
  conversationId?: string;
}): Promise<IyzicoRetrieveResult> {
  let last: IyzicoRetrieveResult = { ok: false, error: "iyzico ödeme sonucu alınamadı." };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    last = await retrieveIyzicoCheckoutForm(input);
    if (last.ok && (isIyzicoPaymentApproved(last) || isIyzicoPaymentDeclined(last))) {
      return last;
    }
    if (attempt < 2) await sleep(500 * (attempt + 1));
  }
  return last;
}

export async function retrieveIyzicoPaymentByConversationId(input: {
  settings: Record<string, string>;
  conversationId: string;
}): Promise<IyzicoRetrieveResult> {
  const creds = getIyzicoCredentials(input.settings);
  if (!creds) return { ok: false, error: "iyzico anahtarları tanımlı değil." };

  const payload: Record<string, unknown> = {
    locale: "tr",
    conversationId: input.conversationId,
    paymentConversationId: input.conversationId,
  };

  try {
    const data = await iyzicoPost<IyzicoApiResponse>(creds, PAYMENT_DETAIL_PATH, payload);
    if (!isIyzicoApiSuccess(data.status)) {
      return { ok: false, error: iyzicoError(data, "iyzico ödeme kaydı bulunamadı.") };
    }
    return mapRetrieveResponse(data, input.conversationId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "iyzico bağlantısı başarısız.";
    return { ok: false, error: message };
  }
}

export type IyzicoRefundItem = {
  paymentTransactionId: string;
  paidPriceMinor: number;
};

function parseRefundItems(data: IyzicoApiResponse): IyzicoRefundItem[] {
  const rows = data.itemTransactions;
  if (!Array.isArray(rows)) return [];
  const items: IyzicoRefundItem[] = [];
  for (const row of rows) {
    const paymentTransactionId =
      row.paymentTransactionId != null ? String(row.paymentTransactionId).trim() : "";
    const paidPriceMinor = majorToMinor(row.paidPrice) ?? majorToMinor(row.price) ?? 0;
    if (!paymentTransactionId || paidPriceMinor <= 0) continue;
    items.push({ paymentTransactionId, paidPriceMinor });
  }
  return items;
}

export async function retrieveIyzicoPaymentByPaymentId(input: {
  settings: Record<string, string>;
  paymentId: string;
  conversationId?: string;
}): Promise<
  | { ok: true; paymentId: string | null; paidPriceMinor: number | null; items: IyzicoRefundItem[] }
  | { ok: false; error: string }
> {
  const creds = getIyzicoCredentials(input.settings);
  if (!creds) return { ok: false, error: "iyzico anahtarları tanımlı değil." };

  const payload: Record<string, unknown> = {
    locale: "tr",
    paymentId: input.paymentId,
  };
  if (input.conversationId) payload.conversationId = input.conversationId;

  try {
    const data = await iyzicoPost<IyzicoApiResponse>(creds, PAYMENT_DETAIL_PATH, payload);
    if (!isIyzicoApiSuccess(data.status)) {
      return { ok: false, error: iyzicoError(data, "iyzico ödeme kaydı bulunamadı.") };
    }
    return {
      ok: true,
      paymentId: data.paymentId != null ? String(data.paymentId) : input.paymentId,
      paidPriceMinor: majorToMinor(data.paidPrice),
      items: parseRefundItems(data),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "iyzico bağlantısı başarısız.";
    return { ok: false, error: message };
  }
}

const IYZICO_REFUND_REASON = "buyer_requested";

async function cancelIyzicoPayment(input: {
  creds: IyzicoCredentials;
  paymentId: string;
  conversationId: string;
  ip: string;
  note?: string | null;
}): Promise<{ ok: true; refundedMinor: number } | { ok: false; error: string }> {
  const payload: Record<string, unknown> = {
    locale: "tr",
    conversationId: input.conversationId,
    paymentId: input.paymentId,
    ip: iyzicoClientIp(input.ip),
    reason: IYZICO_REFUND_REASON,
  };
  if (input.note?.trim()) payload.description = input.note.trim().slice(0, 200);
  try {
    const data = await iyzicoPost<IyzicoApiResponse>(input.creds, CANCEL_PATH, payload);
    if (!isIyzicoApiSuccess(data.status)) {
      return { ok: false, error: iyzicoError(data, "iyzico iptali başarısız.") };
    }
    return { ok: true, refundedMinor: majorToMinor(data.paidPrice) ?? majorToMinor(data.price) ?? 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "iyzico iptali başarısız.";
    return { ok: false, error: message };
  }
}

async function refundIyzicoItem(input: {
  creds: IyzicoCredentials;
  paymentTransactionId: string;
  conversationId: string;
  amountMinor: number;
  ip: string;
  note?: string | null;
}): Promise<{ ok: true; refundedMinor: number } | { ok: false; error: string }> {
  const payload: Record<string, unknown> = {
    locale: "tr",
    conversationId: input.conversationId,
    paymentTransactionId: input.paymentTransactionId,
    price: formatIyzicoPrice(input.amountMinor),
    currency: "TRY",
    ip: iyzicoClientIp(input.ip),
    reason: IYZICO_REFUND_REASON,
    description: (input.note?.trim() || "Alıcı talebi").slice(0, 200),
  };
  try {
    const data = await iyzicoPost<IyzicoApiResponse>(input.creds, REFUND_PATH, payload);
    if (!isIyzicoApiSuccess(data.status)) {
      return { ok: false, error: iyzicoError(data, "iyzico iadesi başarısız.") };
    }
    return { ok: true, refundedMinor: majorToMinor(data.paidPrice) ?? majorToMinor(data.price) ?? input.amountMinor };
  } catch (error) {
    const message = error instanceof Error ? error.message : "iyzico iadesi başarısız.";
    return { ok: false, error: message };
  }
}

async function refundIyzicoPaymentV2(input: {
  creds: IyzicoCredentials;
  paymentId: string;
  conversationId: string;
  amountMinor: number;
  ip: string;
  note?: string | null;
}): Promise<{ ok: true; refundedMinor: number } | { ok: false; error: string }> {
  const payload: Record<string, unknown> = {
    locale: "tr",
    conversationId: input.conversationId,
    paymentId: input.paymentId,
    price: formatIyzicoPrice(input.amountMinor),
    currency: "TRY",
    ip: iyzicoClientIp(input.ip),
    reason: IYZICO_REFUND_REASON,
    description: (input.note?.trim() || "Alıcı talebi").slice(0, 200),
  };
  try {
    const data = await iyzicoPost<IyzicoApiResponse>(input.creds, REFUND_V2_PATH, payload);
    if (!isIyzicoApiSuccess(data.status)) {
      return { ok: false, error: iyzicoError(data, "iyzico iadesi başarısız.") };
    }
    return { ok: true, refundedMinor: majorToMinor(data.paidPrice) ?? majorToMinor(data.price) ?? input.amountMinor };
  } catch (error) {
    const message = error instanceof Error ? error.message : "iyzico iadesi başarısız.";
    return { ok: false, error: message };
  }
}

export async function refundIyzicoPayment(input: {
  settings: Record<string, string>;
  paymentId: string;
  conversationId: string;
  amountMinor: number;
  ip: string;
  note?: string | null;
  preferCancel: boolean;
}): Promise<{ ok: true; refundedMinor: number } | { ok: false; error: string }> {
  const creds = getIyzicoCredentials(input.settings);
  if (!creds) return { ok: false, error: "iyzico anahtarları tanımlı değil." };
  if (input.amountMinor <= 0) return { ok: false, error: "İade tutarı geçersiz." };

  const detail = await retrieveIyzicoPaymentByPaymentId({
    settings: input.settings,
    paymentId: input.paymentId,
    conversationId: input.conversationId,
  });

  const paidPriceMinor = detail.ok ? detail.paidPriceMinor : null;
  if (input.preferCancel && (paidPriceMinor == null || paidPriceMinor === input.amountMinor)) {
    const canceled = await cancelIyzicoPayment({
      creds,
      paymentId: input.paymentId,
      conversationId: input.conversationId,
      ip: iyzicoClientIp(input.ip),
      note: input.note,
    });
    if (canceled.ok) {
      return { ok: true, refundedMinor: canceled.refundedMinor || input.amountMinor };
    }
  }

  const items = detail.ok ? detail.items : [];
  if (items.length === 0) {
    return refundIyzicoPaymentV2({
      creds,
      paymentId: input.paymentId,
      conversationId: input.conversationId,
      amountMinor: input.amountMinor,
      ip: iyzicoClientIp(input.ip),
      note: input.note,
    });
  }

  let left = input.amountMinor;
  let refunded = 0;
  let lastError = "iyzico iadesi tamamlanamadı.";
  for (const item of items) {
    if (left <= 0) break;
    const chunk = Math.min(left, item.paidPriceMinor);
    const result = await refundIyzicoItem({
      creds,
      paymentTransactionId: item.paymentTransactionId,
      conversationId: input.conversationId,
      amountMinor: chunk,
      ip: iyzicoClientIp(input.ip),
      note: input.note,
    });
    if (!result.ok) {
      lastError = result.error;
      continue;
    }
    refunded += result.refundedMinor;
    left -= result.refundedMinor;
  }

  if (refunded <= 0) return { ok: false, error: lastError };
  return { ok: true, refundedMinor: refunded };
}

export function decodeIyzicoCheckoutHtml(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("<")) return content;
  try {
    return Buffer.from(trimmed, "base64").toString("utf8");
  } catch {
    return content;
  }
}

const IYZICO_CARD_ONLY_INIT = `if(typeof iyziInit!=="undefined"){iyziInit.payWithIyzicoEnabled=false;iyziInit.payWithIyzicoUsed=false;iyziInit.payWithIyzicoLead=false;iyziInit.payWithIyzicoFirstTab=false;iyziInit.payWithIyzicoSingleTab=false;iyziInit.payWithIyzicoSingleTabV2=false;iyziInit.payWithIyzicoOneTab=false;iyziInit.storeNewCardEnabled=false;iyziInit.registerCardEnabled=false;iyziInit.creditEnabled=false;iyziInit.bkmEnabled=false;iyziInit.bankTransferEnabled=false;iyziInit.fundEnabled=false;iyziInit.campaignEnabled=false;iyziInit.buyerProtectionEnabled=false;iyziInit.mixPaymentEnabled=false;iyziInit.subscriptionPaymentEnabled=false;iyziInit.enabledApmTypes=[];iyziInit.creditCardEnabled=true;iyziInit.paymentWithNewCardEnabled=true;}`;

export function restrictIyzicoCheckoutToCard(html: string): string {
  const decoded = decodeIyzicoCheckoutHtml(html);
  if (decoded.includes("iyziInit.createTag()")) {
    return decoded.replace(/iyziInit\.createTag\(\)\s*;/g, `${IYZICO_CARD_ONLY_INIT}iyziInit.createTag();`);
  }
  return `${decoded}<script>${IYZICO_CARD_ONLY_INIT}</script>`;
}
