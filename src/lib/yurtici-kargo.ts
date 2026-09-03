import "server-only";

import { XMLParser } from "fast-xml-parser";

export const YURTICI_TEST_URL =
  "http://testwebservices.yurticikargo.com:9090/KOPSWebServices/ShippingOrderDispatcherServices";
export const YURTICI_LIVE_URL =
  "https://ws.yurticikargo.com/KOPSWebServices/ShippingOrderDispatcherServices";

const SOAP_NS = "http://yurticikargo.com.tr/ShippingOrderDispatcherServices";

export type YurticiEnvironment = "test" | "live";
export type YurticiLanguage = "TR" | "EN";

export type YurticiApiSettings = {
  provider: "YURTICI";
  environment: YurticiEnvironment;
  username: string;
  password: string;
  language: YurticiLanguage;
};

export type YurticiApiPublicView = {
  environment: YurticiEnvironment;
  username: string;
  language: YurticiLanguage;
  hasPassword: boolean;
};

export type YurticiCredentials = {
  username: string;
  password: string;
  environment: YurticiEnvironment;
  language: YurticiLanguage;
};

export type YurticiSoapResult = {
  ok: boolean;
  outFlag: string | null;
  outResult: string | null;
  raw: Record<string, unknown>;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  removeNSPrefix: true,
});

export function parseYurticiEnvironment(value: string): YurticiEnvironment {
  const normalized = value.trim().toLowerCase();
  if (normalized === "live") return "live";
  return "test";
}

export function parseYurticiLanguage(value: string): YurticiLanguage {
  const normalized = value.trim().toUpperCase();
  if (normalized === "EN") return "EN";
  return "TR";
}

export function yurticiServiceUrl(environment: YurticiEnvironment): string {
  switch (environment) {
    case "test":
      return YURTICI_TEST_URL;
    case "live":
      return YURTICI_LIVE_URL;
    default: {
      const _exhaustive: never = environment;
      return _exhaustive;
    }
  }
}

export function parseYurticiApiSettings(raw: string | null | undefined): YurticiApiSettings | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<YurticiApiSettings>;
    if (parsed.provider && parsed.provider !== "YURTICI") return null;
    const username = String(parsed.username ?? "").trim();
    const password = String(parsed.password ?? "");
    if (!username && !password) return null;
    return {
      provider: "YURTICI",
      environment: parseYurticiEnvironment(String(parsed.environment ?? "test")),
      username,
      password,
      language: parseYurticiLanguage(String(parsed.language ?? "TR")),
    };
  } catch {
    return null;
  }
}

export function yurticiApiPublicView(raw: string | null | undefined): YurticiApiPublicView {
  const parsed = parseYurticiApiSettings(raw);
  return {
    environment: parsed?.environment ?? "test",
    username: parsed?.username ?? "",
    language: parsed?.language ?? "TR",
    hasPassword: Boolean(parsed?.password),
  };
}

export function yurticiCredentialsReady(settings: YurticiApiSettings | null): boolean {
  return Boolean(settings?.username.trim() && settings.password);
}

export function serializeYurticiApiSettings(settings: YurticiApiSettings): string {
  return JSON.stringify(settings);
}

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function xmlTag(name: string, value: string | number | boolean) {
  return `<${name}>${xmlEscape(String(value))}</${name}>`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return asRecord(value[0]);
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

function asList(value: unknown): Record<string, unknown>[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map((row) => asRecord(row))
      .filter((row): row is Record<string, unknown> => Boolean(row));
  }
  const one = asRecord(value);
  return one ? [one] : [];
}

