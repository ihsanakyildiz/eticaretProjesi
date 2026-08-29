import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { JsonLd } from "@/components/site/json-ld";
import { SiteLink } from "@/components/site/site-link";
import { catalogCategoryHref, getCachedCatalogCategoryIndex } from "@/lib/catalog-products";
import { resolveUrlStructure } from "@/lib/catalog-routes";
import { buildCollectionJsonLd } from "@/lib/json-ld";
import { buildPublicMetadata, catalogPublicHubs } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";
import {
  catalogHubTitle,
  publicCatalogPath,
  type UrlStructure,
} from "@/lib/url-structure";

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);

export async function catalogCategoryIndexMetadata(): Promise<Metadata> {
  const [settings, urls] = await Promise.all([
    getSettingsMap().catch(() => ({}) as Record<string, string>),
    resolveUrlStructure(),
  ]);
  return buildPublicMetadata({
    settings,
    ...catalogPublicHubs(urls).productCategories,
  });
}

export async function CatalogCategoryIndexScreen({ urls }: { urls: UrlStructure }) {
  const [categories, settings] = await Promise.all([
    getCachedCatalogCategoryIndex().catch(() => []),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);
  const hub = catalogPublicHubs(urls).productCategories;
  const catalogPath = publicCatalogPath(urls);
  const hubTitle = catalogHubTitle(urls);
  const roots = categories.filter((category) => !category.parentId);
  const items = roots.length > 0 ? roots : categories;

  return (
    <>
      <JsonLd
        data={buildCollectionJsonLd({
          settings,
          title: hub.title,
          description: hub.description,
          path: hub.path,
          crumbs: [
            { name: "Ana Sayfa", path: "/" },
            { name: hubTitle, path: catalogPath },
            { name: hub.title, path: hub.path },
          ],
        })}
      />
      <section className="relative overflow-hidden border-b border-site-border bg-site-surface py-14">
        <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-70" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <nav className="text-sm text-site-primary">
            <SiteLink href="/" className="hover:underline">
              Ana Sayfa
            </SiteLink>
            <span className="mx-2 text-site-muted">›</span>
            <SiteLink href={catalogPath} className="hover:underline">
              {hubTitle}
            </SiteLink>
            <span className="mx-2 text-site-muted">›</span>
            <span className="text-site-muted">Kategoriler</span>
          </nav>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-5xl">
            Kategoriler
          </h1>
        </div>
      </section>
      <section className="py-12 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
          {items.length === 0 ? (
            <p className="text-sm text-site-muted">Henüz kategori yok.</p>
          ) : (
            items.map((category) => (
              <SiteLink
                key={category.id}
                href={catalogCategoryHref(category.slug, urls, category.urlId)}
                className="rounded-3xl border border-site-border bg-site-card p-5 shadow-sm transition hover:border-site-primary/35"
              >
                <h2 className="font-display text-lg font-bold text-site-fg">{category.name}</h2>
                <p className="mt-1 text-sm text-site-muted">{category.productCount} ürün</p>
              </SiteLink>
            ))
          )}
        </div>
      </section>
      <HomeCta />
    </>
  );
}
