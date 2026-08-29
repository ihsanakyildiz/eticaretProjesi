"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ImageIcon, Upload, X } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import { combinationDisplayTitle } from "@/lib/product-combination-filters";
import type { ProductVariantDraft } from "@/lib/product-editor";
import {
  formatMinorToMajorInput,
  parseMajorToMinor,
  taxIncludedMinor,
} from "@/lib/product-money";
import type { GeneratorAttribute } from "./generate-combinations-modal";

export type ProductGalleryPick = {
  preview: string;
  url?: string;
  file?: File;
};

type VariantEditForm = {
  sku: string;
  barcode: string;
  priceMajor: string;
  compareAtMajor: string;
  stockQuantity: number;
  isDefault: boolean;
  isActive: boolean;
  trackInventory: boolean;
  allowBackorder: boolean;
  image: string;
  imageRemoved: boolean;
  imageFile?: File;
  preview: string;
};

function formFromVariant(variant: ProductVariantDraft): VariantEditForm {
  const preview = variant.imageFile
    ? URL.createObjectURL(variant.imageFile)
    : (variant.image ?? "");
  return {
    sku: variant.sku,
    barcode: variant.barcode ?? "",
    priceMajor: formatMinorToMajorInput(variant.priceMinor),
    compareAtMajor:
      variant.compareAtMinor != null ? formatMinorToMajorInput(variant.compareAtMinor) : "",
    stockQuantity: variant.stockQuantity,
    isDefault: variant.isDefault,
    isActive: variant.isActive !== false,
    trackInventory: variant.trackInventory !== false,
    allowBackorder: Boolean(variant.allowBackorder),
    image: variant.image ?? "",
    imageRemoved: Boolean(variant.imageRemoved),
    imageFile: variant.imageFile,
    preview,
  };
}

function formToPatch(form: VariantEditForm): Partial<ProductVariantDraft> {
  return {
    sku: form.sku.trim() || "SKU",
    barcode: form.barcode.trim(),
    priceMinor: parseMajorToMinor(form.priceMajor) ?? 0,
    compareAtMinor: parseMajorToMinor(form.compareAtMajor),
    stockQuantity: Math.max(0, Math.round(form.stockQuantity)),
    isDefault: form.isDefault,
    isActive: form.isActive,
    trackInventory: form.trackInventory,
    allowBackorder: form.allowBackorder,
    image: form.imageRemoved ? "" : form.image,
    imageRemoved: form.imageRemoved,
    imageFile: form.imageFile,
  };
}

