"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  ORDER_PAYMENT_METHODS,
  ORDER_STATUSES,
  orderPaymentMethodLabel,
  orderStatusLabel,
} from "@/lib/orders";
import { createOrderAction, type OrderFormState } from "../actions";

const initialState: OrderFormState = {};
const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0ab39c]";

type CustomerOption = {
  id: string;
  label: string;
  addresses: {
    id: string;
    label: string;
    isDelivery: boolean;
    isInvoice: boolean;
    isDefaultDelivery: boolean;
    isDefaultInvoice: boolean;
  }[];
};

type VariantOption = {
  id: string;
  label: string;
  stock: number;
};

export function OrderCreateForm({
  customers,
  variants,
}: {
  customers: CustomerOption[];
  variants: VariantOption[];
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createOrderAction, initialState);
  const [customerId, setCustomerId] = useState("");
  const [shippingAddressId, setShippingAddressId] = useState("");
  const [billingAddressId, setBillingAddressId] = useState("");
  const [lines, setLines] = useState<{ variantId: string; quantity: number }[]>([
    { variantId: "", quantity: 1 },
  ]);

  const customer = customers.find((item) => item.id === customerId) ?? null;
  const shippingOptions = useMemo(() => {
    const addresses = customer?.addresses ?? [];
    const delivery = addresses.filter((address) => address.isDelivery);
    return delivery.length > 0 ? delivery : addresses;
  }, [customer]);
  const billingOptions = useMemo(() => {
    const addresses = customer?.addresses ?? [];
    const invoice = addresses.filter((address) => address.isInvoice);
    return invoice.length > 0 ? invoice : addresses;
  }, [customer]);

  useEffect(() => {
    if (!customer) {
      setShippingAddressId("");
      setBillingAddressId("");
      return;
    }
    setShippingAddressId(
      customer.addresses.find((address) => address.isDefaultDelivery)?.id ??
        shippingOptions[0]?.id ??
        "",
    );
    setBillingAddressId(
      customer.addresses.find((address) => address.isDefaultInvoice)?.id ??
        billingOptions[0]?.id ??
        "",
    );
  }, [customer, shippingOptions, billingOptions]);

  useEffect(() => {
    if (state.success && state.redirectId) {
      router.push(`/admin/orders/${state.redirectId}`);
      router.refresh();
    }
  }, [state.success, state.redirectId, router]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="shippingAddressId" value={shippingAddressId} />
      <input type="hidden" name="billingAddressId" value={billingAddressId} />
      <input type="hidden" name="itemsJson" value={JSON.stringify(lines.filter((line) => line.variantId))} />

      {state.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}
      {customers.length === 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Aktif müşteri yok. Önce müşteri ekleyin.
        </div>
      ) : null}
      {variants.length === 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Aktif ürün varyantı yok. Önce katalogda ürün açın.
        </div>
      ) : null}

      <section className="space-y-4 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">Müşteri ve adres</h2>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Müşteri *</label>
          <SearchableSelect
            value={customerId}
            onChange={setCustomerId}
            options={customers.map((item) => ({ id: item.id, label: item.label }))}
            placeholder="Müşteri seçin"
            emptyLabel="Müşteri seçin"
            searchPlaceholder="Müşteri ara…"
          />
        </div>
        {customer && customer.addresses.length === 0 ? (
          <p className="text-sm text-amber-700">
            Bu müşterinin kayıtlı adresi yok. Önce müşteri kartına teslimat ve fatura adresi ekleyin.
          </p>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Teslimat adresi *</label>
            <select
              value={shippingAddressId}
              onChange={(event) => setShippingAddressId(event.target.value)}
              className={inputClass}
              disabled={!customer}
            >
              <option value="">Seçin</option>
              {shippingOptions.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Fatura adresi *</label>
            <select
              value={billingAddressId}
              onChange={(event) => setBillingAddressId(event.target.value)}
              className={inputClass}
              disabled={!customer}
            >
              <option value="">Seçin</option>
              {billingOptions.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Ürünler</h2>
          <button
            type="button"
            onClick={() => setLines((current) => [...current, { variantId: "", quantity: 1 }])}
            className="inline-flex items-center gap-1 text-sm font-medium text-[#405189]"
          >
            <Plus className="h-4 w-4" />
            Satır ekle
          </button>
        </div>
        <div className="space-y-3">
          {lines.map((line, index) => (
            <div key={`line-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_7rem_auto]">
              <SearchableSelect
                value={line.variantId}
                onChange={(variantId) =>
                  setLines((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, variantId } : item,
                    ),
                  )
                }
                options={variants.map((variant) => ({
                  id: variant.id,
                  label: variant.stock > 0 ? variant.label : `${variant.label} · stok yok`,
                }))}
                placeholder="Ürün seçin"
                emptyLabel="Ürün seçin"
                searchPlaceholder="Ürün ara…"
              />
              <input
                type="number"
                min={1}
                value={line.quantity}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, quantity: Math.max(1, Number(event.target.value) || 1) }
                        : item,
                    ),
                  )
                }
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                disabled={lines.length === 1}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-rose-600 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Durum</label>
          <select name="status" defaultValue="AWAITING_PAYMENT" className={inputClass}>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {orderStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Ödeme yöntemi</label>
          <select name="paymentMethod" defaultValue="BANK_WIRE" className={inputClass}>
            {ORDER_PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {orderPaymentMethodLabel(method)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Kargo tutarı (₺)</label>
          <input name="shipping" defaultValue="0" className={inputClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Kargo firması</label>
          <input name="carrierName" placeholder="Örn. Yurtiçi Kargo" className={inputClass} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Sipariş notu</label>
          <textarea name="privateNote" rows={3} className={`${inputClass} resize-y`} />
        </div>
      </section>

      <div className="flex justify-between rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
        <Link href="/admin/orders" className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-medium text-slate-600">
          Listeye dön
        </Link>
        <Can resource="orders" action="create">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Siparişi oluştur
          </button>
        </Can>
      </div>
    </form>
  );
}
