import { ProductCard } from "@/components/site/catalog/product-card";
import { RecentlyViewedRail } from "@/components/site/catalog/recently-viewed-rail";
import type { CatalogProductCard } from "@/lib/catalog-storefront";
import type { ProductSectionSource } from "@/lib/page-sections";

export function HomeProductRail({
  title,
  subtitle,
  eyebrow,
  products,
  source,
}: {
  title: string | null;
  subtitle: string | null;
  eyebrow?: string;
  products: CatalogProductCard[];
  source: ProductSectionSource;
}) {
  if (source === "RECENTLY_VIEWED") {
    return (
      <RecentlyViewedRail title={title} subtitle={subtitle} eyebrow={eyebrow} />
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="border-b border-site-border py-12 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-wide text-site-primary uppercase">
            {eyebrow}
          </p>
        ) : null}
        {title ? (
          <h2 className="mt-1 font-display text-2xl font-bold text-site-fg sm:text-3xl">
            {title}
          </h2>
        ) : null}
        {subtitle ? <p className="mt-2 max-w-2xl text-sm text-site-muted">{subtitle}</p> : null}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} imagePriority={index < 4} />
          ))}
        </div>
      </div>
    </section>
  );
}
