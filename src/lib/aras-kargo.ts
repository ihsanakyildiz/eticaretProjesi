import "server-only";

import { XMLParser } from "fast-xml-parser";

export const ARAS_TEST_ORDER_URL = "https://customerservicestest.araskargo.com.tr/arascargoservice.asmx";
export const ARAS_LIVE_ORDER_URL = "https://customerws.araskargo.com.tr/arascargoservice.asmx";
export const ARAS_TEST_QUERY_URL =
  "https://customerservicestest.araskargo.com.tr/ArasCargoCustomerIntegrationService/ArasCargoIntegrationService.svc";
export const ARAS_LIVE_QUERY_URL =
  "https://customerservices.araskargo.com.tr/ArasCargoCustomerIntegrationService/ArasCargoIntegrationService.svc";

const SOAP_NS = "http://tempuri.org/";

export type ArasEnvironment = "test" | "live";

export type ArasApiSettings = {
  provider: "ARAS";
  environment: ArasEnvironment;
  username: string;
  password: string;
  customerCode: string;
};

export type ArasApiPublicView = {
  environment: ArasEnvironment;
  username: string;
  customerCode: string;
  hasPassword: boolean;
};

export type ArasCredentials = {
  username: string;
  password: string;
  environment: ArasEnvironment;
  customerCode: string;
};

export type ArasSoapResult = {
  ok: boolean;
  resultCode: string | null;
  resultMessage: string | null;
  raw: Record<string, unknown>;
};

export type ArasTrackingEvent = {
  at: string | null;
  title: string;
  reason: string | null;
  location: string | null;
};

export type ArasTrackingView = {
  found: boolean;
  pendingPickup: boolean;
  statusLabel: string;
  trackingUrl: string | null;
  docId: string | null;
  events: ArasTrackingEvent[];
  message: string | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  removeNSPrefix: true,
});

export function parseArasEnvironment(value: string): ArasEnvironment {
  const normalized = value.trim().toLowerCase();
  if (normalized === "live") return "live";
  return "test";
}

export function arasOrderServiceUrl(environment: ArasEnvironment) {
  switch (environment) {
    case "test":
      return ARAS_TEST_ORDER_URL;
    case "live":
      return ARAS_LIVE_ORDER_URL;
    default: {
      const _exhaustive: never = environment;
      return _exhaustive;
    }
  }
}

export function arasQueryServiceUrl(environment: ArasEnvironment) {
  switch (environment) {
    case "test":
      return ARAS_TEST_QUERY_URL;
    case "live":
      return ARAS_LIVE_QUERY_URL;
    default: {
      const _exhaustive: never = environment;
      return _exhaustive;
    }
  }
}

export function parseArasApiSettings(raw: string | null | undefined): ArasApiSettings | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ArasApiSettings>;
    if (parsed.provider && parsed.provider !== "ARAS") return null;
    const username = String(parsed.username ?? "").trim();
    const password = String(parsed.password ?? "");
    const customerCode = String(parsed.customerCode ?? "").trim();
    if (!username && !password && !customerCode) return null;
    return {
      provider: "ARAS",
      environment: parseArasEnvironment(String(parsed.environment ?? "test")),
      username,
      password,
      customerCode,
    };
  } catch {
    return null;
  }
}

export function arasApiPublicView(raw: string | null | undefined): ArasApiPublicView {
  const parsed = parseArasApiSettings(raw);
  return {
    environment: parsed?.environment ?? "test",
    username: parsed?.username ?? "",
    customerCode: parsed?.customerCode ?? "",
    hasPassword: Boolean(parsed?.password),
  };
}

export function arasCredentialsReady(settings: ArasApiSettings | null): boolean {
  return Boolean(settings?.username.trim() && settings.password);
}

export function arasQueryCredentialsReady(settings: ArasApiSettings | null): boolean {
  return Boolean(arasCredentialsReady(settings) && settings?.customerCode.trim());
}