export function VariantEditModal({
  variant,
  list,
  attributes,
  productImages,
  taxRatePercent,
  onSave,
  onClose,
}: {
  variant: ProductVariantDraft;
  list: ProductVariantDraft[];
  attributes: GeneratorAttribute[];
  productImages: ProductGalleryPick[];
  taxRatePercent: number;
  onSave: (clientKey: string, patch: Partial<ProductVariantDraft>, nextKey?: string) => void;
  onClose: () => void;
}) {
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<VariantEditForm>(() => formFromVariant(variant));
  const index = Math.max(0, list.findIndex((item) => item.clientKey === variant.clientKey));
  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < list.length - 1;
  const title = combinationDisplayTitle(variant, attributes);
  const priceMinor = parseMajorToMinor(form.priceMajor) ?? 0;
  const priceIncl = taxIncludedMinor(priceMinor, taxRatePercent);
  const galleryPicks = productImages.filter((item) => item.url || item.file);

  useEffect(() => {
    const next = formFromVariant(variant);
    setForm(next);
    return () => {
      if (next.preview.startsWith("blob:")) URL.revokeObjectURL(next.preview);
    };
  }, [variant]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const persist = (nextKey?: string) => {
    onSave(variant.clientKey, formToPatch(form), nextKey);
  };

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <button type="button" aria-label="Kapat" className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="variant-edit-title"
        className="relative flex max-h-[min(92vh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e9ebec] px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Kombinasyon {index + 1} / {list.length}
            </p>
            <h2 id="variant-edit-title" className="mt-1 truncate text-base font-semibold text-slate-800">
              {title}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section>
            <p className="mb-2 text-sm font-medium text-slate-700">Kombinasyon görseli</p>
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-md border border-[#e9ebec] bg-[#f3f6f9]">
                {form.preview && !form.imageRemoved ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                )}
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="h-4 w-4" />
                  Görsel yükle
                </button>
                {form.preview && !form.imageRemoved ? (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        image: "",
                        imageFile: undefined,
                        imageRemoved: true,
                        preview: "",
                      }))
                    }
                    className="block text-sm text-rose-600 hover:underline"
                  >
                    Görseli kaldır
                  </button>
                ) : null}
                <input
                  id={fileId}
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setForm((prev) => {
                      if (prev.preview.startsWith("blob:")) URL.revokeObjectURL(prev.preview);
                      return {
                        ...prev,
                        image: "",
                        imageFile: file,
                        imageRemoved: false,
                        preview: URL.createObjectURL(file),
                      };
                    });
                  }}
                />
              </div>
            </div>
            {galleryPicks.length > 0 ? (
              <div className="mt-3">
                <p className="mb-1.5 text-xs text-slate-500">Ürün galerisinden seç</p>
                <div className="flex flex-wrap gap-2">
                  {galleryPicks.map((item, galleryIndex) => (
                    <button
                      key={`${item.url ?? item.preview}-${galleryIndex}`}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          image: item.url ?? "",
                          imageFile: item.url ? undefined : item.file,
                          imageRemoved: false,
                          preview: item.preview,
                        }))
                      }
                      className="h-14 w-14 overflow-hidden rounded-md border border-[#e9ebec] hover:border-[#0ab39c]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.preview} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Referans / SKU</label>
              <input
                value={form.sku}
                onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Barkod</label>
              <input
                value={form.barcode}
                onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Satış fiyatı (KDV hariç)
              </label>
              <input
                value={form.priceMajor}
                onChange={(e) => setForm((prev) => ({ ...prev, priceMajor: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Satış fiyatı (KDV dahil)
              </label>
              <input value={formatMinorToMajorInput(priceIncl)} readOnly className={`${inputClass} bg-[#f3f6f9]`} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Karşılaştırma fiyatı (KDV hariç)
              </label>
              <input
                value={form.compareAtMajor}
                onChange={(e) => setForm((prev) => ({ ...prev, compareAtMajor: e.target.value }))}
                className={inputClass}
                placeholder="İsteğe bağlı"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Stok adedi</label>
              <input
                type="number"
                min={0}
                value={form.stockQuantity}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    stockQuantity: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <AdminSwitch
              label="Varsayılan kombinasyon"
              checked={form.isDefault}
              onChange={(checked) => setForm((prev) => ({ ...prev, isDefault: checked }))}
            />
            <AdminSwitch
              label="Aktif"
              checked={form.isActive}
              onChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
            />
            <AdminSwitch
              label="Stok takibi"
              checked={form.trackInventory}
              onChange={(checked) => setForm((prev) => ({ ...prev, trackInventory: checked }))}
            />
            <AdminSwitch
              label="Stok yokken siparişe izin ver"
              description="Boş bırakılırsa ürünün genel stok kuralı kullanılır; bu anahtar yalnızca bu kombinasyonu etkiler."
              checked={form.allowBackorder}
              onChange={(checked) => setForm((prev) => ({ ...prev, allowBackorder: checked }))}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9ebec] bg-[#f3f6f9] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-600"
          >
            İptal
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={() => persist(list[index - 1]?.clientKey)}
              className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Önceki kombinasyon
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => persist(list[index + 1]?.clientKey)}
              className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
            >
              Sonraki kombinasyon
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => persist()}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
