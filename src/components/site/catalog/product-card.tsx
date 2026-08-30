"use client";

import { SiteImage, SiteImageFallback } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { useCatalogUrls } from "@/components/site/site-url-provider";
import { recordProductClickAction } from "@/app/(site)/urunler/actions";
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
  const { priceMinor } = catalogCardPrice(product);
  const displayPrice = taxIncludedMinor(priceMinor, product.taxRatePercent);
  const compareAt = product.compareAtMinor
    ? taxIncludedMinor(product.compareAtMinor, product.taxRatePercent)
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
        void recordProductClickAction(product.id);
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
        {discount ? (
          <span className="absolute top-2 left-2 rounded bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
            %{discount}
          </span>
        ) : product.onSale ? (
          <span className="absolute top-2 left-2 rounded bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
            İndirim
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.brand?.name ? (
          <p className="text-[11px] font-medium tracking-wide text-site-muted uppercase">
            {product.brand.name}
          </p>
        ) : null}
        <h2 className="line-clamp-2 text-sm font-semibold text-site-fg group-hover:text-site-primary">
          {product.title}
        </h2>
        <div className="mt-auto pt-2">
          {product.showPrice ? (
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-base font-bold text-site-fg">{formatMinorTry(displayPrice)}</span>
              {compareAt && compareAt > displayPrice ? (
                <span className="text-xs text-site-muted line-through">
                  {formatMinorTry(compareAt)}
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-site-muted">Fiyat için iletişime geçin</p>
          )}
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
