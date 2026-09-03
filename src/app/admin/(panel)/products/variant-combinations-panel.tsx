"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Pencil, Sparkles, Trash2 } from "lucide-react";
import { COMBINATION_TABLE_PAGE_SIZE } from "@/lib/product-combinations";
import {
  formatMinorToMajorInput,
  fromChargeAndListPrice,
  parseMajorToMinor,
  toChargeAndListPrice,
} from "@/lib/product-money";
import type { ProductVariantDraft } from "@/lib/product-editor";
import { DEFAULT_VARIANT_COMBINATION_KEY } from "@/lib/product-variants";
import {
  buildCombinationFilterAxes,
  combinationDisplayTitle,
  combinationFilterIsActive,
  variantMatchesCombinationFilters,
  type CombinationFilterMap,
} from "@/lib/product-combination-filters";
import type { GeneratorAttribute } from "./generate-combinations-modal";
import { VariantEditModal, type ProductGalleryPick } from "./variant-edit-modal";
import { CatalogStockHint, catalogStockInputClass } from "./catalog-stock-field";

function AttributeFilterDropdown({
  axis,
  selectedIds,
  onChange,
}: {
  axis: { attributeId: string; name: string; values: Array<{ id: string; name: string; colorHex: string | null }> };
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = selectedIds.length > 0;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const allOn = axis.values.length > 0 && axis.values.every((value) => selectedIds.includes(value.id));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
          active
            ? "border-[#0ab39c] bg-[#0ab39c]/10 font-medium text-slate-800"
            : "border-[#e9ebec] bg-white text-slate-700 hover:bg-slate-50"
        }`}
        aria-expanded={open}
      >
        {axis.name}
        {active ? (
          <span className="rounded bg-[#0ab39c] px-1.5 text-[10px] font-semibold text-white">
            {selectedIds.length}
          </span>
        ) : null}
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute top-full left-0 z-30 mt-1 min-w-[180px] rounded-md border border-[#e9ebec] bg-white py-1 shadow-lg">
          <label className="flex cursor-pointer items-center gap-2 border-b border-[#e9ebec] px-3 py-1.5 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              className="accent-[#0ab39c]"
              checked={allOn}
              onChange={() => onChange(allOn ? [] : axis.values.map((value) => value.id))}
            />
            Tümü
          </label>
          <div className="max-h-56 overflow-y-auto">
            {axis.values.map((value) => {
              const on = selectedIds.includes(value.id);
              return (
                <label
                  key={value.id}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    className="accent-[#0ab39c]"
                    checked={on}
                    onChange={() => {
                      if (on) onChange(selectedIds.filter((id) => id !== value.id));
                      else onChange([...selectedIds, value.id]);
                    }}
                  />
                  {value.colorHex ? (
                    <span
                      className="inline-block h-3 w-3 rounded-sm border border-[#e9ebec]"
                      style={{ backgroundColor: value.colorHex }}
                    />
                  ) : null}
                  {value.name}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function VariantCombinationsPanel({
  hidden,
  variants,
  attributes,
  productImages,
  taxRatePercent,
  defaultStock,
  basePriceMinor,
  sku,
  inputClass,
  lockStock = false,
  onVariantsChange,
  onOpenGenerator,
}: {
  hidden: boolean;
  variants: ProductVariantDraft[];
  attributes: GeneratorAttribute[];
  productImages: ProductGalleryPick[];
  taxRatePercent: number;
  defaultStock: number;
  basePriceMinor: number;
  sku: string;
  inputClass: string;
  lockStock?: boolean;
  onVariantsChange: (next: ProductVariantDraft[] | ((prev: ProductVariantDraft[]) => ProductVariantDraft[])) => void;
  onOpenGenerator: () => void;
}) {
  const [filters, setFilters] = useState<CombinationFilterMap>({});
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(1);
  const [bulk, setBulk] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const hasCombinations = variants.some((item) => item.selections.length > 0);
  const axes = useMemo(
    () => buildCombinationFilterAxes(variants, attributes),
    [variants, attributes],
  );

  const filtered = useMemo(() => {
    if (!hasCombinations) return variants;
    return variants.filter((variant) => variantMatchesCombinationFilters(variant, filters));
  }, [filters, hasCombinations, variants]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / COMBINATION_TABLE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * COMBINATION_TABLE_PAGE_SIZE,
    safePage * COMBINATION_TABLE_PAGE_SIZE,
  );

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const filtersActive = combinationFilterIsActive(filters);
  const pageSelectedCount = pageItems.filter((item) => selectedKeys.has(item.clientKey)).length;
  const allPageSelected = pageItems.length > 0 && pageSelectedCount === pageItems.length;

  const updateVariant = (clientKey: string, patch: Partial<ProductVariantDraft>) => {
    onVariantsChange((prev) =>
      prev.map((item) => {
        if (item.clientKey === clientKey) return { ...item, ...patch };
        if (patch.isDefault) return { ...item, isDefault: false };
        return item;
      }),
    );
  };

  const saveEditedVariant = (
    clientKey: string,
    patch: Partial<ProductVariantDraft>,
    nextKey?: string,
  ) => {
    updateVariant(clientKey, patch);
    if (nextKey) setEditingKey(nextKey);
  };

  const editingVariant = editingKey
    ? (filtered.find((item) => item.clientKey === editingKey) ??
      variants.find((item) => item.clientKey === editingKey) ??
      null)
    : null;

  const togglePageSelection = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const item of pageItems) next.delete(item.clientKey);
      } else {
        for (const item of pageItems) next.add(item.clientKey);
      }
      return next;
    });
  };

  const deleteKeys = (keys: Set<string>) => {
    onVariantsChange((prev) => {
      const next = prev.filter((item) => !keys.has(item.clientKey));
      if (!next.length) {
        return [
          {
            clientKey: "default",
            sku: sku || "SKU",
            title: "Varsayılan",
            priceMinor: basePriceMinor,
            stockQuantity: 0,
            isDefault: true,
            isActive: true,
            combinationKey: DEFAULT_VARIANT_COMBINATION_KEY,
            selections: [],
          },
        ];
      }
      if (!next.some((item) => item.isDefault)) next[0].isDefault = true;
      return next;
    });
    setSelectedKeys(new Set());
  };

  const runBulk = (action: string) => {
    setBulk("");
    if (action === "select-page") {
      togglePageSelection();
      return;
    }
    if (action === "select-filtered") {
      setSelectedKeys(new Set(filtered.map((item) => item.clientKey)));
      return;
    }
    if (action === "clear-selection") {
      setSelectedKeys(new Set());
      return;
    }
    if (action === "delete-selected" && selectedKeys.size) {
      deleteKeys(selectedKeys);
    }
  };

  const from = filtered.length === 0 ? 0 : (safePage - 1) * COMBINATION_TABLE_PAGE_SIZE + 1;
  const to = Math.min(safePage * COMBINATION_TABLE_PAGE_SIZE, filtered.length);

  return (
    <section
      className={`rounded-lg border border-[#e9ebec] bg-white shadow-sm ${hidden ? "hidden" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9ebec] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Kombinasyonlar</h2>
          <p className="mt-1 text-sm text-slate-500">
            {lockStock
              ? "Fiyat her SKU satırındadır. Stok adedi ürün kartından değiştirilemez; gelişmiş stok sistemini kullanın."
              : "Stok ve fiyat her SKU satırındadır. Çok sayıda satır sayfalı listelenir; filtre ile daraltın."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasCombinations ? (
            <select
              value={bulk}
              onChange={(e) => runBulk(e.target.value)}
              className="rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="">Toplu eylemler</option>
              <option value="select-page">Bu sayfadakileri seç</option>
              <option value="select-filtered">Filtrelenenlerin tümünü seç</option>
              <option value="clear-selection">Seçimi temizle</option>
              <option value="delete-selected" disabled={selectedKeys.size === 0}>
                Seçilenleri sil ({selectedKeys.size})
              </option>
            </select>
          ) : null}
          <button
            type="button"
            onClick={onOpenGenerator}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            <Sparkles className="h-4 w-4" />
            Kombinasyon üret
          </button>
        </div>
      </div>

      {!hasCombinations ? (
        <div className="grid max-w-md gap-4 p-5">
          <p className="text-sm text-slate-500">
            {lockStock
              ? "Bu ürün tek SKU. Stok adedi gelişmiş stok sisteminden yönetilir."
              : "Bu ürün tek SKU. Beden/renk için kombinasyon üretin veya stok adedini aşağıdan girin."}
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Stok adedi</label>
            <input
              type="number"
              min={0}
              readOnly={lockStock}
              value={defaultStock}
              onChange={(e) => {
                if (lockStock) return;
                const stockQuantity = Number.parseInt(e.target.value, 10) || 0;
                onVariantsChange((prev) =>
                  prev.map((item) =>
                    item.selections.length === 0 ? { ...item, stockQuantity, sku: sku || item.sku } : item,
                  ),
                );
              }}
              className={catalogStockInputClass(inputClass, lockStock)}
            />
            <CatalogStockHint locked={lockStock} />
          </div>
        </div>
      ) : (
        <>
          {axes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-[#e9ebec] px-5 py-3">
              <span className="text-sm font-medium text-slate-600">Filtrele:</span>
              {axes.map((axis) => (
                <AttributeFilterDropdown
                  key={axis.attributeId}
                  axis={axis}
                  selectedIds={filters[axis.attributeId] ?? []}
                  onChange={(ids) => {
                    setFilters((prev) => ({ ...prev, [axis.attributeId]: ids }));
                    setPage(1);
                  }}
                />
              ))}
              {filtersActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setFilters({});
                    setPage(1);
                  }}
                  className="text-xs font-medium text-[#405189] hover:underline"
                >
                  Filtreleri temizle
                </button>
              ) : null}
              <span className="ml-auto text-xs text-slate-400">
                {from}–{to} / {filtered.length.toLocaleString("tr-TR")}
                {filtersActive ? ` (toplam ${variants.length.toLocaleString("tr-TR")})` : ""}
              </span>
            </div>
          ) : null}

          <div className="overflow-x-auto p-5 pt-3">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Bu filtrelere uyan kombinasyon yok.
              </p>
            ) : (
              <table className="min-w-[860px] w-full text-sm">
                <thead className="text-left text-xs tracking-wide text-slate-500 uppercase">
                  <tr className="border-b border-[#e9ebec]">
                    <th className="w-10 py-2 pr-2">
                      <input
                        type="checkbox"
                        className="accent-[#0ab39c]"
                        checked={allPageSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = pageSelectedCount > 0 && !allPageSelected;
                        }}
                        onChange={togglePageSelection}
                        aria-label="Bu sayfadakileri seç"
                      />
                    </th>
                    <th className="w-14 py-2 pr-2">Görsel</th>
                    <th className="py-2 pr-2">Kombinasyon</th>
                    <th className="py-2 pr-2">Referans</th>
                    <th className="py-2 pr-2">Satış (KDV hariç)</th>
                    <th className="py-2 pr-2">İndirimli</th>
                    <th className="py-2 pr-2">Adet</th>
                    <th className="py-2 pr-2">Varsayılan</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((variant) => {
                    const listPrice = fromChargeAndListPrice(
                      variant.priceMinor,
                      variant.compareAtMinor,
                    );
                    return (
                    <tr key={variant.clientKey} className="border-b border-[#e9ebec]">
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          className="accent-[#0ab39c]"
                          checked={selectedKeys.has(variant.clientKey)}
                          onChange={() => {
                            setSelectedKeys((prev) => {
                              const next = new Set(prev);
                              if (next.has(variant.clientKey)) next.delete(variant.clientKey);
                              else next.add(variant.clientKey);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <div className="h-10 w-10 overflow-hidden rounded-md bg-[#f3f6f9]">
                          {variant.image && !variant.imageRemoved ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={variant.image} alt="" className="h-full w-full object-cover" />
                          ) : variant.imageFile ? (
                            <span className="flex h-full items-center justify-center text-[9px] font-semibold text-[#0ab39c]">
                              Yeni
                            </span>
                          ) : (
                            <span className="block h-full w-full" />
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-2 font-medium text-slate-800">
                        {combinationDisplayTitle(variant, attributes)}
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={variant.sku}
                          onChange={(e) => updateVariant(variant.clientKey, { sku: e.target.value })}
                          className="w-36 rounded-md border border-[#e9ebec] px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={formatMinorToMajorInput(listPrice.saleMinor)}
                          onChange={(e) => {
                            const next = toChargeAndListPrice(
                              parseMajorToMinor(e.target.value) ?? 0,
                              listPrice.discountMinor,
                            );
                            updateVariant(variant.clientKey, {
                              priceMinor: next.chargeMinor,
                              compareAtMinor: next.listMinor,
                            });
                          }}
                          className="w-24 rounded-md border border-[#e9ebec] px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={
                            listPrice.discountMinor != null
                              ? formatMinorToMajorInput(listPrice.discountMinor)
                              : ""
                          }
                          onChange={(e) => {
                            const next = toChargeAndListPrice(
                              listPrice.saleMinor,
                              parseMajorToMinor(e.target.value),
                            );
                            updateVariant(variant.clientKey, {
                              priceMinor: next.chargeMinor,
                              compareAtMinor: next.listMinor,
                            });
                          }}
                          placeholder="—"
                          className="w-24 rounded-md border border-[#e9ebec] px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          readOnly={lockStock}
                          value={variant.stockQuantity}
                          onChange={(e) => {
                            if (lockStock) return;
                            updateVariant(variant.clientKey, {
                              stockQuantity: Number.parseInt(e.target.value, 10) || 0,
                            });
                          }}
                          className={catalogStockInputClass(
                            "w-20 rounded-md border border-[#e9ebec] px-2 py-1 text-sm",
                            lockStock,
                          )}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="radio"
                          name="defaultVariant"
                          checked={variant.isDefault}
                          onChange={() =>
                            onVariantsChange((prev) =>
                              prev.map((item) => ({
                                ...item,
                                isDefault: item.clientKey === variant.clientKey,
                              })),
                            )
                          }
                        />
                      </td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingKey(variant.clientKey)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-[#405189]"
                            aria-label="Kombinasyonu düzenle"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteKeys(new Set([variant.clientKey]))}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Kombinasyonu sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {totalPages > 1 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                <p>
                  Sayfa {safePage} / {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="rounded-md border border-[#e9ebec] px-3 py-1.5 disabled:opacity-40"
                  >
                    Önceki
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    className="rounded-md border border-[#e9ebec] px-3 py-1.5 disabled:opacity-40"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}

      {editingVariant ? (
        <VariantEditModal
          variant={editingVariant}
          list={filtered}
          attributes={attributes}
          productImages={productImages}
          taxRatePercent={taxRatePercent}
          lockStock={lockStock}
          onSave={saveEditedVariant}
          onClose={() => setEditingKey(null)}
        />
      ) : null}
    </section>
  );
}
