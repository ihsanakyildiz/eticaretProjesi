const WASTED_HINT_HOSTS = new Set([
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "googletagmanager.com",
  "google-analytics.com",
  "images.unsplash.com",
]);

export function resourceHintHost(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** next/font kendi dosyasını sunar; GTM ertelenir; Unsplash vitrinde yok. */
export function isWastedFirstPaintHint(href: string) {
  const host = resourceHintHost(href);
  return Boolean(host) && WASTED_HINT_HOSTS.has(host);
}
