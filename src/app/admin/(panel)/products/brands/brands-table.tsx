"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Loader2,
  Pencil,
  Power,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { deleteBrandAction, toggleBrandActiveAction } from "./actions";

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  country: string | null;
  logo: string | null;
  banner: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: { products: number };
};

function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function DeleteBrandModal({
  brand,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  brand: BrandRow;
  isPending: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPending, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-slate-900/50"
        disabled={isPending}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="flex items-start gap-3 border-b border-[#e9ebec] px-5 py-4">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-800">Markayı sil</h2>
            <p className="mt-1 text-sm text-slate-500">Bu işlem geri alınamaz.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="text-sm leading-relaxed text-slate-600">
            <strong className="font-semibold text-slate-800">{brand.name}</strong> markasını silmek
            istediğinize emin misiniz?
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-500">
            <li>Marka kalıcı olarak silinecek.</li>
            {brand._count.products > 0 ? (
              <li>
                {brand._count.products} üründen marka bağlantısı kaldırılacak (ürünler silinmez).
              </li>
            ) : null}
            {brand.logo || brand.banner ? <li>Görseller sunucudan kaldırılacak.</li> : null}
          </ul>
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e9ebec] bg-[#f3f6f9] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Evet, Sil
          </button>
        </div>
      </div>
    </div>
  );
}

export function BrandsTable({ brands }: { brands: BrandRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BrandRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = normalizeSearch(search);
    if (!q) return brands;
    return brands.filter((brand) => {
      const haystack = normalizeSearch(
        [brand.name, brand.slug, brand.tagline ?? "", brand.country ?? ""].join(" "),
      );
      return haystack.includes(q);
    });
  }, [brands, search]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteBrandAction({ id: deleteTarget.id });
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setDeleteTarget(null);
      setActionError(null);
      router.refresh();
    });
  };

  const toggleActive = (brand: BrandRow) => {
    startTransition(async () => {
      const result = await toggleBrandActiveAction({
        id: brand.id,
        isActive: !brand.isActive,
      });
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setActionError(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#e9ebec] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Marka ara…"
              className="w-full rounded-md border border-[#e9ebec] bg-white py-2 pr-3 pl-9 text-sm text-slate-700 outline-none focus:border-[#0ab39c]"
            />
          </div>
          <p className="text-xs text-slate-400">
            {filtered.length} / {brands.length} marka
          </p>
        </div>

        {actionError ? (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {actionError}
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-slate-500">
              {brands.length === 0 ? "Henüz marka eklenmemiş." : "Aramanızla eşleşen marka yok."}
            </p>
            {brands.length === 0 ? (
              <Can resource="brands" action="create">
                <Link
                  href="/admin/products/brands/new"
                  className="mt-4 inline-flex text-sm font-medium text-[#405189] hover:underline"
                >
                  İlk markayı ekle →
                </Link>
              </Can>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,0.8fr)_70px_80px_90px_150px] gap-2 border-b border-[#e9ebec] bg-[#f3f6f9] px-4 py-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <span>Marka</span>
                <span>Menşei</span>
                <span>Sıra</span>
                <span>Ürün</span>
                <span>Durum</span>
                <span className="text-right">İşlem</span>
              </div>

              {filtered.map((brand) => (
                <div
                  key={brand.id}
                  className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,0.8fr)_70px_80px_90px_150px] items-center gap-2 border-b border-[#e9ebec] px-4 py-3 text-sm last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f3f6f9]">
                      {brand.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={brand.logo} alt="" className="h-full w-full object-contain p-1" />
                      ) : (
                        <span className="text-[10px] font-semibold text-[#405189]">
                          {brand.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{brand.name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {brand.tagline || brand.slug}
                      </p>
                    </div>
                  </div>
                  <span className="truncate text-slate-500">{brand.country || "—"}</span>
                  <span className="text-slate-500">{brand.sortOrder}</span>
                  <span className="text-slate-500">{brand._count.products}</span>
                  <span>
                    {brand.isActive ? (
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
                    <Can resource="brands" action="update">
                      <Link
                        href={`/admin/products/brands/${brand.id}/edit`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50 hover:text-[#405189]"
                        title="Düzenle"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Can>
                    <Can resource="brands" action="update">
                      <button
                        type="button"
                        onClick={() => toggleActive(brand)}
                        disabled={isPending}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-slate-50 hover:text-[#0ab39c] disabled:opacity-60"
                        title={brand.isActive ? "Pasife al" : "Aktif et"}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    </Can>
                    <Can resource="brands" action="delete">
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setDeleteTarget(brand);
                        }}
                        disabled={isPending}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
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
        )}
      </div>

      {deleteTarget ? (
        <DeleteBrandModal
          brand={deleteTarget}
          isPending={isPending}
          error={actionError}
          onClose={() => {
            if (isPending) return;
            setDeleteTarget(null);
            setActionError(null);
          }}
          onConfirm={confirmDelete}
        />
      ) : null}
    </>
  );
}
