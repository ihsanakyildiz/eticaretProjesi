import "server-only";

import { fetchApiFeedRaw, type ApiFeedFetchAuth } from "@/lib/json-product-feed-fetch";
import { parseJsonDocument } from "@/lib/json-product-feed";
import {
  extractOpenApiSpecUrlFromHtml,
  looksLikeDocsUrl,
  looksLikeHtml,
  looksLikeOpenApi,
  looksLikeYamlOpenApi,
  openApiTitle,
  parseOpenApiEndpoints,
  wellKnownOpenApiUrls,
} from "@/lib/openapi-product-feed";
import type { ApiFeedDiscoveredEndpoint } from "@/lib/api-product-feed-shared";

export type ApiFeedDiscoverResult =
  | { kind: "feed"; text: string }
  | { kind: "openapi"; title: string; specUrl: string; endpoints: ApiFeedDiscoveredEndpoint[] };

function docsNotProductListError() {
  return "Bu adres bir API dokümantasyon sayfası. Ürün listesi JSON’unu veya OpenAPI (Swagger) spec adresini kullanın. Dokümanda “Get all products” örneğindeki URL genelde …/products şeklindedir.";
}

function asOpenApiResult(doc: unknown, specUrl: string): ApiFeedDiscoverResult | null {
  if (!looksLikeOpenApi(doc)) return null;
  const endpoints = parseOpenApiEndpoints(doc, specUrl).filter(
    (item) => item.method === "GET" && item.score >= 0,
  );
  if (endpoints.length === 0) {
    throw new Error("OpenAPI belgesinde listelenebilir GET endpoint bulunamadı.");
  }
  return {
    kind: "openapi",
    title: openApiTitle(doc),
    specUrl,
    endpoints,
  };
}

function inspectAuth(auth: ApiFeedFetchAuth, forceGet: boolean): ApiFeedFetchAuth {
  return {
    ...auth,
    httpMethod: forceGet ? "GET" : auth.httpMethod,
    request: {
      ...auth.request,
      requestBody: forceGet ? "" : auth.request.requestBody,
      pageParam: "",
      pageSizeParam: "",
    },
  };
}

async function fetchMaybeOpenApi(url: string, auth: ApiFeedFetchAuth) {
  const text = await fetchApiFeedRaw(url, auth);
  if (looksLikeYamlOpenApi(text)) {
    throw new Error("Bu OpenAPI belgesi YAML. JSON spec adresini kullanın (ör. /openapi.json veya Redoc spec-url).");
  }
  if (looksLikeHtml(text)) return { text, doc: null as unknown };
  try {
    return { text, doc: parseJsonDocument(text) };
  } catch {
    return { text, doc: null as unknown };
  }
}

export async function discoverApiFeedSource(
  url: string,
  auth: ApiFeedFetchAuth,
): Promise<ApiFeedDiscoverResult> {
  const firstAuth = inspectAuth(auth, looksLikeDocsUrl(url));
  const first = await fetchMaybeOpenApi(url, firstAuth);
  const openapi = asOpenApiResult(first.doc, url);
  if (openapi) return openapi;
  if (!looksLikeHtml(first.text) && first.doc != null) {
    return { kind: "feed", text: first.text };
  }
  if (!looksLikeHtml(first.text)) {
    throw new Error("API JSON döndürmedi. Yanıt JSON olmalı.");
  }

  const candidates: string[] = [];
  const extracted = extractOpenApiSpecUrlFromHtml(first.text, url);
  if (extracted) candidates.push(extracted);
  if (looksLikeDocsUrl(url)) {
    for (const known of wellKnownOpenApiUrls(url)) {
      if (!candidates.includes(known) && known !== url) candidates.push(known);
    }
  }

  for (const specUrl of candidates.slice(0, 4)) {
    try {
      const next = await fetchMaybeOpenApi(specUrl, inspectAuth(auth, true));
      const parsed = asOpenApiResult(next.doc, specUrl);
      if (parsed) return parsed;
    } catch {
      /* diğer spec adayı */
    }
  }

  throw new Error(docsNotProductListError());
}
