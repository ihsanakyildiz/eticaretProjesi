"use client";

import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import type { ProductListVariantRow } from "@/lib/admin-product-list";
import { formatMinorToMajorInput, formatMinorTry, parseMajorToMinor } from "@/lib/product-money";
import { hasStoredCampaign } from "@/lib/product-sale";
import {
  listProductVariantsAction,
  toggleVariantFeedSyncLockAction,
  updateProductVariantQuickAction,
  type ProductSaleResult,
} from "./actions";
import { FEED_SYNC_LOCK_TITLE, FeedSyncLockCheckbox } from "./product-list-feed-lock";
import { ProductSaleModal, SalePlusButton, type ProductSaleTarget } from "./product-list-sale-modal";
import { QuickEditCell } from "./product-list-quick-edit";

function VariantQuickRow({
  variant,
  canUpdate,
  lockStock,
  canApplyAll,
  onUpdated,
  onOpenSale,
}: {
  variant: ProductListVariantRow;
  canUpdate: boolean;
  lockStock: boolean;
  canApplyAll: boolean;
  onUpdated: (next: ProductListVariantRow) => void;
  onOpenSale: (target: ProductSaleTarget) => void;
}) {
  const [lockPending, setLockPending] = useState(false);

  const saveField = (patch: { barcode?: string; priceMinor?: number; stockQuantity?: number }) =>
    updateProductVariantQuickAction({
      variantId: variant.id,
      ...patch,
    })
      .then((result) => {
        if (result.error || !result.variant) {
          return { error: result.error ?? "Kayıt güncellenemedi." };
        }
        onUpdated(result.variant);
        if (patch.barcode !== undefined) {
          return { savedValue: result.variant.barcode ?? "" };
        }
        if (patch.priceMinor !== undefined) {
          return { savedValue: formatMinorToMajorInput(result.variant.priceMinor) };
        }
        if (patch.stockQuantity !== undefined) {
          return { savedValue: String(result.variant.stockQuantity) };
        }
        return {};
      })
      .catch(() => ({ error: "Kayıt güncellenemedi." }));

  const saveFeedLock = (next: boolean) => {
    const previous = variant.feedSyncLocked;
    setLockPending(true);
    onUpdated({ ...variant, feedSyncLocked: next });
    void toggleVariantFeedSyncLockAction({
      variantId: variant.id,
      feedSyncLocked: next,
    })
      .then((result) => {
        if (result.error || !result.variant) {
          onUpdated({ ...variant, feedSyncLocked: previous });
          return;
        }
        onUpdated(result.variant);
      })
      .catch(() => {
        onUpdated({ ...variant, feedSyncLocked: previous });
      })
      .finally(() => setLockPending(false));
  };

  return (
    <div className="grid grid-cols-[minmax(0,1.6fr)_110px_minmax(140px,1fr)_148px_90px_48px] items-start gap-2 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
          {variant.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={variant.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] font-semibold text-[#405189]">
              {variant.title.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800">{variant.title}</p>
          {variant.isActive ? null : (
            <p className="text-[11px] font-medium text-slate-400">Pasif</p>
          )}
        </div>
      </div>
      <span className="truncate pt-1.5 font-mono text-xs text-slate-500">{variant.sku}</span>
      <QuickEditCell
        savedValue={variant.barcode ?? ""}
        ariaLabel={`${variant.title} barkod`}
        placeholder="Barkod"
        disabled={!canUpdate}
        formatGhost={(value) => value.trim() || "—"}
        normalize={(raw) => ({ ok: true, value: raw.replace(/\s+/g, "").trim().toUpperCase() })}
        onCommit={(value) => saveField({ barcode: value })}
      />
      <QuickEditCell
        savedValue={formatMinorToMajorInput(variant.priceMinor)}
        ariaLabel={`${variant.title} fiyat`}
        inputMode="decimal"
        disabled={!canUpdate}
        trailing={
          <SalePlusButton
            active={hasStoredCampaign(variant)}
            disabled={!canUpdate}
            label={`${variant.title} indirim`}
            onClick={() =>
              onOpenSale({
                variantId: variant.id,
                productId: variant.productId,
                title: variant.title,
                priceMinor: variant.priceMinor,
                compareAtMinor: variant.compareAtMinor,
                saleStartsAt: variant.saleStartsAt,
                saleEndsAt: variant.saleEndsAt,
                canApplyAll,
              })
            }
          />
        }
        formatGhost={(value) => {
          const minor = parseMajorToMinor(value);
          return minor == null ? value : formatMinorTry(minor);
        }}
        normalize={(raw) => {
          const minor = parseMajorToMinor(raw);
          if (minor == null) return { ok: false, error: "Geçerli fiyat girin" };
          return { ok: true, value: formatMinorToMajorInput(minor) };
        }}
        onCommit={(value) => {
          const minor = parseMajorToMinor(value);
          if (minor == null) return Promise.resolve({ error: "Geçerli fiyat girin" });
          return saveField({ priceMinor: minor });
        }}
      />
      <QuickEditCell
        savedValue={String(variant.stockQuantity)}
        ariaLabel={`${variant.title} stok`}
        inputMode="numeric"
        disabled={!canUpdate || lockStock}
        formatGhost={(value) => value}
        normalize={(raw) => {
          const parsed = Number.parseInt(raw.trim(), 10);
          if (!Number.isFinite(parsed) || parsed < 0) {
            return { ok: false, error: "Geçerli stok girin" };
          }
          return { ok: true, value: String(parsed) };
        }}
        onCommit={(value) => saveField({ stockQuantity: Number.parseInt(value, 10) })}
      />
      <FeedSyncLockCheckbox
        checked={variant.feedSyncLocked}
        disabled={!canUpdate || lockPending}
        label={`${variant.title} XML/API koruması`}
        onChange={saveFeedLock}
      />
    </div>
  );
}

export function ProductListVariantsPanel({
  productId,
  productImage,
  canUpdate,
  lockStock,
  onStockChange,
  onSaleChange,
}: {
  productId: string;
  productImage: string | null;
  canUpdate: boolean;
  lockStock: boolean;
  onStockChange?: (stockQuantity: number) => void;
  onSaleChange?: (result: ProductSaleResult) => void;
}) {
  const headingId = useId();
  const [variants, setVariants] = useState<ProductListVariantRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saleTarget, setSaleTarget] = useState<ProductSaleTarget | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listProductVariantsAction(productId)
      .then((result) => {
        if (cancelled) return;
        if (result.error || !result.variants) {
          setError(result.error ?? "Varyantlar yüklenemedi.");
          setVariants([]);
          setLoading(false);
          return;
        }
        setVariants(result.variants);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Varyantlar yüklenemedi.");
        setVariants([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const updateVariant = (next: ProductListVariantRow) => {
    setVariants((prev) => {
      const current = prev ?? [];
      return current.map((item) => (item.id === next.id ? next : item));
    });
    const current = variants ?? [];
    const previousStock = current.reduce((sum, item) => sum + item.stockQuantity, 0);
    const nextStock = current
      .map((item) => (item.id === next.id ? next : item))
      .reduce((sum, item) => sum + item.stockQuantity, 0);
    if (nextStock !== previousStock) onStockChange?.(nextStock);
  };

  const applySale = async (result: ProductSaleResult) => {
    onSaleChange?.(result);
    const reloaded = await listProductVariantsAction(productId);
    if (reloaded.variants) {
      setVariants(reloaded.variants);
      return;
    }
    if (result.variant) updateVariant(result.variant);
  };

  return (
    <div className="border-b border-[#e9ebec] bg-[#f8fafc]" role="region" aria-labelledby={headingId}>
      <div className="grid grid-cols-[minmax(0,1.6fr)_110px_minmax(140px,1fr)_148px_90px_48px] gap-2 border-b border-[#e9ebec] px-4 py-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        <span id={headingId}>Varyant</span>
        <span>SKU</span>
        <span>Barkod</span>
        <span>Fiyat</span>
        <span>Stok</span>
        <span title={FEED_SYNC_LOCK_TITLE}>Koru</span>
      </div>
      {lockStock ? (
        <p className="border-b border-[#e9ebec] px-4 py-1.5 text-[11px] text-slate-500">
          Stok adedi görünür; değişiklik gelişmiş stok sisteminden yapılır.
        </p>
      ) : null}
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Varyantlar yükleniyor…
        </div>
      ) : error ? (
        <p className="px-4 py-3 text-sm text-rose-600">{error}</p>
      ) : variants && variants.length > 0 ? (
        <div className="max-h-[420px] overflow-y-auto">
          {variants.map((variant) => (
            <div key={variant.id} className="border-b border-[#e9ebec] last:border-0">
              <VariantQuickRow
                variant={{ ...variant, image: variant.image || productImage }}
                canUpdate={canUpdate}
                lockStock={lockStock}
                canApplyAll={(variants?.length ?? 0) > 1}
                onUpdated={updateVariant}
                onOpenSale={setSaleTarget}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-3 text-sm text-slate-500">Bu üründe gösterilecek kombinasyon yok.</p>
      )}
      {saleTarget ? (
        <ProductSaleModal
          target={saleTarget}
          onClose={() => setSaleTarget(null)}
          onSaved={(result) => {
            void applySale(result);
          }}
        />
      ) : null}
    </div>
  );
}
