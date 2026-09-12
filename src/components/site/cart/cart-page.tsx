"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Trash2, Truck } from "lucide-react";
import { CartNotices } from "@/components/site/cart/cart-notices";
import { useCart } from "@/components/site/cart/cart-provider";
import { DemoModeBanner } from "@/components/site/demo-mode-banner";
import type { DemoNotice } from "@/lib/site-access";
import { usePerformance } from "@/components/site/performance-provider";
import { SiteImage, SiteImageFallback } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { cartLineIssueLabel } from "@/lib/cart-sync";
import type { CartDeliveryCode, HydratedCartLine } from "@/lib/checkout-types";
import { formatMinorTl, formatMinorTry, taxExcludedMinor } from "@/lib/product-money";
import { formatPersonalizationSummary } from "@/lib/product-personalization";

const CART_ORANGE = "text-[#f27a1a]";

function cartDeliveryLabel(code: CartDeliveryCode | null) {
  switch (code) {
    case "SAME_DAY":
      return "Hızlı Teslimat: aynı gün kargoda";
    case "DAYS_1_3":
      return "Hızlı Teslimat: 2 gün içinde kargoda";
    case "DAYS_3_5":
      return "Teslimat: 3-5 gün içinde kargoda";
    case "DAYS_5_10":
      return "Teslimat: 5-10 gün içinde kargoda";
    case null:
      return "Hızlı Teslimat: 2 gün içinde kargoda";
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}

function splitTitle(title: string, brandName: string | null) {
  if (!brandName) return { brand: null, rest: title };
  const prefix = title.slice(0, brandName.length);
  if (prefix.toLocaleLowerCase("tr-TR") === brandName.toLocaleLowerCase("tr-TR")) {
    return { brand: brandName, rest: title.slice(brandName.length).trim() };
  }
  return { brand: brandName, rest: title };
}

function selectedTaxMinor(lines: HydratedCartLine[]) {
  return lines.reduce((sum, line) => {
    return sum + (line.totalMinor - taxExcludedMinor(line.totalMinor, line.taxRatePercent));
  }, 0);
}

const checkboxClass =
  "h-4 w-4 shrink-0 rounded border-site-border text-[#f27a1a] accent-[#f27a1a]";

export function CartPage({ demoNotice = null }: { demoNotice?: DemoNotice | null }) {
  const perf = usePerformance();
  const {
    ready,
    lines,
    hydrated,
    notices,
    dismissNotice,
    selectedIds,
    setQuantity,
    removeItem,
    toggleSelected,
    setAllSelected,
  } = useCart();
  const [openSavings, setOpenSavings] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const visibleLines = hydrated?.lines ?? [];
  const selectedLines = visibleLines.filter(
    (line) => line.available && selectedIds.includes(line.lineKey),
  );
  const selectable = visibleLines.filter((line) => line.available);
  const allSelected = selectable.length > 0 && selectedLines.length === selectable.length;
  const selectedTotal = selectedLines.reduce((sum, line) => sum + line.totalMinor, 0);
  const selectedTax = selectedTaxMinor(selectedLines);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = selectedLines.length > 0 && !allSelected;
  }, [allSelected, selectedLines.length]);

  if (!ready || (lines.length > 0 && !hydrated)) {
    return <CartPending rowCount={Math.max(lines.length, 2)} />;
  }

  if (lines.length === 0) {
    return (
      <div>
        {demoNotice ? <DemoModeBanner notice={demoNotice} variant="panel" /> : null}
        <CartNotices notices={notices} onDismiss={dismissNotice} />
        <div className="rounded-xl border border-site-border bg-site-card px-6 py-16 text-center">
          <p className="font-display text-xl font-semibold text-site-fg">Sepetiniz boş</p>
          <p className="mt-2 text-sm text-site-muted">Ürün ekleyip alışverişe devam edebilirsiniz.</p>
          <SiteLink
            href="/katalog"
            prefetch={perf.prefetchLinks}
            className="mt-6 inline-flex rounded-md bg-site-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            Alışverişe başla
          </SiteLink>
        </div>
      </div>
    );
  }

  return (
    <div>
      {demoNotice ? <DemoModeBanner notice={demoNotice} variant="panel" /> : null}
      <CartNotices notices={notices} onDismiss={dismissNotice} />
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="overflow-hidden rounded-xl border border-site-border bg-site-card">
        <div className="border-b border-site-border px-4 py-3 sm:px-5">
          <label className="inline-flex items-center gap-2 text-sm text-site-muted">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              disabled={selectable.length === 0}
              onChange={(event) => setAllSelected(event.target.checked)}
              className={checkboxClass}
              aria-label="Tümünü seç"
            />
          </label>
        </div>
        <ul>
          {visibleLines.map((line, index) => (
            <CartLineRow
              key={line.lineKey}
              line={line}
              selected={line.available && selectedIds.includes(line.lineKey)}
              savingsOpen={openSavings === line.lineKey}
              imagePriority={index < perf.checkoutImageEager}
              prefetch={perf.prefetchLinks}
              onToggle={() => {
                if (!line.available) return;
                toggleSelected(line.lineKey);
              }}
              onQuantity={(quantity) => setQuantity(line.lineKey, quantity)}
              onRemove={() => removeItem(line.lineKey)}
              onToggleSavings={() =>
                setOpenSavings((current) => (current === line.lineKey ? null : line.lineKey))
              }
            />
          ))}
        </ul>
      </div>

      <aside className="h-fit rounded-xl border border-site-border bg-site-card p-5 lg:sticky lg:top-28">
        <h2 className="text-sm font-semibold text-site-fg">Sipariş özeti</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-site-muted">Seçilen ürünler</dt>
            <dd className="font-medium text-site-fg">{formatMinorTry(selectedTotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-site-muted">KDV</dt>
            <dd className="text-site-fg">{formatMinorTry(selectedTax)}</dd>
          </div>
        </dl>
        <p className={`mt-4 border-t border-site-border pt-4 text-lg font-bold ${CART_ORANGE}`}>
          {formatMinorTl(selectedTotal)}
        </p>
        <p className="mt-1 text-xs text-site-muted">Kargo ücreti sonraki adımda hesaplanır.</p>
        {selectedLines.length === 0 ? (
          <p className="mt-4 text-sm text-site-muted">
            {selectable.length === 0
              ? "Sepette ödenebilir ürün yok. Stokta olmayanları çıkarın veya bekleyin."
              : "Ödemeye geçmek için ürün seçin."}
          </p>
        ) : (
          <SiteLink
            href="/odeme?adim=adres"
            prefetch={perf.checkoutPrefetch}
            className="mt-5 flex w-full items-center justify-center rounded-md bg-site-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            Ödemeye geç
          </SiteLink>
        )}
      </aside>
    </div>
    </div>
  );
}

function CartPending({ rowCount }: { rowCount: number }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]" aria-busy="true" aria-label="Sepet yükleniyor">
      <div className="overflow-hidden rounded-xl border border-site-border bg-site-card">
        <div className="border-b border-site-border px-4 py-3 sm:px-5">
          <span className="block h-4 w-4 rounded bg-site-surface" />
        </div>
        <ul>
          {Array.from({ length: rowCount }, (_, index) => (
            <li key={index} className="border-b border-site-border px-4 py-5 last:border-b-0 sm:px-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <span className="mt-8 h-4 w-4 shrink-0 rounded bg-site-surface" />
                <span className="h-[88px] w-[88px] shrink-0 rounded-lg bg-site-surface" />
                <div className="min-w-0 flex-1 space-y-3">
                  <span className="block h-4 w-3/4 rounded bg-site-surface" />
                  <span className="block h-3 w-1/2 rounded bg-site-surface" />
                  <span className="block h-3 w-2/5 rounded bg-site-surface" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <aside className="h-fit rounded-xl border border-site-border bg-site-card p-5">
        <span className="block h-4 w-28 rounded bg-site-surface" />
        <span className="mt-4 block h-3 w-full rounded bg-site-surface" />
        <span className="mt-2 block h-3 w-2/3 rounded bg-site-surface" />
        <span className="mt-6 block h-10 w-full rounded-md bg-site-surface" />
      </aside>
    </div>
  );
}

function CartLineRow({
  line,
  selected,
  savingsOpen,
  imagePriority,
  prefetch,
  onToggle,
  onQuantity,
  onRemove,
  onToggleSavings,
}: {
  line: HydratedCartLine;
  selected: boolean;
  savingsOpen: boolean;
  imagePriority: boolean;
  prefetch: boolean;
  onToggle: () => void;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  onToggleSavings: () => void;
}) {
  const { brand, rest } = splitTitle(line.title, line.brandName);
  const minQty = line.minOrderQty;
  const step = line.quantityStep;
  const maxQty = line.maxQuantity;
  const canDecrease = line.available && line.quantity - step >= minQty;
  const canIncrease =
    line.available && (maxQty == null || line.quantity + step <= maxQty);
  const issueLabel = line.issue ? cartLineIssueLabel(line.issue) : null;

  const quantityPicker = (
    <div className="flex flex-col items-center">
      {maxQty != null ? (
        <span className="mb-1 rounded-full bg-[#fde8ea] px-2 py-0.5 text-[10px] font-semibold text-[#e85d6a]">
          Maks Adet
        </span>
      ) : (
        <span className="mb-1 h-[18px]" />
      )}
      <div className="inline-flex h-9 items-center rounded-full border border-site-border px-1">
        <button
          type="button"
          disabled={!canDecrease}
          onClick={() => onQuantity(line.quantity - step)}
          className="h-8 w-8 text-lg leading-none text-site-muted disabled:opacity-30"
          aria-label="Azalt"
        >
          −
        </button>
        <span className={`min-w-8 text-center text-sm font-bold ${CART_ORANGE}`}>{line.quantity}</span>
        <button
          type="button"
          disabled={!canIncrease}
          onClick={() => onQuantity(line.quantity + step)}
          className="h-8 w-8 text-lg leading-none text-site-muted disabled:opacity-30"
          aria-label="Artır"
        >
          +
        </button>
      </div>
    </div>
  );

  const priceBlock = (
    <div className="text-right">
      {line.priceChange ? (
        <p className="text-xs text-site-muted line-through">
          {formatMinorTl(line.priceChange.fromMinor * line.quantity)}
        </p>
      ) : null}
      <p className={`text-xl font-bold ${line.available ? CART_ORANGE : "text-site-muted"}`}>
        {formatMinorTl(line.available ? line.totalMinor : line.unitPriceMinor * line.quantity)}
      </p>
      {line.priceChange ? (
        <p
          className={`mt-0.5 text-xs font-medium ${
            line.priceChange.toMinor > line.priceChange.fromMinor ? "text-amber-700" : "text-emerald-700"
          }`}
        >
          {line.priceChange.toMinor > line.priceChange.fromMinor ? "Fiyat arttı" : "Fiyat düştü"}:{" "}
          {formatMinorTry(line.priceChange.fromMinor)} → {formatMinorTry(line.priceChange.toMinor)}
        </p>
      ) : null}
      {line.savingsMinor > 0 ? (
        <button
          type="button"
          onClick={onToggleSavings}
          className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-site-muted"
        >
          Kazancın: {formatMinorTl(line.savingsMinor)}
          <ChevronDown className={`h-3.5 w-3.5 transition ${savingsOpen ? "rotate-180" : ""}`} />
        </button>
      ) : null}
      {savingsOpen && line.compareAtMinor ? (
        <p className="mt-1 text-[11px] text-site-muted">
          Liste: {formatMinorTl(line.compareAtMinor * line.quantity)}
        </p>
      ) : null}
    </div>
  );

  return (
    <li className={`border-b border-site-border px-4 py-5 last:border-b-0 sm:px-5 ${line.available ? "" : "bg-site-surface/60"}`}>
      <div className="flex items-start gap-3 sm:gap-4">
        <input
          type="checkbox"
          checked={selected}
          disabled={!line.available}
          onChange={onToggle}
          className={`${checkboxClass} mt-8 disabled:opacity-40`}
          aria-label={`${line.title} seç`}
        />

        <SiteLink
          href={line.href}
          prefetch={prefetch}
          className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-lg border border-site-border bg-site-surface"
        >
          {line.image ? (
            <SiteImage
              src={line.image}
              alt={line.title}
              fill
              priority={imagePriority}
              className="object-cover"
              sizes="88px"
            />
          ) : (
            <SiteImageFallback fill />
          )}
        </SiteLink>

        <div className="flex min-w-0 flex-1 flex-col gap-4 md:flex-row md:items-stretch md:gap-6">
          <div className="min-w-0 flex-1">
            <SiteLink
              href={line.href}
              prefetch={prefetch}
              className="text-sm leading-snug text-site-fg hover:text-site-primary"
            >
              {brand ? <span className="font-bold">{brand} </span> : null}
              <span className={brand ? "font-normal" : "font-semibold"}>{rest}</span>
            </SiteLink>
            {line.variantTitle ? (
              <p className="mt-1 text-xs text-site-muted">{line.variantTitle}</p>
            ) : null}
            {line.personalization ? (
              <p className="mt-1 text-xs text-site-muted">
                {formatPersonalizationSummary(line.personalization)}
              </p>
            ) : null}
            {issueLabel ? (
              <p className="mt-2 text-xs font-medium text-rose-600">{issueLabel}</p>
            ) : (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <Truck className="h-3.5 w-3.5" />
                {cartDeliveryLabel(line.estimatedDelivery)}
              </p>
            )}
          </div>

          <div className="flex items-end justify-between gap-4 md:min-w-[17rem] md:items-stretch md:justify-end md:gap-8">
            <div className="md:flex md:items-center">{quantityPicker}</div>
            <div className="flex flex-col items-end justify-between md:min-h-[88px]">
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-1 text-sm text-site-muted hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
                Sil
              </button>
              {priceBlock}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
