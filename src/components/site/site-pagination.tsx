import { ChevronLeft, ChevronRight } from "lucide-react";
import { SiteLink } from "@/components/site/site-link";

type SitePaginationProps = {
  currentPage: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
};

export function SitePagination({
  currentPage,
  totalPages,
  hrefForPage,
}: SitePaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const prevHref = currentPage > 1 ? hrefForPage(currentPage - 1) : null;
  const nextHref =
    currentPage < totalPages ? hrefForPage(currentPage + 1) : null;

  return (
    <nav
      aria-label="Sayfalama"
      className="mt-12 flex items-center justify-center gap-2.5"
    >
      {prevHref ? (
        <SiteLink
          href={prevHref}
          aria-label="Önceki sayfa"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-site-fg"
        >
          <ChevronLeft className="h-4 w-4" />
        </SiteLink>
      ) : (
        <span
          aria-disabled
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-300"
        >
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {pages.map((page) => {
        const active = page === currentPage;
        return (
          <SiteLink
            key={page}
            href={hrefForPage(page)}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition ${
              active
                ? "bg-site-primary text-white shadow-md shadow-violet-500/25"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-site-fg"
            }`}
          >
            {page}
          </SiteLink>
        );
      })}

      {nextHref ? (
        <SiteLink
          href={nextHref}
          aria-label="Sonraki sayfa"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-site-fg"
        >
          <ChevronRight className="h-4 w-4" />
        </SiteLink>
      ) : (
        <span
          aria-disabled
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-300"
        >
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
