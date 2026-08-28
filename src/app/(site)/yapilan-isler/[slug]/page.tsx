import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { WorkDetailView } from "@/components/site/work/work-detail-view";
import { JsonLd } from "@/components/site/json-ld";
import { SiteSidebarRenderer } from "@/components/site/site-sidebar-slot";
import { prepareRichHtml } from "@/lib/html";
import { buildServiceJsonLd } from "@/lib/json-ld";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import { buildPublicMetadata, resolveWorkSeo } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";
import { getSidebarByLocation } from "@/lib/site-sidebars";
import {
  getCachedFallbackWorkSkills,
  getCachedWorkBySlug,
  workCategoryHref,
} from "@/lib/works";

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);

export const revalidate = 60;
export const dynamicParams = true;

type WorkDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: WorkDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const work = await getCachedWorkBySlug(slug).catch(() => null);
  if (!work) return { title: "Çalışma" };

  const settings = await getSettingsMap().catch(
    () => ({}) as Record<string, string>,
  );
  const perf = parsePerformance(settings);
  const cover = withCdnUrl(work.image, perf.cdnUrl);
  const seo = resolveWorkSeo({
    title: work.title,
    summary: work.summary,
    content: work.content,
    seoTitle: work.seoTitle,
    seoDescription: work.seoDescription,
  });
  const path = `/yapilan-isler/${work.slug}`;

  return buildPublicMetadata({
    settings,
    title: seo.seoTitle,
    description: seo.seoDescription,
    path,
    image: cover,
    ogType: "article",
    modifiedTime: work.updatedAt,
  });
}

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { slug } = await params;

  const [work, settings, cmsSidebar] = await Promise.all([
    getCachedWorkBySlug(slug),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
    getSidebarByLocation("WORKS_DETAIL"),
  ]);

  if (!work) notFound();

  const skillMap = new Map<
    string,
    {
      id: string;
      name: string;
      description?: string | null;
      icon?: string | null;
    }
  >();

  for (const project of work.projects) {
    for (const feature of project.features) {
      if (!skillMap.has(feature.id)) {
        skillMap.set(feature.id, feature);
      }
    }
  }

  let skills = Array.from(skillMap.values()).slice(0, 8);

  if (skills.length === 0) {
    skills = await getCachedFallbackWorkSkills().catch(() => []);
  }

  const perf = parsePerformance(settings);
  const cover = withCdnUrl(work.image, perf.cdnUrl);

  if (cover) {
    preload(cover, { as: "image", fetchPriority: "high" });
  }

  const content = prepareRichHtml(work.content, {
    lazyImages: perf.lazyImages,
    lazyIframes: perf.lazyIframes,
    disableThirdParty: perf.disableThirdParty,
  });

  const seo = resolveWorkSeo({
    title: work.title,
    summary: work.summary,
    content: work.content,
    seoTitle: work.seoTitle,
    seoDescription: work.seoDescription,
  });
  const path = `/yapilan-isler/${work.slug}`;

  return (
    <>
      <JsonLd
        data={buildServiceJsonLd({
          settings,
          title: seo.seoTitle,
          description: seo.seoDescription,
          path,
          image: cover,
          crumbs: [
            { name: "Ana Sayfa", path: "/" },
            { name: "Yapılan İşler", path: "/yapilan-isler" },
            ...(work.category
              ? [
                  {
                    name: work.category.name,
                    path: workCategoryHref(work.category.slug),
                  },
                ]
              : []),
            { name: work.title, path },
          ],
        })}
      />
      <WorkDetailView
        title={work.title}
        summary={work.summary}
        content={content}
        image={cover}
        categoryName={work.category?.name ?? null}
        categorySlug={work.category?.slug ?? null}
        phone={settings.contact_phone || ""}
        email={settings.contact_email || ""}
        address={settings.contact_address || ""}
        disableThirdParty={perf.disableThirdParty}
        social={{
          facebook: settings.social_facebook || undefined,
          twitter: settings.social_twitter || undefined,
          instagram: settings.social_instagram || undefined,
          linkedin: settings.social_linkedin || undefined,
        }}
        skills={skills}
        relatedProjects={work.projects.map((project) => ({
          id: project.id,
          title: project.title,
          slug: project.slug,
          summary: project.summary,
          image: withCdnUrl(project.image, perf.cdnUrl),
        }))}
        sidebar={
          cmsSidebar ? (
            <SiteSidebarRenderer sidebar={cmsSidebar} embedded />
          ) : undefined
        }
        sidebarPlacement={cmsSidebar?.placement ?? "RIGHT"}
      />
      <HomeCta />
    </>
  );
}
