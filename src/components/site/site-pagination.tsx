import { ChevronLeft, ChevronRight } from "lucide-react";
import { SiteLink } from "@/components/site/site-link";

type SitePaginationProps = {
  currentPage: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
};

type PageItem = { type: "page"; page: number } | { type: "ellipsis"; key: string };

const WINDOW = 2;
const SHOW_ALL_BELOW = 7;

export function buildPaginationItems(currentPage: number, totalPages: number): PageItem[] {
  const current = Math.min(totalPages, Math.max(1, currentPage));
  if (totalPages <= SHOW_ALL_BELOW) {
    return Array.from({ length: totalPages }, (_, index) => ({
      type: "page",
      page: index + 1,
    }));
  }

  const start = Math.max(2, current - WINDOW);
  const end = Math.min(totalPages - 1, current + WINDOW);
  const items: PageItem[] = [{ type: "page", page: 1 }];

  if (start > 2) {
    items.push({ type: "ellipsis", key: "start" });
  }

  for (let page = start; page <= end; page += 1) {
    items.push({ type: "page", page });
  }

  if (end < totalPages - 1) {
    items.push({ type: "ellipsis", key: "end" });
  }

  items.push({ type: "page", page: totalPages });
  return items;
}

export function SitePagination({
  currentPage,
  totalPages,
  hrefForPage,
}: SitePaginationProps) {
  if (totalPages <= 1) return null;

  const items = buildPaginationItems(currentPage, totalPages);
  const prevHref = currentPage > 1 ? hrefForPage(currentPage - 1) : null;
  const nextHref =
    currentPage < totalPages ? hrefForPage(currentPage + 1) : null;

  return (
    <nav
      aria-label="Sayfalama"
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
    >
      {prevHref ? (
        <SiteLink
          href={prevHref}
          prefetch={false}
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

      {items.map((item) => {
        switch (item.type) {
          case "ellipsis":
            return (
              <span
                key={item.key}
                aria-hidden
                className="inline-flex h-10 min-w-10 items-center justify-center px-1 text-sm font-semibold text-slate-400"
              >
                …
              </span>
            );
          case "page": {
            const active = item.page === currentPage;
            return (
              <SiteLink
                key={item.page}
                href={hrefForPage(item.page)}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm font-semibold transition ${
                  active
                    ? "bg-site-primary text-white shadow-md shadow-violet-500/25"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-site-fg"
                }`}
              >
                {item.page}
              </SiteLink>
            );
          }
          default: {
            const _exhaustive: never = item;
            return _exhaustive;
          }
        }
      })}

      {nextHref ? (
        <SiteLink
          href={nextHref}
          prefetch={false}
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
