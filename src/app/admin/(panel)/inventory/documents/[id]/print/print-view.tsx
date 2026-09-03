"use client";

import { useEffect } from "react";

export type StockDocumentPrintModel = {
  number: string;
  kindLabel: string;
  statusLabel: string;
  date: string;
  externalNumber: string | null;
  notes: string | null;
  warehouseName: string;
  warehouseAddress: string | null;
  targetWarehouseName: string | null;
  supplierName: string | null;
  supplierDetail: string | null;
  relatedNumber: string | null;
  lines: {
    productTitle: string;
    variantTitle: string;
    sku: string;
    barcode: string | null;
    quantity: number;
    unitCostMinor: number | null;
  }[];
};

export function StockDocumentPrint({ document }: { document: StockDocumentPrintModel }) {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, []);

  const totalQty = document.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-slate-900 print:max-w-none print:p-0">
      <div className="mb-6 flex items-start justify-between border-b border-slate-300 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">{document.kindLabel}</p>
          <h1 className="text-2xl font-bold">{document.number}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {document.date} · {document.statusLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm print:hidden"
        >
          Yazdır
        </button>
      </div>
      <div className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
        <p>
          <span className="text-slate-500">Depo: </span>
          {document.warehouseName}
        </p>
        {document.targetWarehouseName ? (
          <p>
            <span className="text-slate-500">Hedef: </span>
            {document.targetWarehouseName}
          </p>
        ) : null}
        {document.supplierName ? (
          <p>
            <span className="text-slate-500">Tedarikçi: </span>
            {document.supplierName}
          </p>
        ) : null}
        {document.externalNumber ? (
          <p>
            <span className="text-slate-500">Evrak no: </span>
            {document.externalNumber}
          </p>
        ) : null}
        {document.relatedNumber ? (
          <p>
            <span className="text-slate-500">Bağlı belge: </span>
            {document.relatedNumber}
          </p>
        ) : null}
      </div>
      {document.warehouseAddress ? (
        <p className="mb-4 text-sm text-slate-600">{document.warehouseAddress}</p>
      ) : null}
      {document.supplierDetail ? (
        <p className="mb-4 text-sm text-slate-600">{document.supplierDetail}</p>
      ) : null}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-left">
            <th className="py-2">Ürün</th>
            <th className="py-2">SKU</th>
            <th className="py-2">Barkod</th>
            <th className="py-2 text-right">Adet</th>
          </tr>
        </thead>
        <tbody>
          {document.lines.map((line, index) => (
            <tr key={`${line.sku}-${index}`} className="border-b border-slate-200">
              <td className="py-2">
                {line.productTitle}
                {line.variantTitle ? ` / ${line.variantTitle}` : ""}
              </td>
              <td className="py-2 font-mono text-xs">{line.sku}</td>
              <td className="py-2 font-mono text-xs">{line.barcode ?? "—"}</td>
              <td className="py-2 text-right font-semibold">{line.quantity}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-3 font-semibold">
              Toplam
            </td>
            <td className="pt-3 text-right font-bold">{totalQty}</td>
          </tr>
        </tfoot>
      </table>
      {document.notes ? <p className="mt-6 text-sm text-slate-600">Not: {document.notes}</p> : null}
    </div>
  );
}
