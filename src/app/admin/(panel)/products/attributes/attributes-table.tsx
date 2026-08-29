"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Pencil,
  Power,
  Trash2,
  X,
} from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import {
  productAttributeDisplayLabel,
  type ProductAttributeDisplayTypeValue,
} from "@/lib/product-attributes";
import {
  deleteProductAttributeAction,
  toggleProductAttributeActiveAction,
} from "./actions";

export type ProductAttributeRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayType: ProductAttributeDisplayTypeValue;
  isActive: boolean;
  sortOrder: number;
  _count: { values: number; selections: number };
};

export function ProductAttributesTable({
  attributes,
}: {
  attributes: ProductAttributeRow[];
}) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<ProductAttributeRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const empty = attributes.length === 0;

  const closeDelete = () => {
    if (isPending) return;
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteProductAttributeAction({ id: deleteTarget.id });
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setDeleteTarget(null);
      setDeleteError(null);
      router.refresh();
    });
  };

  if (empty) {
    return (
      <div className="rounded-lg border border-[#e9ebec] bg-white px-5 py-12 text-center shadow-sm">
        <p className="text-sm text-slate-500">Henüz varyant özelliği yok.</p>
        <Can resource="attributes" action="create">
          <Link
            href="/admin/products/attributes/new"
            className="mt-4 inline-flex rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885]"
          >
            İlk Özelliği Ekle
          </Link>
        </Can>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] bg-[#f3f6f9] px-4 py-3 text-xs font-medium text-slate-500">
          {attributes.length} özellik · stok SKU (varyant) satırında tutulur
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_90px_70px_90px_140px] gap-2 border-b border-[#e9ebec] px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <div>Özellik</div>
              <div>Görünüm</div>
              <div>Değer</div>
              <div>Sıra</div>
              <div>Durum</div>
              <div className="text-right">İşlemler</div>
            </div>
            {attributes.map((attribute) => (
              <div
                key={attribute.id}
                className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_90px_70px_90px_140px] items-center gap-2 border-b border-[#e9ebec] px-4 py-3 text-sm last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{attribute.name}</p>
                  <p className="font-mono text-xs text-slate-400">{attribute.slug}</p>
                </div>
                <div className="text-slate-600">
                  {productAttributeDisplayLabel(attribute.displayType)}
                </div>
                <div className="text-slate-600">{attribute._count.values}</div>
                <div className="text-slate-600">{attribute.sortOrder}</div>
                <div>
                  {attribute.isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
                      <Check className="h-3.5 w-3.5" />
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                      <X className="h-3.5 w-3.5" />
                      Pasif
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <Can resource="attributes" action="update">
                    <button
                      type="button"
                      title={attribute.isActive ? "Pasife al" : "Aktif et"}
                      onClick={() =>
                        startTransition(async () => {
                          await toggleProductAttributeActiveAction(attribute.id);
                          router.refresh();
                        })
                      }
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50"
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  </Can>
                  <Can resource="attributes" action="update">
                    <Link
                      href={`/admin/products/attributes/${attribute.id}/edit`}
                      title="Düzenle"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Can>
                  <Can resource="attributes" action="delete">
                    <button
                      type="button"
                      title="Sil"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(attribute);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Can>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-slate-900/50"
            disabled={isPending}
            onClick={closeDelete}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-xl border border-[#e9ebec] bg-white p-5 shadow-xl"
          >
            <h2 className="text-base font-semibold text-slate-800">Özelliği sil</h2>
            <p className="mt-2 text-sm text-slate-600">
              “{deleteTarget.name}” ve {deleteTarget._count.values} değeri silinecek.
              {deleteTarget._count.selections > 0
                ? " Bu özellik ürün SKU’larında kullanıldığı için silinemez."
                : ""}
            </p>
            {deleteError ? (
              <p className="mt-3 text-sm text-rose-600">{deleteError}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={closeDelete}
                className="rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-600"
              >
                Vazgeç
              </button>
              {deleteTarget._count.selections === 0 ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={confirmDelete}
                  className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Sil
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
