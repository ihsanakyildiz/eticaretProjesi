import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { ProductBuyBox } from "@/components/site/catalog/product-buy-box";
import { ProductCard } from "@/components/site/catalog/product-card";
import { ProductDetailTabs } from "@/components/site/catalog/product-detail-tabs";
import { ProductViewTracker } from "@/components/site/catalog/product-view-tracker";
import { JsonLd } from "@/components/site/json-ld";
import { SiteLink } from "@/components/site/site-link";
import {
  catalogBrandHref,
  catalogCardAvailability,
  catalogCardPrice,
  catalogCardSchemaAvailability,
  catalogCategoryHref,
  catalogProductHref,
  getCachedCatalogProduct,
} from "@/lib/catalog-products";
import { prepareRichHtml } from "@/lib/html";
import { buildProductJsonLd } from "@/lib/json-ld";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import { productEstimatedDeliveryLabel } from "@/lib/product-editor";
import { buildPublicMetadata, resolveProductSeo } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";
import {
  catalogHubTitle,
  parseUrlStructure,
  publicCatalogPath,
  type UrlStructure,
} from "@/lib/url-structure";

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);

function featureDisplay(row: {
  booleanValue: boolean | null;
  numberValue: unknown;
  filter: { name: string; unit: string | null; inputType: string };
  value: { name: string } | null;
}) {
  if (row.value?.name) return row.value.name;
  if (row.filter.inputType === "BOOLEAN") return row.booleanValue ? "Evet" : "Hayır";
  if (row.numberValue != null) {
    const n = Number(row.numberValue);
    return `${Number.isFinite(n) ? n : String(row.numberValue)}${row.filter.unit ? ` ${row.filter.unit}` : ""}`;
  }
  return "—";
}

export async function catalogProductMetadata(slug: string): Promise<Metadata> {
  const product = await getCachedCatalogProduct(slug).catch(() => null);
  if (!product) return { title: "Ürün" };

  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const urls = parseUrlStructure(settings);
  const perf = parsePerformance(settings);
  const cover = withCdnUrl(product.image, perf.cdnUrl);
  const seo = resolveProductSeo({
    title: product.title,
    summary: product.summary,
    content: product.content,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
  });

  return buildPublicMetadata({
    settings,
    title: seo.seoTitle,
    description: seo.seoDescription,
    path: catalogProductHref(product.slug, urls, product.urlId),
    image: cover,
  });
}