export function serializeArasApiSettings(settings: ArasApiSettings): string {
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
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>${inner}</soap:Body>
</soap:Envelope>`;
}

async function arasSoapRequest(input: {
  url: string;
  action: string;
  body: string;
}): Promise<ArasSoapResult> {
  const response = await fetch(input.url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: input.action,
    },
    body: soapEnvelope(input.body),
    cache: "no-store",
  });
  const xml = await response.text();
  if (!response.ok && !xml.trim()) {
    throw new Error(`Aras Kargo HTTP ${response.status}`);
  }

  const parsed = asRecord(parser.parse(xml)) ?? {};
  const fault = deepFind(parsed, "Fault") ?? deepFind(parsed, "faultstring");
  const faultText = textOf(deepFind(asRecord(fault), "faultstring") ?? fault);
  const resultCode = textOf(deepFind(parsed, "ResultCode"));
  const resultMessage =
    textOf(deepFind(parsed, "ResultMessage")) ??
    textOf(deepFind(parsed, "GetQueryJSONResult")) ??
    faultText;

  if (faultText && !resultCode) {
    return { ok: false, resultCode: null, resultMessage: faultText, raw: parsed };
  }

  return {
    ok: !faultText,
    resultCode,
    resultMessage,
    raw: parsed,
  };
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
    text.includes("authentication") ||
    text.includes("login")
  );
}

export function arasPhoneDigits(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  if (last10.length === 10) return `0${last10}`;
  return last10;
}

export function arasCreateAccepted(result: ArasSoapResult) {
  const code = (result.resultCode ?? "").trim();
  const message = (result.resultMessage ?? "").toLocaleLowerCase("tr-TR");
  if (code === "0" || code === "00") return true;
  if (!code && result.ok && !looksLikeAuthFailure(result.resultMessage)) {
    return !message || /başarılı|basarili|success|mevcut|kayıtlı|kayitli|daha önce|daha once/.test(message);
  }
  return /başarılı|basarili|success|mevcut|kayıtlı|kayitli|daha önce|daha once/.test(message);
}

export function arasStatusLabel(code: string | null, fallback: string | null) {
  switch ((code ?? "").trim()) {
    case "1":
      return "Çıkış şubesinde";
    case "2":
      return "Yolda";
    case "3":
      return "Teslimat şubesinde";
    case "4":
      return "Teslimatta";
    case "5":
      return "Parçalı teslimat";
    case "6":
      return "Teslim edildi";
    case "7":
      return "Yönlendirildi";
    default:
      return fallback?.trim() || "Kargo durumu güncelleniyor";
  }
}

function normalizeKey(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function fieldOf(row: Record<string, unknown> | null | undefined, ...names: string[]) {
  if (!row) return null;
  const map = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    map.set(normalizeKey(key), value);
  }
  for (const name of names) {
    const found = map.get(normalizeKey(name));
    const text = textOf(found);
    if (text?.trim()) return text.trim();
  }
  return null;
}

function parseArasDateTime(date: string | null, time?: string | null): string | null {
  if (!date?.trim()) return null;
  const digits = date.replace(/\D/g, "");
  if (digits.length >= 8 && /^\d{8}/.test(digits)) {
    const clock = (time ?? "").replace(/\D/g, "").padEnd(6, "0").slice(0, 6);
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T${clock.slice(0, 2)}:${clock.slice(2, 4)}:${clock.slice(4, 6)}`;
  }
  const parsed = Date.parse(date.replace(" ", "T"));
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

function cargoRowsFromJson(payload: unknown): Record<string, unknown>[] {
  if (!payload) return [];
  if (typeof payload === "string") {
    try {
      return cargoRowsFromJson(JSON.parse(payload));
    } catch {
      return [];
    }
  }
  const record = asRecord(payload);
  if (!record) return [];
  const queryResult = asRecord(record.QueryResult) ?? record;
  return asList(queryResult.Cargo ?? queryResult.cargo ?? queryResult);
}

export type ArasShipmentOrder = {
  integrationCode: string;
  invoiceNumber: string;
  tradingWaybillNumber?: string;
  receiverName: string;
  receiverAddress: string;
  receiverPhone: string;
  cityName?: string;
  townName?: string;
  description?: string;
  pieceCount?: number;
};

