"use client";

import { useEffect, useState } from "react";
import { formatOrderDateTime, type OrderStatusCode } from "@/lib/orders";
import { goodsHaveLeftWarehouse } from "@/lib/order-cases";
import { formatMinorToMajorInput, formatMinorTry } from "@/lib/product-money";
import { refundOrderAction } from "../actions";

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0ab39c]";

export type OrderRefundRow = {
  id: string;
  amountMinor: number;
  provider: string | null;
  transactionId: string | null;
  note: string | null;
  createdAt: string;
};

export function OrderRefundPanel({
  orderId,
  status,
  paidMinor,
  refunds,
  providerLabel,
  isCardProvider,
  isPending,
  onRun,
}: {
  orderId: string;
  status: OrderStatusCode;
  paidMinor: number;
  refunds: OrderRefundRow[];
  providerLabel: string;
  isCardProvider: boolean;
  isPending: boolean;
  onRun: (task: () => Promise<{ error?: string; message?: string }>) => void;
}) {
  const refundedMinor = refunds.reduce((sum, row) => sum + row.amountMinor, 0);
  const remainingMinor = Math.max(0, paidMinor - refundedMinor);
  const [amount, setAmount] = useState(formatMinorToMajorInput(remainingMinor));
  const [note, setNote] = useState("");
  const shipped = goodsHaveLeftWarehouse(status);
  const closed = status === "REFUNDED" || status === "CANCELED" || remainingMinor <= 0 || shipped;

  useEffect(() => {
    setAmount(formatMinorToMajorInput(remainingMinor));
  }, [remainingMinor]);

  return (
    <section className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Ödeme iadeleri</h2>
      <p className="mt-1 text-xs text-slate-500">
        {goodsHaveLeftWarehouse(status)
          ? "Kargo veya teslim sonrası doğrudan iade kapalıdır. Yukarıdaki iptal/iade sürecini kullanın."
          : isCardProvider
            ? `Kart ödemelerinde iade tutarı ${providerLabel} üzerinden müşteriye gönderilir. Depodaki siparişlerde stok da geri alınır.`
            : "Havale / kapıda ödemelerde iade kaydı tutulur; tutarı ayrıca müşteriye iletmeniz gerekir."}
      </p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-md bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-400">Tahsil edilen</dt>
          <dd className="font-medium text-slate-800">{formatMinorTry(paidMinor)}</dd>
        </div>
        <div className="rounded-md bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-400">İade edilen</dt>
          <dd className="font-medium text-slate-800">{formatMinorTry(refundedMinor)}</dd>
        </div>
        <div className="rounded-md bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-400">Kalan</dt>
          <dd className="font-medium text-slate-800">{formatMinorTry(remainingMinor)}</dd>
        </div>
      </dl>

      {closed ? null : (
        <div className="mt-3 grid gap-2 sm:grid-cols-[7rem_1fr_auto]">
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            className={inputClass}
            inputMode="decimal"
          />
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="İade notu (isteğe bağlı)"
            maxLength={500}
            className={inputClass}
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              onRun(async () => {
                const result = await refundOrderAction({
                  id: orderId,
                  amount,
                  note,
                });
                if (!result.error) setNote("");
                return result;
              })
            }
            className="rounded-md bg-[#405189] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isCardProvider ? `${providerLabel} ile iade et` : "İade kaydet"}
          </button>
        </div>
      )}

      <ul className="mt-4 divide-y divide-[#e9ebec] text-sm">
        {refunds.length === 0 ? (
          <li className="py-2 text-slate-400">Henüz iade yok.</li>
        ) : (
          refunds.map((row) => (
            <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <span className="text-slate-700">
                {formatMinorTry(row.amountMinor)}
                {row.note ? ` · ${row.note}` : ""}
              </span>
              <span className="text-xs text-slate-400">
                {formatOrderDateTime(row.createdAt)}
                {row.transactionId ? ` · ${row.transactionId}` : ""}
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
