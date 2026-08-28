import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { JsonLd } from "@/components/site/json-ld";
import { ProjectCard } from "@/components/site/project/project-card";
import { ProjectCategorySidebar } from "@/components/site/project/project-category-sidebar";
import { SiteSidebarPageLayout } from "@/components/site/site-sidebar-layout";
import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { SitePagination } from "@/components/site/site-pagination";
import { prepareRichHtml, stripHtml } from "@/lib/html";
import { buildCollectionJsonLd } from "@/lib/json-ld";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import { buildPublicMetadata, resolveProjectSeo } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";
import {
  PROJECT_CATEGORY_PATH,
  PROJECT_GRID_PAGE_SIZE,
  getCachedProjectCategoryIndex,
  getCachedProjectCategoryPage,
  getCachedProjectCategorySlugs,
  projectCategoryHref,
} from "@/lib/projects";

export const revalidate = 60;
export const dynamicParams = true;

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);

type ProjectCategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sayfa?: string }>;
};

export async function generateStaticParams() {
  const rows = await getCachedProjectCategorySlugs().catch(() => []);
  return rows.map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({
  params,
}: ProjectCategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getCachedProjectCategoryPage(slug).catch(() => null);
  if (!payload) return { title: "Proje Kategorisi" };

  const settings = await getSettingsMap().catch(
    () => ({}) as Record<string, string>,
  );
  const perf = parsePerformance(settings);
  const cover = withCdnUrl(payload.category.image, perf.cdnUrl);
  const seo = resolveProjectSeo({
    title: payload.category.name,
    summary: payload.category.description,
    content: payload.category.content,
    seoTitle: payload.category.seoTitle,
    seoDescription: payload.category.seoDescription,
  });
  const path = projectCategoryHref(payload.category.slug);

  return buildPublicMetadata({
    settings,
    title: seo.seoTitle,
    description: seo.seoDescription,
    path,
    image: cover,
  });
}

export default async function ProjectCategoryPage({
  params,
  searchParams,
}: ProjectCategoryPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const requestedPage = Number.parseInt(query.sayfa ?? "1", 10);
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [payload, categories, settings] = await Promise.all([
    getCachedProjectCategoryPage(slug).catch(() => null),
    getCachedProjectCategoryIndex().catch(() => []),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);

  if (!payload) notFound();

  const { category, projects } = payload;
  const perf = parsePerformance(settings);
  const cover = withCdnUrl(category.image, perf.cdnUrl);
  const lead = stripHtml(category.description);

  if (cover) {
    preload(cover, { as: "image", fetchPriority: "high" });
  }

  const content = prepareRichHtml(category.content, {
    lazyImages: perf.lazyImages,
    lazyIframes: perf.lazyIframes,
    disableThirdParty: perf.disableThirdParty,
  });

  const totalPages = Math.max(
    1,
    Math.ceil(projects.length / PROJECT_GRID_PAGE_SIZE),
  );
  const page = Math.min(currentPage, totalPages);
  const gridProjects = projects.slice(
    (page - 1) * PROJECT_GRID_PAGE_SIZE,
    page * PROJECT_GRID_PAGE_SIZE,
  );

  const pageHref = (target: number) =>
    target <= 1
      ? projectCategoryHref(category.slug)
      : `${projectCategoryHref(category.slug)}?sayfa=${target}`;

  const seo = resolveProjectSeo({
    title: category.name,
    summary: category.description,
    content: category.content,
    seoTitle: category.seoTitle,
    seoDescription: category.seoDescription,
  });
  const path = projectCategoryHref(category.slug);
  const crumbs = [
    { name: "Ana Sayfa", path: "/" },
    { name: "Projeler", path: "/projeler" },
    { name: "Kategoriler", path: PROJECT_CATEGORY_PATH },
    ...(category.parent?.isActive
      ? [{ name: category.parent.name, path: projectCategoryHref(category.parent.slug) }]
      : []),
    { name: category.name, path },
  ];

  return (
    <>
      <JsonLd
        data={buildCollectionJsonLd({
          settings,
          title: seo.seoTitle,
          description: seo.seoDescription,
          path,
          crumbs,
        })}
      />
      <section className="relative overflow-hidden border-b border-site-border bg-site-surface py-14">
        <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-site-primary">
            <SiteLink href="/" className="hover:underline">
              Ana Sayfa
            </SiteLink>
            <span className="mx-2 text-site-muted">›</span>
            <SiteLink href="/projeler" className="hover:underline">
              Projeler
            </SiteLink>
            <span className="mx-2 text-site-muted">›</span>
            <SiteLink href={PROJECT_CATEGORY_PATH} className="hover:underline">
              Kategoriler
            </SiteLink>
            {category.parent?.isActive ? (
              <>
                <span className="mx-2 text-site-muted">›</span>
                <SiteLink
                  href={projectCategoryHref(category.parent.slug)}
                  className="hover:underline"
                >
                  {category.parent.name}
                </SiteLink>
              </>
            ) : null}
            <span className="mx-2 text-site-muted">›</span>
            <span className="text-site-muted">{category.name}</span>
          </nav>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-5xl">
            {category.name}
          </h1>
          {lead ? (
            <p className="mt-3 max-w-2xl text-site-muted">{lead}</p>
          ) : null}
        </div>
      </section>

      <section className="py-14">
        <SiteSidebarPageLayout
          location="PROJECTS_LIST"
          activeSlug={category.slug}
          fallbackSidebar={
            <ProjectCategorySidebar
              categories={categories}
              activeSlug={category.slug}
            />
          }
        >
          {cover ? (
            <div className="relative mb-10 aspect-[21/9] overflow-hidden rounded-[1.75rem] border border-site-border bg-slate-100">
              <SiteImage
                src={cover}
                alt={category.name}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 900px"
              />
            </div>
          ) : null}

          {content.trim() ? (
            <div
              className="site-rich-content mb-12 max-w-3xl"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : null}

          {category.children.length > 0 ? (
            <div className="mb-10 flex flex-wrap gap-2">
              {category.children.map((child) => (
                <SiteLink
                  key={child.id}
                  href={projectCategoryHref(child.slug)}
                  className="inline-flex items-center gap-2 rounded-full border border-site-border bg-site-card px-4 py-2 text-sm font-medium text-site-fg transition hover:border-site-primary/40 hover:text-site-primary"
                >
                  {child.name}
                  <span className="text-xs text-site-muted">
                    {child._count.projects}
                  </span>
                </SiteLink>
              ))}
            </div>
          ) : null}

          {gridProjects.length === 0 ? (
            <p className="py-10 text-sm text-site-muted">
              Bu kategoride henüz yayınlanmış proje yok.
            </p>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                {gridProjects.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={{
                      ...project,
                      image: withCdnUrl(project.image, perf.cdnUrl),
                    }}
                    imagePriority={index === 0 && !cover}
                  />
                ))}
              </div>
              <SitePagination
                currentPage={page}
                totalPages={totalPages}
                hrefForPage={pageHref}
              />
            </>
          )}
        </SiteSidebarPageLayout>
      </section>

      <HomeCta />
    </>
  );
}
