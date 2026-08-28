import type { Metadata } from "next";
import { stripHtml } from "@/lib/html";
import { absoluteUrl, getSiteOrigin } from "@/lib/site-origin";

/** Google SERP için önerilen üst sınırlar */
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function clampSeoText(value: string, maxLength: number) {
  return value.slice(0, maxLength);
}

/** Kelime ortasında kesmeden güvenli kısaltma (otomatik üretim için) */
export function truncateSeoText(value: string, maxLength: number) {
  const text = collapseWhitespace(value);
  if (text.length <= maxLength) return text;

  const sliced = text.slice(0, maxLength + 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const base = lastSpace > maxLength * 0.6 ? sliced.slice(0, lastSpace) : text.slice(0, maxLength);
  return `${base.trimEnd()}…`.slice(0, maxLength);
}

export type ResolveWorkSeoInput = {
  title: string;
  summary?: string | null;
  content?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type ResolvedWorkSeo = {
  seoTitle: string;
  seoDescription: string;
  titleAuto: boolean;
  descriptionAuto: boolean;
};

/**
 * Admin SEO alanlarını boş bırakırsa başlık + kısa özettten (yoksa içerikten) üretir.
 * Manuel değerler karakter limitine zorlanır.
 */
export function resolveWorkSeo(input: ResolveWorkSeoInput): ResolvedWorkSeo {
  const title = collapseWhitespace(input.title);
  const manualTitle = clampSeoText(collapseWhitespace(input.seoTitle ?? ""), SEO_TITLE_MAX);
  const manualDescription = clampSeoText(
    collapseWhitespace(input.seoDescription ?? ""),
    SEO_DESCRIPTION_MAX,
  );

  const summaryText = stripHtml(input.summary);
  const contentText = stripHtml(input.content);
  const autoDescriptionSource = summaryText || contentText || title;

  const seoTitle = manualTitle || truncateSeoText(title, SEO_TITLE_MAX);
  const seoDescription =
    manualDescription || truncateSeoText(autoDescriptionSource, SEO_DESCRIPTION_MAX);

  return {
    seoTitle: clampSeoText(seoTitle, SEO_TITLE_MAX),
    seoDescription: clampSeoText(seoDescription, SEO_DESCRIPTION_MAX),
    titleAuto: !manualTitle,
    descriptionAuto: !manualDescription,
  };
}

/** Projeler için aynı SEO üretim kuralları */
export const resolveProjectSeo = resolveWorkSeo;
export type ResolveProjectSeoInput = ResolveWorkSeoInput;

/** Blog yazıları için aynı SEO üretim kuralları */
export const resolveBlogSeo = resolveWorkSeo;
export type ResolveBlogSeoInput = ResolveWorkSeoInput;

/** Klasik sayfalar için aynı SEO üretim kuralları */
export const resolvePageSeo = resolveWorkSeo;
export type ResolvePageSeoInput = ResolveWorkSeoInput;

export function resolveHomeMetadata(settings: Record<string, string>, advanced?: {
  seoTitle?: string | null;
  seoDescription?: string | null;
  title?: string | null;
}): Metadata {
  const origin = getSiteOrigin(settings);
  const siteName = settings.site_name || "İhsan Akyıldız";
  const title =
    clampSeoText(
      collapseWhitespace(
        advanced?.seoTitle ||
          settings.seo_title ||
          `${siteName} | Web Tasarım & Yazılım`,
      ),
      SEO_TITLE_MAX,
    );
  const description = truncateSeoText(
    collapseWhitespace(
      advanced?.seoDescription ||
        settings.seo_description ||
        settings.site_description ||
        "Web tasarım, yazılım geliştirme ve dijital çözümler.",
    ),
    SEO_DESCRIPTION_MAX,
  );
  const ogImage = settings.seo_og_image
    ? absoluteUrl(settings.seo_og_image, origin)
    : undefined;
  const canonical = `${origin}/`;

  return {
    title: { absolute: title },
    description,
    keywords: settings.seo_keywords
      ? settings.seo_keywords.split(",").map((item) => item.trim()).filter(Boolean)
      : undefined,
    applicationName: siteName,
    authors: [{ name: siteName, url: canonical }],
    creator: siteName,
    publisher: siteName,
    category: "technology",
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: canonical,
      siteName,
      title,
      description,
      images: ogImage
        ? [{ url: ogImage, width: 1200, height: 630, alt: siteName }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    verification: settings.google_site_verification
      ? { google: settings.google_site_verification }
      : undefined,
  };
}

export const PUBLIC_HUB_SEO = {
  projects: {
    title: "Projeler",
    description: "Tasarım ve yazılım portföyümüzden seçilmiş web ve dijital projeler.",
    path: "/projeler",
  },
  projectCategories: {
    title: "Proje Kategorileri",
    description: "Çalışma alanlarımıza göre tamamladığımız projeleri keşfedin.",
    path: "/projeler/kategori",
  },
  projectTags: {
    title: "Proje Etiketleri",
    description: "Teknoloji ve yetkinlik etiketlerine göre portföy projelerimizi inceleyin.",
    path: "/projeler/etiket",
  },
  works: {
    title: "Hizmetler ve Yapılan İşler",
    description: "Web tasarım, yazılım ve dijital hizmet çalışmalarımız.",
    path: "/yapilan-isler",
  },
  workCategories: {
    title: "Hizmet Kategorileri",
    description: "Hizmet ve çalışma kategorilerimizi inceleyin.",
    path: "/yapilan-isler/kategori",
  },
  blog: {
    title: "Blog",
    description: "Web tasarım, yazılım ve dijital pazarlama üzerine yazılar.",
    path: "/blog",
  },
  blogCategories: {
    title: "Blog Kategorileri",
    description: "Konularına göre blog yazılarımızı keşfedin.",
    path: "/blog/kategori",
  },
} as const;

export function buildPublicMetadata(input: {
  settings: Record<string, string>;
  title: string;
  description: string;
  path: string;
  image?: string | null;
  ogType?: "website" | "article";
  publishedTime?: Date | string | null;
  modifiedTime?: Date | string | null;
}): Metadata {
  const origin = getSiteOrigin(input.settings);
  const siteName = input.settings.site_name || "İhsan Akyıldız";
  const title = clampSeoText(collapseWhitespace(input.title), SEO_TITLE_MAX);
  const description = truncateSeoText(
    collapseWhitespace(input.description),
    SEO_DESCRIPTION_MAX,
  );
  const canonical = absoluteUrl(input.path, origin);
  const image = input.image
    ? absoluteUrl(input.image, origin)
    : input.settings.seo_og_image
      ? absoluteUrl(input.settings.seo_og_image, origin)
      : undefined;
  const ogType = input.ogType ?? "website";

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: ogType,
      locale: "tr_TR",
      url: canonical,
      siteName,
      title,
      description,
      images: image ? [{ url: image, alt: title }] : undefined,
      publishedTime: input.publishedTime
        ? new Date(input.publishedTime).toISOString()
        : undefined,
      modifiedTime: input.modifiedTime
        ? new Date(input.modifiedTime).toISOString()
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

