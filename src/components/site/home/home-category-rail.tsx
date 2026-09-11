"use client";

import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { useCatalogUrls } from "@/components/site/site-url-provider";
import type { CatalogCategoryCard } from "@/lib/catalog-storefront";
import type { CardColumnsPerRow } from "@/lib/page-sections";

function gridClass(cardsPerRow: CardColumnsPerRow) {
  switch (cardsPerRow) {
    case 5:
      return "mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
    case 4:
      return "mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";
    case 3:
      return "mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3";
    default: {
      const _exhaustive: never = cardsPerRow;
      return _exhaustive;
    }
  }
}

export function HomeCategoryRail({
  title,
  subtitle,
  eyebrow,
  categories,
  cardsPerRow = 4,
  showProductCount = true,
}: {
  title: string | null;
  subtitle: string | null;
  eyebrow?: string;
  categories: CatalogCategoryCard[];
  cardsPerRow?: CardColumnsPerRow;
  showProductCount?: boolean;
}) {
  const { categoryHref } = useCatalogUrls();
  const heading = title?.trim() || "Kategoriler";
  const kicker = eyebrow?.trim() || null;
  const lead = subtitle?.trim() || null;

  return (
    <section className="border-b border-site-border py-12 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {kicker ? (
          <p className="text-xs font-semibold tracking-wide text-site-primary uppercase">
            {kicker}
          </p>
        ) : null}
        {heading ? (
          <h2 className="mt-1 font-display text-2xl font-bold text-site-fg sm:text-3xl">
            {heading}
          </h2>
        ) : null}
        {lead ? (
          <p className="mt-2 max-w-2xl text-sm text-site-muted">{lead}</p>
        ) : null}
        {categories.length === 0 ? (
          <p className="mt-6 text-sm text-site-muted">Bu bölümde gösterilecek kategori yok.</p>
        ) : (
        <div className={gridClass(cardsPerRow)}>
          {categories.map((category, index) => (
            <SiteLink
              key={category.id}
              href={categoryHref(category.slug, category.urlId)}
              className="group flex flex-col overflow-hidden rounded-lg border border-site-border bg-site-card transition hover:border-site-primary/40 hover:shadow-md"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-site-surface">
                {category.image ? (
                  <SiteImage
                    src={category.image}
                    alt={category.name}
                    fill
                    priority={index < 4}
                    className="object-cover transition duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-site-surface text-2xl font-display font-bold text-site-muted/50">
                    {category.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <h3 className="font-display text-base font-bold text-site-fg group-hover:text-site-primary">
                  {category.name}
                </h3>
                {showProductCount ? (
                  <p className="text-sm text-site-muted">{category.productCount} ürün</p>
                ) : null}
              </div>
            </SiteLink>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
