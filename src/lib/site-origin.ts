const FALLBACK_ORIGIN = "https://www.ihsanakyildiz.com.tr";

export function getSiteOrigin(settings?: Record<string, string>) {
  const raw =
    settings?.site_url?.trim() ||
    process.env.AUTH_URL?.trim() ||
    FALLBACK_ORIGIN;

  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return FALLBACK_ORIGIN;
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return FALLBACK_ORIGIN;
  }
}

export function originFromHeaders(headerStore: Headers, settings?: Record<string, string>) {
  const host = (headerStore.get("x-forwarded-host") || headerStore.get("host") || "")
    .split(",")[0]
    ?.trim();
  if (!host) return getSiteOrigin(settings);
  const protoHeader = (headerStore.get("x-forwarded-proto") || "").split(",")[0]?.trim();
  const proto =
    protoHeader === "http" || protoHeader === "https"
      ? protoHeader
      : host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https";
  return `${proto}://${host}`;
}

export function originFromRequest(request: Request, settings?: Record<string, string>) {
  try {
    const url = new URL(request.url);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return url.origin;
    }
  } catch {
    /* ignore invalid request url */
  }
  return originFromHeaders(request.headers, settings);
}

export function absoluteUrl(path: string, origin: string) {
  if (!path) return `${origin}/`;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}
