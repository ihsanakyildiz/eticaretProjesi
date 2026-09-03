"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ClipboardList, Printer, RotateCcw, ScanBarcode } from "lucide-react";
import { playWarehouseMatchSound, playWarehouseMismatchSound } from "@/lib/warehouse-sounds";
import { printWarehouseCargoLabel } from "@/lib/warehouse-print";
import {
  duplicateLineBarcodes,
  lineIsPacked,
  normalizeScanCode,
  orderIsFullyPacked,
  packedProgress,
  type WarehouseLine,
} from "@/lib/warehouse";
import {
  resetWarehousePackAction,
  scanWarehouseBarcodeAction,
  shipPackedOrderAction,
} from "./actions";
import { WarehouseCargoLabel } from "./cargo-label";
import { WarehouseReturnButton } from "./warehouse-return-button";

export type WarehousePackModel = {
  id: string;
  orderNo: number;
  reference: string;
  trackingNumber: string;
  carrierName: string;
  siteName: string;
  customerName: string;
  addressLines: string[];
  lines: WarehouseLine[];
  carriers: { id: string; name: string }[];
  shipped: boolean;
};

export function WarehousePackStation({ order }: { order: WarehousePackModel }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const labelHostRef = useRef<HTMLDivElement>(null);
  const pendingLabelPrint = useRef(false);
  const [code, setCode] = useState("");
  const [lines, setLines] = useState(order.lines);
  const [flash, setFlash] = useState<"match" | "mismatch" | null>(null);
  const [mismatch, setMismatch] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [carrierName, setCarrierName] = useState(order.carrierName);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber);
  const [shipped, setShipped] = useState(order.shipped);
  const [showLabel, setShowLabel] = useState(order.shipped);
  const [isPending, startTransition] = useTransition();

  const progress = packedProgress(lines);
  const complete = orderIsFullyPacked(lines);
  const duplicateBarcodes = duplicateLineBarcodes(lines);

  useEffect(() => {
    setLines(order.lines);
    setTrackingNumber(order.trackingNumber);
    setShipped(order.shipped);
    if (order.shipped) setShowLabel(true);
  }, [order.lines, order.trackingNumber, order.shipped]);

  useEffect(() => {
    if (shipped) return;
    inputRef.current?.focus();
  }, [flash, lines, showLabel, shipped]);

  useEffect(() => {
    if (flash !== "match") return;
    const timer = window.setTimeout(() => setFlash(null), 1400);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const printLabel = () => {
    const label = labelHostRef.current?.querySelector<HTMLElement>(".warehouse-cargo-label");
    printWarehouseCargoLabel(label ?? null);
  };

  useEffect(() => {
    if (!pendingLabelPrint.current || !showLabel) return;
    pendingLabelPrint.current = false;
    const timer = window.setTimeout(printLabel, 80);
    return () => window.clearTimeout(timer);
  }, [showLabel, trackingNumber]);

  const focusScan = () => {
    if (shipped) return;
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  const scan = () => {
    const value = code.trim();
    if (!value || isPending || shipped) return;
    startTransition(async () => {
      const result = await scanWarehouseBarcodeAction({ orderId: order.id, code: value });
      setCode("");
      if (!result.ok) {
        setError(result.error);
        playWarehouseMismatchSound();
        setFlash("mismatch");
        focusScan();
        return;
      }
      setError(null);
      if (!result.match) {
        playWarehouseMismatchSound();
        setFlash("mismatch");
        setMismatch(result.message);
        setNotice(null);
        focusScan();
        return;
      }
      playWarehouseMatchSound();
      setFlash("match");
      setMismatch(null);
      setNotice(
        result.fullyPacked
          ? "Tüm ürünler pakete alındı. Kargoya çıkarabilirsiniz."
          : "Ürün pakete alındı.",
      );
      setLines((current) =>
        current.map((line) =>
          line.id === result.itemId ? { ...line, packedQuantity: result.packedQuantity } : line,
        ),
      );
      focusScan();
    });
  };

  return (
    <div className="space-y-4">
      {flash === "mismatch" ? (
        <div
          role="alert"
          className="sticky top-16 z-20 rounded-lg border-2 border-rose-500 bg-rose-600 px-4 py-4 text-lg font-semibold text-white shadow-lg print:hidden"
        >
          Yanlış ürün. Pakete koymayın.
          {mismatch ? <span className="mt-1 block text-sm font-normal text-rose-100">{mismatch}</span> : null}
        </div>
      ) : null}
      {flash === "match" ? (
        <div className="sticky top-16 z-20 rounded-lg border-2 border-emerald-500 bg-emerald-600 px-4 py-4 text-lg font-semibold text-white shadow-lg print:hidden">
          Barkod eşleşti. Ürünü pakete koyun.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 print:hidden">
          {error}
        </div>
      ) : null}
      {notice && flash !== "mismatch" ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 print:hidden">
          {notice}
        </div>
      ) : null}
      {duplicateBarcodes.length > 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden"
        >
          Bu siparişte aynı barkod birden fazla varyantta:{" "}
          <span className="font-mono font-semibold">{duplicateBarcodes.join(", ")}</span>. Barkod
          okutması durduruldu. SKU okutabilir veya{" "}
          <Link href="/admin/products/duplicate-barcodes" className="font-semibold underline">
            tekrarlayan barkodları
          </Link>{" "}
          katalogda düzeltebilirsiniz.
        </div>
      ) : null}

      {shipped ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 print:hidden">
          <p className="text-sm text-emerald-800">
            Bu sipariş kargoya çıkarıldı. Etiketi tekrar yazdırabilir veya çıkışı geri alabilirsiniz.
          </p>
          <WarehouseReturnButton
            orderId={order.id}
            after="stay"
            onReturned={() => {
              setShipped(false);
              setShowLabel(false);
              setNotice("Sipariş gönderime hazır listesine alındı. Gerekirse paketlemeyi sıfırlayabilirsiniz.");
              setError(null);
            }}
          />
        </div>
      ) : (
      <section className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <ScanBarcode className="h-6 w-6 text-[#405189]" />
          <div className="min-w-0 flex-1">
            <label htmlFor="warehouse-scan" className="text-sm font-semibold text-slate-800">
              El terminali barkod okutma
            </label>
            <p className="text-xs text-slate-500">
              Okuyucu Enter gönderir. Doğru üründe kısa onay sesi, yanlışta uyarı sesi çalar.
            </p>
          </div>
          <p className="text-sm font-medium text-slate-600">
            {progress.packed} / {progress.total} adet
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#0ab39c] transition-[width]"
            style={{
              width: `${progress.total === 0 ? 0 : Math.round((progress.packed / progress.total) * 100)}%`,
            }}
          />
        </div>
        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            scan();
          }}
        >
          <input
            ref={inputRef}
            id="warehouse-scan"
            value={code}
            disabled={isPending}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Tab" && code.trim()) {
                event.preventDefault();
                scan();
              }
            }}
            onBlur={(event) => {
              const next = event.relatedTarget as HTMLElement | null;
              if (next && ["SELECT", "BUTTON", "A", "INPUT", "TEXTAREA"].includes(next.tagName)) {
                return;
              }
              focusScan();
            }}
            autoComplete="off"
            inputMode="none"
            placeholder="Barkodu okutun…"
            className="w-full rounded-md border-2 border-[#405189] bg-white px-4 py-3 font-mono text-2xl tracking-wide text-slate-800 outline-none focus:border-[#0ab39c] disabled:bg-slate-50"
          />
        </form>
      </section>
      )}

      <section className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm print:hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2">Ürün</th>
              <th className="px-4 py-2">Raf</th>
              <th className="px-4 py-2">Barkod / SKU</th>
              <th className="px-4 py-2 text-right">Okutulan</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const packed = lineIsPacked(line);
              const duplicate = Boolean(
                line.barcode && duplicateBarcodes.includes(normalizeScanCode(line.barcode)),
              );
              return (
                <tr
                  key={line.id}
                  className={`border-t border-[#e9ebec] ${
                    packed ? "bg-emerald-50" : duplicate ? "bg-amber-50" : "bg-white"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {line.image ? (
                        <img
                          src={line.image}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-md border border-[#e9ebec] object-cover"
                        />
                      ) : null}
                      <p className={`font-medium ${packed ? "text-emerald-800" : "text-slate-800"}`}>
                        {packed ? <Check className="mr-1 inline h-4 w-4" /> : null}
                        {line.title}
                        {line.variantTitle ? ` (${line.variantTitle})` : ""}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {line.locationCode ? (
                      <div>
                        <p className="font-mono text-base font-bold tracking-wide text-[#405189]">
                          {line.locationCode}
                        </p>
                        {line.locationHint ? (
                          <p className="text-[11px] text-slate-500">{line.locationHint}</p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-amber-700">Raf yok</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    <p className={duplicate ? "font-semibold text-amber-800" : ""}>
                      {line.barcode || "Barkod yok"}
                    </p>
                    {line.sku ? <p className="text-slate-400">SKU {line.sku}</p> : null}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${packed ? "text-emerald-700" : "text-slate-800"}`}
                  >
                    {line.packedQuantity} / {line.quantity}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {!shipped ? (
      <section className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          {order.carriers.length > 0 ? (
            <label className="min-w-[12rem] flex-1 text-sm">
              <span className="mb-1 block text-slate-500">Kargo firması</span>
              <select
                value={carrierName}
                onChange={(event) => setCarrierName(event.target.value)}
                className="w-full rounded-md border border-[#e9ebec] px-3 py-2 text-sm"
              >
                <option value="">Seçin</option>
                {order.carriers.map((carrier) => (
                  <option key={carrier.id} value={carrier.name}>
                    {carrier.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Link
            href={`/admin/warehouse/${order.id}/pick-list`}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <ClipboardList className="h-4 w-4" />
            Toplama listesi
          </Link>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await resetWarehousePackAction({ orderId: order.id });
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setLines((current) => current.map((line) => ({ ...line, packedQuantity: 0 })));
                setNotice(result.message ?? "Sıfırlandı.");
                setMismatch(null);
                setFlash(null);
                focusScan();
              })
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-600"
          >
            <RotateCcw className="h-4 w-4" />
            Paketlemeyi sıfırla
          </button>
          <button
            type="button"
            disabled={isPending || !complete}
            onClick={() =>
              startTransition(async () => {
                const result = await shipPackedOrderAction({
                  orderId: order.id,
                  carrierName,
                });
                if (result.error) {
                  setError(result.error);
                  playWarehouseMismatchSound();
                  setFlash("mismatch");
                  return;
                }
                setNotice(result.message ?? null);
                if (result.trackingNumber) setTrackingNumber(result.trackingNumber);
                setShipped(true);
                setShowLabel(true);
                pendingLabelPrint.current = true;
                playWarehouseMatchSound();
                router.refresh();
              })
            }
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Kargoya çıkar ve etiket yazdır
          </button>
        </div>
        {!complete ? (
          <p className="mt-2 text-xs text-slate-400">Tüm satırlar yeşil olmadan kargoya çıkılamaz.</p>
        ) : null}
      </section>
      ) : null}

      {showLabel ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Kargo etiketi</h2>
              <p className="text-xs text-slate-500">
                Yazıcı seçiminde barkod / termal yazıcıyı seçin. Sayfa 100×150 mm.
              </p>
            </div>
            <button
              type="button"
              onClick={printLabel}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white"
            >
              <Printer className="h-4 w-4" />
              Barkod yazıcısına gönder
            </button>
          </div>
          <div ref={labelHostRef}>
            <WarehouseCargoLabel
              siteName={order.siteName}
              orderNo={order.orderNo}
              reference={order.reference}
              trackingNumber={trackingNumber || order.trackingNumber}
              carrierName={carrierName || order.carrierName}
              customerName={order.customerName}
              addressLines={order.addressLines}
              itemCount={progress.total}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
