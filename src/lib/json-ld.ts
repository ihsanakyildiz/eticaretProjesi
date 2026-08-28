import { stripHtml } from "@/lib/html";
import { absoluteUrl, getSiteOrigin } from "@/lib/site-origin";

export type HomeFaqJsonItem = {
  question: string;
  answer: string;
};

function sameAsFromSettings(settings: Record<string, string>) {
  return [
    settings.social_facebook,
    settings.social_instagram,
    settings.social_twitter,
    settings.social_linkedin,
    settings.social_youtube,
    settings.social_github,
  ]
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item) && /^https?:\/\//i.test(item));
}

function toE164Like(phone?: string) {
  if (!phone) return undefined;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("90")) return `+${digits}`;
  if (digits.startsWith("0")) return `+90${digits.slice(1)}`;
  return digits;
}

export function buildHomeJsonLd(input: {
  settings: Record<string, string>;
  title: string;
  description: string;
  faqs?: HomeFaqJsonItem[];
}) {
  const origin = getSiteOrigin(input.settings);
  const siteName = input.settings.site_name || "İhsan Akyıldız";
  const logo = input.settings.site_logo
    ? absoluteUrl(input.settings.site_logo, origin)
    : absoluteUrl("/apple-touch-icon.png", origin);
  const ogImage = input.settings.seo_og_image
    ? absoluteUrl(input.settings.seo_og_image, origin)
    : undefined;
  const email = input.settings.contact_email?.trim() || undefined;
  const telephone = toE164Like(input.settings.contact_phone);
  const address = input.settings.contact_address?.trim();
  const sameAs = sameAsFromSettings(input.settings);
  const orgId = `${origin}/#organization`;
  const websiteId = `${origin}/#website`;
  const webpageId = `${origin}/#webpage`;

  const organization = {
    "@type": ["Organization", "ProfessionalService"],
    "@id": orgId,
    name: siteName,
    url: `${origin}/`,
    logo: {
      "@type": "ImageObject",
      url: logo,
    },
    image: ogImage || logo,
    description: input.description,
    email,
    telephone,
    address: address
      ? {
          "@type": "PostalAddress",
          streetAddress: address,
          addressCountry: "TR",
        }
      : undefined,
    areaServed: {
      "@type": "Country",
      name: "Türkiye",
    },
    sameAs: sameAs.length ? sameAs : undefined,
    knowsAbout: ["Web tasarım", "Yazılım geliştirme", "Kurumsal web sitesi", "E-ticaret"],
  };

  const website = {
    "@type": "WebSite",
    "@id": websiteId,
    url: `${origin}/`,
    name: siteName,
    inLanguage: "tr-TR",
    publisher: { "@id": orgId },
  };

  const webpage = {
    "@type": "WebPage",
    "@id": webpageId,
    url: `${origin}/`,
    name: input.title,
    description: input.description,
    inLanguage: "tr-TR",
    isPartOf: { "@id": websiteId },
    about: { "@id": orgId },
    primaryImageOfPage: ogImage
      ? { "@type": "ImageObject", url: ogImage }
      : undefined,
  };

  const graph: Record<string, unknown>[] = [organization, website, webpage];

  const faqEntities = (input.faqs ?? [])
    .map((item) => ({
      question: item.question.trim(),
      answer: stripHtml(item.answer).trim(),
    }))
    .filter((item) => item.question && item.answer);

  if (faqEntities.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${origin}/#faq`,
      mainEntity: faqEntities.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export type SeoCrumb = { name: string; path: string };

function graphJsonLd(nodes: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

export function buildBreadcrumbNode(origin: string, crumbs: SeoCrumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path, origin),
    })),
  };
}

