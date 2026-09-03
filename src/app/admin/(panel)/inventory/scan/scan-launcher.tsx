"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScanBarcode } from "lucide-react";
import {
  parseStockDocumentKind,
  stockDocumentKindLabel,
  type StockDocumentKindCode,
} from "@/lib/inventory-labels";
import { createStockDocumentAction } from "../documents/actions";

const KINDS: StockDocumentKindCode[] = [
  "GOODS_RECEIPT",
  "TRANSFER",
  "COUNT",
  "ADJUSTMENT",
  "GOODS_ISSUE",
  "CUSTOMER_RETURN",
];

export type ScanDraftRow = {
  id: string;
  number: string;
  kind: string;
  warehouseName: string;
  lineCount: number;
};

export function InventoryScanLauncher({
  warehouses,
  drafts,
}: {
  warehouses: { id: string; name: string; code: string; city: string | null; isDefault: boolean }[];
  drafts: ScanDraftRow[];
}) {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState(
    warehouses.find((row) => row.isDefault)?.id ?? warehouses[0]?.id ?? "",
  );
  const [kind, setKind] = useState<StockDocumentKindCode>("GOODS_RECEIPT");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const start = () => {
    startTransition(async () => {
      const result = await createStockDocumentAction({ kind, warehouseId });
      if (!result.ok || !result.href) {
        setError(result.error ?? "Belge oluşturulamadı.");
        return;
      }
      setError(null);
      router.push(result.href);
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Stok ve depolar</p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <ScanBarcode className="h-6 w-6 text-[#405189]" />
          El terminali
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Depo ve işlem türünü seçip oturum başlatın. Açılan belgede barkod okutarak satır girin; bitince
          onaylayın.
        </p>
      </div>

      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Depo</span>
            <select
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              className="w-full rounded-md border border-[#e9ebec] px-3 py-3 text-base"
            >
              {warehouses.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} ({row.code})
                  {row.city ? ` · ${row.city}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">İşlem</span>
            <select
              value={kind}
              onChange={(event) => {
                const next = parseStockDocumentKind(event.target.value);
                if (next) setKind(next);
              }}
              className="w-full rounded-md border border-[#e9ebec] px-3 py-3 text-base"
            >
              {KINDS.map((item) => (
                <option key={item} value={item}>
                  {stockDocumentKindLabel(item)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <button
          type="button"
          disabled={isPending || !warehouseId}
          onClick={start}
          className="mt-4 w-full rounded-md bg-[#0ab39c] px-4 py-3.5 text-base font-semibold text-white hover:bg-[#099885] disabled:opacity-60 sm:w-auto"
        >
          Oturum başlat
        </button>
      </div>

      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Açık taslaklar</h2>
        {drafts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Açık taslak yok.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#e9ebec]">
            {drafts.map((row) => (
              <li key={row.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-medium text-slate-800">{row.number}</p>
                  <p className="text-xs text-slate-500">
                    {(() => {
                      const parsed = parseStockDocumentKind(row.kind);
                      return parsed ? stockDocumentKindLabel(parsed) : row.kind;
                    })()}{" "}
                    · {row.warehouseName} · {row.lineCount} satır
                  </p>
                </div>
                <Link
                  href={`/admin/inventory/documents/${row.id}`}
                  className="text-sm font-semibold text-[#405189] hover:underline"
                >
                  Devam et
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
