"use client";

import { Search } from "lucide-react";
import { useCatalogUrls } from "@/components/site/site-url-provider";

export function SiteHeaderSearch({
  className = "",
  autoFocus = false,
}: {
  className?: string;
  autoFocus?: boolean;
}) {
  const { catalogPath } = useCatalogUrls();
  return (
    <form action={catalogPath} method="get" className={`relative ${className}`}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-site-muted" />
      <input
        type="search"
        name="q"
        autoFocus={autoFocus}
        placeholder="Ürün, kategori veya marka ara"
        className="h-11 w-full rounded-full border border-site-border bg-site-surface pr-4 pl-10 text-sm text-site-fg outline-none transition placeholder:text-site-muted focus:border-site-primary focus:bg-site-card focus:ring-2 focus:ring-site-primary/20"
      />
    </form>
  );
}
