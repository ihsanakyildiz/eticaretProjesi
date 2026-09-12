import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { CatalogBreadcrumb } from "@/components/site/catalog/catalog-breadcrumb";
import { ProductBuyBox } from "@/components/site/catalog/product-buy-box";
import { ProductCard } from "@/components/site/catalog/product-card";
import { ProductViewTracker } from "@/components/site/catalog/product-view-tracker";
import { JsonLd } from "@/components/site/json-ld";
import { getCategoryBreadcrumb } from "@/lib/category-tree";
import {
  catalogBrandHref,
  catalogCardAvailability,
  catalogCardPrice,
  catalogCardSchemaAvailability,
  catalogCategoryHref,
  catalogProductHref,
  getCachedCatalogCategoryIndex,
  getCachedCatalogProduct,
} from "@/lib/catalog-products";
import { prepareRichHtml } from "@/lib/html";
import { buildProductJsonLd } from "@/lib/json-ld";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { productEstimatedDeliveryLabel } from "@/lib/product-editor";
import { reviewerDisplayName } from "@/lib/reviews";
import { buildPublicMetadata, resolveProductSeo } from "@/lib/seo";
import { getSettingsMap } from "@/lib/settings";
import { parseUrlStructure, type UrlStructure } from "@/lib/url-structure";

const ProductDetailTabs = dynamic(() =>
  import("@/components/site/catalog/product-detail-tabs").then((mod) => mod.ProductDetailTabs),
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
  const [product, settings, categories, reviewRows] = await Promise.all([
    getCachedCatalogProduct(slug),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
    getCachedCatalogCategoryIndex().catch(() => []),
    prisma.productReview.findMany({
      where: { product: { slug }, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        rating: true,
        comment: true,
        displayName: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, name: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }).catch(() => []),
  ]);
  if (!product) notFound();
  const reviewCount = reviewRows.length;
  const reviewAverage =
    reviewCount === 0
      ? 0
      : reviewRows.reduce((sum, row) => sum + row.rating, 0) / reviewCount;

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
  const homeLabel = settings.site_name?.trim() || "Ana Sayfa";
  const categoryTrail = product.category
    ? getCategoryBreadcrumb(categories, product.category.id)
    : [];
  const crumbs = [
    { name: homeLabel, href: "/" },
    ...categoryTrail.map((item) => ({
      name: item.name,
      href: catalogCategoryHref(item.slug, urls, item.urlId),
    })),
    { name: product.title },
  ];
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
            { name: homeLabel, path: "/" },
            ...categoryTrail.map((item) => ({
              name: item.name,
              path: catalogCategoryHref(item.slug, urls, item.urlId),
            })),
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

      {perf.productPreloadImage && cover ? (
        <link rel="preload" as="image" href={cover} fetchPriority="high" />
      ) : null}
      <ProductViewTracker productId={product.id} recordView={perf.productTrackViews} />
      <section className="py-5 sm:py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <CatalogBreadcrumb items={crumbs} />
          <div className="space-y-10">
          <ProductBuyBox
            title={product.title}
            brandName={product.brand?.name ?? null}
            brandHref={
              product.brand
                ? catalogBrandHref(product.brand.slug, urls, product.brand.urlId)
                : null
            }
            sku={product.sku}
            onlineOnly={product.onlineOnly}
            gallery={gallery}
            galleryEager={perf.productGalleryEager}
            variants={product.variants.map((variant) => ({
              id: variant.id,
              title: variant.title,
              sku: variant.sku,
              priceMinor: variant.priceMinor,
              compareAtMinor: variant.compareAtMinor,
              saleStartsAt: variant.saleStartsAt,
              saleEndsAt: variant.saleEndsAt,
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
            campaign={product.campaign}
            personalizationFields={product.personalizationFields ?? []}
          />

          <ProductDetailTabs
            descriptionHtml={content || null}
            features={product.filterAssignments.map((row) => ({
              id: row.id,
              name: row.filter.name,
              value: featureDisplay(row),
            }))}
            reviews={reviewRows.map((row) => ({
              id: row.id,
              rating: row.rating,
              comment: row.comment ?? "",
              author: reviewerDisplayName({
                displayName: row.displayName,
                firstName: row.user.firstName,
                lastName: row.user.lastName,
                name: row.user.name,
              }),
              createdAt: row.createdAt.toISOString(),
              photos: row.images.map((image) => image.url),
            }))}
            reviewAverage={reviewAverage}
            reviewCount={reviewCount}
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
        </div>
      </section>
    </>
  );
}
