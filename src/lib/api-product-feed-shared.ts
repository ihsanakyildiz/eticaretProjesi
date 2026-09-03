import {
  emptyXmlFeedForm,
  feedToForm,
  type XmlFeedFormValues,
  type XmlProductFeedSummary,
} from "@/lib/xml-product-feed-shared";

export const API_FEED_HTTP_METHODS = ["GET", "POST"] as const;
export type ApiFeedHttpMethod = (typeof API_FEED_HTTP_METHODS)[number];

export const API_FEED_AUTH_TYPES = ["NONE", "BEARER", "BASIC", "HEADER", "QUERY"] as const;
export type ApiFeedAuthType = (typeof API_FEED_AUTH_TYPES)[number];

export type ApiFeedRequestConfig = {
  authHeader: string;
  extraHeaders: string;
  requestBody: string;
  pageParam: string;
  pageSizeParam: string;
  pageSize: number;
  pageStart: number;
  maxPages: number;
};

export type ApiFeedDiscoveredEndpoint = {
  method: "GET" | "POST";
  path: string;
  url: string;
  summary: string;
  tag: string;
  score: number;
  itemPath: string;
  suggestedMapping: XmlFeedFormValues["mapping"];
  schemaFields: string[];
  pageParam: string;
  pageSizeParam: string;
  recommended: boolean;
};

export type ApiFeedFormValues = XmlFeedFormValues & {
  httpMethod: ApiFeedHttpMethod;
  authType: ApiFeedAuthType;
} & ApiFeedRequestConfig;

export type ApiProductFeedSummary = XmlProductFeedSummary & {
  httpMethod: ApiFeedHttpMethod;
  authType: ApiFeedAuthType;
} & ApiFeedRequestConfig;

export function isApiFeedHttpMethod(value: string): value is ApiFeedHttpMethod {
  return (API_FEED_HTTP_METHODS as readonly string[]).includes(value);
}

export function isApiFeedAuthType(value: string): value is ApiFeedAuthType {
  return (API_FEED_AUTH_TYPES as readonly string[]).includes(value);
}

export function apiFeedHttpMethodLabel(value: ApiFeedHttpMethod) {
  switch (value) {
    case "GET":
      return "GET";
    case "POST":
      return "POST";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function apiFeedAuthTypeLabel(value: ApiFeedAuthType) {
  switch (value) {
    case "NONE":
      return "Yok";
    case "BEARER":
      return "Bearer token";
    case "BASIC":
      return "HTTP Basic";
    case "HEADER":
      return "Özel header";
    case "QUERY":
      return "URL parametresi";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function emptyApiFeedRequestConfig(): ApiFeedRequestConfig {
  return {
    authHeader: "",
    extraHeaders: "",
    requestBody: "",
    pageParam: "",
    pageSizeParam: "",
    pageSize: 100,
    pageStart: 1,
    maxPages: 20,
  };
}

export function emptyApiFeedForm(): ApiFeedFormValues {
  return {
    ...emptyXmlFeedForm(),
    httpMethod: "GET",
    authType: "NONE",
    ...emptyApiFeedRequestConfig(),
  };
}

function asPositiveInt(value: unknown, fallback: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(max, Math.max(0, Math.floor(parsed)));
}

export function parseApiFeedRequestJson(raw: string): ApiFeedRequestConfig {
  const empty = emptyApiFeedRequestConfig();
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return empty;
    const record = parsed as Record<string, unknown>;
    return {
      authHeader: typeof record.authHeader === "string" ? record.authHeader : "",
      extraHeaders: typeof record.extraHeaders === "string" ? record.extraHeaders : "",
      requestBody: typeof record.requestBody === "string" ? record.requestBody : "",
      pageParam: typeof record.pageParam === "string" ? record.pageParam : "",
      pageSizeParam: typeof record.pageSizeParam === "string" ? record.pageSizeParam : "",
      pageSize: asPositiveInt(record.pageSize, empty.pageSize, 1000) || empty.pageSize,
      pageStart: asPositiveInt(record.pageStart, empty.pageStart, 10000),
      maxPages: asPositiveInt(record.maxPages, empty.maxPages, 500) || empty.maxPages,
    };
  } catch {
    return empty;
  }
}

export function serializeApiFeedRequestJson(values: ApiFeedRequestConfig) {
  return JSON.stringify({
    authHeader: values.authHeader.trim().slice(0, 191),
    extraHeaders: values.extraHeaders.slice(0, 4000),
    requestBody: values.requestBody.slice(0, 20_000),
    pageParam: values.pageParam.trim().slice(0, 80),
    pageSizeParam: values.pageSizeParam.trim().slice(0, 80),
    pageSize: asPositiveInt(values.pageSize, 100, 1000) || 100,
    pageStart: asPositiveInt(values.pageStart, 1, 10000),
    maxPages: asPositiveInt(values.maxPages, 20, 500) || 20,
  });
}

export function parseExtraHeaderLines(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf(":");
    if (index <= 0) continue;
    const name = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!name || !value) continue;
    if (!/^[A-Za-z0-9-]+$/.test(name)) continue;
    headers[name] = value.slice(0, 1000);
  }
  return headers;
}

export function apiFeedToForm(feed: ApiProductFeedSummary): ApiFeedFormValues {
  const base = feedToForm(feed);
  return {
    ...base,
    httpMethod: feed.httpMethod,
    authType: feed.authType,
    authHeader: feed.authHeader,
    extraHeaders: feed.extraHeaders,
    requestBody: feed.requestBody,
    pageParam: feed.pageParam,
    pageSizeParam: feed.pageSizeParam,
    pageSize: feed.pageSize,
    pageStart: feed.pageStart,
    maxPages: feed.maxPages,
  };
}

export function apiFeedMatchByLabel(value: ApiProductFeedSummary["matchBy"]) {
  switch (value) {
    case "BARCODE":
      return "Barkod";
    case "SKU":
      return "SKU";
    case "PRODUCT_CODE":
      return "Ürün kodu";
    case "PRODUCT_ID":
      return "API ürün ID";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}
