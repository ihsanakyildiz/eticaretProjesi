import "server-only";

import type { ApiFeedDiscoveredEndpoint } from "@/lib/api-product-feed-shared";
import { suggestXmlMapping } from "@/lib/xml-product-feed";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function looksLikeOpenApi(value: unknown) {
  if (!isRecord(value)) return false;
  const hasSpec = typeof value.openapi === "string" || typeof value.swagger === "string";
  return hasSpec && isRecord(value.paths);
}

export function looksLikeHtml(text: string) {
  const start = text.slice(0, 400).trim().toLowerCase();
  return (
    start.startsWith("<!doctype") ||
    start.startsWith("<html") ||
    start.includes("<redoc") ||
    start.includes("swagger-ui")
  );
}

export function looksLikeYamlOpenApi(text: string) {
  const start = text.slice(0, 200).trim();
  if (start.startsWith("{") || start.startsWith("[")) return false;
  return /^(openapi|swagger)\s*:/i.test(start);
}

function decodeJsonPointer(segment: string) {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

function resolveRef(doc: Record<string, unknown>, node: unknown, depth = 0): unknown {
  if (!isRecord(node) || depth > 8) return node;
  const ref = node.$ref;
  if (typeof ref !== "string" || !ref.startsWith("#/")) return node;
  let current: unknown = doc;
  for (const raw of ref.slice(2).split("/")) {
    if (!isRecord(current)) return node;
    current = current[decodeJsonPointer(raw)];
  }
  return resolveRef(doc, current, depth + 1);
}

function schemaType(schema: unknown) {
  if (!isRecord(schema)) return "";
  const type = schema.type;
  if (typeof type === "string") return type;
  if (Array.isArray(type) && typeof type[0] === "string") return type[0];
  if (isRecord(schema.items)) return "array";
  if (isRecord(schema.properties)) return "object";
  return "";
}

function schemaPropertyPaths(
  doc: Record<string, unknown>,
  schema: unknown,
  prefix = "",
  depth = 0,
): string[] {
  const resolved = resolveRef(doc, schema);
  if (!isRecord(resolved) || depth > 4) return prefix ? [prefix] : [];
  if (schemaType(resolved) === "array") {
    return schemaPropertyPaths(doc, resolved.items, prefix, depth);
  }
  const props = resolved.properties;
  if (!isRecord(props)) return prefix ? [prefix] : [];
  const paths: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    const next = prefix ? `${prefix}.${key}` : key;
    const child = resolveRef(doc, value);
    if (schemaType(child) === "object" && isRecord(child) && isRecord(child.properties)) {
      paths.push(...schemaPropertyPaths(doc, child, next, depth + 1));
      continue;
    }
    paths.push(next);
    if (schemaType(child) === "array") {
      paths.push(...schemaPropertyPaths(doc, isRecord(child) ? child.items : null, next, depth + 1));
    }
  }
  return [...new Set(paths)];
}

function findItemPath(doc: Record<string, unknown>, schema: unknown, prefix = "", depth = 0): string {
  const resolved = resolveRef(doc, schema);
  if (!isRecord(resolved) || depth > 5) return prefix;
  if (schemaType(resolved) === "array") return prefix;
  const props = resolved.properties;
  if (!isRecord(props)) return prefix;
  const keys = Object.keys(props);
  const preferred = keys.filter((key) => /product|item|data|result|record|payload/i.test(key));
  const rest = keys.filter((key) => !preferred.includes(key));
  for (const key of [...preferred, ...rest]) {
    const next = prefix ? `${prefix}.${key}` : key;
    const child = resolveRef(doc, props[key]);
    if (schemaType(child) === "array") return next;
    if (schemaType(child) === "object") {
      const nested = findItemPath(doc, child, next, depth + 1);
      if (nested !== next) return nested;
    }
  }
  return prefix;
}

