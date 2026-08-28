import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { JsonLd } from "@/components/site/json-ld";
import { BlogPostCard } from "@/components/site/blog/blog-post-card";
import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { SitePagination } from "@/components/site/site-pagination";
import {
  BLOG_CATEGORY_PATH,
  BLOG_GRID_PAGE_SIZE,
  blogCategoryHref,
  getCachedBlogCategoryPage,
  getCachedBlogCategorySlugs,
} from "@/lib/blog";
import { prepareRichHtml, stripHtml } from "@/lib/html";
import { buildCollectionJsonLd } from "@/lib/json-ld";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import { buildPublicMetadata, resolveBlogSeo } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";

export const revalidate = 60;
export const dynamicParams = true;

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);

type BlogCategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sayfa?: string }>;
};

export async function generateStaticParams() {
  const rows = await getCachedBlogCategorySlugs().catch(() => []);
  return rows.map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({
  params,
}: BlogCategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getCachedBlogCategoryPage(slug).catch(() => null);
  if (!payload) return { title: "Blog Kategorisi" };

  const settings = await getSettingsMap().catch(
    () => ({}) as Record<string, string>,
  );
  const perf = parsePerformance(settings);
  const cover = withCdnUrl(payload.category.image, perf.cdnUrl);
  const seo = resolveBlogSeo({
    title: payload.category.name,
    summary: payload.category.description,
    content: payload.category.content,
    seoTitle: payload.category.seoTitle,
    seoDescription: payload.category.seoDescription,
  });
  const path = blogCategoryHref(payload.category.slug);

  return buildPublicMetadata({
    settings,
    title: seo.seoTitle,
    description: seo.seoDescription,
    path,
    image: cover,
  });
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: BlogCategoryPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const requestedPage = Number.parseInt(query.sayfa ?? "1", 10);
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [payload, settings] = await Promise.all([
    getCachedBlogCategoryPage(slug).catch(() => null),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);

  if (!payload) notFound();

  const { category, posts } = payload;
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

  const totalPages = Math.max(1, Math.ceil(posts.length / BLOG_GRID_PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const gridPosts = posts.slice(
    (page - 1) * BLOG_GRID_PAGE_SIZE,
    page * BLOG_GRID_PAGE_SIZE,
  );

  const pageHref = (target: number) =>
    target <= 1
      ? blogCategoryHref(category.slug)
      : `${blogCategoryHref(category.slug)}?sayfa=${target}`;

  const seo = resolveBlogSeo({
    title: category.name,
    summary: category.description,
    content: category.content,
    seoTitle: category.seoTitle,
    seoDescription: category.seoDescription,
  });
  const path = blogCategoryHref(category.slug);
  const crumbs = [
    { name: "Ana Sayfa", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: "Kategoriler", path: BLOG_CATEGORY_PATH },
    ...(category.parent?.isActive
      ? [{ name: category.parent.name, path: blogCategoryHref(category.parent.slug) }]
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
        <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-70" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-site-primary">
            <SiteLink href="/" className="hover:underline">
              Ana Sayfa
            </SiteLink>
            <span className="mx-2 text-site-muted">›</span>
            <SiteLink href="/blog" className="hover:underline">
              Blog
            </SiteLink>
            <span className="mx-2 text-site-muted">›</span>
            <SiteLink href={BLOG_CATEGORY_PATH} className="hover:underline">
              Kategoriler
            </SiteLink>
            {category.parent?.isActive ? (
              <>
                <span className="mx-2 text-site-muted">›</span>
                <SiteLink
                  href={blogCategoryHref(category.parent.slug)}
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {cover ? (
            <div className="relative mb-10 aspect-[21/9] overflow-hidden rounded-[1.75rem] border border-site-border bg-slate-100">
              <SiteImage
                src={cover}
                alt={category.name}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 1200px"
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
                  href={blogCategoryHref(child.slug)}
                  className="inline-flex items-center gap-2 rounded-full border border-site-border bg-site-card px-4 py-2 text-sm font-medium text-site-fg transition hover:border-site-primary/40 hover:text-site-primary"
                >
                  {child.name}
                  <span className="text-xs text-site-muted">
                    {child._count.posts}
                  </span>
                </SiteLink>
              ))}
            </div>
          ) : null}

          {gridPosts.length === 0 ? (
            <p className="py-10 text-center text-sm text-site-muted">
              Bu kategoride henüz yayınlanmış yazı yok.
            </p>
          ) : (
            <>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {gridPosts.map((post, index) => (
                  <BlogPostCard
                    key={post.id}
                    post={{
                      ...post,
                      image: withCdnUrl(post.image, perf.cdnUrl),
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
        </div>
      </section>

      <HomeCta />
    </>
  );
}
