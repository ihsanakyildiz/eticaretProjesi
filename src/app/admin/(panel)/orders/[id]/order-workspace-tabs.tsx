"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { Can } from "@/components/admin/admin-permissions";
import { FileText, History, Plus, RefreshCw, Trash2, Truck } from "lucide-react";
import {
  formatOrderDate,
  formatOrderDateTime,
  formatOrderDocumentNumber,
  formatWeightKg,
  orderDocumentKindLabel,
  orderStatusBadgeClass,
  orderStatusLabel,
  type OrderDocumentKindCode,
  type OrderStatusCode,
} from "@/lib/orders";
import { OrderStatusSelect } from "../order-status-select";
import { formatMinorToMajorInput, formatMinorTry } from "@/lib/product-money";
import {
  createOrderDocumentAction,
  deleteOrderDocumentAction,
  resendOrderStatusEmailAction,
  updateOrderNoteAction,
  updateOrderShippingAction,
  updateOrderStatusAction,
} from "../actions";

export type OrderDocumentRow = {
  id: string;
  kind: OrderDocumentKindCode;
  number: number;
  amountMinor: number;
  createdAt: string;
};

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0ab39c]";

type TabId = "status" | "documents" | "carriers";

export function OrderWorkspaceTabs({
  orderId,
  status,
  history,
  documents,
  privateNote,
  carrierName,
  trackingNumber,
  shippingMinor,
  weightKg,
  createdAt,
  isPending,
  onStatusChange,
  onRun,
}: {
  orderId: string;
  status: OrderStatusCode;
  history: { id: string; status: OrderStatusCode; createdAt: string }[];
  documents: OrderDocumentRow[];
  privateNote: string;
  carrierName: string;
  trackingNumber: string;
  shippingMinor: number;
  weightKg: number;
  createdAt: string;
  isPending: boolean;
  onStatusChange: (status: OrderStatusCode) => void;
  onRun: (task: () => Promise<{ error?: string }>) => void;
}) {
  const [tab, setTab] = useState<TabId>("status");
  const [noteOpen, setNoteOpen] = useState(Boolean(privateNote));
  const [note, setNote] = useState(privateNote);
  const [editingCarrier, setEditingCarrier] = useState(false);
  const [carrierDraft, setCarrierDraft] = useState({
    carrierName,
    trackingNumber,
    shipping: formatMinorToMajorInput(shippingMinor),
    weightKg: weightKg.toFixed(3),
  });

  return (
    <section className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <div className="flex flex-wrap border-b border-[#e9ebec] bg-[#f3f6f9]">
        <TabButton
          active={tab === "status"}
          onClick={() => setTab("status")}
          icon={History}
          label={`Durum (${history.length})`}
        />
        <TabButton
          active={tab === "documents"}
          onClick={() => setTab("documents")}
          icon={FileText}
          label={`Belgeler (${documents.length})`}
        />
        <TabButton
          active={tab === "carriers"}
          onClick={() => setTab("carriers")}
          icon={Truck}
          label="Kargo (1)"
        />
      </div>

      <div className="p-4">
        {renderTab(tab, {
          orderId,
          status,
          history,
          documents,
          noteOpen,
          setNoteOpen,
          note,
          setNote,
          editingCarrier,
          setEditingCarrier,
          carrierDraft,
          setCarrierDraft,
          carrierName,
          trackingNumber,
          shippingMinor,
          weightKg,
          createdAt,
          isPending,
          onStatusChange,
          onRun,
        })}
      </div>
    </section>
  );
}