export async function CatalogProductScreen({
  slug,
  urls,
}: {
  slug: string;
  urls: UrlStructure;
}) {
  const [product, settings] = await Promise.all([
    getCachedCatalogProduct(slug),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);
  if (!product) notFound();

  const perf = parsePerformance(settings);
  const cover = withCdnUrl(product.image, perf.cdnUrl);
  const seo = resolveProductSeo({
    title: product.title,
    summary: product.summary,
    content: product.content,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
  });
  const { priceMinor } = catalogCardPrice(product);
  const cardAvailability = catalogCardAvailability(product);
  const content = prepareRichHtml(product.content, {
    lazyImages: perf.lazyImages,
    lazyIframes: perf.lazyIframes,
    disableThirdParty: perf.disableThirdParty,
  });
  const path = catalogProductHref(product.slug, urls, product.urlId);
  const catalogPath = publicCatalogPath(urls);
  const hubTitle = catalogHubTitle(urls);
  const gallery = product.images.map((image) => ({
    ...image,
    url: withCdnUrl(image.url, perf.cdnUrl) ?? image.url,
  }));

  return (
    <>
      <JsonLd
        data={buildProductJsonLd({
          settings,
          title: product.title,
          description: seo.seoDescription,
          path,
          crumbs: [
            { name: "Ana Sayfa", path: "/" },
            { name: hubTitle, path: catalogPath },
            ...(product.category
              ? [{ name: product.category.name, path: catalogCategoryHref(product.category.slug, urls, product.category.urlId) }]
              : []),
            { name: product.title, path },
          ],
          image: cover,
          priceMinor,
          sku: product.sku,
          brandName: product.brand?.name,
          availability: catalogCardSchemaAvailability(cardAvailability),
          showPrice: product.showPrice,
        })}
      />

      <ProductViewTracker productId={product.id} />
      <section className="border-b border-site-border bg-site-surface py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-site-muted">
            <SiteLink href="/" className="hover:text-site-primary">
              Ana Sayfa
            </SiteLink>
            <span className="mx-2">/</span>
            <SiteLink href={catalogPath} className="hover:text-site-primary">
              {hubTitle}
            </SiteLink>
            {product.category ? (
              <>
                <span className="mx-2">/</span>
                <SiteLink
                  href={catalogCategoryHref(product.category.slug, urls, product.category.urlId)}
                  className="hover:text-site-primary"
                >
                  {product.category.name}
                </SiteLink>
              </>
            ) : null}
            <span className="mx-2">/</span>
            <span className="text-site-fg">{product.title}</span>
          </nav>
        </div>
      </section>

      <section className="py-8 sm:py-10">
        <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-site-fg sm:text-3xl">
              {product.title}
            </h1>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-site-muted">
              {product.brand ? (
                <SiteLink href={catalogBrandHref(product.brand.slug, urls, product.brand.urlId)} className="hover:text-site-primary">
                  {product.brand.name}
                </SiteLink>
              ) : null}
              {product.sku ? <span>SKU: {product.sku}</span> : null}
              {product.onlineOnly ? <span>Sadece çevrimiçi</span> : null}
            </div>
          </div>
          <ProductBuyBox
            title={product.title}
            gallery={gallery}
            variants={product.variants.map((variant) => ({
              id: variant.id,
              title: variant.title,
              sku: variant.sku,
              priceMinor: variant.priceMinor,
              compareAtMinor: variant.compareAtMinor,
              stockQuantity: variant.stockQuantity,
              trackInventory: variant.trackInventory,
              allowBackorder: variant.allowBackorder,
              isDefault: variant.isDefault,
              image: withCdnUrl(variant.image, perf.cdnUrl),
              selectionCount: variant.selections.length,
              selections: variant.selections.map((selection) => ({
                attributeId: selection.attributeId,
                attributeName: selection.attribute.name,
                attributeSlug: selection.attribute.slug,
                attributeSortOrder: selection.attribute.sortOrder,
                displayType: selection.attribute.displayType ?? "TEXT",
                valueId: selection.valueId,
                valueName: selection.value.name,
                valueSlug: selection.value.slug,
                valueSortOrder: selection.value.sortOrder,
                colorHex: selection.value.colorHex,
                image: selection.value.image,
                attributeValues: selection.attribute.values.map((value) => ({
                  id: value.id,
                  name: value.name,
                  slug: value.slug,
                  sortOrder: value.sortOrder,
                  colorHex: value.colorHex,
                  image: value.image,
                })),
              })),
            }))}
            taxRatePercent={product.taxRatePercent}
            showPrice={product.showPrice}
            availableForOrder={product.availableForOrder}
            saleUnit={product.saleUnit}
            minOrderQty={product.minOrderQty}
            quantityStep={product.quantityStep}
            inStockLabel={product.inStockLabel}
            outOfStockLabel={product.outOfStockLabel}
            outOfStockBehavior={product.outOfStockBehavior}
            deliveryLabel={
              product.estimatedDelivery
                ? productEstimatedDeliveryLabel(product.estimatedDelivery)
                : null
            }
          />

          <ProductDetailTabs
            descriptionHtml={content || null}
            features={product.filterAssignments.map((row) => ({
              id: row.id,
              name: row.filter.name,
              value: featureDisplay(row),
            }))}
          />

          {product.attachments.length > 0 ? (
            <div>
              <h2 className="font-display text-xl font-bold text-site-fg">Dosyalar</h2>
              <ul className="mt-3 space-y-2">
                {product.attachments.map((file) => (
                  <li key={file.id}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-site-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      {file.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {product.related.length > 0 ? (
            <div>
              <h2 className="font-display text-xl font-bold text-site-fg">İlgili ürünler</h2>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {product.related.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
      <HomeCta />
    </>
  );
}
