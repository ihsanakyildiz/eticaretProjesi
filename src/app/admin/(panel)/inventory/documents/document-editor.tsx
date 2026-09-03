"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ImageOff, Loader2, Printer, ScanBarcode, Trash2 } from "lucide-react";
import { useCan } from "@/components/admin/admin-permissions";
import { playWarehouseMatchSound, playWarehouseMismatchSound } from "@/lib/warehouse-sounds";
import { normalizeScanCode } from "@/lib/warehouse";
import {
  documentKindNeedsSupplier,
  documentKindNeedsTarget,
  documentQuantityHint,
  stockDocumentKindHref,
  stockDocumentKindLabel,
  stockDocumentStatusLabel,
  type StockDocumentKindCode,
  type StockDocumentStatusCode,
} from "@/lib/inventory-labels";
import {
  cancelStockDocumentAction,
  confirmStockDocumentAction,
  createInvoiceFromReceiptAction,
  deleteDraftStockDocumentAction,
  deleteStockDocumentLineAction,
  scanStockDocumentLineAction,
  updateStockDocumentLineAction,
  updateStockDocumentMetaAction,
  type ScannedStockLine,
} from "./actions";
import { StockLocationSelect } from "../stock-location-select";

export type StockDocumentLineModel = {
  id: string;
  variantId: string;
  quantity: number;
  unitCostMinor: number | null;
  notes: string | null;
  sku: string;
  barcode: string | null;
  title: string;
  productTitle: string;
  image: string | null;
  warehouseOnHand: number;
  locationId: string | null;
  locationCode: string | null;
};

export type StockDocumentModel = {
  id: string;
  number: string;
  kind: StockDocumentKindCode;
  status: StockDocumentStatusCode;
  warehouseId: string;
  targetWarehouseId: string | null;
  supplierId: string | null;
  relatedDocumentId: string | null;
  relatedNumber: string | null;
  externalNumber: string | null;
  documentDate: string;
  notes: string | null;
  lines: StockDocumentLineModel[];
  warehouses: { id: string; name: string; code: string; city: string | null }[];
  suppliers: { id: string; name: string }[];
  locations: { id: string; code: string; hint: string }[];
};

function dateInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function upsertScannedLine(current: StockDocumentLineModel[], line: ScannedStockLine): StockDocumentLineModel[] {
  if (line.quantity <= 0) {
    return current.filter((row) => row.id !== line.id && row.variantId !== line.variantId);
  }
  const index = current.findIndex((row) => row.id === line.id || row.variantId === line.variantId);
  if (index === -1) return [...current, line];
  const next = [...current];
  next[index] = { ...next[index], ...line };
  return next;
}

function applyLineLocation(
  current: StockDocumentLineModel[],
  variantId: string,
  locationId: string | null,
  locations: StockDocumentModel["locations"],
): StockDocumentLineModel[] {
  const code = locations.find((row) => row.id === locationId)?.code ?? null;
  return current.map((row) => (row.variantId === variantId ? { ...row, locationId, locationCode: code } : row));
}

function LineThumb({ src, alt, size }: { src: string | null; alt: string; size: "sm" | "lg" }) {
  const box = size === "lg" ? "h-28 w-28 sm:h-36 sm:w-36" : "h-14 w-14";
  if (!src) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-md border border-[#e9ebec] bg-slate-50 text-slate-400 ${box}`}
      >
        <ImageOff className={size === "lg" ? "h-8 w-8" : "h-5 w-5"} />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`shrink-0 rounded-md border border-[#e9ebec] bg-white object-cover ${box}`}
    />
  );
}

