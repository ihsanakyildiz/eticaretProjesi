"use client";

import Link from "next/link";

export function catalogStockInputClass(base: string, locked: boolean) {
  return locked ? `${base} cursor-not-allowed bg-[#f3f6f9] text-slate-600` : base;
}

export function CatalogStockHint({ locked }: { locked: boolean }) {
  if (!locked) return null;
  return (
    <p className="mt-1.5 text-xs text-slate-500">
      Depo stoğu yalnızca gelişmiş stok sisteminden (irsaliye, sayım, düzeltme) değişir. XML/API
      stoğu tedarikçi stoğu olarak ayrı tutulur ve satışı etkilemez.{" "}
      <Link href="/admin/inventory" className="font-medium text-[#0ab39c] hover:underline">
        Stok ve depolar
      </Link>
    </p>
  );
}

export function SupplierStockInfo({
  warehouseStock,
  supplierStock,
}: {
  warehouseStock: number;
  supplierStock: number;
}) {
  const warehouse = Math.max(0, warehouseStock);
  const supplier = Math.max(0, supplierStock);
  const total = warehouse + supplier;
  return (
    <div className="mt-2 space-y-1 rounded-md border border-[#e9ebec] bg-[#f8f9fa] px-3 py-2 text-xs text-slate-600">
      <p>
        <span className="font-medium text-slate-700">Depo stoğu:</span> {warehouse}
        <span className="text-slate-400"> (satılabilir)</span>
      </p>
      <p>
        <span className="font-medium text-slate-700">Tedarikçi stoğu:</span> {supplier}
        <span className="text-slate-400"> (XML/API · salt okunur)</span>
      </p>
      <p>
        <span className="font-medium text-slate-700">Toplam (bilgi):</span> {total}
      </p>
    </div>
  );
}
