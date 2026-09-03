"use client";

import { useActionState } from "react";
import {
  ORDER_CASE_REASONS,
  canOpenCancelCase,
  canOpenReturnCase,
  isOpenOrderCaseStatus,
  orderCaseKindLabel,
  orderCaseReasonLabel,
  orderCaseStatusBadgeClass,
  orderCaseStatusLabel,
  type OrderCaseKindCode,
  type OrderCaseView,
} from "@/lib/order-cases";
import { formatOrderDateTime, type OrderStatusCode } from "@/lib/orders";
import { requestMemberOrderCaseAction, type MemberCaseFormState } from "../case-actions";

type OrderLine = {
  id: string;
  title: string;
  variantTitle: string | null;
  quantity: number;
};

const inputClass =
  "w-full rounded-xl border border-site-border bg-site-card px-3 py-2 text-sm text-site-fg outline-none focus:border-site-primary";

export function MemberOrderCasePanel({
  reference,
  status,
  items,
  cases,
}: {
  reference: string;
  status: OrderStatusCode;
  items: OrderLine[];
  cases: OrderCaseView[];
}) {
  const cancelable = canOpenCancelCase(status);
  const returnable = canOpenReturnCase(status);
  const kind: OrderCaseKindCode | null = cancelable ? "CANCEL" : returnable ? "RETURN" : null;
  const open = cases.some((row) => isOpenOrderCaseStatus(row.status));

  return (
    <section className="rounded-2xl border border-site-border bg-site-card p-5 sm:p-6">
      <h3 className="text-base font-semibold text-site-fg">İptal / iade</h3>
      {cases.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {cases.map((row) => (
            <li key={row.id} className="rounded-xl border border-site-border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-site-fg">
                  {row.code} · {orderCaseKindLabel(row.kind)}
                </span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${orderCaseStatusBadgeClass(row.status)}`}>
                  {orderCaseStatusLabel(row.status)}
                </span>
              </div>
              <p className="mt-1 text-site-muted">
                {orderCaseReasonLabel(row.reason)} · {formatOrderDateTime(row.createdAt)}
              </p>
              {row.rejectReason ? <p className="mt-1 text-rose-700">{row.rejectReason}</p> : null}
              {row.status === "AWAITING_RETURN" ? (
                <p className="mt-2 text-xs text-site-muted">
                  Ürünü belirtilen şekilde gönderin. Depoya ulaşıp kontrol edilmeden ödeme iade edilmez.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {kind && !open ? <MemberCaseForm reference={reference} kind={kind} items={items} /> : null}
      {!kind ? (
        <p className="mt-3 text-sm text-site-muted">Bu sipariş için iptal veya iade talebi açılamaz.</p>
      ) : null}
    </section>
  );
}

function MemberCaseForm({
  reference,
  kind,
  items,
}: {
  reference: string;
  kind: OrderCaseKindCode;
  items: OrderLine[];
}) {
  const [state, action, pending] = useActionState(
    requestMemberOrderCaseAction,
    {} as MemberCaseFormState,
  );

  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="reference" value={reference} />
      <p className="text-sm text-site-muted">
        {kind === "CANCEL"
          ? "Sipariş henüz kargoya verilmediği için iptal edebilirsiniz. Ödeme alındıysa tutar kartınıza iade edilir."
          : "Sipariş kargoda veya teslim edildi. İade talebi açılır; ürün depoya gelip kontrol edilmeden ödeme iade edilmez."}
      </p>
      {kind === "RETURN"
        ? items.map((item) => (
            <label key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <input type="checkbox" name="returnItem" value={item.id} defaultChecked />
                <span className="truncate">
                  {item.title}
                  {item.variantTitle ? ` (${item.variantTitle})` : ""}
                </span>
              </span>
              <input
                type="number"
                name={`qty-${item.id}`}
                min={1}
                max={item.quantity}
                defaultValue={item.quantity}
                className="w-16 rounded-lg border border-site-border px-2 py-1"
              />
            </label>
          ))
        : null}
      <select name="reason" className={inputClass} defaultValue="CHANGED_MIND">
        {ORDER_CASE_REASONS.map((reason) => (
          <option key={reason} value={reason}>
            {orderCaseReasonLabel(reason)}
          </option>
        ))}
      </select>
      <textarea
        name="note"
        rows={3}
        maxLength={500}
        placeholder="Açıklama (isteğe bağlı)"
        className={`${inputClass} resize-y`}
      />
      {state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-site-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {kind === "CANCEL" ? "Siparişi iptal et" : "İade talebi gönder"}
      </button>
    </form>
  );
}
