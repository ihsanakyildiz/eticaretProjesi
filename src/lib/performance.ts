import { isSettingEnabled } from "@/lib/settings";

export type SitePerformance = {
  lazyImages: boolean;
  lazyIframes: boolean;
  prefetchLinks: boolean;
  imageQuality: number;
  responsiveImages: boolean;
  webpPriority: boolean;
  showLoadingIndicator: boolean;
  htmlCacheSeconds: number;
  staleWhileRevalidate: boolean;
  assetCacheDays: number;
  fontDisplaySwap: boolean;
  preloadLogo: boolean;
  disableThirdParty: boolean;
  cdnUrl: string;
  productCacheSeconds: number;
  productRelatedLimit: number;
  productGalleryLimit: number;
  productGalleryEager: number;
  productTrackViews: boolean;
  productPreloadImage: boolean;
  checkoutCacheSeconds: number;
  checkoutImageEager: number;
  checkoutPrefetch: boolean;
};

export const DEFAULT_SITE_PERFORMANCE: SitePerformance = {
  lazyImages: true,
  lazyIframes: true,
  prefetchLinks: true,
  imageQuality: 75,
  responsiveImages: true,
  webpPriority: true,
  showLoadingIndicator: true,
  htmlCacheSeconds: 0,
  staleWhileRevalidate: true,
  assetCacheDays: 365,
  fontDisplaySwap: true,
  preloadLogo: true,
  disableThirdParty: false,
  cdnUrl: "",
  productCacheSeconds: 180,
  productRelatedLimit: 8,
  productGalleryLimit: 16,
  productGalleryEager: 1,
  productTrackViews: true,
  productPreloadImage: true,
  checkoutCacheSeconds: 60,
  checkoutImageEager: 2,
  checkoutPrefetch: false,
};

function clampInt(raw: string | undefined, fallback: number, min: number, max: number) {
  const value = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function parsePerformance(
  settings: Record<string, string>,
): SitePerformance {
  return {
    lazyImages: isSettingEnabled(settings, "perf_lazy_images", true),
    lazyIframes: isSettingEnabled(settings, "perf_lazy_iframes", true),
    prefetchLinks: isSettingEnabled(settings, "perf_prefetch_links", true),
    imageQuality: clampInt(settings.perf_image_quality, 75, 1, 100),
    responsiveImages: isSettingEnabled(settings, "perf_responsive_images", true),
    webpPriority: isSettingEnabled(settings, "perf_image_webp", true),
    showLoadingIndicator: isSettingEnabled(
      settings,
      "perf_show_loading_indicator",
      true,
    ),
    htmlCacheSeconds: clampInt(settings.perf_html_cache_seconds, 0, 0, 86_400),
    staleWhileRevalidate: isSettingEnabled(
      settings,
      "perf_stale_while_revalidate",
      true,
    ),
    assetCacheDays: clampInt(settings.perf_asset_cache_days, 365, 1, 730),
    fontDisplaySwap: isSettingEnabled(settings, "perf_font_display_swap", true),
    preloadLogo: isSettingEnabled(settings, "perf_preload_logo", true),
    disableThirdParty: isSettingEnabled(
      settings,
      "perf_disable_third_party",
      false,
    ),
    cdnUrl: (settings.perf_cdn_url || "").replace(/\/$/, ""),
    productCacheSeconds: clampInt(settings.perf_product_cache_seconds, 180, 0, 86_400),
    productRelatedLimit: clampInt(settings.perf_product_related_limit, 8, 0, 24),
    productGalleryLimit: clampInt(settings.perf_product_gallery_limit, 16, 1, 40),
    productGalleryEager: clampInt(settings.perf_product_gallery_eager, 1, 0, 8),
    productTrackViews: isSettingEnabled(settings, "perf_product_track_views", true),
    productPreloadImage: isSettingEnabled(settings, "perf_product_preload_image", true),
    checkoutCacheSeconds: clampInt(settings.perf_checkout_cache_seconds, 60, 0, 600),
    checkoutImageEager: clampInt(settings.perf_checkout_image_eager, 2, 0, 12),
    checkoutPrefetch: isSettingEnabled(settings, "perf_checkout_prefetch", false),
  };
}

export function catalogDataCacheSeconds(perf: SitePerformance): number {
  if (perf.htmlCacheSeconds > 0) return perf.htmlCacheSeconds;
  return 60;
}

export function productDataCacheSeconds(perf: SitePerformance): number {
  if (perf.productCacheSeconds > 0) return perf.productCacheSeconds;
  return catalogDataCacheSeconds(perf);
}

export function checkoutDataCacheSeconds(perf: SitePerformance): number {
  return perf.checkoutCacheSeconds;
}

export function buildHtmlCacheControl(perf: SitePerformance): string | null {
  if (perf.htmlCacheSeconds <= 0) return null;
  const swr = perf.staleWhileRevalidate
    ? `, stale-while-revalidate=${Math.max(perf.htmlCacheSeconds, 60)}`
    : "";
  return `public, s-maxage=${perf.htmlCacheSeconds}${swr}`;
}

export function buildAssetCacheControl(perf: SitePerformance): string {
  const maxAge = perf.assetCacheDays * 86_400;
  const swr = perf.staleWhileRevalidate
    ? `, stale-while-revalidate=${maxAge}`
    : "";
  return `public, max-age=${maxAge}, immutable${swr}`;
}

export function withCdnUrl(path: string | null | undefined, cdnUrl: string): string | null {
  if (!path) return null;
  if (!cdnUrl || /^https?:\/\//i.test(path) || path.startsWith("data:")) {
    return path;
  }
  return `${cdnUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
