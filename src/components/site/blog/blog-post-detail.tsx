import type { ReactNode } from "react";
import type { SidebarPlacement } from "@prisma/client";
import { CalendarDays, FolderOpen, Phone } from "lucide-react";
import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { blogCategoryHref } from "@/lib/blog";
import { stripHtml } from "@/lib/html";

export type BlogRelatedPost = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  image: string | null;
};

export type BlogCategoryLink = {
  id: string;
  name: string;
  slug: string;
  postCount: number;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

export function BlogPostDetailView({
  title,
  summary,
  content,
  image,
  categoryName,
  categorySlug,
  publishedAt,
  relatedPosts,
  categories,
  phone,
  sidebar,
  sidebarPlacement = "RIGHT",
}: {
  title: string;
  summary?: string | null;
  content?: string | null;
  image?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  publishedAt: Date;
  relatedPosts: BlogRelatedPost[];
  categories: BlogCategoryLink[];
  phone?: string;
  sidebar?: ReactNode;
  sidebarPlacement?: SidebarPlacement;
}) {
  const summaryText = stripHtml(summary);

  const asideContent = sidebar ?? (
    <>
      {categories.length > 0 ? (
        <div className="rounded-3xl border border-site-border bg-site-card p-5 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-site-fg">
            Kategoriler
          </h3>
          <ul className="mt-3 space-y-1">
            {categories.map((category) => (
              <li key={category.id}>
                <SiteLink
                  href={blogCategoryHref(category.slug)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-site-fg transition hover:bg-site-surface"
                >
                  <span className="truncate">{category.name}</span>
                  <span className="text-xs text-site-muted">
                    {category.postCount}
                  </span>
                </SiteLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-3xl bg-site-primary p-6 text-white shadow-lg shadow-violet-500/20">
        <p className="font-display text-xl font-semibold leading-snug">
          Projeniz için konuşalım.
        </p>
        {phone ? (
          <a
            href={`tel:${phone.replace(/\s+/g, "")}`}
            className="mt-5 flex items-center gap-2 text-sm font-semibold text-white/95"
          >
            <Phone className="h-4 w-4" />
            {phone}
          </a>
        ) : null}
        <SiteLink
          href="/iletisim"
          className="mt-5 inline-flex rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-site-primary"
        >
          İletişime Geç
        </SiteLink>
      </div>
    </>
  );

  const hasAside = Boolean(asideContent);
  const isRight = sidebarPlacement === "RIGHT";
  const gridCols = hasAside
    ? isRight
      ? "lg:grid-cols-[minmax(0,1fr)_18rem]"
      : "lg:grid-cols-[18rem_minmax(0,1fr)]"
    : "";

  const article = (
    <article className="min-w-0">
      {image ? (
        <div className="relative aspect-[16/9] overflow-hidden rounded-[1.75rem] border border-site-border bg-slate-100 shadow-sm">
          <SiteImage
            src={image}
            alt={title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 70vw"
          />
        </div>
      ) : null}

      {summaryText ? (
        <p className="mt-8 text-lg leading-relaxed text-site-muted">
          {summaryText}
        </p>
      ) : null}

      {content?.trim() ? (
        <div
          className="site-rich-content mt-8"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : !summaryText ? (
        <p className="mt-8 text-sm text-site-muted">
          Bu yazı için içerik yakında eklenecek.
        </p>
      ) : null}

      {relatedPosts.length > 0 ? (
        <div className="mt-14 border-t border-site-border pt-10 [content-visibility:auto] [contain-intrinsic-size:800px]">
          <h2 className="font-display text-2xl font-bold text-site-fg">
            İlgili Yazılar
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {relatedPosts.map((post) => (
              <li key={post.id}>
                <SiteLink
                  href={`/blog/${post.slug}`}
                  className="group grid overflow-hidden rounded-2xl border border-site-border bg-site-card shadow-sm transition hover:-translate-y-0.5 hover:border-site-primary/35 hover:shadow-lg"
                >
                  <span className="relative aspect-[16/10] bg-slate-100">
                    {post.image ? (
                      <SiteImage
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 40vw"
                      />
                    ) : (
                      <span className="absolute inset-0 bg-gradient-to-br from-violet-100 to-slate-100" />
                    )}
                  </span>
                  <span className="p-4">
                    <span className="block font-display text-base font-bold text-site-fg group-hover:text-site-primary">
                      {post.title}
                    </span>
                    {post.summary ? (
                      <span className="mt-1.5 block text-sm leading-6 text-site-muted line-clamp-2">
                        {stripHtml(post.summary)}
                      </span>
                    ) : null}
                  </span>
                </SiteLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );

  const aside = hasAside ? (
    <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
      {asideContent}
    </aside>
  ) : null;

  return (
    <>
      <section className="relative overflow-hidden border-b border-site-border bg-site-surface py-12 sm:py-14">
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
            {categoryName ? (
              <>
                <span className="mx-2 text-site-muted">›</span>
                {categorySlug ? (
                  <SiteLink
                    href={blogCategoryHref(categorySlug)}
                    className="hover:underline"
                  >
                    {categoryName}
                  </SiteLink>
                ) : (
                  <span className="text-site-muted">{categoryName}</span>
                )}
              </>
            ) : null}
          </nav>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-5xl">
            {title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-site-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-site-primary" />
              {formatDate(publishedAt)}
            </span>
            {categoryName ? (
              categorySlug ? (
                <SiteLink
                  href={blogCategoryHref(categorySlug)}
                  className="inline-flex items-center gap-1.5 hover:text-site-primary"
                >
                  <FolderOpen className="h-4 w-4 text-site-primary" />
                  {categoryName}
                </SiteLink>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <FolderOpen className="h-4 w-4 text-site-primary" />
                  {categoryName}
                </span>
              )
            ) : null}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div
          className={`mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:gap-12 lg:px-8 ${gridCols}`}
        >
          {isRight ? (
            <>
              {article}
              {aside}
            </>
          ) : (
            <>
              {aside}
              {article}
            </>
          )}
        </div>
      </section>
    </>
  );
}
