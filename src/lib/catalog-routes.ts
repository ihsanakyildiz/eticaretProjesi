import {
  findCatalogBrandRef,
  findCatalogCategoryRef,
  findCatalogProductRef,
} from "@/lib/catalog-products";
import { getSettingsMap } from "@/lib/settings";
import { permanentRedirect } from "next/navigation";
import {
  appendSearchParams,
  joinPublicPath,
  parseUrlStructure,
  publicBrandIndexPath,
  publicCatalogPath,
  publicCategoryIndexPath,
  publicProductBrandHref,
  publicProductCategoryHref,
  publicProductHref,
  type UrlStructure,
} from "@/lib/url-structure";

export async function resolveUrlStructure(): Promise<UrlStructure> {
  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  return parseUrlStructure(settings);
}

function redirectIfNeeded(
  incoming: string,
  canonical: string,
  search?: Record<string, string | string[] | undefined>,
) {
  if (incoming !== canonical) {
    permanentRedirect(appendSearchParams(canonical, search ?? {}));
  }
}

export async function enforceCatalogIndex(
  routeKey: string,
  search?: Record<string, string | string[] | undefined>,
) {
  const urls = await resolveUrlStructure();
  redirectIfNeeded(joinPublicPath(routeKey), publicCatalogPath(urls), search);
  return urls;
}

export async function enforceCategoryIndex(routeKey: string) {
  const urls = await resolveUrlStructure();
  redirectIfNeeded(joinPublicPath(routeKey), publicCategoryIndexPath(urls));
  return urls;
}

export async function enforceCategoryPage(
  routeKey: string,
  slug: string,
  search?: Record<string, string | string[] | undefined>,
  urlId?: number,
) {
  const urls = await resolveUrlStructure();
  const entity = await findCatalogCategoryRef(slug, urlId);
  const canonical = publicProductCategoryHref(entity?.slug ?? slug, urls, entity?.urlId);
  redirectIfNeeded(joinPublicPath(routeKey, slug, urlId), canonical, search);
  return urls;
}

export async function enforceBrandIndex(routeKey: string) {
  const urls = await resolveUrlStructure();
  redirectIfNeeded(joinPublicPath(routeKey), publicBrandIndexPath(urls));
  return urls;
}

export async function enforceBrandPage(
  routeKey: string,
  slug: string,
  search?: Record<string, string | string[] | undefined>,
  urlId?: number,
) {
  const urls = await resolveUrlStructure();
  const entity = await findCatalogBrandRef(slug, urlId);
  const canonical = publicProductBrandHref(entity?.slug ?? slug, urls, entity?.urlId);
  redirectIfNeeded(joinPublicPath(routeKey, slug, urlId), canonical, search);
  return urls;
}

export async function enforceProductPage(routeKey: string, slug: string, urlId?: number) {
  const urls = await resolveUrlStructure();
  const entity = await findCatalogProductRef(slug, urlId);
  const canonical = publicProductHref(entity?.slug ?? slug, urls, entity?.urlId);
  redirectIfNeeded(joinPublicPath(routeKey, slug, urlId), canonical);
  return urls;
}

export async function enforceResolvedCategory(
  pathname: string,
  slug: string,
  urlId: number | undefined,
  search?: Record<string, string | string[] | undefined>,
) {
  const urls = await resolveUrlStructure();
  const entity = await findCatalogCategoryRef(slug, urlId);
  if (!entity) return { urls, slug };
  const canonical = publicProductCategoryHref(entity.slug, urls, entity.urlId);
  redirectIfNeeded(pathname, canonical, search);
  return { urls, slug: entity.slug };
}

export async function enforceResolvedBrand(
  pathname: string,
  slug: string,
  urlId: number | undefined,
  search?: Record<string, string | string[] | undefined>,
) {
  const urls = await resolveUrlStructure();
  const entity = await findCatalogBrandRef(slug, urlId);
  if (!entity) return { urls, slug };
  const canonical = publicProductBrandHref(entity.slug, urls, entity.urlId);
  redirectIfNeeded(pathname, canonical, search);
  return { urls, slug: entity.slug };
}

export async function enforceResolvedProduct(pathname: string, slug: string, urlId?: number) {
  const urls = await resolveUrlStructure();
  const entity = await findCatalogProductRef(slug, urlId);
  if (!entity) return { urls, slug };
  const canonical = publicProductHref(entity.slug, urls, entity.urlId);
  redirectIfNeeded(pathname, canonical);
  return { urls, slug: entity.slug };
}
