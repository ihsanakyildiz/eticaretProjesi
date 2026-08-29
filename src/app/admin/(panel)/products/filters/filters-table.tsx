"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Power, Trash2 } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import {
  productFilterInputTypeLabel,
  productFilterKindLabel,
  type ProductFilterInputTypeValue,
  type ProductFilterKindValue,
} from "@/lib/product-filters";
import {
  deleteProductFilterAction,
  toggleProductFilterActiveAction,
} from "./actions";

export type ProductFilterRow = {
  id: string;
  name: string;
  slug: string;
  kind: ProductFilterKindValue;
  inputType: ProductFilterInputTypeValue;
  appliesGlobally: boolean;
  isActive: boolean;
  sortOrder: number;
  _count: { values: number; categories: number };
};

export function ProductFiltersTable({ filters }: { filters: ProductFilterRow[] }) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<ProductFilterRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (filters.length === 0) {
    return (
      <div className="rounded-lg border border-[#e9ebec] bg-white px-5 py-12 text-center shadow-sm">
        <p className="text-sm text-slate-500">Henüz vitrin filtresi yok.</p>
        <Can resource="filters" action="create">
          <Link
            href="/admin/products/filters/new"
            className="mt-4 inline-flex rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885]"
          >
            İlk Filtreyi Ekle
          </Link>
        </Can>
      </div>
    );
  }

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteProductFilterAction({ id: deleteTarget.id });
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setDeleteTarget(null);
      setDeleteError(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[minmax(0,1.5fr)_110px_120px_90px_80px_90px_150px] gap-2 border-b border-[#e9ebec] bg-[#f3f6f9] px-4 py-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <span>Filtre</span>
            <span>Kaynak</span>
            <span>Vitrin</span>
            <span>Kapsam</span>
            <span>Değer</span>
            <span>Durum</span>
            <span className="text-right">İşlem</span>
          </div>
          {filters.map((filter) => (
            <div
              key={filter.id}
              className="grid grid-cols-[minmax(0,1.5fr)_110px_120px_90px_80px_90px_150px] items-center gap-2 border-b border-[#e9ebec] px-4 py-3 text-sm last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">{filter.name}</p>
                <p className="truncate text-xs text-slate-400">{filter.slug}</p>
              </div>
              <span className="text-slate-600">{productFilterKindLabel(filter.kind)}</span>
              <span className="text-slate-600">{productFilterInputTypeLabel(filter.inputType)}</span>
              <span className="text-slate-500">
                {filter.appliesGlobally ? "Global" : `${filter._count.categories} kat.`}
              </span>
              <span className="text-slate-500">{filter._count.values}</span>
              <span>
                {filter.isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#0ab39c]/10 px-2 py-0.5 text-xs font-semibold text-[#0ab39c]">
                    <Check className="h-3 w-3" />
                    Aktif
                  </span>
                ) : (
                  <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                    Pasif
                  </span>
                )}
              </span>
              <div className="flex items-center justify-end gap-1">
                <Can resource="filters" action="update">
                  <Link
                    href={`/admin/products/filters/${filter.id}/edit`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#405189]"
                    title="Düzenle"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Can>
                <Can resource="filters" action="update">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await toggleProductFilterActiveAction({
                          id: filter.id,
                          isActive: !filter.isActive,
                        });
                        router.refresh();
                      })
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#0ab39c] disabled:opacity-60"
                    title={filter.isActive ? "Pasife al" : "Aktif et"}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                </Can>
                <Can resource="filters" action="delete">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(filter);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-rose-600 disabled:opacity-60"
                    title="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Can>
              </div>
            </div>
          ))}
        </div>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-slate-900/50"
            disabled={isPending}
            onClick={() => {
              if (isPending) return;
              setDeleteTarget(null);
              setDeleteError(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
          >
            <div className="border-b border-[#e9ebec] px-5 py-4">
              <h2 className="text-base font-semibold text-slate-800">Filtreyi sil</h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-slate-600">
              <p>
                <strong className="text-slate-800">{deleteTarget.name}</strong> filtresini silmek
                istediğinize emin misiniz?
              </p>
              <p className="text-slate-500">
                Varyant özelliğinin kendisi silinmez. Ürünlere yazılmış özel değerler kalkar.
              </p>
              {deleteError ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                  {deleteError}
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-[#e9ebec] bg-[#f3f6f9] px-5 py-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (isPending) return;
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                className="rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-600"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={confirmDelete}
                className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
