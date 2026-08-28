import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/json-ld";
import { ProjectCard } from "@/components/site/project/project-card";
import { SiteLink } from "@/components/site/site-link";
import { SitePagination } from "@/components/site/site-pagination";
import { LucideIconByName } from "@/lib/lucide-icons";
import { buildCollectionJsonLd } from "@/lib/json-ld";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import {
  PROJECT_GRID_PAGE_SIZE,
  PROJECT_TAG_PATH,
  getCachedProjectTagPage,
  getCachedProjectTagSlugs,
  projectTagHref,
} from "@/lib/projects";
import { buildPublicMetadata, resolveProjectSeo } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";

export const revalidate = 60;
export const dynamicParams = true;

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);

type ProjectTagPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sayfa?: string }>;
};

export async function generateStaticParams() {
  const rows = await getCachedProjectTagSlugs().catch(() => []);
  return rows.map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({
  params,
}: ProjectTagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getCachedProjectTagPage(slug).catch(() => null);
  if (!payload || payload.projects.length === 0) {
    return { title: "Proje Etiketi" };
  }

  const settings = await getSettingsMap().catch(
    () => ({}) as Record<string, string>,
  );
  const seo = resolveProjectSeo({
    title: `${payload.feature.name} Projeleri`,
    summary:
      payload.feature.description ||
      `${payload.feature.name} teknolojisi / yetkinliği ile tamamladığımız portföy çalışmaları.`,
    seoTitle: null,
    seoDescription: null,
  });

  return buildPublicMetadata({
    settings,
    title: seo.seoTitle,
    description: seo.seoDescription,
    path: projectTagHref(payload.feature.slug),
  });
}

export default async function ProjectTagPage({
  params,
  searchParams,
}: ProjectTagPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const requestedPage = Number.parseInt(query.sayfa ?? "1", 10);
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [payload, settings] = await Promise.all([
    getCachedProjectTagPage(slug).catch(() => null),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);

  if (!payload || payload.projects.length === 0) notFound();

  const { feature, projects } = payload;
  const perf = parsePerformance(settings);
  const seo = resolveProjectSeo({
    title: `${feature.name} Projeleri`,
    summary:
      feature.description ||
      `${feature.name} teknolojisi / yetkinliği ile tamamladığımız portföy çalışmaları.`,
    seoTitle: null,
    seoDescription: null,
  });
  const path = projectTagHref(feature.slug);

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
    target <= 1 ? path : `${path}?sayfa=${target}`;

  return (
    <>
      <JsonLd
        data={buildCollectionJsonLd({
          settings,
          title: seo.seoTitle,
          description: seo.seoDescription,
          path,
          crumbs: [
            { name: "Ana Sayfa", path: "/" },
            { name: "Projeler", path: "/projeler" },
            { name: "Etiketler", path: PROJECT_TAG_PATH },
            { name: feature.name, path },
          ],
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
            <SiteLink href={PROJECT_TAG_PATH} className="hover:underline">
              Etiketler
            </SiteLink>
            <span className="mx-2 text-site-muted">›</span>
            <span className="text-site-muted">{feature.name}</span>
          </nav>
          <div className="mt-6 flex items-start gap-4">
            <span
              className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-site-primary-soft"
              style={{ color: feature.iconColor || undefined }}
            >
              <LucideIconByName
                name={feature.icon ?? "Sparkles"}
                className={`h-6 w-6 ${feature.iconColor ? "" : "text-site-primary"}`}
              />
            </span>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-site-fg sm:text-5xl">
                {feature.name} Projeleri
              </h1>
              <p className="mt-3 max-w-2xl text-site-muted">
                {feature.description ||
                  `${feature.name} ile hayata geçirdiğimiz tasarım ve yazılım çalışmaları.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gridProjects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={{
                  ...project,
                  image: withCdnUrl(project.image, perf.cdnUrl),
                }}
                imagePriority={index === 0}
              />
            ))}
          </div>
          <SitePagination
            currentPage={page}
            totalPages={totalPages}
            hrefForPage={pageHref}
          />
        </div>
      </section>

      <HomeCta />
    </>
  );
}
