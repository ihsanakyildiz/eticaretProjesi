"use client";

import { useEffect } from "react";
import type { WarehouseLine } from "@/lib/warehouse";

export function WarehousePickListPrint({
  orderNo,
  reference,
  customerName,
  lines,
}: {
  orderNo: number;
  reference: string;
  customerName: string;
  lines: WarehouseLine[];
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-slate-900 print:max-w-none print:p-0">
      <div className="mb-6 flex items-start justify-between border-b border-slate-300 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">Toplama listesi</p>
          <h1 className="text-2xl font-bold">Sipariş #{orderNo}</h1>
          <p className="mt-1 font-mono text-sm text-slate-600">{reference}</p>
          <p className="mt-1 text-sm">{customerName}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm print:hidden"
        >
          Yazdır
        </button>
      </div>
      <p className="mb-4 text-sm text-slate-600">
        Raflar koridor sırasına göre dizildi. Ürünü raftan alın, barkodu paketleme ekranında okutun.
      </p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-left">
            <th className="py-2">Raf</th>
            <th className="py-2">Ürün</th>
            <th className="py-2">Barkod</th>
            <th className="py-2 text-right">Adet</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-b border-slate-200">
              <td className="py-3 align-top">
                <p className="font-mono text-lg font-bold">{line.locationCode ?? "—"}</p>
                {line.locationHint ? <p className="text-xs text-slate-500">{line.locationHint}</p> : null}
              </td>
              <td className="py-3">
                {line.title}
                {line.variantTitle ? ` / ${line.variantTitle}` : ""}
              </td>
              <td className="py-3 font-mono text-xs">
                <div>{line.barcode ?? "—"}</div>
                {line.sku ? <div>{line.sku}</div> : null}
              </td>
              <td className="py-3 text-right text-lg font-bold">{line.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
