"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Star, Trash2 } from "lucide-react";
import { Can, AdminOnly } from "@/components/admin/admin-permissions";
import { deleteWarehouseAction, setDefaultWarehouseAction } from "./actions";

export type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  stockLines: number;
  onHand: number;
};

export function WarehousesTable({ warehouses }: { warehouses: WarehouseRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ error?: string; success?: boolean }>) => {
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  if (warehouses.length === 0) {
    return (
      <p className="rounded-lg border border-[#e9ebec] bg-white p-6 text-sm text-slate-500 shadow-sm">
        Henüz depo yok. İstanbul, İzmir, Adana gibi lokasyonlar için yeni depo ekleyin.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      {error ? (
        <p className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-3">Depo</th>
            <th className="px-4 py-3">Kod</th>
            <th className="px-4 py-3">Şehir</th>
            <th className="px-4 py-3">Stok satırı</th>
            <th className="px-4 py-3">Toplam adet</th>
            <th className="px-4 py-3">Durum</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e9ebec]">
          {warehouses.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/70">
              <td className="px-4 py-3 font-medium text-slate-800">
                <span className="flex items-center gap-2">
                  {row.name}
                  {row.isDefault ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      <Star className="h-3 w-3" />
                      Varsayılan
                    </span>
                  ) : null}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.code}</td>
              <td className="px-4 py-3 text-slate-600">{row.city ?? "—"}</td>
              <td className="px-4 py-3 text-slate-600">{row.stockLines}</td>
              <td className="px-4 py-3 font-semibold text-slate-800">{row.onHand}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {row.isActive ? "Aktif" : "Pasif"}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Can resource="inventory" action="update">
                    <Link
                      href={`/admin/inventory/locations?warehouse=${row.id}`}
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title="Raflar"
                    >
                      <MapPin className="h-4 w-4" />
                    </Link>
                    {!row.isDefault ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => run(() => setDefaultWarehouseAction(row.id))}
                        className="rounded-md p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-700"
                        title="Varsayılan yap"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    ) : null}
                    <Link
                      href={`/admin/inventory/warehouses/${row.id}/edit`}
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Can>
                  <AdminOnly>
                    {!row.isDefault ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `${row.name} deposu silinsin mi? Bu işlem yalnızca tam yöneticiye aittir ve geri alınamaz.`,
                            )
                          ) {
                            return;
                          }
                          run(() => deleteWarehouseAction(row.id));
                        }}
                        className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Sil (yalnız tam yönetici)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </AdminOnly>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
