"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { formatMinorToMajorInput, parseMajorToMinor } from "@/lib/product-money";
import {
  fromDatetimeLocalValue,
  hasStoredCampaign,
  listPriceMinor,
  parseSaleWindow,
  toDatetimeLocalValue,
} from "@/lib/product-sale";
import { updateProductSaleAction, type ProductSaleResult } from "./actions";

const fieldClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

export type ProductSaleTarget = {
  variantId: string;
  productId: string;
  title: string;
  priceMinor: number;
  compareAtMinor: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  canApplyAll?: boolean;
};

export function SalePlusButton({
  active,
  disabled,
  onClick,
  label,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={active ? "Kampanyayı düzenle" : "İndirim ekle"}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition ${
        active
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-400 hover:bg-[#0ab39c]/10 hover:text-[#0ab39c]"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
    </button>
  );
}

export function ProductSaleModal({
  target,
  onClose,
  onSaved,
}: {
  target: ProductSaleTarget;
  onClose: () => void;
  onSaved: (result: ProductSaleResult) => void;
}) {
  const titleId = useId();
  const list = listPriceMinor(target);
  const hasCampaign = hasStoredCampaign(target);
  const timedInitial = Boolean(target.saleStartsAt || target.saleEndsAt);
  const [listMajor, setListMajor] = useState(formatMinorToMajorInput(list));
  const [saleMajor, setSaleMajor] = useState(
    hasCampaign && target.compareAtMinor != null && target.compareAtMinor > target.priceMinor
      ? formatMinorToMajorInput(target.priceMinor)
      : "",
  );
  const [timed, setTimed] = useState(timedInitial);
  const [startsAt, setStartsAt] = useState(toDatetimeLocalValue(target.saleStartsAt));
  const [endsAt, setEndsAt] = useState(toDatetimeLocalValue(target.saleEndsAt));
  const [applyAll, setApplyAll] = useState(Boolean(target.canApplyAll));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  const submit = async (remove: boolean) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (remove) {
        const result = await updateProductSaleAction({
          variantId: target.variantId,
          remove: true,
          applyToAll: applyAll && Boolean(target.canApplyAll),
        });
        if (result.error || !result.variant || !result.product) {
          setError(result.error ?? "Kampanya kaldırılamadı.");
          return;
        }
        onSaved(result);
        onClose();
        return;
      }

      const listMinor = parseMajorToMinor(listMajor);
      const chargeMinor = parseMajorToMinor(saleMajor);
      if (listMinor == null || listMinor <= 0) {
        setError("Geçerli bir liste fiyatı girin.");
        return;
      }
      if (chargeMinor == null || chargeMinor <= 0) {
        setError("Geçerli bir indirimli fiyat girin.");
        return;
      }
      if (chargeMinor >= listMinor) {
        setError("İndirimli fiyat, liste fiyatından küçük olmalı.");
        return;
      }
      const window = parseSaleWindow({ timed, startsAt, endsAt });
      if (!window.ok) {
        setError(window.error);
        return;
      }

      const result = await updateProductSaleAction({
        variantId: target.variantId,
        listMinor,
        chargeMinor,
        saleStartsAt: window.saleStartsAt ? window.saleStartsAt.toISOString() : null,
        saleEndsAt: window.saleEndsAt ? window.saleEndsAt.toISOString() : null,
        applyToAll: applyAll && Boolean(target.canApplyAll),
      });
      if (result.error || !result.variant || !result.product) {
        setError(result.error ?? "İndirim kaydedilemedi.");
        return;
      }
      onSaved(result);
      onClose();
    } catch {
      setError("İndirim kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-slate-900/50"
        disabled={saving}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-[#e9ebec] px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-slate-800">
              İndirim / kampanya
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500">{target.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Satış fiyatı (KDV hariç)</span>
            <input
              className={fieldClass}
              inputMode="decimal"
              value={listMajor}
              onChange={(event) => setListMajor(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Kampanyalı fiyat (KDV hariç)</span>
            <input
              className={fieldClass}
              inputMode="decimal"
              value={saleMajor}
              placeholder="Örn. 399.90"
              onChange={(event) => setSaleMajor(event.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="accent-[#0ab39c]"
              checked={timed}
              onChange={(event) => setTimed(event.target.checked)}
            />
            Kampanyaya süre ver
          </label>
          {timed ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Başlangıç (isteğe bağlı)</span>
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Bitiş</span>
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={endsAt}
                  min={startsAt || undefined}
                  onChange={(event) => setEndsAt(event.target.value)}
                />
              </label>
            </div>
          ) : null}
          {target.canApplyAll ? (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 accent-[#0ab39c]"
                checked={applyAll}
                onChange={(event) => setApplyAll(event.target.checked)}
              />
              <span>Tüm kombinasyonlara aynı oranda uygula</span>
            </label>
          ) : null}
          {timed && endsAt ? (
            <p className="text-[11px] text-slate-400">
              Bitiş saati geldiğinde indirim otomatik kalkar. Sitede geri sayım görünür.
              {fromDatetimeLocalValue(startsAt) ? " Başlangıçtan önce liste fiyatı gösterilir." : ""}
            </p>
          ) : null}
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#e9ebec] bg-[#f3f6f9] px-5 py-3">
          {hasCampaign ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit(true)}
              className="mr-auto rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
            >
              İndirimi kaldır
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit(false)}
            className="rounded-md bg-[#0ab39c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-60"
          >
            {saving ? "Kaydediliyor…" : "Uygula"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