export async function arasSetOrder(credentials: ArasCredentials, order: ArasShipmentOrder) {
  const orderXml = [
    xmlTag("UserName", credentials.username),
    xmlTag("Password", credentials.password),
    xmlTag("TradingWaybillNumber", (order.tradingWaybillNumber ?? order.invoiceNumber).slice(0, 30)),
    xmlTag("InvoiceNumber", order.invoiceNumber.slice(0, 30)),
    xmlTag("ReceiverName", order.receiverName.slice(0, 200)),
    xmlTag("ReceiverAddress", order.receiverAddress.slice(0, 250)),
    xmlTag("ReceiverPhone1", order.receiverPhone.slice(0, 20)),
    xmlTag("ReceiverCityName", (order.cityName ?? "").slice(0, 50)),
    xmlTag("ReceiverTownName", (order.townName ?? "").slice(0, 50)),
    xmlTag("PieceCount", String(order.pieceCount ?? 1)),
    xmlTag("IntegrationCode", order.integrationCode.slice(0, 30)),
    xmlTag("Description", (order.description ?? "").slice(0, 255)),
    xmlTag("Country", "TÜRKİYE"),
    xmlTag("CountryCode", "TR"),
    xmlTag("PayorTypeCode", "1"),
    xmlTag("IsWorldWide", "0"),
    xmlTag("IsCod", "0"),
  ].join("");

  const body = `<SetOrder xmlns="${SOAP_NS}">
    <orderInfo>
      <Order>${orderXml}</Order>
    </orderInfo>
    ${xmlTag("userName", credentials.username)}
    ${xmlTag("password", credentials.password)}
  </SetOrder>`;

  return arasSoapRequest({
    url: arasOrderServiceUrl(credentials.environment),
    action: `${SOAP_NS}SetOrder`,
    body,
  });
}

export async function arasCancelDispatch(credentials: ArasCredentials, integrationCode: string) {
  const body = `<CancelDispatch xmlns="${SOAP_NS}">
    ${xmlTag("userName", credentials.username)}
    ${xmlTag("password", credentials.password)}
    ${xmlTag("integrationCode", integrationCode.slice(0, 30))}
  </CancelDispatch>`;
  return arasSoapRequest({
    url: arasOrderServiceUrl(credentials.environment),
    action: `${SOAP_NS}CancelDispatch`,
    body,
  });
}

export async function arasGetCityList(credentials: ArasCredentials) {
  const body = `<GetCityList xmlns="${SOAP_NS}">
    ${xmlTag("username", credentials.username)}
    ${xmlTag("password", credentials.password)}
  </GetCityList>`;
  return arasSoapRequest({
    url: arasOrderServiceUrl(credentials.environment),
    action: `${SOAP_NS}GetCityList`,
    body,
  });
}

export async function arasGetQueryJson(credentials: ArasCredentials, integrationCode: string) {
  const loginInfo = `<LoginInfo>${xmlTag("UserName", credentials.username)}${xmlTag("Password", credentials.password)}${xmlTag("CustomerCode", credentials.customerCode)}</LoginInfo>`;
  const queryInfo = `<QueryInfo>${xmlTag("QueryType", "1")}${xmlTag("IntegrationCode", integrationCode)}</QueryInfo>`;
  const body = `<GetQueryJSON xmlns="${SOAP_NS}">
    ${xmlTag("loginInfo", loginInfo)}
    ${xmlTag("queryInfo", queryInfo)}
  </GetQueryJSON>`;
  return arasSoapRequest({
    url: arasQueryServiceUrl(credentials.environment),
    action: `${SOAP_NS}IArasCargoIntegrationService/GetQueryJSON`,
    body,
  });
}

export async function arasGetCargoInfo(credentials: ArasCredentials, integrationCode: string) {
  const body = `<GetCargoInfo xmlns="${SOAP_NS}">
    ${xmlTag("username", credentials.username)}
    ${xmlTag("password", credentials.password)}
    ${xmlTag("customerCode", credentials.customerCode)}
    ${xmlTag("integrationCode", integrationCode)}
  </GetCargoInfo>`;
  return arasSoapRequest({
    url: arasOrderServiceUrl(credentials.environment),
    action: `${SOAP_NS}GetCargoInfo`,
    body,
  });
}

