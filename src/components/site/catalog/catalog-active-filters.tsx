"use client";

import { X } from "lucide-react";
import { SiteLink } from "@/components/site/site-link";
import {
  catalogActiveFilterChips,
  type CatalogActiveFilterChip,
} from "@/lib/catalog-active-filters";

export { catalogActiveFilterChips };
export type { CatalogActiveFilterChip };

export function CatalogActiveFilterChips({
  chips,
  clearHref,
}: {
  chips: CatalogActiveFilterChip[];
  clearHref: string;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="mb-2.5 border-b border-site-border pb-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-site-fg">Seçilen filtreler</p>
        <SiteLink
          href={clearHref}
          scroll={false}
          className="text-[11px] text-site-muted hover:text-site-primary"
        >
          Temizle
        </SiteLink>
      </div>
      <div className="flex flex-wrap gap-1">
        {chips.map((chip) => (
          <SiteLink
            key={chip.key}
            href={chip.href}
            scroll={false}
            className="inline-flex max-w-full items-center gap-1 rounded border border-site-border bg-site-surface px-1.5 py-0.5 text-[11px] font-normal text-site-fg hover:border-site-primary/40"
          >
            <span className="truncate">{chip.label}</span>
            <X className="h-3 w-3 shrink-0 text-site-muted" />
          </SiteLink>
        ))}
      </div>
    </div>
  );
}
