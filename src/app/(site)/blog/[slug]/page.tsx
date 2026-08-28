import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { BlogPostDetailView } from "@/components/site/blog/blog-post-detail";
import { JsonLd } from "@/components/site/json-ld";
import { SiteSidebarRenderer } from "@/components/site/site-sidebar-slot";
import { getCachedBlogDetailPayload, blogCategoryHref } from "@/lib/blog";
import { prepareRichHtml } from "@/lib/html";
import { buildBlogPostingJsonLd } from "@/lib/json-ld";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import { buildPublicMetadata, resolveBlogSeo } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";
import { getSidebarByLocation } from "@/lib/site-sidebars";

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);

export const revalidate = 60;
export const dynamicParams = true;

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getCachedBlogDetailPayload(slug).catch(() => null);
  if (!payload) return { title: "Blog" };

  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const perf = parsePerformance(settings);
  const cover = withCdnUrl(payload.post.image, perf.cdnUrl);
  const seo = resolveBlogSeo({
    title: payload.post.title,
    summary: payload.post.summary,
    content: payload.post.content,
    seoTitle: payload.post.seoTitle,
    seoDescription: payload.post.seoDescription,
  });
  const path = `/blog/${payload.post.slug}`;

  return buildPublicMetadata({
    settings,
    title: seo.seoTitle,
    description: seo.seoDescription,
    path,
    image: cover,
    ogType: "article",
    publishedTime: payload.post.updatedAt,
    modifiedTime: payload.post.updatedAt,
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  const [payload, settings, cmsSidebar] = await Promise.all([
    getCachedBlogDetailPayload(slug),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
    getSidebarByLocation("BLOG_DETAIL"),
  ]);

  if (!payload) notFound();

  const { post, relatedPosts, categories } = payload;
  const perf = parsePerformance(settings);
  const cover = withCdnUrl(post.image, perf.cdnUrl);

  if (cover) {
    preload(cover, { as: "image", fetchPriority: "high" });
  }

  const content = prepareRichHtml(post.content, {
    lazyImages: perf.lazyImages,
    lazyIframes: perf.lazyIframes,
    disableThirdParty: perf.disableThirdParty,
  });

  const seo = resolveBlogSeo({
    title: post.title,
    summary: post.summary,
    content: post.content,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
  });
  const path = `/blog/${post.slug}`;

  return (
    <>
      <JsonLd
        data={buildBlogPostingJsonLd({
          settings,
          title: seo.seoTitle,
          description: seo.seoDescription,
          path,
          image: cover,
          datePublished: post.updatedAt,
          dateModified: post.updatedAt,
          categoryName: post.category?.name,
          crumbs: [
            { name: "Ana Sayfa", path: "/" },
            { name: "Blog", path: "/blog" },
            ...(post.category
              ? [
                  {
                    name: post.category.name,
                    path: blogCategoryHref(post.category.slug),
                  },
                ]
              : []),
            { name: post.title, path },
          ],
        })}
      />
      <BlogPostDetailView
        title={post.title}
        summary={post.summary}
        content={content}
        image={cover}
        categoryName={post.category?.name ?? null}
        categorySlug={post.category?.slug ?? null}
        publishedAt={new Date(post.updatedAt)}
        relatedPosts={relatedPosts.map((item) => ({
          ...item,
          image: withCdnUrl(item.image, perf.cdnUrl),
        }))}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          postCount: category._count.posts,
        }))}
        phone={settings.contact_phone || ""}
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