export async function arasGetCargoTransaction(credentials: ArasCredentials, integrationCode: string) {
  const body = `<GetCargoTransaction xmlns="${SOAP_NS}">
    ${xmlTag("username", credentials.username)}
    ${xmlTag("password", credentials.password)}
    ${xmlTag("code", "")}
    ${xmlTag("integrationCode", integrationCode)}
  </GetCargoTransaction>`;
  return arasSoapRequest({
    url: arasOrderServiceUrl(credentials.environment),
    action: `${SOAP_NS}GetCargoTransaction`,
    body,
  });
}

function eventsFromCargoRow(row: Record<string, unknown>): ArasTrackingEvent[] {
  const exitBranch = fieldOf(row, "CIKIS_SUBE", "ÇIKIŞ ŞUBE", "CikisSube");
  const exitDate = fieldOf(row, "CIKIS_TARIHI", "ÇIKIŞ TARİHİ", "CIKIS TARIH", "CikisTarihi");
  const destBranch = fieldOf(row, "VARIS_SUBE", "VARIŞ ŞUBE", "VarisSube");
  const status = fieldOf(row, "DURUMU", "DURUM", "GONDERI_DURUMU");
  const deliveredTo = fieldOf(row, "TESLIM_ALAN", "TESLİM ALAN");
  const deliveredDate = fieldOf(row, "TESLIM_TARIHI", "TESLİM TARİHİ");
  const deliveredTime = fieldOf(row, "TESLIM_SAATI", "TESLİM SAATİ");
  const reason = fieldOf(row, "SEBEP", "IADE_SEBEBI", "İADE SEBEBİ", "ACIKLAMA");

  const events: ArasTrackingEvent[] = [];
  if (exitBranch || exitDate) {
    events.push({
      at: parseArasDateTime(exitDate),
      title: "Çıkış şubesinde",
      reason: null,
      location: exitBranch,
    });
  }
  if (destBranch && destBranch !== exitBranch) {
    events.push({
      at: null,
      title: "Teslimat şubesinde",
      reason: null,
      location: destBranch,
    });
  }
  if (status) {
    events.push({
      at: parseArasDateTime(deliveredDate, deliveredTime) ?? parseArasDateTime(exitDate),
      title: status,
      reason,
      location: destBranch,
    });
  }
  if (deliveredTo) {
    events.push({
      at: parseArasDateTime(deliveredDate, deliveredTime),
      title: `Teslim edildi · ${deliveredTo}`,
      reason: null,
      location: destBranch,
    });
  }
  return events.filter((event, index, list) => {
    return list.findIndex((rowEvent) => rowEvent.title === event.title && rowEvent.at === event.at) === index;
  });
}

function eventsFromDataset(raw: Record<string, unknown>): ArasTrackingEvent[] {
  const tables = asList(deepFind(raw, "Table") ?? deepFind(raw, "NewDataSet") ?? deepFind(raw, "diffgram"));
  const rows = tables.length > 0 ? tables : asList(deepFind(raw, "WEBCARGODATA13"));
  return rows
    .map((row) => {
      const title =
        fieldOf(row, "ISLEM", "HAREKET", "ACIKLAMA", "DURUM", "ISLEM_ADI", "EVENT") ?? "Kargo hareketi";
      const at = parseArasDateTime(
        fieldOf(row, "TARIH", "ISLEM_TARIHI", "EVENT_DATE", "Tarih"),
        fieldOf(row, "SAAT", "ISLEM_SAATI", "EVENT_TIME"),
      );
      const location = fieldOf(row, "SUBE", "BIRIM", "UNIT", "IL", "CITY");
      const reason = fieldOf(row, "SEBEP", "NEDEN", "ACIKLAMA");
      return {
        at,
        title,
        reason: reason && reason !== title ? reason : null,
        location,
      };
    })
    .sort((left, right) => {
      if (!left.at) return 1;
      if (!right.at) return -1;
      return left.at.localeCompare(right.at);
    });
}

