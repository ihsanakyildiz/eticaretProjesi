"use client";

import { useMemo, useState } from "react";
import {
  ORDER_CASE_REASONS,
  caseKindForOrderStatus,
  fulfillmentStage,
  isOpenOrderCaseStatus,
  orderCaseKindLabel,
  orderCaseReasonLabel,
  orderCaseStatusBadgeClass,
  orderCaseStatusLabel,
  orderReturnConditionLabel,
  type OrderCaseKindCode,
  type OrderCaseView,
  type OrderReturnConditionCode,
} from "@/lib/order-cases";
import { formatOrderDateTime, type OrderStatusCode } from "@/lib/orders";
import { formatMinorToMajorInput, formatMinorTry } from "@/lib/product-money";
import {
  approveReturnCaseAction,
  completeCancelCaseAction,
  completeReturnCaseAction,
  createOrderCaseAction,
  receiveReturnCaseAction,
  rejectOrderCaseAction,
  retryCaseRefundAction,
} from "../case-actions";

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0ab39c]";

type OrderLine = {
  id: string;
  title: string;
  variantTitle: string | null;
  quantity: number;
};

export function OrderCasePanel({
  orderId,
  status,
  remainingMinor,
  items,
  cases,
  isPending,
  onRun,
}: {
  orderId: string;
  status: OrderStatusCode;
  remainingMinor: number;
  items: OrderLine[];
  cases: OrderCaseView[];
  isPending: boolean;
  onRun: (task: () => Promise<{ error?: string; message?: string }>) => void;
}) {
  const kind = caseKindForOrderStatus(status);
  const openCase = cases.find((row) => isOpenOrderCaseStatus(row.status)) ?? null;
  const stage = fulfillmentStage(status);

  return (
    <section className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">İptal / iade süreci</h2>
      <p className="mt-1 text-xs text-slate-500">{policyText(stage)}</p>

      {openCase ? (
        <OpenCaseCard
          record={openCase}
          remainingMinor={remainingMinor}
          isPending={isPending}
          onRun={onRun}
        />
      ) : kind ? (
        <CreateCaseForm
          orderId={orderId}
          kind={kind}
          items={items}
          isPending={isPending}
          onRun={onRun}
        />
      ) : (
        <p className="mt-3 text-sm text-slate-400">Bu sipariş için yeni iptal veya iade açılamaz.</p>
      )}

      {cases.length > 0 ? (
        <ul className="mt-4 divide-y divide-[#e9ebec] text-sm">
          {cases.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-slate-700">
                {row.code} · {orderCaseKindLabel(row.kind)} · {orderCaseReasonLabel(row.reason)}
              </span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${orderCaseStatusBadgeClass(row.status)}`}>
                {orderCaseStatusLabel(row.status)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function policyText(stage: ReturnType<typeof fulfillmentStage>): string {
  switch (stage) {
    case "unpaid":
      return "Ödeme alınmamış sipariş iptal edilebilir. Stok geri alınır, kart iadesi yoktur.";
    case "paid_unshipped":
      return "Ürün depodayken iptal güvenlidir: ödeme iade edilir ve stok hemen açılır.";
    case "in_transit":
      return "Kargo yoldayken iptal yoktur. İade açılır; paket depoya gelip kontrol edilmeden para gönderilmez ve stok yazılmaz.";
    case "delivered":
      return "Teslim sonrası iade: müşteri ürünü gönderir, depo kontrol eder. Satılabilir adet stoka girer; onaylanırsa ödeme iade edilir.";
    case "closed":
      return "Sipariş kapalı. Yeni iptal veya iade açılamaz.";
    default: {
      const _exhaustive: never = stage;
      return _exhaustive;
    }
  }
}

function CreateCaseForm({
  orderId,
  kind,
  items,
  isPending,
  onRun,
}: {
  orderId: string;
  kind: OrderCaseKindCode;
  items: OrderLine[];
  isPending: boolean;
  onRun: (task: () => Promise<{ error?: string; message?: string }>) => void;
}) {
  const [reason, setReason] = useState("CHANGED_MIND");
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.quantity])),
  );

  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm font-medium text-slate-700">
        {kind === "CANCEL" ? "Siparişi iptal et" : "İade süreci başlat"}
      </p>
      {kind === "RETURN" ? (
        <ul className="space-y-2 rounded-md border border-[#e9ebec] p-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <label className="flex min-w-0 items-center gap-2">
                <input
                  type="checkbox"
                  checked={(selected[item.id] ?? 0) > 0}
                  onChange={(event) =>
                    setSelected((current) => ({
                      ...current,
                      [item.id]: event.target.checked ? item.quantity : 0,
                    }))
                  }
                />
                <span className="truncate">
                  {item.title}
                  {item.variantTitle ? ` (${item.variantTitle})` : ""}
                </span>
              </label>
              <input
                type="number"
                min={0}
                max={item.quantity}
                value={selected[item.id] ?? 0}
                onChange={(event) =>
                  setSelected((current) => ({
                    ...current,
                    [item.id]: Math.max(0, Math.min(item.quantity, Number(event.target.value) || 0)),
                  }))
                }
                className="w-16 rounded-md border border-[#e9ebec] px-2 py-1 text-sm"
              />
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <select value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass}>
          {ORDER_CASE_REASONS.map((value) => (
            <option key={value} value={value}>
              {orderCaseReasonLabel(value)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            onRun(() =>
              createOrderCaseAction({
                orderId,
                kind,
                reason,
                note,
                items:
                  kind === "RETURN"
                    ? items
                        .filter((item) => (selected[item.id] ?? 0) > 0)
                        .map((item) => ({ orderItemId: item.id, quantity: selected[item.id] ?? 0 }))
                    : undefined,
              }),
            )
          }
          className="rounded-md bg-[#405189] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {kind === "CANCEL" ? "İptal et ve iade gönder" : "İade sürecini başlat"}
        </button>
      </div>
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={500}
        placeholder="Personel notu (isteğe bağlı)"
        className={inputClass}
      />
      {kind === "CANCEL" ? (
        <p className="text-xs text-slate-400">İptal onayında ödeme hemen iade edilir çünkü ürün henüz depodadır.</p>
      ) : (
        <p className="text-xs text-slate-400">
          Süreç “ürün bekleniyor” ile açılır. Depo teslimi ve kontrolden önce ödeme iadesi yok.
        </p>
      )}
    </div>
  );
}

function OpenCaseCard({
  record,
  remainingMinor,
  isPending,
  onRun,
}: {
  record: OrderCaseView;
  remainingMinor: number;
  isPending: boolean;
  onRun: (task: () => Promise<{ error?: string; message?: string }>) => void;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [carrierName, setCarrierName] = useState(record.returnCarrierName ?? "");
  const [trackingNumber, setTrackingNumber] = useState(record.returnTrackingNumber ?? "");
  const [amount, setAmount] = useState(formatMinorToMajorInput(remainingMinor));
  const [staffNote, setStaffNote] = useState(record.staffNote ?? "");
  const [returnless, setReturnless] = useState(false);
  const [conditions, setConditions] = useState<Record<string, OrderReturnConditionCode>>(() =>
    Object.fromEntries(record.items.map((item) => [item.id, item.condition])),
  );

  const inspections = useMemo(
    () => record.items.map((item) => ({ itemId: item.id, condition: conditions[item.id] ?? item.condition })),
    [conditions, record.items],
  );

  return (
    <div className="mt-3 rounded-md border border-[#e9ebec] bg-slate-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {record.code} · {orderCaseKindLabel(record.kind)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {orderCaseReasonLabel(record.reason)}
            {record.source === "CUSTOMER" ? " · müşteri talebi" : " · personel"}
            {record.customerNote ? ` · ${record.customerNote}` : ""}
          </p>
        </div>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${orderCaseStatusBadgeClass(record.status)}`}>
          {orderCaseStatusLabel(record.status)}
        </span>
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {record.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {item.title}
              {item.variantTitle ? ` (${item.variantTitle})` : ""} × {item.quantity}
            </span>
            {record.status === "RECEIVED" ? (
              <select
                value={conditions[item.id] ?? item.condition}
                onChange={(event) =>
                  setConditions((current) => ({
                    ...current,
                    [item.id]: event.target.value as OrderReturnConditionCode,
                  }))
                }
                className="rounded-md border border-[#e9ebec] bg-white px-2 py-1 text-xs"
              >
                <option value="PENDING">{orderReturnConditionLabel("PENDING")}</option>
                <option value="SELLABLE">{orderReturnConditionLabel("SELLABLE")}</option>
                <option value="UNSALEABLE">{orderReturnConditionLabel("UNSALEABLE")}</option>
              </select>
            ) : (
              <span className="text-xs text-slate-400">{orderReturnConditionLabel(item.condition)}</span>
            )}
          </li>
        ))}
      </ul>

      {record.events.length > 0 ? (
        <ol className="mt-3 space-y-1 border-t border-[#e9ebec] pt-3 text-xs text-slate-500">
          {record.events.map((event) => (
            <li key={event.id}>
              {formatOrderDateTime(event.createdAt)} · {orderCaseStatusLabel(event.status)}
              {event.note ? ` — ${event.note}` : ""}
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-3 space-y-2">
        {record.kind === "CANCEL" && record.status === "REQUESTED" ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => onRun(() => completeCancelCaseAction({ caseId: record.id, staffNote }))}
              className="rounded-md bg-[#405189] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              İptali onayla ve ödemeyi iade et
            </button>
            <RejectField
              value={rejectReason}
              onChange={setRejectReason}
              disabled={isPending}
              onReject={() => onRun(() => rejectOrderCaseAction({ caseId: record.id, rejectReason }))}
            />
          </div>
        ) : null}

        {record.kind === "RETURN" && record.status === "REQUESTED" ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => onRun(() => approveReturnCaseAction({ caseId: record.id }))}
              className="rounded-md bg-[#405189] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              İadeyi onayla (ürünü bekle)
            </button>
            <RejectField
              value={rejectReason}
              onChange={setRejectReason}
              disabled={isPending}
              onReject={() => onRun(() => rejectOrderCaseAction({ caseId: record.id, rejectReason }))}
            />
          </div>
        ) : null}

        {record.kind === "RETURN" && (record.status === "AWAITING_RETURN" || record.status === "APPROVED") ? (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={carrierName}
                onChange={(event) => setCarrierName(event.target.value)}
                placeholder="İade kargo firması (sonra bağlanacak)"
                className={inputClass}
              />
              <input
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                placeholder="İade takip no"
                className={inputClass}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  onRun(() =>
                    receiveReturnCaseAction({
                      caseId: record.id,
                      carrierName,
                      trackingNumber,
                    }),
                  )
                }
                className="rounded-md bg-[#405189] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Depoya geldi
              </button>
              <label className="flex items-center gap-2 text-xs text-rose-700">
                <input
                  type="checkbox"
                  checked={returnless}
                  onChange={(event) => setReturnless(event.target.checked)}
                />
                Ürün gelmeden iade et (stok yazılmaz, riskli)
              </label>
              {returnless ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    onRun(() =>
                      completeReturnCaseAction({
                        caseId: record.id,
                        refund: true,
                        returnless: true,
                        amount,
                        staffNote,
                      }),
                    )
                  }
                  className="rounded-md bg-rose-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Ürünsüz ödeme iadesi gönder
                </button>
              ) : null}
              <RejectField
                value={rejectReason}
                onChange={setRejectReason}
                disabled={isPending}
                onReject={() => onRun(() => rejectOrderCaseAction({ caseId: record.id, rejectReason }))}
              />
            </div>
          </div>
        ) : null}

        {record.kind === "RETURN" && record.status === "RECEIVED" ? (
          <div className="space-y-2">
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="İade tutarı"
              className={`${inputClass} max-w-[10rem]`}
              inputMode="decimal"
            />
            <input
              value={staffNote}
              onChange={(event) => setStaffNote(event.target.value)}
              placeholder="Kontrol notu"
              maxLength={500}
              className={inputClass}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  onRun(() =>
                    completeReturnCaseAction({
                      caseId: record.id,
                      refund: true,
                      amount,
                      staffNote,
                      inspections,
                    }),
                  )
                }
                className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Onayla: stok + ödeme iadesi
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  onRun(() =>
                    completeReturnCaseAction({
                      caseId: record.id,
                      refund: false,
                      staffNote: staffNote || rejectReason,
                    }),
                  )
                }
                className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60"
              >
                Reddet: ödeme yok
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Satılabilir adet stoka yazılır. Satılamaz adet stoka girmez. Kalan tahsilat: {formatMinorTry(remainingMinor)}.
            </p>
          </div>
        ) : null}

        {(record.kind === "CANCEL" && record.status === "REQUESTED") ||
        (record.kind === "RETURN" && (record.status === "RECEIVED" || record.returnless)) ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onRun(() => retryCaseRefundAction({ caseId: record.id }))}
            className="text-xs font-medium text-[#405189] hover:underline"
          >
            Ödeme iadesini tekrar dene
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RejectField({
  value,
  onChange,
  disabled,
  onReject,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  onReject: () => void;
}) {
  return (
    <div className="flex min-w-[16rem] flex-1 gap-2">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Red gerekçesi"
        className={inputClass}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={onReject}
        className="rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-60"
      >
        Reddet
      </button>
    </div>
  );
}