function walkSchemaPath(doc: Record<string, unknown>, schema: unknown, path: string): unknown {
  if (!path) return schema;
  let current = schema;
  for (const segment of path.split(".").filter(Boolean)) {
    const resolved = resolveRef(doc, current);
    if (!isRecord(resolved) || !isRecord(resolved.properties)) return current;
    current = resolved.properties[segment];
  }
  return current;
}

function successResponseSchema(doc: Record<string, unknown>, operation: Record<string, unknown>) {
  const responses = operation.responses;
  if (!isRecord(responses)) return null;
  const preferred = ["200", "201", "default", ...Object.keys(responses)];
  for (const code of preferred) {
    const response = resolveRef(doc, responses[code]);
    if (!isRecord(response)) continue;
    const content = response.content;
    if (!isRecord(content)) continue;
    const json =
      content["application/json"] ??
      content["application/vnd.api+json"] ??
      Object.values(content).find(isRecord);
    if (!isRecord(json)) continue;
    const schema = resolveRef(doc, json.schema);
    if (schema) return schema;
  }
  return null;
}

function joinServerUrl(server: string, specUrl: string, path: string) {
  const origin = new URL(specUrl);
  const serverBase = server.trim() || origin.origin;
  const base = serverBase.startsWith("http://") || serverBase.startsWith("https://")
    ? serverBase
    : new URL(serverBase, origin.origin).toString();
  const withSlash = base.endsWith("/") ? base : `${base}/`;
  return new URL(path.replace(/^\//, ""), withSlash).toString();
}

function firstServerUrl(doc: Record<string, unknown>, specUrl: string) {
  const servers = doc.servers;
  if (Array.isArray(servers) && isRecord(servers[0]) && typeof servers[0].url === "string") {
    return servers[0].url;
  }
  if (typeof doc.host === "string") {
    const scheme = Array.isArray(doc.schemes) && typeof doc.schemes[0] === "string" ? doc.schemes[0] : "https";
    const basePath = typeof doc.basePath === "string" ? doc.basePath : "";
    return `${scheme}://${doc.host}${basePath}`;
  }
  return new URL(specUrl).origin;
}

function collectParameters(doc: Record<string, unknown>, operation: Record<string, unknown>, pathItem: Record<string, unknown>) {
  const raw = [...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []), ...(Array.isArray(operation.parameters) ? operation.parameters : [])];
  const names: Array<{ name: string; location: string }> = [];
  for (const item of raw) {
    const resolved = resolveRef(doc, item);
    if (!isRecord(resolved) || typeof resolved.name !== "string") continue;
    names.push({
      name: resolved.name,
      location: typeof resolved.in === "string" ? resolved.in : "",
    });
  }
  return names;
}

function scoreEndpoint(path: string, summary: string, tag: string, method: string, fields: string[]) {
  const hay = `${path} ${summary} ${tag}`.toLowerCase();
  let score = method === "GET" ? 20 : 4;
  if (/product|urun|catalog|listing|goods|item/.test(hay)) score += 35;
  if (/cart|user|auth|login|order|customer|payment/.test(hay)) score -= 45;
  if (/\{[^}]+\}/.test(path)) score -= 50;
  if (fields.length > 0) score += 8;
  const fieldHay = fields.join(" ").toLowerCase();
  if (/\btitle\b|\bname\b/.test(fieldHay)) score += 12;
  if (/\bprice\b|\bfiyat\b/.test(fieldHay)) score += 12;
  if (/\bimage\b|\bphoto\b/.test(fieldHay)) score += 8;
  if (/\bstock\b|\bsku\b|\bbarcode\b/.test(fieldHay)) score += 6;
  return score;
}

