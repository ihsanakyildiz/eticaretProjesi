"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/site/cart/cart-provider";
import { SiteImage } from "@/components/site/site-image";
import { productSaleUnitShort } from "@/lib/product-editor";
import { formatMinorTry, taxIncludedMinor } from "@/lib/product-money";
import { pickSellableVariants } from "@/lib/catalog-storefront";
import type { ProductSaleUnit } from "@prisma/client";

export type StorefrontVariant = {
  id: string;
  title: string;
  sku: string;
  priceMinor: number;
  compareAtMinor: number | null;
  stockQuantity: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  isDefault: boolean;
  image: string | null;
  selectionCount?: number;
};

export type StorefrontGalleryImage = {
  id: string;
  url: string;
  alt: string | null;
};

export function ProductBuyBox({
  title,
  gallery,
  variants,
  taxRatePercent,
  showPrice,
  availableForOrder,
  saleUnit,
  minOrderQty,
  quantityStep,
  inStockLabel,
  outOfStockLabel,
  deliveryLabel,
}: {
  title: string;
  gallery: StorefrontGalleryImage[];
  variants: StorefrontVariant[];
  taxRatePercent: number;
  showPrice: boolean;
  availableForOrder: boolean;
  saleUnit: ProductSaleUnit;
  minOrderQty: number;
  quantityStep: number;
  inStockLabel: string | null;
  outOfStockLabel: string | null;
  deliveryLabel?: string | null;
}) {
  const sellable = useMemo(() => pickSellableVariants(variants), [variants]);
  const defaultId =
    sellable.find((item) => item.isDefault)?.id ?? sellable[0]?.id ?? variants[0]?.id ?? "";
  const router = useRouter();
  const { addItem } = useCart();
  const [variantId, setVariantId] = useState(defaultId);
  const [qty, setQty] = useState(Math.max(1, minOrderQty));
  const [activeImage, setActiveImage] = useState(gallery[0]?.url ?? "");
  const [added, setAdded] = useState(false);

  const variant = useMemo(
    () =>
      sellable.find((item) => item.id === variantId) ??
      sellable[0] ??
      variants[0],
    [variantId, sellable, variants],
  );
  const hasCombinations = sellable.length > 1;
  const image = variant?.image || activeImage || gallery[0]?.url || null;
  const priceIncl = variant ? taxIncludedMinor(variant.priceMinor, taxRatePercent) : 0;
  const compareIncl =
    variant?.compareAtMinor != null
      ? taxIncludedMinor(variant.compareAtMinor, taxRatePercent)
      : null;
  const inStock = !variant?.trackInventory || (variant?.stockQuantity ?? 0) > 0 || variant?.allowBackorder;
  const unitLabel = productSaleUnitShort(saleUnit);
  const canOrder = availableForOrder && inStock;

  const bumpQty = (direction: 1 | -1) => {
    const step = Math.max(1, quantityStep);
    const min = Math.max(1, minOrderQty);
    const next = qty + direction * step;
    setQty(Math.max(min, next));
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-lg border border-site-border bg-site-surface">
          {image ? (
            <SiteImage
              src={image}
              alt={title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-violet-100 to-slate-100" />
          )}
        </div>
        {gallery.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {gallery.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveImage(item.url)}
                onMouseEnter={() => setActiveImage(item.url)}
                className={`relative h-16 w-16 overflow-hidden rounded-md border ${
                  (activeImage || gallery[0]?.url) === item.url
                    ? "border-site-primary ring-2 ring-site-primary/30"
                    : "border-site-border"
                }`}
              >
                <SiteImage src={item.url} alt={item.alt || title} fill className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        {showPrice ? (
          <div className="flex flex-wrap items-end gap-3">
            <p className="font-display text-3xl font-bold text-site-fg">{formatMinorTry(priceIncl)}</p>
            {compareIncl && compareIncl > priceIncl ? (
              <p className="text-lg text-site-muted line-through">{formatMinorTry(compareIncl)}</p>
            ) : null}
            <span className="text-sm text-site-muted">KDV dahil / {unitLabel}</span>
          </div>
        ) : (
          <p className="text-site-muted">Fiyat için bizimle iletişime geçin.</p>
        )}

        {hasCombinations ? (
          <div className="mt-6">
            <label className="mb-1.5 block text-sm font-medium text-site-fg">Seçenek</label>
            <select
              value={variant?.id ?? ""}
              onChange={(event) => {
                const next = sellable.find((item) => item.id === event.target.value);
                setVariantId(event.target.value);
                if (next?.image) setActiveImage(next.image);
              }}
              className="w-full rounded-md border border-site-border bg-site-card px-3 py-2.5 text-sm"
            >
              {sellable.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <p className="mt-4 text-sm text-site-muted">
          {inStock
            ? inStockLabel || "Stokta"
            : outOfStockLabel || "Tükendi"}
          {variant?.trackInventory ? ` · ${variant.stockQuantity} ${unitLabel}` : ""}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-md border border-site-border">
            <button type="button" onClick={() => bumpQty(-1)} className="px-3 py-2 text-lg">
              −
            </button>
            <input
              type="number"
              min={Math.max(1, minOrderQty)}
              step={Math.max(1, quantityStep)}
              value={qty}
              onChange={(event) => setQty(Math.max(1, Number(event.target.value) || minOrderQty))}
              className="w-16 border-x border-site-border bg-transparent py-2 text-center text-sm"
            />
            <button type="button" onClick={() => bumpQty(1)} className="px-3 py-2 text-lg">
              +
            </button>
          </div>
          {canOrder && variant ? (
            <>
              <button
                type="button"
                onClick={() => {
                  addItem(variant.id, qty);
                  setAdded(true);
                }}
                className="inline-flex rounded-md bg-site-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                {added ? "Sepete eklendi" : "Sepete ekle"}
              </button>
              <button
                type="button"
                onClick={() => {
                  addItem(variant.id, qty);
                  router.push("/sepet");
                }}
                className="inline-flex rounded-md border border-site-border px-5 py-2.5 text-sm font-semibold text-site-fg transition hover:bg-site-surface"
              >
                Hemen al
              </button>
            </>
          ) : (
            <span className="rounded-full bg-site-surface px-5 py-2.5 text-sm font-semibold text-site-muted">
              Siparişe kapalı
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-site-muted">
          Minimum {Math.max(1, minOrderQty)} {unitLabel}
          {quantityStep > 1 ? ` · ${quantityStep} ${unitLabel} katları` : ""}
        </p>
        {deliveryLabel ? (
          <p className="mt-4 text-sm text-site-muted">Tahmini teslimat: {deliveryLabel}</p>
        ) : null}
      </div>
    </div>
  );
}
