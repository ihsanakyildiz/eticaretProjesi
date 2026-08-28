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

export function absoluteUrl(path: string, origin: string) {
  if (!path) return `${origin}/`;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}
