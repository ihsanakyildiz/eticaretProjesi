import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { BlogCategorySidebar } from "@/components/site/blog/blog-category-sidebar";
import { BlogPostCard } from "@/components/site/blog/blog-post-card";
import { SiteSidebarPageLayout } from "@/components/site/site-sidebar-layout";
import { JsonLd } from "@/components/site/json-ld";
import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { SitePagination } from "@/components/site/site-pagination";
import {
  BLOG_GRID_PAGE_SIZE,
  getCachedBlogCategoryIndex,
  getCachedBlogListing,
} from "@/lib/blog";
import { stripHtml } from "@/lib/html";
import { buildCollectionJsonLd } from "@/lib/json-ld";
import { buildPublicMetadata, PUBLIC_HUB_SEO } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettingsMap().catch(
    () => ({}) as Record<string, string>,
  );
  return buildPublicMetadata({
    settings,
    ...PUBLIC_HUB_SEO.blog,
  });
}

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);

const GRID_PAGE_SIZE = BLOG_GRID_PAGE_SIZE;

type BlogIndexPageProps = {
  searchParams: Promise<{ sayfa?: string }>;
};

function postHref(slug: string) {
  return `/blog/${slug}`;
}

function pageHref(page: number) {
  return page <= 1 ? "/blog" : `/blog?sayfa=${page}`;
}

export default async function BlogIndexPage({ searchParams }: BlogIndexPageProps) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.sayfa ?? "1", 10);
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [posts, categories, settings] = await Promise.all([
    getCachedBlogListing().catch(() => []),
    getCachedBlogCategoryIndex().catch(() => []),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);

  const lead = posts[0] ?? null;
  const rest = posts.slice(1);
  const totalPages = Math.max(1, Math.ceil(rest.length / GRID_PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const gridPosts = rest.slice((page - 1) * GRID_PAGE_SIZE, page * GRID_PAGE_SIZE);
  const showFeatured = page === 1 && Boolean(lead);

  const hub = PUBLIC_HUB_SEO.blog;

  return (
    <>
      <JsonLd
        data={buildCollectionJsonLd({
          settings,
          title: hub.title,
          description: hub.description,
          path: hub.path,
          crumbs: [
            { name: "Ana Sayfa", path: "/" },
            { name: hub.title, path: hub.path },
          ],
        })}
      />
      <section className="relative overflow-hidden border-b border-site-border bg-site-surface py-14">
        <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-70" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-site-fg sm:text-5xl">
            Son Yazılarımız
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-site-muted">
            Sektörü şekillendiren içgörüler, trendler ve pratik notlar.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-14">
        <SiteSidebarPageLayout
          location="BLOG_LIST"
          fallbackSidebar={<BlogCategorySidebar categories={categories} />}
        >
          {posts.length === 0 ? (
            <p className="py-10 text-sm text-site-muted">
              Henüz yayınlanmış yazı yok.
            </p>
          ) : (
            <>
              {showFeatured && lead ? (
                <article>
                  {lead.category?.name ? (
                    <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      {lead.category.name}
                    </span>
                  ) : null}
                  <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-4xl">
                    <SiteLink
                      href={postHref(lead.slug)}
                      className="hover:text-site-primary"
                    >
                      {lead.title}
                    </SiteLink>
                  </h2>
                  {lead.summary ? (
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-site-muted">
                      {stripHtml(lead.summary)}
                    </p>
                  ) : null}
                  <SiteLink
                    href={postHref(lead.slug)}
                    className="relative mt-6 block aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100"
                  >
                    {lead.image ? (
                      <SiteImage
                        src={lead.image}
                        alt={lead.title}
                        fill
                        priority
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 70vw"
                      />
                    ) : (
                      <span className="absolute inset-0 bg-gradient-to-br from-violet-100 to-slate-100" />
                    )}
                  </SiteLink>
                </article>
              ) : null}

              <div className="relative mt-10 flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[1.75rem] bg-site-primary px-6 py-8 text-white sm:flex-row sm:items-center sm:px-10">
                <div className="pointer-events-none absolute inset-0 opacity-25">
                  <div className="absolute -top-16 -left-10 h-40 w-40 rounded-full bg-fuchsia-300 blur-3xl" />
                  <div className="absolute -right-8 -bottom-16 h-44 w-44 rounded-full bg-indigo-800 blur-3xl" />
                </div>
                <h2 className="relative max-w-xl font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  Ekibimizi büyütüyoruz
                </h2>
                <SiteLink
                  href="/iletisim"
                  className="relative inline-flex items-center gap-2 rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-lime-200"
                >
                  Başvur
                  <ArrowRight className="h-4 w-4" />
                </SiteLink>
              </div>

              <div className="mt-12">
                <h2 className="font-display text-3xl font-bold tracking-tight text-site-fg">
                  Blog
                </h2>
                {gridPosts.length === 0 && page === 1 ? (
                  <p className="mt-10 text-sm text-site-muted">
                    Daha fazla yazı yakında eklenecek.
                  </p>
                ) : (
                  <>
                    <div className="mt-8 grid gap-8 sm:grid-cols-2">
                      {gridPosts.map((post) => (
                        <BlogPostCard key={post.id} post={post} />
                      ))}
                    </div>
                    <SitePagination
                      currentPage={page}
                      totalPages={totalPages}
                      hrefForPage={pageHref}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </SiteSidebarPageLayout>
      </section>

      <HomeCta />
    </>
  );
}
