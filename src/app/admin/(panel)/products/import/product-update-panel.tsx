"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Download, Loader2, RefreshCw, Upload } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import type { ProductImportFilter, ProductImportJobSummary, ProductImportPreviewRow } from "@/lib/product-import";
import {
  PRODUCT_UPDATE_MODES,
  productUpdateModeLabel,
  type ProductUpdateMode,
} from "@/lib/product-import-update-shared";
import {
  countProductUpdateExportAction,
  getProductImportJobAction,
  listProductImportRowsAction,
  previewProductUpdateAction,
  startProductUpdateAction,
  type ProductImportPreviewState,
} from "./actions";

export type ProductUpdateFilterOption = {
  id: string;
  name: string;
  depth?: number;
};

const previewInitial: ProductImportPreviewState = {};

export function ProductUpdatePanel({
  categories,
  brands,
}: {
  categories: ProductUpdateFilterOption[];
  brands: ProductUpdateFilterOption[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [mode, setMode] = useState<ProductUpdateMode>("all");
  const [counts, setCounts] = useState<{ productCount: number; rowCount: number } | null>(null);
  const [countPending, startCount] = useTransition();
  const [previewState, previewAction, previewPending] = useActionState(
    previewProductUpdateAction,
    previewInitial,
  );
  const [job, setJob] = useState<ProductImportJobSummary | null>(null);
  const [filter, setFilter] = useState<ProductImportFilter | null>(null);
  const [page, setPage] = useState(1);
  const [rowPage, setRowPage] = useState<{
    rows: ProductImportPreviewRow[];
    total: number;
    pageCount: number;
  } | null>(null);
  const [listPending, startList] = useTransition();
  const [startPending, startStart] = useTransition();

  useEffect(() => {
    startCount(() => {
      void countProductUpdateExportAction({ categoryId, brandId, mode }).then((result) => {
        if ("productCount" in result) setCounts(result);
      });
    });
  }, [categoryId, brandId, mode]);

  useEffect(() => {
    if (previewState.job) {
      setJob(previewState.job);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setFilter(null);
      setRowPage(null);
      setPage(1);
    }
  }, [previewState.job]);

  useEffect(() => {
    if (!job || !filter) return;
    const jobId = job.id;
    const nextPage = page;
    startList(() => {
      void listProductImportRowsAction(jobId, filter, nextPage).then((result) => {
        if (result.page) {
          setRowPage({
            rows: result.page.rows,
            total: result.page.total,
            pageCount: result.page.pageCount,
          });
        }
      });
    });
  }, [filter, job, page]);

  useEffect(() => {
    if (!job || (job.status !== "QUEUED" && job.status !== "RUNNING")) return;
    const jobId = job.id;
    const timer = window.setInterval(() => {
      void getProductImportJobAction(jobId).then((result) => {
        if (result.job) {
          setJob(result.job);
          if (result.job.status === "COMPLETED") {
            setFilter(null);
            setRowPage(null);
          }
          return;
        }
        setJob((current) =>
          current
            ? { ...current, status: "COMPLETED", currentTitle: null, currentRow: null }
            : current,
        );
        setFilter(null);
        setRowPage(null);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status]);

  const downloadHref = `/admin/products/import/update-export?mode=${mode}${
    categoryId ? `&categoryId=${encodeURIComponent(categoryId)}` : ""
  }${brandId ? `&brandId=${encodeURIComponent(brandId)}` : ""}`;

  const busy = previewPending || startPending;
  const canStart =
    Boolean(job) &&
    (job?.status === "PREVIEW" || job?.status === "FAILED") &&
    (job?.importCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      {job && (job.status === "QUEUED" || job.status === "RUNNING" || job.status === "COMPLETED") ? (
        <div className="rounded-lg border border-[#405189]/20 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">
            {job.status === "COMPLETED" ? "Güncelleme tamamlandı" : "Sunucuda güncelleniyor"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {job.importedCount} / {job.importCount}
            {job.failedCount ? ` · ${job.failedCount} hata` : ""}
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Download className="mt-0.5 h-5 w-5 text-[#0ab39c]" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-800">1. Mevcut ürünleri indirin</h2>
            <p className="mt-1 text-sm text-slate-500">
              Kategori veya marka seçerek yalnızca o ürünleri alın. Güncelleme türü Excel’deki
              kolonları belirler. <strong>Ürün ID</strong> değiştirilmemelidir; bu ID’siz satır
              yeni ürün olarak eklenmez.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-600">Kategori</span>
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800"
                >
                  <option value="">Tüm kategoriler</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {`${"— ".repeat(category.depth ?? 0)}${category.name}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-600">Marka</span>
                <select
                  value={brandId}
                  onChange={(event) => setBrandId(event.target.value)}
                  className="w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800"
                >
                  <option value="">Tüm markalar</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">Yapılmak istenen güncelleme</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {PRODUCT_UPDATE_MODES.map((id) => (
                <label
                  key={id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm ${
                    mode === id
                      ? "border-[#405189] bg-[#405189]/5 text-slate-800"
                      : "border-[#e9ebec] text-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="update-mode"
                    checked={mode === id}
                    onChange={() => setMode(id)}
                    className="accent-[#405189]"
                  />
                  {productUpdateModeLabel(id)}
                </label>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {countPending ? (
                "Sayılıyor…"
              ) : counts ? (
                <>
                  <strong>{counts.productCount.toLocaleString("tr-TR")}</strong> ürün, Excel’de{" "}
                  <strong>{counts.rowCount.toLocaleString("tr-TR")}</strong> satır.
                </>
              ) : (
                "Filtreye göre ürün sayısı hesaplanacak."
              )}
            </p>
            <Can resource="products" action="update">
              <a
                href={downloadHref}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
              >
                <Download className="h-4 w-4" />
                Excel’i indir
              </a>
            </Can>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Upload className="mt-0.5 h-5 w-5 text-[#405189]" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-800">2. Düzenlenen Excel’i yükleyin</h2>
            <p className="mt-1 text-sm text-slate-500">
              Yalnızca var olan ürünler güncellenir. Aynı barkod veya aynı ürün kodu başka bir
              üründe varsa satır hata olarak işaretlenir. Yeni ürün eklenmez.
            </p>
            <Can resource="products" action="update">
              <div className="mt-4 space-y-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Dosya seç
                  </button>
                  <span className="text-sm text-slate-500">{file?.name || "Henüz dosya seçilmedi"}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form
                    action={(formData) => {
                      if (file) formData.set("file", file);
                      previewAction(formData);
                    }}
                  >
                    <button
                      type="submit"
                      disabled={busy || !file}
                      className="inline-flex items-center gap-2 rounded-md border border-[#405189] bg-[#405189] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#364574] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {previewPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Önizle
                    </button>
                  </form>
                  <button
                    type="button"
                    disabled={busy || !canStart}
                    onClick={() => {
                      if (!job) return;
                      startStart(() => {
                        void startProductUpdateAction(job.id).then((result) => {
                          if (result.job) setJob(result.job);
                        });
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {startPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Geçerli satırları güncelle
                  </button>
                </div>
              </div>
            </Can>
            {previewState.error ? <p className="mt-3 text-sm text-rose-600">{previewState.error}</p> : null}
          </div>
        </div>
      </div>

      {job && job.status !== "COMPLETED" ? (
        <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <RefreshCw className="h-4 w-4 text-slate-400" />
            Güncelleme özeti
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {job.rowCount} satır okundu. {job.importCount} satır güncellenecek.
            {job.errorCount > 0 ? ` ${job.errorCount} satır atlanacak.` : " Atlanacak satır yok."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setPage(1);
              }}
              className={`rounded-md border px-3 py-2 text-sm ${
                filter === "all" ? "border-[#405189] bg-[#405189]/5" : "border-[#e9ebec]"
              }`}
            >
              Tümü ({job.rowCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter("ready");
                setPage(1);
              }}
              className={`rounded-md border px-3 py-2 text-sm ${
                filter === "ready" ? "border-[#405189] bg-[#405189]/5" : "border-[#e9ebec]"
              }`}
            >
              Uygun ({job.readyCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter("error");
                setPage(1);
              }}
              className={`rounded-md border px-3 py-2 text-sm ${
                filter === "error" ? "border-[#405189] bg-[#405189]/5" : "border-[#e9ebec]"
              }`}
            >
              Hatalı ({job.errorCount})
            </button>
          </div>
          {filter && rowPage ? (
            <div className="mt-4 overflow-x-auto">
              {listPending && rowPage.rows.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Liste yükleniyor…
                </p>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#f3f6f9] text-xs tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="px-3 py-2">Satır</th>
                      <th className="px-3 py-2">Ürün</th>
                      <th className="px-3 py-2">Barkod</th>
                      <th className="px-3 py-2">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowPage.rows.map((row) => (
                      <tr key={row.rowNumber} className="border-t border-[#e9ebec]">
                        <td className="px-3 py-2 text-slate-500">{row.rowLabel || row.rowNumber}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{row.title || "—"}</td>
                        <td className="px-3 py-2 text-slate-600">{row.barcode || "—"}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.ok ? "Hazır" : row.errors.join(" ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {rowPage.pageCount > 1 ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || listPending}
                    onClick={() => setPage(page - 1)}
                    className="rounded-md border border-[#e9ebec] px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Önceki
                  </button>
                  <button
                    type="button"
                    disabled={page >= rowPage.pageCount || listPending}
                    onClick={() => setPage(page + 1)}
                    className="rounded-md border border-[#e9ebec] px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Sonraki
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
