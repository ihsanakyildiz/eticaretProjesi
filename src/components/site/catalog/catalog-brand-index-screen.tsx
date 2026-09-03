import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { catalogBrandHref, getCachedCatalogBrandIndex } from "@/lib/catalog-products";
import { resolveUrlStructure } from "@/lib/catalog-routes";
import { buildCollectionJsonLd } from "@/lib/json-ld";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import { buildPublicMetadata, catalogPublicHubs } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";
import {
  catalogHubTitle,
  publicCatalogPath,
  type UrlStructure,
} from "@/lib/url-structure";


export async function catalogBrandIndexMetadata(): Promise<Metadata> {
  const [settings, urls] = await Promise.all([
    getSettingsMap().catch(() => ({}) as Record<string, string>),
    resolveUrlStructure(),
  ]);
  return buildPublicMetadata({
    settings,
    ...catalogPublicHubs(urls).productBrands,
  });
}

export async function CatalogBrandIndexScreen({ urls }: { urls: UrlStructure }) {
  const [brands, settings] = await Promise.all([
    getCachedCatalogBrandIndex().catch(() => []),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);
  const hub = catalogPublicHubs(urls).productBrands;
  const catalogPath = publicCatalogPath(urls);
  const hubTitle = catalogHubTitle(urls);
  const perf = parsePerformance(settings);

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
            <span className="text-site-muted">Markalar</span>
          </nav>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-5xl">
            Markalar
          </h1>
        </div>
      </section>
      <section className="py-12 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
          {brands.length === 0 ? (
            <p className="text-sm text-site-muted">Henüz marka ürünü yok.</p>
          ) : (
            brands.map((brand) => (
              <SiteLink
                key={brand.id}
                href={catalogBrandHref(brand.slug, urls, brand.urlId)}
                className="flex items-center gap-4 rounded-3xl border border-site-border bg-site-card p-5 shadow-sm transition hover:border-site-primary/35"
              >
                {brand.logo ? (
                  <span className="relative h-12 w-12 overflow-hidden rounded-xl bg-site-surface">
                    <SiteImage
                      src={withCdnUrl(brand.logo, perf.cdnUrl) ?? brand.logo}
                      alt={brand.name}
                      fill
                      className="object-contain p-1"
                      sizes="48px"
                    />
                  </span>
                ) : null}
                <span>
                  <span className="block font-display text-lg font-bold text-site-fg">{brand.name}</span>
                  <span className="text-sm text-site-muted">{brand.productCount} ürün</span>
                </span>
              </SiteLink>
            ))
          )}
        </div>
      </section>
    </>
  );
}