function renderTab(
  tab: TabId,
  props: {
    orderId: string;
    status: OrderStatusCode;
    history: { id: string; status: OrderStatusCode; createdAt: string }[];
    documents: OrderDocumentRow[];
    noteOpen: boolean;
    setNoteOpen: (open: boolean) => void;
    note: string;
    setNote: (value: string) => void;
    editingCarrier: boolean;
    setEditingCarrier: (open: boolean) => void;
    carrierDraft: { carrierName: string; trackingNumber: string; shipping: string; weightKg: string };
    setCarrierDraft: Dispatch<
      SetStateAction<{ carrierName: string; trackingNumber: string; shipping: string; weightKg: string }>
    >;
    carrierName: string;
    trackingNumber: string;
    shippingMinor: number;
    weightKg: number;
    createdAt: string;
    isPending: boolean;
    onStatusChange: (status: OrderStatusCode) => void;
    onRun: (task: () => Promise<{ error?: string }>) => void;
  },
) {
  switch (tab) {
    case "status":
      return <StatusTab {...props} />;
    case "documents":
      return <DocumentsTab {...props} />;
    case "carriers":
      return <CarriersTab {...props} />;
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

function StatusTab({
  orderId,
  status,
  history,
  noteOpen,
  setNoteOpen,
  note,
  setNote,
  isPending,
  onStatusChange,
  onRun,
}: {
  orderId: string;
  status: OrderStatusCode;
  history: { id: string; status: OrderStatusCode; createdAt: string }[];
  noteOpen: boolean;
  setNoteOpen: (open: boolean) => void;
  note: string;
  setNote: (value: string) => void;
  isPending: boolean;
  onStatusChange: (status: OrderStatusCode) => void;
  onRun: (task: () => Promise<{ error?: string }>) => void;
}) {
  return (
    <div className="space-y-4">
      {history.length === 0 ? (
        <p className="text-sm text-slate-400">Henüz durum kaydı yok.</p>
      ) : (
      <ul className="space-y-3">
        {history.map((event) => (
          <li
            key={event.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e9ebec] pb-3 last:border-0 last:pb-0"
          >
            <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${orderStatusBadgeClass(event.status)}`}>
              {orderStatusLabel(event.status)}
            </span>
            <span className="text-xs text-slate-400">{formatOrderDateTime(event.createdAt)}</span>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                onRun(() => resendOrderStatusEmailAction({ orderId, eventId: event.id }))
              }
              className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              E-postayı tekrar gönder
            </button>
          </li>
        ))}
      </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Can resource="orders" action="update">
          <OrderStatusSelect
            value={status}
            disabled={isPending}
            onChange={onStatusChange}
            size="md"
            className="w-full max-w-md"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() => onRun(() => updateOrderStatusAction({ id: orderId, status }))}
            className="rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Durumu güncelle
          </button>
        </Can>
      </div>

      <div className="border-t border-[#e9ebec] pt-3">
        <button
          type="button"
          onClick={() => setNoteOpen(!noteOpen)}
          className="flex w-full items-center justify-between text-sm font-semibold text-slate-800"
        >
          Sipariş notu
          <Plus className={`h-4 w-4 text-slate-400 transition ${noteOpen ? "rotate-45" : ""}`} />
        </button>
        {noteOpen ? (
          <div className="mt-3">
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className={`${inputClass} resize-y`}
              placeholder="Yalnızca yönetim panelinde görünür"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() => onRun(() => updateOrderNoteAction({ id: orderId, privateNote: note }))}
              className="mt-2 rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Notu kaydet
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DocumentsTab({
  orderId,
  documents,
  isPending,
  onRun,
}: {
  orderId: string;
  documents: OrderDocumentRow[];
  isPending: boolean;
  onRun: (task: () => Promise<{ error?: string }>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs text-slate-400 uppercase">
            <tr>
              <th className="py-2 pr-3">Tarih</th>
              <th className="py-2 pr-3">Belge</th>
              <th className="py-2 pr-3">Numara</th>
              <th className="py-2 pr-3 text-right">Tutar</th>
              <th className="py-2 text-right">Eylemler</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  Herhangi mevcut bir belge bulunmamaktadır.
                </td>
              </tr>
            ) : (
              documents.map((document) => (
                <tr key={document.id} className="border-t border-[#e9ebec]">
                  <td className="py-2 pr-3">{formatOrderDateTime(document.createdAt)}</td>
                  <td className="py-2 pr-3">{orderDocumentKindLabel(document.kind)}</td>
                  <td className="py-2 pr-3 font-medium">
                    {formatOrderDocumentNumber(document.kind, document.number)}
                  </td>
                  <td className="py-2 pr-3 text-right">{formatMinorTry(document.amountMinor)}</td>
                  <td className="py-2">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/orders/${orderId}/documents/${document.id}`}
                        className="text-xs font-medium text-[#405189] hover:underline"
                      >
                        Görüntüle
                      </Link>
                      <Can resource="orders" action="delete">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            if (!window.confirm("Bu belge silinsin mi?")) return;
                            onRun(() =>
                              deleteOrderDocumentAction({ orderId, documentId: document.id }),
                            );
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#e9ebec] text-slate-400 hover:text-rose-600"
                          title="Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Can resource="orders" action="create">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => onRun(() => createOrderDocumentAction({ orderId, kind: "INVOICE" }))}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Fatura oluştur
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onRun(() => createOrderDocumentAction({ orderId, kind: "DELIVERY_SLIP" }))}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
          >
            İrsaliye oluştur
          </button>
        </div>
      </Can>
    </div>
  );
}

function CarriersTab({
  orderId,
  editingCarrier,
  setEditingCarrier,
  carrierDraft,
  setCarrierDraft,
  carrierName,
  trackingNumber,
  shippingMinor,
  weightKg,
  createdAt,
  isPending,
  onRun,
}: {
  orderId: string;
  editingCarrier: boolean;
  setEditingCarrier: (open: boolean) => void;
  carrierDraft: { carrierName: string; trackingNumber: string; shipping: string; weightKg: string };
  setCarrierDraft: Dispatch<
    SetStateAction<{ carrierName: string; trackingNumber: string; shipping: string; weightKg: string }>
  >;
  carrierName: string;
  trackingNumber: string;
  shippingMinor: number;
  weightKg: number;
  createdAt: string;
  isPending: boolean;
  onRun: (task: () => Promise<{ error?: string }>) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs text-slate-400 uppercase">
          <tr>
            <th className="py-2 pr-3">Tarih</th>
            <th className="py-2 pr-3">Kargo firması</th>
            <th className="py-2 pr-3">Ağırlık</th>
            <th className="py-2 pr-3">Kargo ücreti</th>
            <th className="py-2 pr-3">Takip no</th>
            <th className="py-2 text-right">Eylemler</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-[#e9ebec]">
            <td className="py-2.5 pr-3">{formatOrderDate(createdAt)}</td>
            <td className="py-2.5 pr-3">
              {editingCarrier ? (
                <input
                  value={carrierDraft.carrierName}
                  onChange={(event) =>
                    setCarrierDraft((current) => ({ ...current, carrierName: event.target.value }))
                  }
                  className={inputClass}
                />
              ) : (
                carrierName || "—"
              )}
            </td>
            <td className="py-2.5 pr-3">
              {editingCarrier ? (
                <input
                  value={carrierDraft.weightKg}
                  onChange={(event) =>
                    setCarrierDraft((current) => ({ ...current, weightKg: event.target.value }))
                  }
                  className={`${inputClass} max-w-[7rem]`}
                />
              ) : (
                formatWeightKg(weightKg)
              )}
            </td>
            <td className="py-2.5 pr-3">
              {editingCarrier ? (
                <input
                  value={carrierDraft.shipping}
                  onChange={(event) =>
                    setCarrierDraft((current) => ({ ...current, shipping: event.target.value }))
                  }
                  className={`${inputClass} max-w-[7rem]`}
                />
              ) : (
                formatMinorTry(shippingMinor)
              )}
            </td>
            <td className="py-2.5 pr-3">
              {editingCarrier ? (
                <input
                  value={carrierDraft.trackingNumber}
                  onChange={(event) =>
                    setCarrierDraft((current) => ({ ...current, trackingNumber: event.target.value }))
                  }
                  className={inputClass}
                />
              ) : (
                trackingNumber || "—"
              )}
            </td>
            <td className="py-2.5 text-right">
              {editingCarrier ? (
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      onRun(async () => {
                        const result = await updateOrderShippingAction({
                          id: orderId,
                          carrierName: carrierDraft.carrierName,
                          trackingNumber: carrierDraft.trackingNumber,
                          shipping: carrierDraft.shipping,
                          weightKg: carrierDraft.weightKg,
                        });
                        if (!result.error) setEditingCarrier(false);
                        return result;
                      })
                    }
                    className="text-xs font-semibold text-[#0ab39c]"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCarrier(false)}
                    className="text-xs font-medium text-slate-500"
                  >
                    İptal
                  </button>
                </div>
              ) : (
                <Can resource="orders" action="update">
                  <button
                    type="button"
                    onClick={() => {
                      setCarrierDraft({
                        carrierName,
                        trackingNumber,
                        shipping: formatMinorToMajorInput(shippingMinor),
                        weightKg: weightKg.toFixed(3),
                      });
                      setEditingCarrier(true);
                    }}
                    className="text-xs font-medium text-[#405189] hover:underline"
                  >
                    Düzenle
                  </button>
                </Can>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof History;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition ${
        active
          ? "border-slate-800 bg-white text-slate-800"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
