"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductAttributeDisplayType, ProductSaleUnit } from "@prisma/client";
import { useCart } from "@/components/site/cart/cart-provider";
import { SiteImage, SiteImageFallback } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { SaleCountdown, useTickingNow } from "@/components/site/catalog/sale-countdown";
import { pickSellableVariants } from "@/lib/catalog-storefront";
import { fallbackSwatchHex } from "@/lib/product-attributes";
import { productSaleUnitShort } from "@/lib/product-editor";
import { formatMinorTry, taxIncludedMinor } from "@/lib/product-money";
import { resolveSalePrice } from "@/lib/product-sale";
import { isVariantPurchasable, type OutOfStockBehavior } from "@/lib/product-stock";
import {
  buildStorefrontVariantAxes,
  constrainVariantSelection,
  findVariantBySelection,
  selectionFromSearchParams,
  selectionMapFromVariant,
  valuesAvailableForAxis,
  writeVariantSearchToUrl,
  type StorefrontVariantOption,
} from "@/lib/storefront-variant-picker";

export type StorefrontVariant = {
  id: string;
  title: string;
  sku: string;
  priceMinor: number;
  compareAtMinor: number | null;
  saleStartsAt?: Date | string | null;
  saleEndsAt?: Date | string | null;
  stockQuantity: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  isDefault: boolean;
  image: string | null;
  selectionCount?: number;
  selections: StorefrontVariantOption[];
};

export type StorefrontGalleryImage = {
  id: string;
  url: string;
  alt: string | null;
};

