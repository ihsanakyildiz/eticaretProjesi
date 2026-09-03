"use client";

import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteLink } from "@/components/site/site-link";

export type CatalogFilterOption = {
  id: string;
  name: string;
  href: string;
  active: boolean;
};

export function CatalogFilterOptionLink({ option }: { option: CatalogFilterOption }) {
  return (
    <SiteLink
      href={option.href}
      scroll={false}
      className={`flex items-center gap-2 py-[5px] text-[12px] leading-snug ${
        option.active ? "font-medium text-site-fg" : "font-normal text-site-fg/80 hover:text-site-fg"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border ${
          option.active
            ? "border-site-primary bg-site-primary text-white"
            : "border-neutral-300 bg-white dark:border-neutral-600 dark:bg-transparent"
        }`}
      >
        {option.active ? <Check className="h-2.5 w-2.5" strokeWidth={2.5} /> : null}
      </span>
      <span className="min-w-0 truncate">{option.name}</span>
    </SiteLink>
  );
}

export function CatalogFilterSearchList({
  placeholder,
  options,
  searchPool,
  searchable = true,
}: {
  placeholder: string;
  options: CatalogFilterOption[];
  searchPool?: CatalogFilterOption[];
  searchable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const showSearch = searchable;
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    const source = needle && searchPool ? searchPool : options;
    if (!needle) return source;
    return source.filter((item) => item.name.toLocaleLowerCase("tr-TR").includes(needle));
  }, [options, query, searchPool]);

  return (
    <div>
      {showSearch ? (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="mb-1.5 w-full rounded border border-site-border bg-site-surface px-2 py-1.5 text-[12px] text-site-fg outline-none placeholder:text-site-muted/70 focus:border-site-primary/40"
        />
      ) : null}
      {filtered.length === 0 ? (
        <p className="py-1.5 text-[11px] text-site-muted">Sonuç bulunamadı</p>
      ) : (
        <ul className="max-h-52 overflow-y-auto overscroll-contain">
          {filtered.map((item) => (
            <li key={item.id}>
              <CatalogFilterOptionLink option={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