function deepFind(value: unknown, key: string): unknown {
  const record = asRecord(value);
  if (!record) return undefined;
  if (key in record) return record[key];
  for (const child of Object.values(record)) {
    const found = deepFind(child, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

function textOf(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const record = asRecord(value);
  if (!record) return null;
  if ("#text" in record) return textOf(record["#text"]);
  return null;
}

function soapEnvelope(inner: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ship="${SOAP_NS}">
  <soapenv:Header/>
  <soapenv:Body>${inner}</soapenv:Body>
</soapenv:Envelope>`;
}

async function yurticiSoapRequest(
  credentials: YurticiCredentials,
  action: string,
  body: string,
): Promise<YurticiSoapResult> {
  const url = yurticiServiceUrl(credentials.environment);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: action,
    },
    body: soapEnvelope(body),
    cache: "no-store",
  });
  const xml = await response.text();
  if (!response.ok && !xml.trim()) {
    throw new Error(`Yurtiçi Kargo HTTP ${response.status}`);
  }

  const parsed = asRecord(parser.parse(xml)) ?? {};
  const fault = deepFind(parsed, "Fault") ?? deepFind(parsed, "faultstring");
  const faultText = textOf(deepFind(asRecord(fault), "faultstring") ?? fault);
  const outFlag = textOf(deepFind(parsed, "outFlag"));
  const outResult = textOf(deepFind(parsed, "outResult")) ?? faultText;

  if (faultText && !outFlag) {
    return { ok: false, outFlag: null, outResult: faultText, raw: parsed };
  }

  return {
    ok: outFlag === "0" || outFlag === "2" ? outFlag === "0" : !faultText,
    outFlag,
    outResult,
    raw: parsed,
  };
}

function authXml(credentials: YurticiCredentials, languageTag: "userLanguage" | "wsLanguage") {
  return `${xmlTag("wsUserName", credentials.username)}${xmlTag("wsPassword", credentials.password)}${xmlTag(languageTag, credentials.language)}`;
}

export async function yurticiQueryShipment(
  credentials: YurticiCredentials,
  input: { keys: string; keyType?: 0 | 1; addHistoricalData?: boolean; onlyTracking?: boolean },
): Promise<YurticiSoapResult> {
  const body = `<ship:queryShipment>
    ${authXml(credentials, "wsLanguage")}
    ${xmlTag("keys", input.keys)}
    ${xmlTag("keyType", input.keyType ?? 0)}
    ${xmlTag("addHistoricalData", input.addHistoricalData ?? false)}
    ${xmlTag("onlyTracking", input.onlyTracking ?? true)}
  </ship:queryShipment>`;
  return yurticiSoapRequest(credentials, "queryShipment", body);
}

export async function yurticiCancelShipment(
  credentials: YurticiCredentials,
  cargoKeys: string,
): Promise<YurticiSoapResult> {
  const body = `<ship:cancelShipment>
    ${authXml(credentials, "userLanguage")}
    ${xmlTag("cargoKeys", cargoKeys)}
  </ship:cancelShipment>`;
  return yurticiSoapRequest(credentials, "cancelShipment", body);
}

export type YurticiShipmentOrder = {
  cargoKey: string;
  invoiceKey: string;
  receiverCustName: string;
  receiverAddress: string;
  receiverPhone1: string;
  cityName?: string;
  townName?: string;
  emailAddress?: string;
  cargoCount?: number;
  desi?: number;
  kg?: number;
  description?: string;
  waybillNo?: string;
};

export async function yurticiCreateShipment(
  credentials: YurticiCredentials,
  order: YurticiShipmentOrder,
): Promise<YurticiSoapResult> {
  const shippingOrder = [
    xmlTag("cargoKey", order.cargoKey.slice(0, 20)),
    xmlTag("invoiceKey", order.invoiceKey.slice(0, 20)),
    xmlTag("receiverCustName", order.receiverCustName.slice(0, 200)),
    xmlTag("receiverAddress", order.receiverAddress.slice(0, 200)),
    xmlTag("receiverPhone1", order.receiverPhone1.slice(0, 20)),
    xmlTag("cityName", (order.cityName ?? "").slice(0, 40)),
    xmlTag("townName", (order.townName ?? "").slice(0, 40)),
    xmlTag("emailAddress", (order.emailAddress ?? "").slice(0, 200)),
    xmlTag("cargoCount", order.cargoCount ?? 1),
    xmlTag("desi", order.desi ?? ""),
    xmlTag("kg", order.kg ?? ""),
    xmlTag("description", (order.description ?? "").slice(0, 255)),
    xmlTag("waybillNo", (order.waybillNo ?? "").slice(0, 20)),
  ].join("");

  const body = `<ship:createShipment>
    ${authXml(credentials, "userLanguage")}
    <ShippingOrderVO>${shippingOrder}</ShippingOrderVO>
  </ship:createShipment>`;
  return yurticiSoapRequest(credentials, "createShipment", body);
}

function looksLikeAuthFailure(message: string | null) {
  if (!message) return false;
  const text = message.toLocaleLowerCase("tr-TR");
  return (
    text.includes("kullanıcı") ||
    text.includes("sifre") ||
    text.includes("şifre") ||
    text.includes("password") ||
    text.includes("username") ||
    text.includes("yetki") ||
    text.includes("unauthorized") ||
    text.includes("authentication")
  );
}

export type YurticiTrackingEvent = {
  at: string | null;
  title: string;
  reason: string | null;
  location: string | null;
};

export type YurticiTrackingView = {
  found: boolean;
  pendingPickup: boolean;
  statusLabel: string;
  trackingUrl: string | null;
  docId: string | null;
  events: YurticiTrackingEvent[];
  message: string | null;
};

export function yurticiResultField(result: YurticiSoapResult, key: string): string | null {
  return textOf(deepFind(result.raw, key));
}

export function yurticiCreateAccepted(result: YurticiSoapResult) {
  const errCode = yurticiResultField(result, "errCode");
  if (errCode === "0" || errCode === "60020") return true;
  if (result.outFlag === "0" && (!errCode || errCode === "0")) return true;
  return false;
}

export function yurticiPhoneDigits(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function yurticiOperationLabel(code: string | null, fallback: string | null) {
  switch (code) {
    case "0":
    case "NOP":
      return "Kargo henüz işlem görmedi";
    case "1":
    case "IND":
      return "Kargo teslimatta";
    case "2":
    case "ISR":
      return "Kargo işlem gördü, fatura bekleniyor";
    case "3":
    case "CNL":
      return "Kargo çıkışı engellendi";
    case "4":
    case "ISC":
      return "Kargo iptal edildi";
    case "5":
    case "DLV":
      return "Kargo teslim edildi";
    case "6":
    case "BI":
      return "Fatura şube tarafından iptal edildi";
    default:
      return fallback?.trim() || "Kargo durumu güncelleniyor";
  }
}

function parseYkDateTime(date: string | null, time: string | null): string | null {
  const day = date?.replace(/\D/g, "") ?? "";
  if (day.length < 8) return null;
  const clock = (time ?? "").replace(/\D/g, "").padEnd(6, "0").slice(0, 6);
  return `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T${clock.slice(0, 2)}:${clock.slice(2, 4)}:${clock.slice(4, 6)}`;
}

export function parseYurticiTracking(result: YurticiSoapResult): YurticiTrackingView {
  const details = asList(deepFind(result.raw, "shippingDeliveryDetailVO"));
  const detail = details[0] ?? null;
  const errCode = textOf(detail?.errCode) ?? yurticiResultField(result, "errCode");
  const errMessage = textOf(detail?.errMessage) ?? result.outResult;
  const pendingPickup = errCode === "82519" || errCode === "82526";

  if (pendingPickup || !detail) {
    return {
      found: false,
      pendingPickup: true,
      statusLabel: "Yurtiçi henüz paketi teslim almadı",
      trackingUrl: null,
      docId: null,
      events: [],
      message: "Şube paket barkodunu okuttuğunda kargo hareketleri burada görünür.",
    };
  }

  const item = asRecord(detail.shippingDeliveryItemDetailVO);
  const operationCode = textOf(detail.operationCode) ?? textOf(item?.operationCode);
  const operationStatus = textOf(detail.operationStatus) ?? textOf(item?.operationStatus);
  const operationMessage = textOf(detail.operationMessage) ?? textOf(item?.operationMessage);
  const events = asList(item?.invDocCargoVOArray)
    .map((row) => {
      const city = textOf(row.cityName);
      const town = textOf(row.townName);
      const unit = textOf(row.unitName);
      const location = [unit, [town, city].filter(Boolean).join(" / ")].filter(Boolean).join(" · ");
      return {
        at: parseYkDateTime(textOf(row.eventDate), textOf(row.eventTime)),
        title: textOf(row.eventName)?.trim() || "Kargo hareketi",
        reason: textOf(row.reasonName),
        location: location || null,
      };
    })
    .sort((left, right) => {
      if (!left.at) return 1;
      if (!right.at) return -1;
      return left.at.localeCompare(right.at);
    });

  const statusLabel = yurticiOperationLabel(operationCode ?? operationStatus, operationMessage);
  const waitingForPickup =
    events.length === 0 &&
    (operationCode === "0" || operationCode === "NOP" || operationCode == null);

  return {
    found: errCode === "0" || errCode == null,
    pendingPickup: waitingForPickup,
    statusLabel,
    trackingUrl: textOf(item?.trackingUrl),
    docId: textOf(item?.docId),
    events,
    message: waitingForPickup
      ? "Şube paket barkodunu okuttuğunda kargo hareketleri burada görünür."
      : errCode && errCode !== "0"
        ? errMessage
        : null,
  };
}

export async function yurticiQueryTracking(credentials: YurticiCredentials, cargoKey: string) {
  const result = await yurticiQueryShipment(credentials, {
    keys: cargoKey,
    keyType: 0,
    addHistoricalData: true,
    onlyTracking: false,
  });
  return parseYurticiTracking(result);
}

export async function testYurticiConnection(credentials: YurticiCredentials) {
  if (!credentials.username.trim() || !credentials.password) {
    return { ok: false as const, error: "Kullanıcı adı ve şifre gerekli." };
  }

  try {
    const result = await yurticiQueryShipment(credentials, {
      keys: "CONNECTION-TEST",
      keyType: 0,
      addHistoricalData: false,
      onlyTracking: true,
    });
    if (looksLikeAuthFailure(result.outResult)) {
      return { ok: false as const, error: result.outResult?.trim() || "Kimlik doğrulama reddedildi." };
    }
    return {
      ok: true as const,
      message:
        credentials.environment === "test"
          ? "Test ortamına bağlanıldı. Kullanıcı adı ve şifre kabul edildi."
          : "Canlı ortama bağlanıldı. Kullanıcı adı ve şifre kabul edildi.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yurtiçi Kargo bağlantısı başarısız.";
    return {
      ok: false as const,
      error: `${message} Test/canlı WSDL’ye erişim ve Yurtiçi BT IP yetkisi gerekir.`,
    };
  }
}
