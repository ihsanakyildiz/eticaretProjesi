import "server-only";

import {
  parseExtraHeaderLines,
  type ApiFeedAuthType,
  type ApiFeedHttpMethod,
  type ApiFeedRequestConfig,
} from "@/lib/api-product-feed-shared";
import {
  capJsonFeedItems,
  detectJsonItemPath,
  extractJsonItems,
  parseJsonDocument,
} from "@/lib/json-product-feed";
import { assertPublicHttpUrl } from "@/lib/public-http-url";
import { XML_FEED_MAX_BYTES, XML_FEED_MAX_ITEMS } from "@/lib/xml-product-feed-shared";

export type ApiFeedFetchAuth = {
  httpMethod: ApiFeedHttpMethod;
  authType: ApiFeedAuthType;
  httpUser?: string | null;
  httpPass?: string | null;
  request: ApiFeedRequestConfig;
};

function applyHeaderAuth(headers: Record<string, string>, auth: ApiFeedFetchAuth) {
  switch (auth.authType) {
    case "NONE":
    case "QUERY":
      return;
    case "BEARER": {
      const token = (auth.httpPass ?? "").trim();
      if (token) headers.Authorization = `Bearer ${token}`;
      return;
    }
    case "BASIC": {
      const user = (auth.httpUser ?? "").trim();
      if (user) {
        headers.Authorization = `Basic ${Buffer.from(`${user}:${auth.httpPass ?? ""}`).toString("base64")}`;
      }
      return;
    }
    case "HEADER": {
      const name = auth.request.authHeader.trim() || "X-API-Key";
      const value = (auth.httpPass ?? "").trim();
      if (value && /^[A-Za-z0-9-]+$/.test(name)) headers[name] = value;
      return;
    }
    default: {
      const _exhaustive: never = auth.authType;
      return _exhaustive;
    }
  }
}

function applyQueryAuth(url: URL, auth: ApiFeedFetchAuth) {
  if (auth.authType !== "QUERY") return url;
  const key = auth.request.authHeader.trim() || "api_key";
  const value = (auth.httpPass ?? "").trim();
  if (!key || !value) return url;
  const next = new URL(url.toString());
  next.searchParams.set(key, value);
  return next;
}

function buildRequestUrl(base: URL, auth: ApiFeedFetchAuth, pageIndex: number | null) {
  const next = new URL(base.toString());
  const pageParam = auth.request.pageParam.trim();
  const sizeParam = auth.request.pageSizeParam.trim();
  if (pageIndex != null && pageParam) next.searchParams.set(pageParam, String(pageIndex));
  if (sizeParam) next.searchParams.set(sizeParam, String(Math.max(1, auth.request.pageSize)));
  return applyQueryAuth(next, auth);
}

async function fetchJsonPage(url: URL, auth: ApiFeedFetchAuth) {
  const withAuth = applyQueryAuth(url, auth);
  const parsed = await assertPublicHttpUrl(withAuth.toString(), "API adresi");
  const headers: Record<string, string> = {
    Accept: "application/json, text/json, */*",
    "User-Agent": "EticaretApiFeed/1.0 (+https://localhost)",
    ...parseExtraHeaderLines(auth.request.extraHeaders),
  };
  applyHeaderAuth(headers, auth);

  const method = auth.httpMethod;
  if (method === "POST") {
    const body = auth.request.requestBody.trim();
    if (body && !headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(parsed.toString(), {
      method,
      headers,
      body: method === "POST" && auth.request.requestBody.trim() ? auth.request.requestBody : undefined,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`API yanıt vermedi (${response.status}).`);
    }
    const length = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(length) && length > XML_FEED_MAX_BYTES) {
      throw new Error("API yanıtı 25 MB sınırını aşıyor.");
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > XML_FEED_MAX_BYTES) {
      throw new Error("API yanıtı 25 MB sınırını aşıyor.");
    }
    return buffer.toString("utf8");
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("API adresi zaman aşımına uğradı.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchApiFeedRaw(url: string, auth: ApiFeedFetchAuth) {
  const parsed = await assertPublicHttpUrl(url.trim(), "API adresi");
  return fetchJsonPage(parsed, auth);
}

export async function fetchApiFeedJson(url: string, auth: ApiFeedFetchAuth) {
  const parsed = await assertPublicHttpUrl(url.trim(), "API adresi");
  const pageStart = auth.request.pageParam.trim()
    ? Number.isFinite(auth.request.pageStart)
      ? auth.request.pageStart
      : 1
    : null;
  return fetchJsonPage(buildRequestUrl(parsed, auth, pageStart), auth);
}

export async function fetchApiFeedItems(
  url: string,
  itemPathInput: string,
  auth: ApiFeedFetchAuth,
): Promise<{ items: Record<string, unknown>[]; itemPath: string }> {
  const parsed = await assertPublicHttpUrl(url.trim(), "API adresi");
  const pageParam = auth.request.pageParam.trim();
  const maxPages = pageParam ? Math.max(1, auth.request.maxPages) : 1;
  const pageStart = Number.isFinite(auth.request.pageStart) ? auth.request.pageStart : 1;
  const pageSize = Math.max(1, auth.request.pageSize);
  const collected: Record<string, unknown>[] = [];
  let itemPath = itemPathInput.trim();

  for (let page = 0; page < maxPages; page += 1) {
    const pageIndex = pageParam ? pageStart + page : null;
    const text = await fetchJsonPage(buildRequestUrl(parsed, auth, pageIndex), auth);
    const root = parseJsonDocument(text);
    if (!itemPath) itemPath = detectJsonItemPath(root);
    const batch = extractJsonItems(root, itemPath);
    if (batch.length === 0) break;
    collected.push(...batch);
    if (collected.length >= XML_FEED_MAX_ITEMS) break;
    if (!pageParam) break;
    if (batch.length < pageSize) break;
  }

  return { items: capJsonFeedItems(collected), itemPath };
}
