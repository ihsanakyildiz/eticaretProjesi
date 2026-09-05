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

export function preferHttpForLoopback(origin: string) {
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.protocol = "http:";
      return url.origin;
    }
    return url.origin;
  } catch {
    return origin;
  }
}

function isLoopbackHost(host: string) {
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

export function originFromHeaders(headerStore: Headers, settings?: Record<string, string>) {
  const host = (headerStore.get("x-forwarded-host") || headerStore.get("host") || "")
    .split(",")[0]
    ?.trim();
  if (!host) return getSiteOrigin(settings);
  const protoHeader = (headerStore.get("x-forwarded-proto") || "").split(",")[0]?.trim();
  const proto = isLoopbackHost(host)
    ? "http"
    : protoHeader === "http" || protoHeader === "https"
      ? protoHeader
      : "https";
  return `${proto}://${host}`;
}

export function originFromRequest(request: Request, settings?: Record<string, string>) {
  const forwarded = originFromHeaders(request.headers, settings);
  try {
    const forwardedHost = new URL(forwarded).hostname;
    if (forwardedHost && !isLoopbackHost(forwardedHost)) {
      return forwarded;
    }
  } catch {
    /* ignore invalid forwarded origin */
  }
  try {
    const url = new URL(request.url);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.protocol = "http:";
      return url.origin;
    }
  } catch {
    /* ignore invalid request url */
  }
  return preferHttpForLoopback(forwarded);
}

export function absoluteUrl(path: string, origin: string) {
  if (!path) return `${origin}/`;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}
