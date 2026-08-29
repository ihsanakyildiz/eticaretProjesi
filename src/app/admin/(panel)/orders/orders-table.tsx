"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, RefreshCw, Search, Trash2 } from "lucide-react";
import { Can, useCan } from "@/components/admin/admin-permissions";
import {
  ORDER_PAYMENT_METHODS,
  ORDER_STATUSES,
  formatOrderDateTime,
  orderPaymentMethodLabel,
  orderStatusBadgeClass,
  orderStatusLabel,
  type OrderPaymentMethodCode,
  type OrderStatusCode,
} from "@/lib/orders";
import { formatMinorTry } from "@/lib/product-money";
import { deleteOrderAction, deleteOrdersAction, updateOrderStatusAction } from "./actions";
import { OrderStatusSelect } from "./order-status-select";

export type OrderRow = {
  id: string;
  orderNo: number;
  reference: string;
  isNewClient: boolean;
  deliveryCountry: string;
  customerName: string;
  customerEmail: string;
  totalMinor: number;
  paymentMethod: OrderPaymentMethodCode;
  status: OrderStatusCode;
  createdAt: string;
  carrierName: string | null;
  trackingNumber: string | null;
  shippingLines: string[];
  billingLines: string[];
  items: { title: string; sku: string | null; quantity: number; totalMinor: number }[];
};

const filterInputClass =
  "w-full min-w-[5.5rem] rounded border border-[#ced4da] bg-white px-1.5 py-1 text-[11px] text-slate-700 outline-none focus:border-[#0ab39c]";

type Filters = {
  orderNo: string;
  reference: string;
  customer: string;
  payment: "all" | OrderPaymentMethodCode;
  status: "all" | OrderStatusCode;
  dateFrom: string;
  dateTo: string;
};

