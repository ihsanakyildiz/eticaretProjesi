import Link from "next/link";
import { ChevronLeft, ChevronRight, PackageOpen, Printer, Search } from "lucide-react";
import { formatOrderDateTime, orderStatusLabel } from "@/lib/orders";
import type { WarehouseListKind, WarehouseReadyRow } from "@/lib/warehouse-list";
import { WarehouseReturnButton } from "./warehouse-return-button";

export type { WarehouseReadyRow };

function listPath(kind: WarehouseListKind) {
  switch (kind) {
    case "ready":
      return "/admin/warehouse";
    case "shipped":
      return "/admin/warehouse/shipped";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function listHref(kind: WarehouseListKind, q: string, page: number) {
  const search = new URLSearchParams();
  if (q) search.set("q", q);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  const path = listPath(kind);
  return query ? `${path}?${query}` : path;
}

export function WarehouseOrdersTable({
  kind,
  rows,
  emptyLabel,
  actionLabel,
  query,
  page,
  pageCount,
  pageSize,
  total,
}: {
  kind: WarehouseListKind;
  rows: WarehouseReadyRow[];
  emptyLabel: string;
  actionLabel: string;
  query: string;
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}) {
  const ActionIcon = kind === "ready" ? PackageOpen : Printer;
  const rangeStart = total === 0 || rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = rows.length === 0 ? 0 : rangeStart + rows.length - 1;

  return (
    <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <form
        action={listPath(kind)}
        className="flex items-center gap-2 border-b border-[#e9ebec] px-4 py-3"
      >
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          name="q"
          defaultValue={query}
          placeholder="Sipariş no, referans, takip veya müşteri ara…"
          className="w-full bg-transparent text-sm outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-[#405189] px-3 py-1.5 text-xs font-semibold text-white"
        >
          Ara
        </button>
      </form>
      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2">Sipariş</th>
              <th className="px-4 py-2">Müşteri</th>
              <th className="px-4 py-2">İl</th>
              <th className="px-4 py-2">Durum</th>
              <th className="px-4 py-2 text-right">Paket</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const ready = row.packed >= row.total && row.total > 0;
              return (
                <tr key={row.id} className="border-t border-[#e9ebec]">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">#{row.orderNo}</p>
                    <p className="font-mono text-xs text-slate-400">{row.reference}</p>
                    <p className="text-[11px] text-slate-400">{formatOrderDateTime(row.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.customerName}</td>
                  <td className="px-4 py-3 text-slate-600">{row.city || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{orderStatusLabel(row.status)}</td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${ready ? "text-emerald-700" : "text-slate-800"}`}
                  >
                    {row.packed} / {row.total}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {kind === "shipped" ? <WarehouseReturnButton orderId={row.id} /> : null}
                      <Link
                        href={`/admin/warehouse/${row.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#405189] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#364574]"
                      >
                        <ActionIcon className="h-3.5 w-3.5" />
                        {actionLabel}
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e9ebec] px-4 py-3 text-xs text-slate-500">
        <p>
          {total === 0
            ? "Sonuç yok"
            : `${rangeStart.toLocaleString("tr-TR")}–${rangeEnd.toLocaleString("tr-TR")} / ${total.toLocaleString("tr-TR")}`}
        </p>
        {pageCount > 1 ? (
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={listHref(kind, query, page - 1)}
                className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-2.5 py-1 text-slate-600"
              >
                <ChevronLeft className="h-4 w-4" />
                Önceki
              </Link>
            ) : null}
            <span>
              Sayfa {page} / {pageCount}
            </span>
            {page < pageCount ? (
              <Link
                href={listHref(kind, query, page + 1)}
                className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-2.5 py-1 text-slate-600"
              >
                Sonraki
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