export function ProductBuyBox({
  title,
  brandName = null,
  brandHref = null,
  sku = null,
  onlineOnly = false,
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
  outOfStockBehavior,
  deliveryLabel,
  galleryEager = 1,
}: {
  title: string;
  brandName?: string | null;
  brandHref?: string | null;
  sku?: string | null;
  onlineOnly?: boolean;
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
  outOfStockBehavior: OutOfStockBehavior;
  deliveryLabel?: string | null;
  galleryEager?: number;
}) {
  const sellable = useMemo(() => pickSellableVariants(variants), [variants]);
  const defaultVariant =
    sellable.find((item) => item.isDefault) ?? sellable[0] ?? variants[0] ?? null;
  const axes = useMemo(() => buildStorefrontVariantAxes(sellable), [sellable]);
  const router = useRouter();
  const { addItem } = useCart();
  const [picked, setPicked] = useState(() => selectionMapFromVariant(defaultVariant));
  const [qty, setQty] = useState(Math.max(1, minOrderQty));
  const [activeImage, setActiveImage] = useState(gallery[0]?.url ?? "");
  const [added, setAdded] = useState(false);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlReadyRef = useRef(false);

  const flashAdded = () => {
    setAdded(true);
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    addedTimerRef.current = setTimeout(() => setAdded(false), 1800);
  };

  useEffect(() => {
    return () => {
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    };
  }, []);

  const variant = useMemo(
    () =>
      findVariantBySelection(sellable, picked) ??
      sellable.find((item) => item.id === defaultVariant?.id) ??
      sellable[0] ??
      variants[0],
    [defaultVariant?.id, picked, sellable, variants],
  );
  const saleTick = Boolean(variant?.saleStartsAt || variant?.saleEndsAt);
  const now = useTickingNow(saleTick);
  const resolvedSale = variant
    ? resolveSalePrice(
        {
          priceMinor: variant.priceMinor,
          compareAtMinor: variant.compareAtMinor,
          saleStartsAt: variant.saleStartsAt,
          saleEndsAt: variant.saleEndsAt,
        },
        now ?? undefined,
      )
    : null;
  const hasAxisPicker = axes.length > 0 && sellable.length > 1;
  const hasFallbackSelect = !hasAxisPicker && sellable.length > 1;

  useEffect(() => {
    if (axes.length === 0) return;
    if (!urlReadyRef.current) {
      urlReadyRef.current = true;
      const fromUrl = selectionFromSearchParams(
        axes,
        new URLSearchParams(window.location.search),
      );
      if (Object.keys(fromUrl).length > 0) {
        const merged = { ...picked, ...fromUrl };
        const next = axes[0]
          ? constrainVariantSelection(axes, sellable, merged, axes[0].attributeId)
          : merged;
        setPicked(next);
        const match = findVariantBySelection(sellable, next);
        if (match?.image) setActiveImage(match.image);
        writeVariantSearchToUrl(axes, next);
        return;
      }
    }
    writeVariantSearchToUrl(axes, picked);
  }, [axes, picked, sellable]);
  const image = variant?.image || activeImage || gallery[0]?.url || null;
  const priceIncl = resolvedSale
    ? taxIncludedMinor(resolvedSale.priceMinor, taxRatePercent)
    : 0;
  const compareIncl =
    resolvedSale?.compareAtMinor != null
      ? taxIncludedMinor(resolvedSale.compareAtMinor, taxRatePercent)
      : null;
  const hasPhysicalStock =
    !variant?.trackInventory || (variant?.stockQuantity ?? 0) > 0;
  const canOrder =
    availableForOrder &&
    Boolean(
      variant &&
        isVariantPurchasable({
          trackInventory: variant.trackInventory,
          stockQuantity: variant.stockQuantity,
          neededQuantity: qty,
          allowBackorder: variant.allowBackorder,
          outOfStockBehavior,
        }),
    );
  const unitLabel = productSaleUnitShort(saleUnit);
  const displaySku = (variant?.sku?.trim() || sku?.trim() || "") || null;
  const showMeta = Boolean(brandName || displaySku || onlineOnly);

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
              priority={galleryEager > 0}
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <SiteImageFallback fill />
          )}
        </div>
        {gallery.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {gallery.map((item, index) => (
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
                <SiteImage
                  src={item.url}
                  alt={item.alt || title}
                  fill
                  priority={index < galleryEager}
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <header className="mb-4">
          <h1 className="text-[1.0625rem] font-medium leading-snug tracking-tight text-site-fg sm:text-lg">
            {title}
          </h1>
          {showMeta ? (
            <p className="mt-1.5 text-[12px] font-normal leading-relaxed tracking-wide text-site-muted">
              {brandName ? (
                brandHref ? (
                  <SiteLink href={brandHref} className="transition-colors hover:text-site-fg">
                    {brandName}
                  </SiteLink>
                ) : (
                  <span>{brandName}</span>
                )
              ) : null}
              {brandName && displaySku ? " " : null}
              {displaySku ? <span>SKU: {displaySku}</span> : null}
              {(brandName || displaySku) && onlineOnly ? (
                <span className="mx-1.5 text-site-border">·</span>
              ) : null}
              {onlineOnly ? <span>Sadece çevrimiçi</span> : null}
            </p>
          ) : null}
        </header>
        {showPrice ? (
          <div className="flex flex-wrap items-end gap-3">
            {compareIncl && compareIncl > priceIncl ? (
              <p className="text-lg text-site-muted line-through">{formatMinorTry(compareIncl)}</p>
            ) : null}
            <p
              className={`font-display text-3xl font-semibold tracking-tight ${
                compareIncl && compareIncl > priceIncl ? "text-rose-600" : "text-site-primary"
              }`}
            >
              {formatMinorTry(priceIncl)}
            </p>
            <span className="text-sm text-site-muted">KDV dahil / {unitLabel}</span>
          </div>
        ) : (
          <p className="text-site-muted">Fiyat için bizimle iletişime geçin.</p>
        )}
        {resolvedSale?.onSale && resolvedSale.saleEndsAt ? (
          <SaleCountdown endsAt={resolvedSale.saleEndsAt} />
        ) : null}

        {hasAxisPicker ? (
          <div className="mt-6 space-y-4">
            {axes.map((axis, index) => {
              const required: Record<string, string> = {};
              for (let prior = 0; prior < index; prior += 1) {
                const priorAxis = axes[prior];
                if (!priorAxis) continue;
                const valueId = picked[priorAxis.attributeId];
                if (valueId) required[priorAxis.attributeId] = valueId;
              }
              const available = valuesAvailableForAxis(sellable, axis.attributeId, required);
              const showAllValues = axis.displayType === "COLOR" || axis.displayType === "IMAGE";
              return (
                <VariantAxisField
                  key={axis.attributeId}
                  name={axis.name}
                  displayType={axis.displayType}
                  values={
                    showAllValues
                      ? axis.values
                      : axis.values.filter((value) => available.has(value.id))
                  }
                  availableIds={available}
                  selectedId={picked[axis.attributeId] ?? ""}
                  onChange={(valueId) => {
                    const next = constrainVariantSelection(
                      axes,
                      sellable,
                      { ...picked, [axis.attributeId]: valueId },
                      axis.attributeId,
                    );
                    setPicked(next);
                    const match = findVariantBySelection(sellable, next);
                    if (match?.image) setActiveImage(match.image);
                  }}
                />
              );
            })}
          </div>
        ) : null}

        {hasFallbackSelect ? (
          <div className="mt-6">
            <label className="mb-1.5 block text-sm font-medium text-site-fg">Seçenek</label>
            <select
              value={variant?.id ?? ""}
              onChange={(event) => {
                const next = sellable.find((item) => item.id === event.target.value);
                setPicked(selectionMapFromVariant(next));
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
          {hasPhysicalStock
            ? inStockLabel || "Stokta"
            : canOrder
              ? outOfStockLabel || "Ön sipariş"
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
                  addItem(variant.id, qty, priceIncl);
                  flashAdded();
                }}
                className={`inline-flex rounded-md px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition ${
                  added
                    ? "bg-emerald-600 hover:bg-emerald-600"
                    : "bg-site-primary hover:brightness-110"
                }`}
              >
                {added ? "Sepete eklendi" : "Sepete ekle"}
              </button>
              <button
                type="button"
                onClick={() => {
                  addItem(variant.id, qty, priceIncl);
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

function VariantAxisField({
  name,
  displayType,
  values,
  availableIds,
  selectedId,
  onChange,
}: {
  name: string;
  displayType: ProductAttributeDisplayType;
  values: Array<{
    id: string;
    name: string;
    colorHex: string | null;
    image: string | null;
  }>;
  availableIds: Set<string>;
  selectedId: string;
  onChange: (valueId: string) => void;
}) {
  switch (displayType) {
    case "COLOR":
      return (
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-site-fg">{name}</legend>
          <div className="flex flex-wrap items-center gap-2">
            {values.map((value) => {
              const selected = selectedId === value.id;
              const enabled = availableIds.has(value.id);
              return (
                <button
                  key={value.id}
                  type="button"
                  title={value.name}
                  disabled={!enabled}
                  aria-pressed={selected}
                  onClick={() => onChange(value.id)}
                  className={`h-8 w-8 rounded-full border ${
                    selected
                      ? "border-site-primary ring-2 ring-site-primary/30"
                      : "border-site-border"
                  } ${enabled ? "" : "cursor-not-allowed opacity-35"}`}
                  style={{ backgroundColor: fallbackSwatchHex(value.name, value.colorHex) }}
                >
                  <span className="sr-only">{value.name}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      );
    case "IMAGE":
      if (values.some((value) => value.image)) {
        return (
          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-site-fg">{name}</legend>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => (
                <button
                  key={value.id}
                  type="button"
                  title={value.name}
                  aria-pressed={selectedId === value.id}
                  onClick={() => onChange(value.id)}
                  className={`relative h-12 w-12 overflow-hidden rounded-md border ${
                    selectedId === value.id
                      ? "border-site-primary ring-2 ring-site-primary/30"
                      : "border-site-border"
                  }`}
                >
                  {value.image ? (
                    <SiteImage src={value.image} alt={value.name} fill className="object-cover" sizes="48px" />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-[10px] text-site-muted">
                      {value.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </fieldset>
        );
      }
      return (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-site-fg">{name}</span>
          <select
            value={selectedId}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-md border border-site-border bg-site-card px-3 py-2.5 text-sm"
          >
            {values.map((value) => (
              <option key={value.id} value={value.id}>
                {value.name}
              </option>
            ))}
          </select>
        </label>
      );
    case "BUTTON": {
      const selectedName = values.find((value) => value.id === selectedId)?.name ?? "";
      return (
        <div>
          <p className="mb-2 text-sm font-medium text-site-fg">
            {name}
            {selectedName ? `: ${selectedName}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => {
              const selected = selectedId === value.id;
              return (
                <button
                  key={value.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(value.id)}
                  className={`min-w-10 rounded-md border px-3 py-2 text-sm font-medium transition ${
                    selected
                      ? "border-site-primary bg-site-primary-soft text-site-primary"
                      : "border-site-border bg-site-surface text-site-fg hover:border-site-primary/50"
                  }`}
                >
                  {value.name}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    case "TEXT":
      return (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-site-fg">{name}</span>
          <select
            value={selectedId}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-md border border-site-border bg-site-card px-3 py-2.5 text-sm"
          >
            {values.map((value) => (
              <option key={value.id} value={value.id}>
                {value.name}
              </option>
            ))}
          </select>
        </label>
      );
    default: {
      const _exhaustive: never = displayType;
      return _exhaustive;
    }
  }
}