export function buildCollectionJsonLd(input: {
  settings: Record<string, string>;
  title: string;
  description: string;
  path: string;
  crumbs: SeoCrumb[];
}) {
  const origin = getSiteOrigin(input.settings);
  const url = absoluteUrl(input.path, origin);
  return graphJsonLd([
    buildBreadcrumbNode(origin, input.crumbs),
    {
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      url,
      name: input.title,
      description: input.description,
      inLanguage: "tr-TR",
      isPartOf: { "@id": `${origin}/#website` },
    },
  ]);
}

export function buildWebPageJsonLd(input: {
  settings: Record<string, string>;
  title: string;
  description: string;
  path: string;
  crumbs: SeoCrumb[];
  image?: string | null;
}) {
  const origin = getSiteOrigin(input.settings);
  const url = absoluteUrl(input.path, origin);
  const image = input.image ? absoluteUrl(input.image, origin) : undefined;
  return graphJsonLd([
    buildBreadcrumbNode(origin, input.crumbs),
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: input.title,
      description: input.description,
      inLanguage: "tr-TR",
      isPartOf: { "@id": `${origin}/#website` },
      primaryImageOfPage: image
        ? { "@type": "ImageObject", url: image }
        : undefined,
    },
  ]);
}

export function buildServiceJsonLd(input: {
  settings: Record<string, string>;
  title: string;
  description: string;
  path: string;
  crumbs: SeoCrumb[];
  image?: string | null;
}) {
  const origin = getSiteOrigin(input.settings);
  const url = absoluteUrl(input.path, origin);
  const image = input.image ? absoluteUrl(input.image, origin) : undefined;
  const siteName = input.settings.site_name || "İhsan Akyıldız";
  return graphJsonLd([
    buildBreadcrumbNode(origin, input.crumbs),
    {
      "@type": "Service",
      "@id": `${url}#service`,
      name: input.title,
      description: input.description,
      url,
      image,
      provider: { "@id": `${origin}/#organization` },
      areaServed: { "@type": "Country", name: "Türkiye" },
      brand: { "@type": "Brand", name: siteName },
    },
  ]);
}

export function buildCreativeWorkJsonLd(input: {
  settings: Record<string, string>;
  title: string;
  description: string;
  path: string;
  crumbs: SeoCrumb[];
  image?: string | null;
  dateModified?: Date | string | null;
}) {
  const origin = getSiteOrigin(input.settings);
  const url = absoluteUrl(input.path, origin);
  const image = input.image ? absoluteUrl(input.image, origin) : undefined;
  return graphJsonLd([
    buildBreadcrumbNode(origin, input.crumbs),
    {
      "@type": "CreativeWork",
      "@id": `${url}#work`,
      name: input.title,
      description: input.description,
      url,
      image,
      inLanguage: "tr-TR",
      dateModified: input.dateModified
        ? new Date(input.dateModified).toISOString()
        : undefined,
      creator: { "@id": `${origin}/#organization` },
    },
  ]);
}

export function buildBlogPostingJsonLd(input: {
  settings: Record<string, string>;
  title: string;
  description: string;
  path: string;
  crumbs: SeoCrumb[];
  image?: string | null;
  datePublished?: Date | string | null;
  dateModified?: Date | string | null;
  categoryName?: string | null;
}) {
  const origin = getSiteOrigin(input.settings);
  const url = absoluteUrl(input.path, origin);
  const image = input.image ? absoluteUrl(input.image, origin) : undefined;
  const siteName = input.settings.site_name || "İhsan Akyıldız";
  return graphJsonLd([
    buildBreadcrumbNode(origin, input.crumbs),
    {
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      headline: input.title,
      description: input.description,
      url,
      image,
      inLanguage: "tr-TR",
      datePublished: input.datePublished
        ? new Date(input.datePublished).toISOString()
        : undefined,
      dateModified: input.dateModified
        ? new Date(input.dateModified).toISOString()
        : undefined,
      author: { "@type": "Organization", name: siteName, url: `${origin}/` },
      publisher: { "@id": `${origin}/#organization` },
      articleSection: input.categoryName || undefined,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    },
  ]);
}