const emptyFilters: Filters = {
  orderNo: "",
  reference: "",
  customer: "",
  payment: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

const COLUMN_COUNT = 11;

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const canUpdate = useCan("orders", "update");
  const canDelete = useCan("orders", "delete");
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"" | "delete">("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [statusById, setStatusById] = useState<Record<string, OrderStatusCode>>({});

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      if (applied.orderNo && !String(order.orderNo).includes(applied.orderNo.trim())) return false;
      if (
        applied.reference &&
        !order.reference.toLocaleLowerCase("tr-TR").includes(applied.reference.toLocaleLowerCase("tr-TR"))
      ) {
        return false;
      }
      if (
        applied.customer &&
        !`${order.customerName} ${order.customerEmail}`
          .toLocaleLowerCase("tr-TR")
          .includes(applied.customer.toLocaleLowerCase("tr-TR"))
      ) {
        return false;
      }
      if (applied.payment !== "all" && order.paymentMethod !== applied.payment) return false;
      if (applied.status !== "all" && order.status !== applied.status) return false;
      const day = order.createdAt.slice(0, 10);
      if (applied.dateFrom && day < applied.dateFrom) return false;
      if (applied.dateTo && day > applied.dateTo) return false;
      return true;
    });
  }, [orders, applied]);

  const visibleIds = filtered.map((order) => order.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  const toggleAll = () => {
    setSelected((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds])),
    );
  };

  const toggleOne = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const remove = (id: string) => {
    if (!window.confirm("Bu sipariş silinecek. Devam edilsin mi?")) return;
    startTransition(async () => {
      const result = await deleteOrderAction({ id });
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setSelected((current) => current.filter((item) => item !== id));
      router.refresh();
    });
  };

  const changeStatus = (id: string, status: OrderStatusCode) => {
    const previous = statusById[id] ?? orders.find((order) => order.id === id)?.status;
    setStatusById((current) => ({ ...current, [id]: status }));
    startTransition(async () => {
      const result = await updateOrderStatusAction({ id, status });
      if (result.error) {
        setStatusById((current) => {
          const next = { ...current };
          if (previous) next[id] = previous;
          else delete next[id];
          return next;
        });
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  const applyBulk = () => {
    if (bulkAction !== "delete" || selected.length === 0) return;
    if (!window.confirm(`${selected.length} sipariş silinecek. Bu işlem geri alınamaz.`)) return;
    startTransition(async () => {
      const result = await deleteOrdersAction({ ids: selected });
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setSelected([]);
      setBulkAction("");
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9ebec] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {canDelete ? (
            <>
              <select
                value={bulkAction}
                onChange={(event) => setBulkAction(event.target.value as "" | "delete")}
                className="rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0ab39c]"
                aria-label="Toplu eylemler"
              >
                <option value="">Toplu Eylemler</option>
                <option value="delete">Seçilenleri sil</option>
              </select>
              <button
                type="button"
                onClick={applyBulk}
                disabled={isPending || bulkAction !== "delete" || selected.length === 0}
                className="rounded-md bg-[#0ab39c] px-3 py-2 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-50"
              >
                Uygula
              </button>
              {selected.length > 0 ? (
                <span className="text-xs text-slate-500">{selected.length} seçili</span>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-800">Siparişler ({filtered.length})</h2>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50"
            title="Yenile"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {error ? (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#e9ebec] bg-[#f3f6f9] text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  aria-label="Tümünü seç"
                />
              </th>
              <th className="px-2 py-2">Kimlik</th>
              <th className="px-2 py-2">Referans</th>
              <th className="px-2 py-2">Yeni müşteri</th>
              <th className="px-2 py-2">Teslimat</th>
              <th className="px-2 py-2">Müşteri</th>
              <th className="px-2 py-2">Toplam</th>
              <th className="px-2 py-2">Ödeme</th>
              <th className="px-2 py-2">Durum</th>
              <th className="px-2 py-2">Tarih</th>
              <th className="px-2 py-2 text-right">Eylemler</th>
            </tr>
            <tr className="border-b border-[#e9ebec] bg-[#f8f9fa]">
              <td className="px-3 py-1.5" />
              <td className="px-2 py-1.5">
                <input
                  value={draft.orderNo}
                  onChange={(event) => setDraft((current) => ({ ...current, orderNo: event.target.value }))}
                  placeholder="ID ara"
                  className={filterInputClass}
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  value={draft.reference}
                  onChange={(event) => setDraft((current) => ({ ...current, reference: event.target.value }))}
                  placeholder="Referans ara"
                  className={filterInputClass}
                />
              </td>
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5">
                <input
                  value={draft.customer}
                  onChange={(event) => setDraft((current) => ({ ...current, customer: event.target.value }))}
                  placeholder="Müşteri ara"
                  className={filterInputClass}
                />
              </td>
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5">
                <select
                  value={draft.payment}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, payment: event.target.value as Filters["payment"] }))
                  }
                  className={filterInputClass}
                  aria-label="Ödeme filtresi"
                >
                  <option value="all">Hepsi</option>
                  {ORDER_PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {orderPaymentMethodLabel(method)}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-1.5">
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, status: event.target.value as Filters["status"] }))
                  }
                  className={filterInputClass}
                  aria-label="Durum filtresi"
                >
                  <option value="all">Hepsi</option>
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {orderStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-1.5">
                <div className="flex min-w-[10rem] flex-col gap-1">
                  <input
                    type="date"
                    value={draft.dateFrom}
                    onChange={(event) => setDraft((current) => ({ ...current, dateFrom: event.target.value }))}
                    className={filterInputClass}
                    aria-label="Başlangıç tarihi"
                  />
                  <input
                    type="date"
                    value={draft.dateTo}
                    onChange={(event) => setDraft((current) => ({ ...current, dateTo: event.target.value }))}
                    className={filterInputClass}
                    aria-label="Bitiş tarihi"
                  />
                </div>
              </td>
              <td className="px-2 py-1.5 text-right">
                <button
                  type="button"
                  onClick={() => setApplied(draft)}
                  className="inline-flex items-center gap-1 rounded border border-[#ced4da] bg-[#e9ebec] px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                >
                  <Search className="h-3 w-3" />
                  Ara
                </button>
              </td>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={COLUMN_COUNT} className="px-4 py-12 text-center text-sm text-slate-500">
                  {orders.length === 0 ? "Henüz sipariş yok." : "Aramanızla eşleşen sipariş yok."}
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <Fragment key={order.id}>
                  <tr className="border-b border-[#e9ebec] hover:bg-[#f8f9fa]">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.includes(order.id)}
                        onChange={() => toggleOne(order.id)}
                        aria-label={`Sipariş ${order.orderNo} seç`}
                      />
                    </td>
                    <td className="px-2 py-2.5 tabular-nums text-slate-700">{order.orderNo}</td>
                    <td className="px-2 py-2.5 font-medium text-slate-800">{order.reference}</td>
                    <td className="px-2 py-2.5 text-slate-600">{order.isNewClient ? "Evet" : "Hayır"}</td>
                    <td className="px-2 py-2.5 text-slate-600">{order.deliveryCountry}</td>
                    <td className="px-2 py-2.5">
                      <p className="font-medium text-slate-800">{order.customerName}</p>
                      <p className="text-xs text-slate-400">{order.customerEmail}</p>
                    </td>
                    <td className="px-2 py-2.5 font-medium text-slate-800">{formatMinorTry(order.totalMinor)}</td>
                    <td className="px-2 py-2.5 text-slate-600">
                      {orderPaymentMethodLabel(order.paymentMethod)}
                    </td>
                    <td className="px-2 py-2.5">
                      {canUpdate ? (
                        <OrderStatusSelect
                          value={statusById[order.id] ?? order.status}
                          disabled={isPending}
                          onChange={(status) => changeStatus(order.id, status)}
                        />
                      ) : (
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${orderStatusBadgeClass(
                            statusById[order.id] ?? order.status,
                          )}`}
                        >
                          {orderStatusLabel(statusById[order.id] ?? order.status)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap text-slate-600">
                      {formatOrderDateTime(order.createdAt)}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setExpandedId((current) => (current === order.id ? null : order.id))}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50"
                          title="Özet"
                        >
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition ${expandedId === order.id ? "rotate-180" : ""}`}
                          />
                        </button>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="rounded-md border border-[#e9ebec] px-2 py-1.5 text-xs font-medium text-slate-600 hover:text-[#405189]"
                        >
                          Detay
                        </Link>
                        <Can resource="orders" action="delete">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => remove(order.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            title="Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                  {expandedId === order.id ? (
                    <tr className="border-b border-[#e9ebec] bg-[#f8f9fa]">
                      <td colSpan={COLUMN_COUNT} className="px-4 py-4">
                        <div className="grid gap-4 lg:grid-cols-3">
                          <div>
                            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Kargo</p>
                            <p className="mt-1 text-sm text-slate-600">
                              Kargo firması: {order.carrierName || "—"}
                            </p>
                            <p className="text-sm text-slate-600">
                              Takip no: {order.trackingNumber || "—"}
                            </p>
                            <ul className="mt-2 space-y-0.5 text-sm text-slate-700">
                              {order.shippingLines.map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Fatura</p>
                            <p className="mt-1 text-sm text-slate-600">{order.customerEmail}</p>
                            <ul className="mt-2 space-y-0.5 text-sm text-slate-700">
                              {order.billingLines.map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                              Ürünler ({order.items.length})
                            </p>
                            <ul className="mt-2 divide-y divide-[#e9ebec] text-sm">
                              {order.items.map((item) => (
                                <li key={`${item.sku}-${item.title}`} className="flex justify-between gap-3 py-1.5">
                                  <span>
                                    {item.title}
                                    {item.sku ? (
                                      <span className="block text-xs text-slate-400">{item.sku}</span>
                                    ) : null}
                                    <span className="text-xs text-slate-400">Adet: {item.quantity}</span>
                                  </span>
                                  <span className="shrink-0 font-medium">{formatMinorTry(item.totalMinor)}</span>
                                </li>
                              ))}
                            </ul>
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="mt-3 inline-flex rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Detayları aç
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