export function parseArasTracking(
  result: ArasSoapResult,
  options?: { publicUrl?: string | null },
): ArasTrackingView {
  const jsonText = textOf(deepFind(result.raw, "GetQueryJSONResult")) ?? result.resultMessage;
  const cargo = cargoRowsFromJson(jsonText)[0] ?? asList(deepFind(result.raw, "GetCargoInfoResult"))[0] ?? null;
  if (!cargo && looksLikeAuthFailure(result.resultMessage)) {
    return {
      found: false,
      pendingPickup: false,
      statusLabel: "Kargo durumu alınamadı",
      trackingUrl: options?.publicUrl ?? null,
      docId: null,
      events: [],
      message: "Aras Kargo kimlik bilgileri reddedildi.",
    };
  }
  if (!cargo) {
    return {
      found: false,
      pendingPickup: true,
      statusLabel: "Aras henüz paketi teslim almadı",
      trackingUrl: options?.publicUrl ?? null,
      docId: null,
      events: [],
      message: "Şube paket barkodunu okuttuğunda kargo hareketleri burada görünür.",
    };
  }

  const statusCode = fieldOf(cargo, "DURUM_KODU", "DURUM KODU");
  const statusText = fieldOf(cargo, "DURUMU", "DURUM", "GONDERI_DURUMU");
  const trackingNo = fieldOf(cargo, "KARGO_TAKIP_NO", "KARGO TAKİP NO", "TRACKINGNUMBER");
  const events = eventsFromCargoRow(cargo);
  const pendingPickup = !statusCode || statusCode === "0" || events.length === 0;

  return {
    found: true,
    pendingPickup,
    statusLabel: arasStatusLabel(statusCode, statusText),
    trackingUrl: options?.publicUrl ?? null,
    docId: trackingNo,
    events,
    message: pendingPickup
      ? "Şube paket barkodunu okuttuğunda kargo hareketleri burada görünür."
      : null,
  };
}

export async function arasQueryTracking(credentials: ArasCredentials, integrationCode: string) {
  let result: ArasSoapResult | null = null;
  if (credentials.customerCode.trim()) {
    result = await arasGetQueryJson(credentials, integrationCode).catch(() => null);
  }
  if (!result?.ok || !textOf(deepFind(result.raw, "GetQueryJSONResult"))) {
    result = await arasGetCargoInfo(credentials, integrationCode);
  }

  const tracking = parseArasTracking(result);
  if (tracking.events.length > 0) return tracking;

  const history = await arasGetCargoTransaction(credentials, integrationCode).catch(() => null);
  if (!history) return tracking;
  const events = eventsFromDataset(history.raw);
  if (events.length === 0) return tracking;
  return {
    ...tracking,
    found: true,
    pendingPickup: false,
    events,
    message: null,
  };
}

export async function testArasConnection(credentials: ArasCredentials) {
  if (!credentials.username.trim() || !credentials.password) {
    return { ok: false as const, error: "Kullanıcı adı ve şifre gerekli." };
  }

  try {
    const cities = await arasGetCityList(credentials);
    if (looksLikeAuthFailure(cities.resultMessage)) {
      return { ok: false as const, error: cities.resultMessage?.trim() || "Kimlik doğrulama reddedildi." };
    }
    if (!cities.ok && cities.resultMessage) {
      return { ok: false as const, error: cities.resultMessage };
    }

    if (credentials.customerCode.trim()) {
      const query = await arasGetQueryJson(credentials, "CONNECTION-TEST").catch(() => null);
      if (query && looksLikeAuthFailure(query.resultMessage)) {
        return {
          ok: false as const,
          error: "Gönderi servisi kabul edildi ancak sorgu (müşteri kodu) reddedildi.",
        };
      }
    }

    return {
      ok: true as const,
      message:
        credentials.environment === "test"
          ? credentials.customerCode.trim()
            ? "Test ortamına bağlanıldı. Kullanıcı adı, şifre ve müşteri kodu kabul edildi."
            : "Test ortamına bağlanıldı. Kullanıcı adı ve şifre kabul edildi. Takip için müşteri kodu da kaydedin."
          : credentials.customerCode.trim()
            ? "Canlı ortama bağlanıldı. Kullanıcı adı, şifre ve müşteri kodu kabul edildi."
            : "Canlı ortama bağlanıldı. Kullanıcı adı ve şifre kabul edildi. Takip için müşteri kodu da kaydedin.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Aras Kargo bağlantısı başarısız.";
    return {
      ok: false as const,
      error: `${message} Test/canlı WSDL’ye erişim ve Aras IP yetkisi gerekir.`,
    };
  }
}
