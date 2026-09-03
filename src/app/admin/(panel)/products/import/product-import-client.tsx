"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import type {
  ProductImportFilter,
  ProductImportJobSummary,
  ProductImportPreviewRow,
} from "@/lib/product-import";
import {
  getProductImportJobAction,
  listProductImportRowsAction,
  previewProductImportAction,
  startProductImportAction,
  type ProductImportPreviewState,
} from "./actions";

const previewInitial: ProductImportPreviewState = {};

export function ProductImportClient({
  initialJob,
}: {
  initialJob: ProductImportJobSummary | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewState, previewAction, previewPending] = useActionState(
    previewProductImportAction,
    previewInitial,
  );
  const [job, setJob] = useState<ProductImportJobSummary | null>(initialJob);
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
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        setFilter(null);
        setRowPage(null);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status]);

  const busy = previewPending || startPending;
  const canStart =
    Boolean(job) &&
    (job?.status === "PREVIEW" || job?.status === "FAILED") &&
    (job?.importCount ?? 0) > 0;

  return (
    <div className="space-y-6">
          {job && (job.status === "QUEUED" || job.status === "RUNNING" || job.status === "COMPLETED") ? (
            <ImportProgressBar job={job} />
          ) : null}

          <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="mt-0.5 h-5 w-5 text-[#0ab39c]" />
              <div>
                <h2 className="text-base font-semibold text-slate-800">1. Boş kalıbı indirin</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Zorunlu kolonlar: <strong>Ürün adı</strong>, <strong>Kategori</strong> ve her
                  SKU için <strong>Barkod</strong>. Eksik veya hatalı zorunlu alanı olan ürünün
                  tamamı atlanır. Renk + beden için aynı <strong>Ürün kodu</strong>nu tekrarlayın;
                  her satır bir kombinasyondur (Özellik 1 = Beden, Özellik 2 = Renk). Özellik
                  adları Varyantlar menüsünde kayıtlı olmalıdır; yeni değerler otomatik eklenir.
                  Satış fiyatı 0 olan ürünler yüklenir ama satışa kapanır. İndirimli satış
                  doluysa sitede satış üstü çizili, müşteri indirimli tutarı öder. Aynı barkod
                  veya aynı ürün kodu başka bir üründe varsa o ürün yüklenmez. Excel’deki görsel
                  linkleri sunucuya indirilir; uzak dosya yoksa o ürün atlanır.
                </p>
                <Can resource="products" action="create">
                  <a
                    href="/admin/products/import/template"
                    className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
                  >
                    <Download className="h-4 w-4" />
                    Excel kalıbını indir
                  </a>
                </Can>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Upload className="mt-0.5 h-5 w-5 text-[#405189]" />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-slate-800">2. Dosyayı sunucuya alın</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Önizlemede her satır bir üründür; aynı ürün kodundaki varyant satırları
                  birleştirilir. Yükleme 80’er ürünlük paketler halinde kaydedilir; görseller
                  paralel indirilir. Excel diske yazılmaz. Aktarım bitince yükleme kaydı ve
                  satır verisi sunucudan silinir.
                </p>
                <Can resource="products" action="create">
                  <div className="mt-4 space-y-3">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="hidden"
                      onChange={(event) => {
                        setFile(event.target.files?.[0] ?? null);
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Dosya seç
                      </button>
                      <span className="text-sm text-slate-500">
                        {file?.name ||
                          (job && job.status !== "COMPLETED" ? job.fileName : "Henüz dosya seçilmedi")}
                      </span>
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
                            void startProductImportAction(job.id).then((result) => {
                              if (result.job) setJob(result.job);
                            });
                          });
                        }}
                        className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {startPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Geçerli ürünleri yükle
                      </button>
                    </div>
                  </div>
                </Can>
                {previewState.error ? (
                  <p className="mt-3 text-sm text-rose-600">{previewState.error}</p>
                ) : null}
              </div>
            </div>
          </div>

          {job && job.status !== "COMPLETED" ? (
            <ImportJobPanel
              job={job}
              filter={filter}
              page={page}
              rowPage={rowPage}
              listPending={listPending}
              onFilter={(next) => {
                setFilter(next);
                setPage(1);
              }}
              onPage={setPage}
            />
          ) : null}
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImportProgressBar({ job }: { job: ProductImportJobSummary }) {
  const total = Math.max(1, job.importCount);
  const done = job.importedCount + job.failedCount;
  const percent = Math.min(100, Math.round((done / total) * 100));
  const running = job.status === "QUEUED" || job.status === "RUNNING";

  return (
    <div className="sticky top-16 z-20 rounded-lg border border-[#405189]/20 bg-white p-4 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">
          {running ? "Sunucuda yükleniyor" : "Yükleme tamamlandı"}
        </p>
        <p className="text-sm text-slate-500">
          {job.importedCount} / {job.importCount}
          {job.failedCount ? ` · ${job.failedCount} hata` : ""}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#0ab39c] transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 truncate text-sm text-slate-600">
        {running
          ? job.currentTitle
            ? `Sıradaki: ${job.currentTitle}${job.currentRow ? ` · satır ${job.currentRow}` : ""}`
            : "Kuyruk hazırlanıyor…"
          : `${job.importedCount} ürün eklendi.`}
      </p>
      {running ? (
        <p className="mt-1 text-xs text-slate-400">
          Aktarım tarayıcıya bağlı değildir. Sayfayı kapatabilir veya internetiniz kesse bile
          sunucu çalıştığı sürece devam eder.
        </p>
      ) : null}
    </div>
  );
}

function ImportJobPanel({
  job,
  filter,
  page,
  rowPage,
  listPending,
  onFilter,
  onPage,
}: {
  job: ProductImportJobSummary;
  filter: ProductImportFilter | null;
  page: number;
  rowPage: { rows: ProductImportPreviewRow[]; total: number; pageCount: number } | null;
  listPending: boolean;
  onFilter: (filter: ProductImportFilter) => void;
  onPage: (page: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">Dosya özeti</h2>
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{job.fileName}</span>
          {" · "}
          {formatFileSize(job.fileSize)}
          {" · "}
          {job.rowCount} ürün okundu. {job.importCount} ürün yüklenecek
          {job.zeroPriceCount > 0
            ? `, bunlardan ${job.zeroPriceCount} tanesi fiyatı 0 olduğu için satışa kapalı açılacak`
            : ""}
          . {job.errorCount > 0 ? `${job.errorCount} ürün atlanacak.` : "Atlanacak ürün yok."}
          {" Kartlara basarak listeyi açın."}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Toplam ürün"
            value={job.rowCount}
            active={filter === "all"}
            onClick={() => onFilter("all")}
          />
          <StatCard
            label="Başarılı"
            value={job.readyCount}
            tone="success"
            active={filter === "ready"}
            onClick={() => onFilter("ready")}
          />
          <StatCard
            label="Fiyatı sıfır"
            value={job.zeroPriceCount}
            tone="warn"
            active={filter === "zero_price"}
            onClick={() => onFilter("zero_price")}
          />
          <StatCard
            label="Hatalı"
            value={job.errorCount}
            tone="danger"
            active={filter === "error"}
            onClick={() => onFilter("error")}
          />
        </div>
      </div>

      {filter ? (
        <PreviewGroup
          filter={filter}
          rows={rowPage?.rows ?? []}
          total={rowPage?.total ?? 0}
          page={page}
          pageCount={rowPage?.pageCount ?? 1}
          pending={listPending}
          onPage={onPage}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warn" | "danger";
  active: boolean;
  onClick: () => void;
}) {
  const toneClass = (() => {
    switch (tone) {
      case "success":
        return "text-emerald-700";
      case "warn":
        return "text-amber-700";
      case "danger":
        return "text-rose-700";
      case "neutral":
        return "text-slate-800";
      default: {
        const _exhaustive: never = tone;
        return _exhaustive;
      }
    }
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-4 py-3 text-left transition ${
        active
          ? "border-[#405189] bg-[#405189]/5 ring-2 ring-[#405189]/20"
          : "border-[#e9ebec] bg-[#f8f9fb] hover:border-[#405189]/40"
      }`}
    >
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </button>
  );
}

function PreviewGroup({
  filter,
  rows,
  total,
  page,
  pageCount,
  pending,
  onPage,
}: {
  filter: ProductImportFilter;
  rows: ProductImportPreviewRow[];
  total: number;
  page: number;
  pageCount: number;
  pending: boolean;
  onPage: (page: number) => void;
}) {
  const meta: {
    title: string;
    description: string;
    icon: typeof FileSpreadsheet;
    tone: "neutral" | "success" | "warn" | "danger";
  } = (() => {
    switch (filter) {
      case "all":
        return {
          title: "Tüm ürünler",
          description: "Dosyadaki bütün ürünler. Varyant satırları ürün koduna göre birleştirilir.",
          icon: FileSpreadsheet,
          tone: "neutral" as const,
        };
      case "ready":
        return {
          title: "Başarılı ürünler",
          description: "Zorunlu alanları geçerli ve fiyatı dolu ürünler. Satışa açık yüklenecek.",
          icon: CheckCircle2,
          tone: "success" as const,
        };
      case "zero_price":
        return {
          title: "Fiyatı sıfır olan ürünler",
          description: "Yüklenecek ancak siparişe kapalı kaydedilecek.",
          icon: AlertTriangle,
          tone: "warn" as const,
        };
      case "error":
        return {
          title: "Hatalı ürünler",
          description: "Zorunlu alanı eksik veya hatalı ürünler yüklenmez.",
          icon: XCircle,
          tone: "danger" as const,
        };
      default: {
        const _exhaustive: never = filter;
        void _exhaustive;
        return {
          title: "Ürünler",
          description: "",
          icon: FileSpreadsheet,
          tone: "neutral" as const,
        };
      }
    }
  })();
  const Icon = meta.icon;
  const iconClass = (() => {
    switch (meta.tone) {
      case "success":
        return "text-emerald-600";
      case "warn":
        return "text-amber-600";
      case "danger":
        return "text-rose-600";
      case "neutral":
        return "text-slate-400";
      default: {
        const _exhaustive: never = meta.tone;
        return _exhaustive;
      }
    }
  })();

  return (
    <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <div className="border-b border-[#e9ebec] px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
          <Icon className={`h-5 w-5 ${iconClass}`} />
          {meta.title}
          <span className="text-sm font-medium text-slate-400">({total})</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">{meta.description}</p>
      </div>
      {pending && rows.length === 0 ? (
        <p className="flex items-center gap-2 px-5 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Liste yükleniyor…
        </p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500">Bu grupta ürün yok.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f3f6f9] text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Satır</th>
                  <th className="px-4 py-3">Ürün</th>
                  <th className="px-4 py-3">Varyant</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Barkod</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Satış</th>
                  <th className="px-4 py-3">İndirimli</th>
                  <th className="px-4 py-3">Stok</th>
                  <th className="px-4 py-3">Durum</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-[#e9ebec]">
                    <td className="px-4 py-3 text-slate-500">{row.rowLabel || row.rowNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.title || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.variantSummary || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.category || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.barcode || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.sku || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.price || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.discount || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.stock || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.ok ? (row.zeroPrice ? "Satışa kapalı" : "Hazır") : row.errors.join(" ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9ebec] px-5 py-3">
            <p className="text-xs text-slate-500">
              Sayfa {page} / {pageCount}
              {pending ? " · güncelleniyor" : ""}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || pending}
                onClick={() => onPage(page - 1)}
                className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Önceki
              </button>
              <button
                type="button"
                disabled={page >= pageCount || pending}
                onClick={() => onPage(page + 1)}
                className="inline-flex items-center gap-1 rounded-md border border-[#e9ebec] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Sonraki
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
