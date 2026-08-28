import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { stripHtml } from "@/lib/html";

export type BlogPostCardData = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  image: string | null;
  category?: { name: string; slug?: string | null } | null;
};

export function BlogPostCard({
  post,
  imagePriority = false,
}: {
  post: BlogPostCardData;
  imagePriority?: boolean;
}) {
  return (
    <article>
      <SiteLink href={`/blog/${post.slug}`} className="group block">
        <div className="relative aspect-[16/11] overflow-hidden rounded-2xl bg-slate-100">
          {post.image ? (
            <SiteImage
              src={post.image}
              alt={post.title}
              fill
              priority={imagePriority}
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-violet-100 to-slate-100" />
          )}
        </div>
        {post.category?.name ? (
          <span className="mt-4 inline-flex rounded-full bg-site-primary-soft px-3 py-1 text-xs font-semibold text-site-primary">
            {post.category.name}
          </span>
        ) : null}
        <h3 className="mt-3 font-display text-lg font-bold tracking-tight text-site-fg group-hover:text-site-primary">
          {post.title}
        </h3>
        {post.summary ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-site-muted">
            {stripHtml(post.summary)}
          </p>
        ) : null}
      </SiteLink>
    </article>
  );
}
