"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Printer, Warehouse } from "lucide-react";
import {
  ORDER_PAYMENT_METHODS,
  formatOrderDateTime,
  orderPaymentMethodLabel,
  type OrderPaymentMethodCode,
  type OrderStatusCode,
} from "@/lib/orders";
import { isWarehouseReadyStatus } from "@/lib/warehouse";
import {
  orderPaymentProviderLabel,
  type OrderPaymentProvider,
} from "@/lib/checkout-payment-choice";
import { formatMinorTry } from "@/lib/product-money";
import type { OrderCaseView } from "@/lib/order-cases";
import {
  addOrderMessageAction,
  addOrderPaymentAction,
  updateOrderStatusAction,
} from "../actions";
import { OrderStatusSelect } from "../order-status-select";
import { OrderItemsEditor, type CatalogProduct, type OrderItemRow } from "./order-items-editor";
import { OrderCasePanel } from "./order-case-panel";
import { OrderRefundPanel, type OrderRefundRow } from "./order-refund-panel";
import { OrderWorkspaceTabs, type OrderDocumentRow } from "./order-workspace-tabs";

type AddressBlock = {
  name: string;
  company: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  lines: string[];
};

export type OrderDetailModel = {
  id: string;
  orderNo: number;
  reference: string;
  status: OrderStatusCode;
  paymentMethod: OrderPaymentMethodCode;
  paymentProvider: OrderPaymentProvider | null;
  productsMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  carrierName: string;
  trackingNumber: string;
  weightKg: number;
  privateNote: string;
  documents: OrderDocumentRow[];
  createdAt: string;
  previousId: string | null;
  nextId: string | null;
  customer: {
    id: string;
    customerNo: number;
    name: string;
    email: string;
    registeredAt: string;
    orderCount: number;
  };
  shipping: AddressBlock | null;
  billing: AddressBlock | null;
  items: OrderItemRow[];
  catalog: CatalogProduct[];
  history: { id: string; status: OrderStatusCode; createdAt: string }[];
  payments: {
    id: string;
    method: OrderPaymentMethodCode;
    amountMinor: number;
    transactionId: string | null;
    paidAt: string;
  }[];
  refunds: OrderRefundRow[];
  cases: OrderCaseView[];
  messages: { id: string; body: string; visibleToCustomer: boolean; createdAt: string }[];
};

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0ab39c]";

