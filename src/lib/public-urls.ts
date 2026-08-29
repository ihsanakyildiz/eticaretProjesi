import {
  publicProductBrandHref as brandHref,
  publicProductCategoryHref as categoryHref,
  publicProductHref as productHref,
  type UrlStructure,
} from "@/lib/url-structure";

export function publicPageHref(slug: string) {
  return slug === "anasayfa" ? "/" : `/${slug}`;
}

export function publicBlogPostHref(slug: string) {
  return `/blog/${slug}`;
}

export function publicBlogCategoryHref(slug: string) {
  return `/blog/kategori/${slug}`;
}

export function publicWorkHref(slug: string) {
  return `/yapilan-isler/${slug}`;
}

export function publicWorkCategoryHref(slug: string) {
  return `/yapilan-isler/kategori/${slug}`;
}

export function publicProjectHref(slug: string) {
  return `/projeler/${slug}`;
}

export function publicProjectCategoryHref(slug: string) {
  return `/projeler/kategori/${slug}`;
}

export function publicProjectTagHref(slug: string) {
  return `/projeler/etiket/${slug}`;
}

export function publicPricingPlanHref(slug: string) {
  return `/paket/${slug}`;
}

export function publicProductCategoryHref(
  slug: string,
  structure?: UrlStructure,
  urlId?: number | null,
) {
  return categoryHref(slug, structure, urlId);
}

export function publicProductBrandHref(
  slug: string,
  structure?: UrlStructure,
  urlId?: number | null,
) {
  return brandHref(slug, structure, urlId);
}

export function publicProductHref(
  slug: string,
  structure?: UrlStructure,
  urlId?: number | null,
) {
  return productHref(slug, structure, urlId);
}