export function StockDocumentEditor({ document }: { document: StockDocumentModel }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<Array<{ code: string; quantity: number }>>([]);
  const drainingRef = useRef(false);
  const [code, setCode] = useState("");
  const [qty, setQty] = useState("1");
  const [lines, setLines] = useState(document.lines);
  const [lastScan, setLastScan] = useState<ScannedStockLine & { addedQuantity: number } | null>(null);
  const [flash, setFlash] = useState<"match" | "mismatch" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canUpdate = useCan("inventory", "update");
  const canCreate = useCan("inventory", "create");
  const canDelete = useCan("inventory", "delete");
  const draft = document.status === "DRAFT";
  const editable = draft && canUpdate;
  const kind = document.kind;
  const showCost = kind === "PURCHASE_INVOICE" || kind === "GOODS_RECEIPT";
  const lineColSpan = showCost ? 7 : 6;

  const assignLocation = (variantId: string, locationId: string | null) => {
    setLines((current) => applyLineLocation(current, variantId, locationId, document.locations));
    setLastScan((current) => {
      if (!current || current.variantId !== variantId) return current;
      const code = document.locations.find((row) => row.id === locationId)?.code ?? null;
      return { ...current, locationId, locationCode: code };
    });
  };

  useEffect(() => {
    setLines(document.lines);
    setLastScan(null);
  }, [document.id, document.status]);

  useEffect(() => {
    if (!editable) return;
    inputRef.current?.focus();
  }, [editable, flash, lines.length]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 1600);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string; href?: string }>) => {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "İşlem başarısız.");
        setNotice(null);
        return;
      }
      setError(null);
      setNotice(result.message ?? null);
      if (result.href) {
        router.push(result.href);
        return;
      }
      router.refresh();
    });
  };

  const applyScanResult = async (scanned: string, quantity: number) => {
    const result = await scanStockDocumentLineAction({
      documentId: document.id,
      code: scanned,
      quantity,
    });
    if (!result.ok) {
      playWarehouseMismatchSound();
      setFlash("mismatch");
      setError(result.error ?? "Eşleşmedi.");
      setNotice(null);
      return;
    }
    playWarehouseMatchSound();
    setFlash("match");
    setError(null);
    setLines((current) => upsertScannedLine(current, result.line));
    setLastScan({ ...result.line, addedQuantity: result.addedQuantity });
    setNotice(
      `${result.variantTitle} · bu okutmada +${result.addedQuantity} · belgede ${result.lineQuantity} adet`,
    );
  };

  const drainQueue = async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const job = queueRef.current.shift();
        if (!job) break;
        await applyScanResult(job.code, job.quantity);
      }
    } finally {
      drainingRef.current = false;
      if (queueRef.current.length > 0) void drainQueue();
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
  };

  const scan = () => {
    const value = normalizeScanCode(code);
    if (!value || !editable) return;
    const quantity = Number.parseInt(qty, 10) || 1;
    setCode("");
    queueRef.current.push({ code: value, quantity });
    void drainQueue();
  };

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              {stockDocumentKindLabel(kind)}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">{document.number}</h1>
            <p className="mt-2 text-sm text-slate-500">
              El terminali veya barkod okuyucu HID klavye olarak çalışır. Okutunca satır eklenir.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                document.status === "CONFIRMED"
                  ? "bg-emerald-50 text-emerald-700"
                  : document.status === "CANCELED"
                    ? "bg-slate-100 text-slate-500"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
              {stockDocumentStatusLabel(document.status)}
            </span>
            <Link
              href={`${stockDocumentKindHref(kind)}`}
              className="rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Listeye dön
            </Link>
            {document.status === "CONFIRMED" ? (
              <Link
                href={`/admin/inventory/documents/${document.id}/print`}
                className="inline-flex items-center gap-2 rounded-md bg-[#405189] px-3 py-2 text-sm font-semibold text-white hover:bg-[#364574]"
              >
                <Printer className="h-4 w-4" />
                Yazdır
              </Link>
            ) : null}
          </div>
        </div>
        {document.relatedNumber ? (
          <p className="mt-3 text-sm text-slate-500">
            Bağlı belge: <span className="font-semibold text-slate-700">{document.relatedNumber}</span>
            {kind === "PURCHASE_INVOICE" ? " — stok bu faturada tekrar hareket etmez." : null}
          </p>
        ) : null}
      </div>

      <form
        className="grid gap-4 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          run(() =>
            updateStockDocumentMetaAction({
              documentId: document.id,
              warehouseId: String(form.get("warehouseId") ?? ""),
              targetWarehouseId: String(form.get("targetWarehouseId") ?? ""),
              supplierId: String(form.get("supplierId") ?? ""),
              externalNumber: String(form.get("externalNumber") ?? ""),
              documentDate: String(form.get("documentDate") ?? ""),
              notes: String(form.get("notes") ?? ""),
            }),
          );
        }}
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            {kind === "TRANSFER" ? "Kaynak depo" : "Depo"}
          </span>
          <select
            name="warehouseId"
            defaultValue={document.warehouseId}
            disabled={!editable}
            className={inputClass}
          >
            {document.warehouses.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} ({row.code})
                {row.city ? ` · ${row.city}` : ""}
              </option>
            ))}
          </select>
        </label>
        {documentKindNeedsTarget(kind) ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Hedef depo</span>
            <select
              name="targetWarehouseId"
              defaultValue={document.targetWarehouseId ?? ""}
              disabled={!editable}
              className={inputClass}
            >
              <option value="">Seçin</option>
              {document.warehouses
                .filter((row) => row.id !== document.warehouseId)
                .map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} ({row.code})
                  </option>
                ))}
            </select>
          </label>
        ) : null}
        {documentKindNeedsSupplier(kind) ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Tedarikçi</span>
            <select
              name="supplierId"
              defaultValue={document.supplierId ?? ""}
              disabled={!editable}
              className={inputClass}
            >
              <option value="">Seçilmedi</option>
              {document.suppliers.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Belge tarihi</span>
          <input
            type="date"
            name="documentDate"
            defaultValue={dateInputValue(document.documentDate)}
            disabled={!editable}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            {kind === "PURCHASE_INVOICE" ? "Fatura no (tedarikçi)" : "İrsaliye / evrak no"}
          </span>
          <input
            name="externalNumber"
            defaultValue={document.externalNumber ?? ""}
            disabled={!editable}
            className={inputClass}
          />
        </label>
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Not</span>
          <textarea name="notes" rows={2} defaultValue={document.notes ?? ""} disabled={!editable} className={inputClass} />
        </label>
        {editable ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md border border-[#e9ebec] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Belge bilgilerini kaydet
            </button>
          </div>
        ) : null}
      </form>

      {editable ? (
        <div
          className={`rounded-lg border p-5 shadow-sm ${
            flash === "match"
              ? "border-emerald-300 bg-emerald-50"
              : flash === "mismatch"
                ? "border-rose-300 bg-rose-50"
                : "border-[#e9ebec] bg-white"
          }`}
        >
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ScanBarcode className="h-4 w-4 text-[#405189]" />
            Barkod okut
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              ref={inputRef}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  scan();
                }
              }}
              placeholder="Barkod veya SKU"
              className="min-w-0 flex-1 rounded-md border border-[#e9ebec] bg-white px-3 py-3 font-mono text-base outline-none focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
            />
            <input
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              type="number"
              className="w-24 rounded-md border border-[#e9ebec] px-3 py-3 text-center text-sm"
              title={documentQuantityHint(kind)}
            />
            <button
              type="button"
              onClick={scan}
              disabled={!editable}
              className="rounded-md bg-[#0ab39c] px-4 py-3 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-60"
            >
              Ekle
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {kind === "COUNT"
              ? "Okutulan adet sayılan miktardır. Onayda depo bakiyesi bu sayıya çekilir."
              : kind === "ADJUSTMENT"
                ? "Pozitif adet giriş, negatif adet çıkıştır."
                : "Her okutmada belirtilen adet satıra eklenir. Aynı barkodu peş peşe okutabilirsiniz."}
          </p>
          {lastScan ? (
            <div className="mt-4 flex gap-4 rounded-lg border border-emerald-200 bg-white p-3">
              <LineThumb
                src={lastScan.image}
                alt={lastScan.productTitle}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
                  Son okutulan
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">{lastScan.productTitle}</p>
                {lastScan.title ? <p className="text-sm text-slate-600">{lastScan.title}</p> : null}
                <p className="mt-2 font-mono text-xs text-slate-500">
                  {lastScan.barcode ?? "Barkod yok"}
                  <span className="mx-1.5 text-slate-300">·</span>
                  {lastScan.sku}
                </p>
                <p className="mt-3 text-lg font-bold text-emerald-800">
                  Belgede {lastScan.quantity} adet
                  <span className="ml-2 text-sm font-semibold text-emerald-600">
                    (+{lastScan.addedQuantity})
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">Depodaki mevcut stok: {lastScan.warehouseOnHand}</p>
                <div className="mt-3 max-w-xs">
                  <p className="mb-1 text-xs font-medium text-slate-600">Raf / göz</p>
                  {document.locations.length > 0 ? (
                    <StockLocationSelect
                      warehouseId={document.warehouseId}
                      variantId={lastScan.variantId}
                      locationId={lastScan.locationId}
                      locations={document.locations}
                      onAssigned={(locationId) => assignLocation(lastScan.variantId, locationId)}
                    />
                  ) : (
                    <p className="text-xs text-amber-700">
                      Bu depoda raf yok.{" "}
                      <Link
                        href={`/admin/inventory/locations?warehouse=${document.warehouseId}`}
                        className="font-semibold underline"
                      >
                        Raf oluşturun
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Ürün</th>
              <th className="px-4 py-3">Barkod / SKU</th>
              <th className="px-4 py-3">Depo stok</th>
              <th className="px-4 py-3">Raf</th>
              <th className="px-4 py-3">{documentQuantityHint(kind)}</th>
              {showCost ? <th className="px-4 py-3">Birim maliyet</th> : null}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9ebec]">
            {lines.length === 0 ? (
              <tr>
                <td colSpan={lineColSpan} className="px-4 py-8 text-center text-sm text-slate-500">
                  Henüz satır yok. Barkod okutarak ekleyin.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <LineThumb src={line.image} alt={line.productTitle} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800">{line.productTitle}</p>
                        {line.title ? <p className="text-xs text-slate-500">{line.title}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    <div>{line.barcode ?? "—"}</div>
                    <div>{line.sku}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{line.warehouseOnHand}</td>
                  <td className="px-4 py-3">
                    {document.locations.length > 0 ? (
                      <StockLocationSelect
                        warehouseId={document.warehouseId}
                        variantId={line.variantId}
                        locationId={line.locationId}
                        locations={document.locations}
                        compact
                        onAssigned={(locationId) => assignLocation(line.variantId, locationId)}
                      />
                    ) : (
                      <span className="font-mono text-xs text-slate-500">{line.locationCode ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editable ? (
                      <input
                        type="number"
                        value={line.quantity}
                        className="w-24 rounded-md border border-[#e9ebec] px-2 py-1.5 text-sm"
                        onChange={(event) => {
                          const next = Number.parseInt(event.target.value, 10);
                          if (!Number.isFinite(next)) return;
                          setLines((current) =>
                            current.map((row) => (row.id === line.id ? { ...row, quantity: next } : row)),
                          );
                        }}
                        onBlur={(event) => {
                          const next = Number.parseInt(event.target.value, 10);
                          if (!Number.isFinite(next) || next === 0) return;
                          run(() =>
                            updateStockDocumentLineAction({
                              lineId: line.id,
                              quantity: next,
                              unitCostMinor: line.unitCostMinor,
                              notes: line.notes,
                            }),
                          );
                        }}
                      />
                    ) : (
                      <span className="font-semibold">{line.quantity}</span>
                    )}
                  </td>
                  {showCost ? (
                    <td className="px-4 py-3">
                      {editable ? (
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={line.unitCostMinor != null ? (line.unitCostMinor / 100).toFixed(2) : ""}
                          className="w-28 rounded-md border border-[#e9ebec] px-2 py-1.5 text-sm"
                          onBlur={(event) => {
                            const major = Number.parseFloat(event.target.value);
                            const minor = Number.isFinite(major) ? Math.round(major * 100) : null;
                            run(() =>
                              updateStockDocumentLineAction({
                                lineId: line.id,
                                quantity: line.quantity,
                                unitCostMinor: minor,
                                notes: line.notes,
                              }),
                            );
                          }}
                        />
                      ) : (
                        <span>
                          {line.unitCostMinor != null
                            ? `${(line.unitCostMinor / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`
                            : "—"}
                        </span>
                      )}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-right">
                    {editable ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => run(() => deleteStockDocumentLineAction(line.id))}
                        className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        {editable ? (
          <button
            type="button"
            disabled={isPending || lines.length === 0}
            onClick={() => {
              if (!window.confirm("Belge onaylansın ve stok uygulansın mı? Bu işlem geri alınabilir iptalle yapılır.")) {
                return;
              }
              run(() => confirmStockDocumentAction(document.id));
            }}
            className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Onayla ve stoğa işle
          </button>
        ) : null}
        {draft && canDelete ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (!window.confirm("Taslak silinsin mi?")) return;
              run(() => deleteDraftStockDocumentAction(document.id));
            }}
            className="rounded-md border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
          >
            Taslağı sil
          </button>
        ) : null}
        {document.status === "CONFIRMED" ? (
          <>
            {kind === "GOODS_RECEIPT" && canCreate ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => createInvoiceFromReceiptAction(document.id))}
                className="rounded-md bg-[#405189] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#364574]"
              >
                Alış faturası kes
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (!window.confirm("Onaylı belge iptal edilsin ve stok tersine çevrilsin mi?")) return;
                  run(() => cancelStockDocumentAction(document.id));
                }}
                className="rounded-md border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
              >
                İptal et
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