export function OrderDetail({ order }: { order: OrderDetailModel }) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [message, setMessage] = useState("");
  const [showToCustomer, setShowToCustomer] = useState(true);
  const [payMethod, setPayMethod] = useState<OrderPaymentMethodCode>(order.paymentMethod);
  const [payAmount, setPayAmount] = useState((order.totalMinor / 100).toFixed(2));
  const [payTxn, setPayTxn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (task: () => Promise<{ error?: string; message?: string }>) => {
    startTransition(async () => {
      const result = await task();
      if (result.error) {
        setError(result.error);
        setNotice(null);
        return;
      }
      setError(null);
      setNotice(result.message ?? null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
        <OrderStatusSelect
          value={status}
          disabled={isPending}
          onChange={setStatus}
          size="md"
          className="w-full max-w-md"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => updateOrderStatusAction({ id: order.id, status }))}
          className="rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Durumu güncelle
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-600"
        >
          <Printer className="h-4 w-4" />
          Siparişi yazdır
        </button>
        {isWarehouseReadyStatus(order.status) || order.status === "SHIPPED" ? (
          <Link
            href={`/admin/warehouse/${order.id}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#405189] px-3 py-2 text-sm font-semibold text-white hover:bg-[#364574]"
          >
            <Warehouse className="h-4 w-4" />
            Depo paketleme
          </Link>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          {order.previousId ? (
            <Link
              href={`/admin/orders/${order.previousId}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50"
              title="Önceki sipariş"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e9ebec] text-slate-300">
              <ChevronLeft className="h-4 w-4" />
            </span>
          )}
          {order.nextId ? (
            <Link
              href={`/admin/orders/${order.nextId}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50"
              title="Sonraki sipariş"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e9ebec] text-slate-300">
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
      ) : null}
      {notice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">Temel bilgiler</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Kimlik" value={String(order.orderNo)} />
              <Row label="Referans" value={order.reference} />
              <Row label="Toplam" value={formatMinorTry(order.totalMinor)} />
              <Row label="Oluşturulma" value={formatOrderDateTime(order.createdAt)} />
              <Row
                label="Ödeme"
                value={
                  order.paymentProvider
                    ? `${orderPaymentMethodLabel(order.paymentMethod)} (${orderPaymentProviderLabel(order.paymentProvider)})`
                    : orderPaymentMethodLabel(order.paymentMethod)
                }
              />
              <Row label="Teslimat" value={order.carrierName || "—"} />
            </dl>
          </section>

          <section className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-800">{order.customer.name}</h2>
              <Link
                href={`/admin/members/${order.customer.id}`}
                className="text-xs font-medium text-[#405189] hover:underline"
              >
                Detayları görüntüle
              </Link>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Müşteri no" value={String(order.customer.customerNo)} />
              <Row label="E-posta" value={order.customer.email} />
              <Row label="Kayıt" value={formatOrderDateTime(order.customer.registeredAt)} />
              <Row label="Sipariş sayısı" value={String(order.customer.orderCount)} />
            </dl>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <AddressCard title="Kargo adresi" address={order.shipping} />
              <AddressCard title="Fatura adresi" address={order.billing} />
            </div>
          </section>

          <section className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">Mesajlar ({order.messages.length})</h2>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showToCustomer}
                onChange={(event) => setShowToCustomer(event.target.checked)}
              />
              Müşteriye gösterilsin mi?
            </label>
            <textarea
              value={message}
              maxLength={1200}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              className={`${inputClass} mt-2 resize-y`}
              placeholder="Mesaj"
            />
            <p className="mt-1 text-right text-[11px] text-slate-400">{message.length}/1200</p>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                run(async () => {
                  const result = await addOrderMessageAction({
                    id: order.id,
                    body: message,
                    visibleToCustomer: showToCustomer,
                  });
                  if (!result.error) setMessage("");
                  return result;
                })
              }
              className="mt-2 rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Mesaj gönder
            </button>
            <ul className="mt-4 divide-y divide-[#e9ebec] text-sm">
              {order.messages.map((item) => (
                <li key={item.id} className="py-2">
                  <p className="text-slate-700">{item.body}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatOrderDateTime(item.createdAt)}
                    {item.visibleToCustomer ? " · müşteriye açık" : " · yalnızca personel"}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-4">
          <OrderItemsEditor
            orderId={order.id}
            items={order.items}
            productsMinor={order.productsMinor}
            shippingMinor={order.shippingMinor}
            taxMinor={order.taxMinor}
            totalMinor={order.totalMinor}
            catalog={order.catalog}
            isPending={isPending}
            onRun={run}
          />

          <OrderWorkspaceTabs
            orderId={order.id}
            status={status}
            history={order.history}
            documents={order.documents}
            privateNote={order.privateNote}
            carrierName={order.carrierName}
            trackingNumber={order.trackingNumber}
            shippingMinor={order.shippingMinor}
            weightKg={order.weightKg}
            createdAt={order.createdAt}
            isPending={isPending}
            onStatusChange={setStatus}
            onRun={run}
          />

          <OrderCasePanel
            orderId={order.id}
            status={order.status}
            remainingMinor={Math.max(
              0,
              order.payments.reduce((sum, row) => sum + Math.max(0, row.amountMinor), 0) -
                order.refunds.reduce((sum, row) => sum + row.amountMinor, 0),
            )}
            items={order.items.map((item) => ({
              id: item.id,
              title: item.title,
              variantTitle: item.variantTitle,
              quantity: item.quantity,
            }))}
            cases={order.cases}
            isPending={isPending}
            onRun={run}
          />

          <OrderRefundPanel
            orderId={order.id}
            status={order.status}
            paidMinor={order.payments.reduce((sum, row) => sum + Math.max(0, row.amountMinor), 0)}
            refunds={order.refunds}
            providerLabel={
              order.paymentProvider ? orderPaymentProviderLabel(order.paymentProvider) : "Manuel"
            }
            isCardProvider={
              order.paymentProvider === "iyzico" ||
              order.paymentProvider === "stripe" ||
              order.paymentProvider === "paytr"
            }
            isPending={isPending}
            onRun={run}
          />

          <section className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">Ödeme ({order.payments.length})</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-400 uppercase">
                  <tr>
                    <th className="py-2">Tarih</th>
                    <th className="py-2">Yöntem</th>
                    <th className="py-2">İşlem</th>
                    <th className="py-2 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {order.payments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-slate-400">
                        Kayıtlı ödeme yok.
                      </td>
                    </tr>
                  ) : (
                    order.payments.map((payment) => (
                      <tr key={payment.id} className="border-t border-[#e9ebec]">
                        <td className="py-2">{formatOrderDateTime(payment.paidAt)}</td>
                        <td className="py-2">{orderPaymentMethodLabel(payment.method)}</td>
                        <td className="py-2">{payment.transactionId || "—"}</td>
                        <td className="py-2 text-right">{formatMinorTry(payment.amountMinor)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_7rem_auto]">
              <select
                value={payMethod}
                onChange={(event) => setPayMethod(event.target.value as OrderPaymentMethodCode)}
                className={inputClass}
              >
                {ORDER_PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {orderPaymentMethodLabel(method)}
                  </option>
                ))}
              </select>
              <input
                value={payTxn}
                onChange={(event) => setPayTxn(event.target.value)}
                placeholder="İşlem kimliği"
                className={inputClass}
              />
              <input
                value={payAmount}
                onChange={(event) => setPayAmount(event.target.value)}
                placeholder="0,00"
                className={inputClass}
              />
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(() =>
                    addOrderPaymentAction({
                      id: order.id,
                      method: payMethod,
                      amount: payAmount,
                      transactionId: payTxn,
                    }),
                  )
                }
                className="rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Ekle
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right text-slate-800">{value}</dd>
    </div>
  );
}

function AddressCard({ title, address }: { title: string; address: AddressBlock | null }) {
  if (!address) {
    return (
      <div>
        <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{title}</p>
        <p className="mt-1 text-sm text-slate-400">Adres yok.</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{title}</p>
      <p className="mt-1 font-medium text-slate-800">{address.name}</p>
      {address.company ? <p className="text-sm text-slate-600">{address.company}</p> : null}
      {address.taxOffice ? <p className="text-sm text-slate-500">Vergi dairesi: {address.taxOffice}</p> : null}
      {address.taxNumber ? <p className="text-sm text-slate-500">Vergi no: {address.taxNumber}</p> : null}
      <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
        {address.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
