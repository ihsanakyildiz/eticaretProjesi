"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { orderDiscountSummary, orderLineDiscount } from "@/lib/order-discount";
import {
  formatMinorToMajorInput,
  formatMinorTry,
  parseMajorToMinor,
  taxExcludedMinor,
  taxIncludedMinor,
} from "@/lib/product-money";
import { addOrderItemAction, deleteOrderItemAction, updateOrderItemAction } from "../actions";

export type CatalogProduct = {
  id: string;
  title: string;
  taxRatePercent: number;
  image: string | null;
  variants: {
    id: string;
    title: string;
    sku: string;
    isDefault: boolean;
    priceExclMinor: number;
    stock: number;
    image: string | null;
  }[];
};

export type OrderItemRow = {
  id: string;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  unitPriceMinor: number;
  compareAtMinor?: number | null;
  taxRatePercent: number;
  totalMinor: number;
  image: string | null;
  stock: number | null;
};

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-[#0ab39c]";

type EditDraft = {
  itemId: string;
  quantity: string;
  unitIncl: string;
};

type AddDraft = {
  productId: string;
  variantId: string;
  quantity: string;
  priceExcl: string;
  priceIncl: string;
};

const emptyAdd: AddDraft = {
  productId: "",
  variantId: "",
  quantity: "1",
  priceExcl: "",
  priceIncl: "",
};

export function OrderItemsEditor({
  orderId,
  items,
  productsMinor,
  shippingMinor,
  taxMinor,
  totalMinor,
  catalog,
  isPending,
  onRun,
}: {
  orderId: string;
  items: OrderItemRow[];
  productsMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  catalog: CatalogProduct[];
  isPending: boolean;
  onRun: (task: () => Promise<{ error?: string }>) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<AddDraft>(emptyAdd);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  const selectedProduct = catalog.find((product) => product.id === addDraft.productId) ?? null;
  const selectedVariant =
    selectedProduct?.variants.find((variant) => variant.id === addDraft.variantId) ?? null;

  const productOptions = useMemo(
    () => catalog.map((product) => ({ id: product.id, label: product.title })),
    [catalog],
  );
  const discount = useMemo(() => orderDiscountSummary(items), [items]);

  const applyCatalogPrices = (product: CatalogProduct, variant: CatalogProduct["variants"][number]) => {
    setAddDraft((current) => ({
      ...current,
      productId: product.id,
      variantId: variant.id,
      priceExcl: formatMinorToMajorInput(variant.priceExclMinor),
      priceIncl: formatMinorToMajorInput(taxIncludedMinor(variant.priceExclMinor, product.taxRatePercent)),
    }));
  };

  const chooseProduct = (productId: string) => {
    const product = catalog.find((item) => item.id === productId);
    if (!product) {
      setAddDraft(emptyAdd);
      return;
    }
    const variant = product.variants.find((item) => item.isDefault) ?? product.variants[0];
    if (!variant) {
      setAddDraft({ ...emptyAdd, productId });
      return;
    }
    applyCatalogPrices(product, variant);
  };

  const chooseVariant = (variantId: string) => {
    if (!selectedProduct) return;
    const variant = selectedProduct.variants.find((item) => item.id === variantId);
    if (!variant) return;
    applyCatalogPrices(selectedProduct, variant);
  };

  const changeAddPrice = (field: "excl" | "incl", raw: string) => {
    const tax = selectedProduct?.taxRatePercent ?? 0;
    const minor = parseMajorToMinor(raw);
    if (field === "excl") {
      setAddDraft((current) => ({
        ...current,
        priceExcl: raw,
        priceIncl:
          minor === null ? current.priceIncl : formatMinorToMajorInput(taxIncludedMinor(minor, tax)),
      }));
      return;
    }
    setAddDraft((current) => ({
      ...current,
      priceIncl: raw,
      priceExcl:
        minor === null ? current.priceExcl : formatMinorToMajorInput(taxExcludedMinor(minor, tax)),
    }));
  };

  const startEdit = (item: OrderItemRow) => {
    setAdding(false);
    setEditDraft({
      itemId: item.id,
      quantity: String(item.quantity),
      unitIncl: formatMinorToMajorInput(item.unitPriceMinor),
    });
  };

  const resetAdd = () => {
    setAddDraft(emptyAdd);
    setAdding(false);
  };

  return (
    <section className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">Ürünler ({items.length})</h2>
        <Can resource="orders" action="update">
          <button
            type="button"
            disabled={isPending || catalog.length === 0}
            onClick={() => {
              setEditDraft(null);
              setAdding(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0ab39c] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#099885] disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Ürün ekle
          </button>
        </Can>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs text-slate-400 uppercase">
            <tr>
              <th className="py-2 pr-3">Ürün</th>
              <th className="py-2 pr-3">Birim fiyat</th>
              <th className="py-2 pr-3">İndirim</th>
              <th className="py-2 pr-3">Adet</th>
              <th className="py-2 pr-3">Stokta</th>
              <th className="py-2 pr-3 text-right">Toplam</th>
              <th className="py-2 text-right">Eylemler</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const editing = editDraft?.itemId === item.id;
              const discount = orderLineDiscount(item);
              return (
                <tr key={item.id} className="border-t border-[#e9ebec]">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-start gap-3">
                      <Thumb src={item.image} alt={item.title} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800">{item.title}</p>
                        {item.variantTitle ? (
                          <p className="text-xs text-slate-500">{item.variantTitle}</p>
                        ) : null}
                        {item.sku ? <p className="text-xs text-slate-400">{item.sku}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 align-top">
                    {editing && editDraft ? (
                      <input
                        value={editDraft.unitIncl}
                        onChange={(event) =>
                          setEditDraft({ ...editDraft, unitIncl: event.target.value })
                        }
                        className={`${inputClass} max-w-[7.5rem]`}
                        aria-label="Birim fiyat (KDV dahil)"
                      />
                    ) : (
                      <div>
                        {discount.compareAtMinor ? (
                          <p className="text-[11px] text-slate-400 line-through">
                            {formatMinorTry(discount.compareAtMinor)}
                          </p>
                        ) : null}
                        <p>{formatMinorTry(item.unitPriceMinor)}</p>
                        <p className="text-[11px] text-slate-400">KDV dahil</p>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 align-top">
                    {discount.savingsMinor > 0 ? (
                      <div>
                        <p className="font-medium text-emerald-700">
                          −{formatMinorTry(discount.savingsMinor)}
                        </p>
                        <p className="text-[11px] font-semibold text-emerald-600">
                          %{discount.percent}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">—</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 align-top">
                    {editing && editDraft ? (
                      <input
                        type="number"
                        min={1}
                        value={editDraft.quantity}
                        onChange={(event) =>
                          setEditDraft({ ...editDraft, quantity: event.target.value })
                        }
                        className={`${inputClass} w-16`}
                        aria-label="Adet"
                      />
                    ) : (
                      item.quantity
                    )}
                  </td>
                  <td className="py-2.5 pr-3 align-top text-slate-600">
                    {item.stock == null ? "—" : item.stock}
                  </td>
                  <td className="py-2.5 pr-3 text-right align-top font-medium">
                    {formatMinorTry(item.totalMinor)}
                  </td>
                  <td className="py-2.5 align-top">
                    <div className="flex items-center justify-end gap-1">
                      {editing && editDraft ? (
                        <>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              onRun(async () => {
                                const result = await updateOrderItemAction({
                                  orderId,
                                  itemId: item.id,
                                  quantity: Number(editDraft.quantity),
                                  unitPriceIncl: editDraft.unitIncl,
                                });
                                if (!result.error) setEditDraft(null);
                                return result;
                              })
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-[#0ab39c] hover:bg-teal-50"
                            title="Kaydet"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => setEditDraft(null)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50"
                            title="Vazgeç"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Can resource="orders" action="update">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => startEdit(item)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50 hover:text-[#405189]"
                              title="Düzenle"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </Can>
                          <Can resource="orders" action="update">
                            <button
                              type="button"
                              disabled={isPending || items.length <= 1}
                              onClick={() => {
                                if (!window.confirm("Bu ürün siparişten silinsin mi?")) return;
                                onRun(() => deleteOrderItemAction({ orderId, itemId: item.id }));
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                              title="Sil"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </Can>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adding ? (
        <div className="mt-4 rounded-md border border-[#e9ebec] bg-[#f8f9fa] p-3">
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Ürün ekle</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7.5rem_7.5rem_5rem_auto]">
            <SearchableSelect
              value={addDraft.productId}
              onChange={chooseProduct}
              options={productOptions}
              placeholder="Ürün ara"
              emptyLabel="Ürün seçin"
              searchPlaceholder="Ürün adı ara…"
            />
            <select
              value={addDraft.variantId}
              onChange={(event) => chooseVariant(event.target.value)}
              disabled={!selectedProduct}
              className={inputClass}
              aria-label="Varyant"
            >
              <option value="">{selectedProduct ? "Varyant seçin" : "Önce ürün seçin"}</option>
              {(selectedProduct?.variants ?? []).map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.isDefault ? "Varsayılan" : variant.title}
                  {variant.sku ? ` · ${variant.sku}` : ""}
                </option>
              ))}
            </select>
            <label className="block">
              <span className="mb-1 block text-[11px] text-slate-400">KDV hariç</span>
              <input
                value={addDraft.priceExcl}
                onChange={(event) => changeAddPrice("excl", event.target.value)}
                disabled={!selectedVariant}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-slate-400">KDV dahil</span>
              <input
                value={addDraft.priceIncl}
                onChange={(event) => changeAddPrice("incl", event.target.value)}
                disabled={!selectedVariant}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-slate-400">Adet</span>
              <input
                type="number"
                min={1}
                value={addDraft.quantity}
                onChange={(event) =>
                  setAddDraft((current) => ({ ...current, quantity: event.target.value }))
                }
                className={inputClass}
              />
            </label>
            <div className="flex items-end gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={resetAdd}
                className="rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm font-medium text-slate-600"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={isPending || !selectedVariant}
                onClick={() =>
                  onRun(async () => {
                    const result = await addOrderItemAction({
                      orderId,
                      variantId: addDraft.variantId,
                      quantity: Number(addDraft.quantity),
                      unitPriceIncl: addDraft.priceIncl,
                    });
                    if (!result.error) resetAdd();
                    return result;
                  })
                }
                className="rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Ekle
              </button>
            </div>
          </div>
          {selectedVariant ? (
            <p className="mt-2 text-xs text-slate-500">
              Stok: {selectedVariant.stock}
              {selectedVariant.sku ? ` · ${selectedVariant.sku}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {catalog.length === 0 ? (
        <p className="mt-3 text-sm text-amber-700">Aktif ürün yok. Katalogdan ürün ekleyin.</p>
      ) : null}

      <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
        {discount.discountMinor > 0 ? (
          <>
            <div className="flex justify-between">
              <dt className="text-slate-500">Liste tutarı</dt>
              <dd className="text-slate-400 line-through">{formatMinorTry(discount.listMinor)}</dd>
            </div>
            <div className="flex justify-between text-emerald-700">
              <dt>
                İndirim
                <span className="ml-1 text-xs font-semibold">%{discount.percent}</span>
              </dt>
              <dd>−{formatMinorTry(discount.discountMinor)}</dd>
            </div>
          </>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-slate-500">Ürünler</dt>
          <dd>{formatMinorTry(productsMinor)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Kargo</dt>
          <dd>{formatMinorTry(shippingMinor)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">KDV</dt>
          <dd>{formatMinorTry(taxMinor)}</dd>
        </div>
        <div className="flex justify-between rounded-md bg-slate-800 px-3 py-2 font-semibold text-white">
          <dt>Toplam</dt>
          <dd>{formatMinorTry(totalMinor)}</dd>
        </div>
      </dl>
    </section>
  );
}

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  return (
    <span className="inline-flex h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#e9ebec] bg-[#f3f6f9]">
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : null}
    </span>
  );
}
