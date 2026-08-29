"use client";

import { SiteLink } from "@/components/site/site-link";
import { useCatalogUrls } from "@/components/site/site-url-provider";

export type CatalogSidebarCategory = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  urlId?: number;
  productCount: number;
};

export function CatalogCategorySidebar({
  categories,
  activeSlug = null,
  title = "Kategoriler",
}: {
  categories: CatalogSidebarCategory[];
  activeSlug?: string | null;
  title?: string;
}) {
  const { catalogPath, categoryHref } = useCatalogUrls();
  const roots = categories.filter(
    (category) =>
      !category.parentId || !categories.some((item) => item.id === category.parentId),
  );
  const items = roots.length > 0 ? roots : categories;

  if (categories.length === 0) return null;

  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <div className="rounded-lg border border-site-border bg-site-card p-4">
        <h2 className="text-sm font-semibold text-site-fg">{title}</h2>
        <ul className="mt-3 space-y-1">
          <li>
            <SiteLink
              href={catalogPath}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
                !activeSlug
                  ? "bg-site-primary-soft font-semibold text-site-primary"
                  : "text-site-fg hover:bg-site-surface"
              }`}
            >
              Tüm ürünler
            </SiteLink>
          </li>
          {items.map((category) => (
            <CategoryBranch
              key={category.id}
              category={category}
              categories={categories}
              activeSlug={activeSlug}
              categoryHref={categoryHref}
              depth={0}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}

function CategoryBranch({
  category,
  categories,
  activeSlug,
  categoryHref,
  depth,
}: {
  category: CatalogSidebarCategory;
  categories: CatalogSidebarCategory[];
  activeSlug: string | null;
  categoryHref: (slug: string, urlId?: number | null) => string;
  depth: number;
}) {
  const children = categories.filter((item) => item.parentId === category.id);
  const active = activeSlug === category.slug;

  return (
    <li>
      <SiteLink
        href={categoryHref(category.slug, category.urlId)}
        className={`flex items-center justify-between rounded-xl py-2.5 pr-3 text-sm transition ${
          depth > 0 ? "pl-6" : "pl-3"
        } ${
          active
            ? "bg-site-primary-soft font-semibold text-site-primary"
            : "text-site-fg hover:bg-site-surface"
        }`}
      >
        <span className="truncate">{category.name}</span>
        <span className="ml-2 shrink-0 text-xs text-site-muted">{category.productCount}</span>
      </SiteLink>
      {children.length > 0 ? (
        <ul className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <CategoryBranch
              key={child.id}
              category={child}
              categories={categories}
              activeSlug={activeSlug}
              categoryHref={categoryHref}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