export function parseOpenApiEndpoints(doc: unknown, specUrl: string): ApiFeedDiscoveredEndpoint[] {
  if (!looksLikeOpenApi(doc) || !isRecord(doc)) return [];
  const paths = doc.paths;
  if (!isRecord(paths)) return [];
  const server = firstServerUrl(doc, specUrl);
  const endpoints: ApiFeedDiscoveredEndpoint[] = [];

  for (const [path, pathValue] of Object.entries(paths)) {
    if (!isRecord(pathValue) || /\{[^}]+\}/.test(path)) continue;
    for (const method of ["get", "post"] as const) {
      const operation = pathValue[method];
      if (!isRecord(operation)) continue;
      const schema = successResponseSchema(doc, operation);
      const itemPath = schema ? findItemPath(doc, schema) : "";
      const itemSchema = schema
        ? schemaType(resolveRef(doc, schema)) === "array" && isRecord(resolveRef(doc, schema))
          ? (resolveRef(doc, schema) as Record<string, unknown>).items
          : walkSchemaPath(doc, schema, itemPath)
        : null;
      const itemItems =
        schemaType(itemSchema) === "array" && isRecord(itemSchema) ? itemSchema.items : itemSchema;
      const schemaFields = schemaPropertyPaths(doc, itemItems ?? schema);
      const suggestedMapping = suggestXmlMapping(schemaFields);
      const params = collectParameters(doc, operation, pathValue);
      const query = params.filter((item) => item.location === "query");
      const pageSizeParam =
        query.find((item) => /^(limit|per[_-]?page|page[_-]?size|pagesize|size)$/i.test(item.name))?.name ?? "";
      const pageParam =
        query.find((item) => /^(page|page[_-]?number|pagenumber|offset|skip)$/i.test(item.name))?.name ?? "";
      const summary =
        (typeof operation.summary === "string" && operation.summary) ||
        (typeof operation.operationId === "string" && operation.operationId) ||
        `${method.toUpperCase()} ${path}`;
      const tag = Array.isArray(operation.tags) && typeof operation.tags[0] === "string" ? operation.tags[0] : "";
      const httpMethod = method === "post" ? "POST" : "GET";
      const score = scoreEndpoint(path, summary, tag, httpMethod, schemaFields);
      endpoints.push({
        method: httpMethod,
        path,
        url: joinServerUrl(server, specUrl, path),
        summary,
        tag,
        score,
        itemPath,
        suggestedMapping,
        schemaFields: schemaFields.slice(0, 12),
        pageParam,
        pageSizeParam,
        recommended: false,
      });
    }
  }

  endpoints.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
  const best = endpoints[0];
  if (best && best.score >= 30) best.recommended = true;
  return endpoints;
}

export function extractOpenApiSpecUrlFromHtml(html: string, pageUrl: string) {
  const patterns = [
    /spec-url\s*=\s*['"]([^'"]+)['"]/i,
    /["']spec-url["']\s*:\s*["']([^"']+)["']/i,
    /url:\s*['"]([^'"]+(?:openapi|swagger|docs-data)[^'"]*)['"]/i,
    /href\s*=\s*['"]([^'"]*(?:openapi|swagger|docs-data)[^'"]*)['"]/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const raw = match?.[1]?.trim();
    if (!raw) continue;
    try {
      return new URL(raw, pageUrl).toString();
    } catch {
      continue;
    }
  }
  return null;
}

export function wellKnownOpenApiUrls(pageUrl: string) {
  try {
    const origin = new URL(pageUrl).origin;
    return [
      new URL("/docs-data", origin).toString(),
      new URL("/openapi.json", origin).toString(),
      new URL("/swagger.json", origin).toString(),
      new URL("/v3/api-docs", origin).toString(),
    ];
  } catch {
    return [];
  }
}

export function looksLikeDocsUrl(url: string) {
  try {
    return /\/(docs|swagger|redoc|api-docs|documentation)(\/|$|\?)/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export function openApiTitle(doc: unknown) {
  if (!isRecord(doc) || !isRecord(doc.info) || typeof doc.info.title !== "string") return "API dokümantasyonu";
  return doc.info.title;
}
