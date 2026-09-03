import { ChevronRight } from "lucide-react";
import { SiteLink } from "@/components/site/site-link";

export type CatalogBreadcrumbItem = {
  name: string;
  href?: string;
};

export function CatalogBreadcrumb({ items }: { items: CatalogBreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Sayfa yolu" className="mb-5 text-[12px] leading-none text-site-muted sm:mb-6">
      <ol className="flex flex-wrap items-center">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.name}-${index}`} className="inline-flex items-center">
              {index > 0 ? (
                <ChevronRight
                  aria-hidden
                  className="mx-1 h-3 w-3 shrink-0 text-site-primary"
                  strokeWidth={2.25}
                />
              ) : null}
              {last || !item.href ? (
                <span className="text-site-fg/70">{item.name}</span>
              ) : (
                <SiteLink href={item.href} className="transition hover:text-site-fg">
                  {item.name}
                </SiteLink>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
