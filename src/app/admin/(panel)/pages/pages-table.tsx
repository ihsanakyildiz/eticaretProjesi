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
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AdminPublicLink, AdminPublicTextLink } from "@/components/admin/admin-public-link";
import { stripHtml } from "@/lib/html";
import { publicPageHref } from "@/lib/public-urls";
import { deletePageAction, togglePageActiveAction } from "./actions";

export type PageRow = {
  id: string;
  type: "CLASSIC" | "ADVANCED";
  title: string;
  slug: string;
  summary: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: {
    works: number;
    projects: number;
    posts: number;
  };
};

type StatusFilter = "all" | "active" | "passive";
type TypeFilter = "all" | "CLASSIC" | "ADVANCED";

function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function DeletePageModal({
  page,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  page: PageRow;
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
        aria-labelledby="delete-page-title"
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="flex items-start gap-3 border-b border-[#e9ebec] px-5 py-4">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="delete-page-title" className="text-base font-semibold text-slate-800">
              Sayfayı sil
            </h2>
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
            <strong className="font-semibold text-slate-800">{page.title}</strong> sayfasını silmek
            istediğinize emin misiniz?
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-500">
            <li>Sayfa kalıcı olarak silinecek.</li>
            {page.image ? <li>Kapak görseli sunucudan kaldırılacak.</li> : null}
            <li>İlişkili içerik seçimleri kaldırılacak (içerikler silinmez).</li>
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

export function PagesTable({ pages }: { pages: PageRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<PageRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = normalizeSearch(query);

    return pages.filter((page) => {
      if (type !== "all" && page.type !== type) return false;
      if (status === "active" && !page.isActive) return false;
      if (status === "passive" && page.isActive) return false;
      if (!needle) return true;

      const haystack = normalizeSearch(
        [page.title, page.slug, stripHtml(page.summary)].join(" "),
      );
      return haystack.includes(needle);
    });
  }, [pages, type, status, query]);

  const hasActiveFilters =
    Boolean(query.trim()) || type !== "all" || status !== "all";

  const resetFilters = () => {
    setQuery("");
    setType("all");
    setStatus("all");
  };

  const closeDeleteModal = () => {
    if (isPending) return;
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    const formData = new FormData();
    formData.set("id", deleteTarget.id);

    startTransition(async () => {
      const result = await deletePageAction(formData);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setDeleteTarget(null);
      setDeleteError(null);
      router.refresh();
    });
  };

  if (pages.length === 0) {
    return (
      <div className="rounded-lg border border-[#e9ebec] bg-white px-5 py-12 text-center shadow-sm">
        <p className="text-sm text-slate-500">Henüz oluşturulmuş bir sayfa yok.</p>
        <Link
          href="/admin/pages/new"
          className="mt-4 inline-flex rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885]"
        >
          İlk Sayfayı Ekle
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_auto]">
          <div>
            <label htmlFor="pages-search" className="mb-1.5 block text-xs font-medium text-slate-500">
              Arama
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="pages-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Başlık, slug veya özet ara…"
                className="w-full rounded-md border border-[#e9ebec] bg-white py-2.5 pr-3 pl-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="pages-type" className="mb-1.5 block text-xs font-medium text-slate-500">
              Tip
            </label>
            <select
              id="pages-type"
              value={type}
              onChange={(e) => setType(e.target.value as TypeFilter)}
              className="w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
            >
              <option value="all">Tümü</option>
              <option value="CLASSIC">Klasik</option>
              <option value="ADVANCED">Gelişmiş</option>
            </select>
          </div>

          <div>
            <label htmlFor="pages-status" className="mb-1.5 block text-xs font-medium text-slate-500">
              Durum
            </label>
            <select
              id="pages-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
            >
              <option value="all">Tümü</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto"
            >
              <RotateCcw className="h-4 w-4" />
              Sıfırla
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] bg-[#f3f6f9] px-4 py-3">
          <p className="text-xs font-medium text-slate-500">
            {filtered.length} / {pages.length} sayfa listeleniyor
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Filtrelere uygun sayfa bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-[minmax(0,1.8fr)_90px_minmax(0,1fr)_60px_90px_176px] gap-2 border-b border-[#e9ebec] px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <div>Sayfa</div>
                <div>Tip</div>
                <div>İlişkiler</div>
                <div>Sıra</div>
                <div>Durum</div>
                <div className="text-right">İşlemler</div>
              </div>

              {filtered.map((page) => {
                const relatedTotal =
                  page._count.works + page._count.projects + page._count.posts;

                return (
                  <div
                    key={page.id}
                    className="grid grid-cols-[minmax(0,1.8fr)_90px_minmax(0,1fr)_60px_90px_176px] items-center gap-2 border-b border-[#e9ebec] px-4 py-3 text-sm last:border-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f3f6f9]">
                        {page.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={page.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-semibold text-[#405189]">
                            {page.title.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">
                          <AdminPublicTextLink href={publicPageHref(page.slug)}>
                            {page.title}
                          </AdminPublicTextLink>
                        </p>
                        <AdminPublicTextLink
                          href={publicPageHref(page.slug)}
                          className="mt-0.5 block truncate font-mono text-xs text-slate-400"
                        >
                          {publicPageHref(page.slug)}
                        </AdminPublicTextLink>
                      </div>
                    </div>

                    <div>
                      {page.type === "CLASSIC" ? (
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                          Klasik
                        </span>
                      ) : (
                        <span className="inline-flex rounded-md bg-[#405189]/10 px-2 py-1 text-[11px] font-semibold text-[#405189]">
                          Gelişmiş
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500">
                      {relatedTotal > 0 ? (
                        <span>
                          {page._count.works} çalışma · {page._count.projects} proje ·{" "}
                          {page._count.posts} yazı
                        </span>
                      ) : (
                        <span className="text-slate-400">İlişki yok</span>
                      )}
                    </div>

                    <div className="text-slate-600">{page.sortOrder}</div>

                    <div>
                      {page.isActive ? (
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
                      <AdminPublicLink href={publicPageHref(page.slug)} />
                      <form action={togglePageActiveAction}>
                        <input type="hidden" name="id" value={page.id} />
                        <button
                          type="submit"
                          title={page.isActive ? "Pasife al" : "Aktif et"}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 transition hover:bg-slate-50 hover:text-[#0ab39c]"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </form>
                      <Link
                        href={`/admin/pages/${page.id}/edit`}
                        title="Düzenle"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 transition hover:bg-slate-50 hover:text-[#405189]"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        title="Sil"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(page);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-500 transition hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {deleteTarget ? (
        <DeletePageModal
          page={deleteTarget}
          isPending={isPending}
          error={deleteError}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
        />
      ) : null}
    </>
  );
}
