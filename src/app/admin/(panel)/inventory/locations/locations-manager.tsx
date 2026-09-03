"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Trash2, X } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { locationHint } from "@/lib/inventory-locations";
import {
  createStockLocationFormAction,
  deleteStockLocationAction,
  generateStockLocationsFormAction,
  updateStockLocationFormAction,
  type LocationActionResult,
} from "./actions";

export type LocationRow = {
  id: string;
  code: string;
  aisle: string | null;
  rack: string | null;
  shelf: string | null;
  notes: string | null;
  isActive: boolean;
  stockCount: number;
};

export type WarehouseOption = { id: string; name: string; code: string; city: string | null };

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

const idleResult: LocationActionResult = { ok: false };

export function LocationsManager({
  warehouses,
  locations,
  warehouseId,
}: {
  warehouses: WarehouseOption[];
  locations: LocationRow[];
  warehouseId: string;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [createState, createAction, createPending] = useActionState(
    createStockLocationFormAction,
    idleResult,
  );
  const [generateState, generateAction, generatePending] = useActionState(
    generateStockLocationsFormAction,
    idleResult,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateStockLocationFormAction,
    idleResult,
  );
  const warehouse = useMemo(
    () => warehouses.find((row) => row.id === warehouseId) ?? warehouses[0],
    [warehouses, warehouseId],
  );
  const isPending = createPending || generatePending || updatePending || isDeleting;
  const error = createState.error ?? generateState.error ?? updateState.error ?? deleteError;
  const notice = createState.message ?? generateState.message ?? updateState.message ?? deleteNotice;

  useEffect(() => {
    if (createState.ok || generateState.ok || updateState.ok) router.refresh();
    if (updateState.ok) setEditingId(null);
  }, [
    createState.ok,
    createState.message,
    generateState.ok,
    generateState.message,
    updateState.ok,
    updateState.message,
    router,
  ]);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Stok ve depolar</p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <MapPin className="h-6 w-6 text-[#405189]" />
          Raflar
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Koridor / raf / göz adresi tanımlayın (ör. A-12-03). Yanlış eklediğiniz rafı listeden kalem
          ikonuyla düzeltin; ürüne bağlı atamalar bozulmaz.
        </p>
        {warehouseId ? (
          <p className="mt-2 text-sm">
            <Link
              href={`/admin/inventory?warehouse=${warehouseId}`}
              className="font-medium text-[#405189] hover:underline"
            >
              Bu depodaki ürünlere raf ata →
            </Link>
          </p>
        ) : null}
        <label className="mt-4 block max-w-sm text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">Depo</span>
          <select
            value={warehouseId}
            onChange={(event) => router.push(`/admin/inventory/locations?warehouse=${event.target.value}`)}
            className={inputClass}
          >
            {warehouses.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} ({row.code})
                {row.city ? ` · ${row.city}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <form action={createAction} className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
          <input type="hidden" name="warehouseId" value={warehouseId} />
          <h2 className="text-sm font-semibold text-slate-800">Tek göz ekle</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Koridor</span>
              <input name="aisle" placeholder="A" className={inputClass} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Raf</span>
              <input name="rack" placeholder="12" className={inputClass} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Göz</span>
              <input name="shelf" placeholder="03" className={inputClass} />
            </label>
          </div>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-slate-500">Kod (isteğe bağlı)</span>
            <input name="code" placeholder="Boşsa A-12-03 üretilir" className={inputClass} />
          </label>
          <Can resource="inventory" action="create">
            <button
              type="submit"
              disabled={isPending || !warehouseId}
              className="mt-4 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-60"
            >
              Raf ekle
            </button>
          </Can>
        </form>

        <form action={generateAction} className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
          <input type="hidden" name="warehouseId" value={warehouseId} />
          <h2 className="text-sm font-semibold text-slate-800">Hızlı depo kurulumu</h2>
          <p className="mt-1 text-xs text-slate-500">
            Koridor A, raf 1–10, göz 1–4 → A-01-01 … A-10-04. Mevcut kodlar atlanır.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <label className="text-sm sm:col-span-1">
              <span className="mb-1 block text-slate-500">Koridor</span>
              <input name="aisle" defaultValue="A" required className={inputClass} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Raf baş</span>
              <input name="rackFrom" type="number" defaultValue={1} min={1} className={inputClass} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Raf bitiş</span>
              <input name="rackTo" type="number" defaultValue={10} min={1} className={inputClass} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Göz baş</span>
              <input name="shelfFrom" type="number" defaultValue={1} min={1} className={inputClass} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Göz bitiş</span>
              <input name="shelfTo" type="number" defaultValue={4} min={1} className={inputClass} />
            </label>
          </div>
          <Can resource="inventory" action="create">
            <button
              type="submit"
              disabled={isPending || !warehouseId}
              className="mt-4 rounded-md bg-[#405189] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#364574] disabled:opacity-60"
            >
              Gözleri oluştur
            </button>
          </Can>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Kod</th>
              <th className="px-4 py-3">Adres</th>
              <th className="px-4 py-3">Ürün</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9ebec]">
            {locations.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  {warehouse
                    ? `${warehouse.name} için henüz raf yok. Hızlı kurulumla bir koridoru saniyeler içinde oluşturun.`
                    : "Önce depo ekleyin."}
                </td>
              </tr>
            ) : (
              locations.map((row) =>
                editingId === row.id ? (
                  <tr key={row.id} className="bg-slate-50">
                    <td colSpan={4} className="px-4 py-3">
                      <form action={updateAction} className="flex flex-col gap-3 lg:flex-row lg:items-end">
                        <input type="hidden" name="id" value={row.id} />
                        <label className="min-w-0 flex-1 text-sm">
                          <span className="mb-1 block text-slate-500">Koridor</span>
                          <input name="aisle" defaultValue={row.aisle ?? ""} className={inputClass} />
                        </label>
                        <label className="min-w-0 flex-1 text-sm">
                          <span className="mb-1 block text-slate-500">Raf</span>
                          <input name="rack" defaultValue={row.rack ?? ""} className={inputClass} />
                        </label>
                        <label className="min-w-0 flex-1 text-sm">
                          <span className="mb-1 block text-slate-500">Göz</span>
                          <input name="shelf" defaultValue={row.shelf ?? ""} className={inputClass} />
                        </label>
                        <label className="min-w-0 flex-1 text-sm">
                          <span className="mb-1 block text-slate-500">Kod</span>
                          <input
                            name="code"
                            defaultValue={row.code}
                            placeholder="Boşsa yeniden üretilir"
                            className={inputClass}
                          />
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-md bg-[#0ab39c] px-3 py-2 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-60"
                          >
                            Kaydet
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => setEditingId(null)}
                            className="rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-800">{row.code}</td>
                    <td className="px-4 py-3 text-slate-600">{locationHint(row) || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.stockCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Can resource="inventory" action="update">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => setEditingId(row.id)}
                            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Düzenle"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </Can>
                        <Can resource="inventory" action="delete">
                          {row.stockCount === 0 ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              if (!window.confirm(`${row.code} silinsin mi? Ürün bağlı olmayan boş raflar silinebilir.`)) {
                                return;
                              }
                              startDelete(async () => {
                                const result = await deleteStockLocationAction(row.id);
                                if (!result.ok) {
                                  setDeleteError(result.error ?? "Silinemedi.");
                                  setDeleteNotice(null);
                                  return;
                                }
                                setDeleteError(null);
                                setDeleteNotice(result.message ?? null);
                                if (editingId === row.id) setEditingId(null);
                                router.refresh();
                              });
                            }}
                            className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          ) : null}
                        </Can>
                      </div>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
