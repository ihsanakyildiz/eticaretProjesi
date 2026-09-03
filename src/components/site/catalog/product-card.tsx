"use client";

import { SiteImage, SiteImageFallback } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { useCatalogUrls } from "@/components/site/site-url-provider";
import { trackProductEvent } from "@/components/site/catalog/catalog-client-api";
import { SaleCountdown, useTickingNow } from "@/components/site/catalog/sale-countdown";
import {
  catalogCardAvailability,
  catalogCardAvailabilityLabel,
  catalogCardHoverImage,
  catalogCardPrice,
  type CatalogProductCard,
} from "@/lib/catalog-storefront";
import { formatMinorTry, taxIncludedMinor } from "@/lib/product-money";

export function ProductCard({
  product,
  imagePriority = false,
}: {
  product: CatalogProductCard;
  imagePriority?: boolean;
}) {
  const hasWindow = Boolean(
    product.saleStartsAt ||
      product.saleEndsAt ||
      product.variants.some((item) => item.saleStartsAt || item.saleEndsAt),
  );
  const now = useTickingNow(hasWindow);
  const { priceMinor, compareAtMinor, onSale, saleEndsAt } = catalogCardPrice(
    product,
    now ?? undefined,
  );
  const displayPrice = taxIncludedMinor(priceMinor, product.taxRatePercent);
  const compareAt = compareAtMinor
    ? taxIncludedMinor(compareAtMinor, product.taxRatePercent)
    : null;
  const discount =
    compareAt && compareAt > displayPrice
      ? Math.round(((compareAt - displayPrice) / compareAt) * 100)
      : null;
  const hoverImage = catalogCardHoverImage(product);
  const availability = catalogCardAvailability(product);
  const { productHref } = useCatalogUrls();

  return (
    <SiteLink
      href={productHref(product.slug, product.urlId)}
      onClick={() => {
        trackProductEvent(product.id, "click");
      }}
      className="group flex flex-col overflow-hidden rounded-lg border border-site-border bg-site-card transition hover:border-site-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-site-surface">
        {product.image ? (
          <>
            <SiteImage
              src={product.image}
              alt={product.title}
              fill
              priority={imagePriority}
              className={`object-cover transition duration-300 ${hoverImage ? "group-hover:opacity-0" : "group-hover:scale-105"}`}
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            {hoverImage ? (
              <SiteImage
                src={hoverImage}
                alt=""
                fill
                className="object-cover opacity-0 transition duration-300 group-hover:opacity-100"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            ) : null}
          </>
        ) : (
          <SiteImageFallback fill />
        )}
        {onSale || discount ? (
          <span className="absolute top-2 left-2 z-10 flex max-w-[calc(100%-1rem)] flex-col items-start gap-1">
            <span className="rounded-md bg-rose-600 px-2 py-1 text-[11px] font-bold tracking-wide text-white uppercase shadow-sm">
              İndirim
            </span>
            {discount ? (
              <span className="rounded-md bg-rose-700/95 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                %{discount}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.brand?.name ? (
          <p className="text-[11px] font-normal tracking-wide text-site-muted uppercase">
            {product.brand.name}
          </p>
        ) : null}
        <h2 className="line-clamp-2 text-sm font-normal leading-snug text-site-fg">
          {product.title}
        </h2>
        <div className="mt-auto pt-2">
          {product.showPrice ? (
            <div className="flex flex-wrap items-baseline gap-2">
              {compareAt && compareAt > displayPrice ? (
                <span className="text-xs text-site-muted line-through">
                  {formatMinorTry(compareAt)}
                </span>
              ) : null}
              <span
                className={`text-base font-semibold ${
                  compareAt && compareAt > displayPrice ? "text-rose-600" : "text-site-primary"
                }`}
              >
                {formatMinorTry(displayPrice)}
              </span>
            </div>
          ) : (
            <p className="text-xs text-site-muted">Fiyat için iletişime geçin</p>
          )}
          {onSale && saleEndsAt ? <SaleCountdown endsAt={saleEndsAt} compact /> : null}
          <p
            className={`mt-1 text-[11px] ${
              availability === "out_of_stock" ? "text-site-muted" : "text-emerald-600"
            }`}
          >
            {catalogCardAvailabilityLabel(availability)}
          </p>
        </div>
      </div>
    </SiteLink>
  );
}
