import { ArrowUpRight } from "lucide-react";
import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { stripHtml } from "@/lib/html";

export type WorkCardData = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  image: string | null;
  category?: { name: string; slug?: string | null } | null;
};

export function WorkCard({
  work,
  imagePriority = false,
}: {
  work: WorkCardData;
  imagePriority?: boolean;
}) {
  return (
    <SiteLink
      href={`/yapilan-isler/${work.slug}`}
      className="group overflow-hidden rounded-3xl border border-site-border bg-site-card shadow-sm transition hover:-translate-y-1 hover:border-site-primary/35 hover:shadow-xl"
    >
      <div className="relative aspect-[16/11] overflow-hidden bg-slate-100">
        {work.image ? (
          <SiteImage
            src={work.image}
            alt={work.title}
            fill
            priority={imagePriority}
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-100 to-slate-100" />
        )}
      </div>
      <div className="p-5">
        {work.category?.name ? (
          <p className="text-xs font-semibold tracking-wide text-site-primary uppercase">
            {work.category.name}
          </p>
        ) : null}
        <h2 className="mt-1 flex items-start justify-between gap-2 font-display text-lg font-bold text-site-fg group-hover:text-site-primary">
          <span>{work.title}</span>
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 opacity-60" />
        </h2>
        {work.summary ? (
          <p className="mt-2 line-clamp-2 text-sm text-site-muted">
            {stripHtml(work.summary)}
          </p>
        ) : null}
      </div>
    </SiteLink>
  );
}
