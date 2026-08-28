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
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  deletePricingPlanAction,
  togglePricingPlanActiveAction,
} from "./actions";
import type { PricingPriceType } from "@/lib/pricing";
import { resolvePlanPrice } from "@/lib/pricing";

export type PricingPlanRow = {
  id: string;
  name: string;
  slug: string;
  blurb: string | null;
  priceType: PricingPriceType;
  priceRangeMin: string | null;
  priceRangeMax: string | null;
  priceMonthly: string;
  priceYearly: string;
  priceMonthlyDiscount: string | null;
  priceYearlyDiscount: string | null;
  featured: boolean;
  isActive: boolean;
  sortOrder: number;
};

const PRICE_TYPE_LABEL: Record<PricingPriceType, string> = {
  FIXED: "Sabit",
  RANGE: "Aralık",
  QUOTE: "Teklif",
};

function formatAdminPrice(plan: PricingPlanRow) {
  return resolvePlanPrice(plan, "monthly", "project").price;
}

function DeletePlanModal({
  plan,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  plan: PricingPlanRow;
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
            <h2 className="text-base font-semibold text-slate-800">
              Paketi sil
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Bu işlem geri alınamaz.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md p-1 text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-slate-600">
            <strong className="font-semibold text-slate-800">{plan.name}</strong>{" "}
            paketini silmek istediğinize emin misiniz?
          </p>
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
            className="rounded-md border border-[#e9ebec] bg-white px-4 py-2 text-sm font-medium text-slate-600"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Evet, Sil
          </button>
        </div>
      </div>
    </div>
  );
}

export function PricingPlansTable({ plans }: { plans: PricingPlanRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PricingPlanRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter(
      (plan) =>
        plan.name.toLowerCase().includes(q) ||
        plan.slug.toLowerCase().includes(q) ||
        (plan.blurb ?? "").toLowerCase().includes(q) ||
        plan.priceMonthly.toLowerCase().includes(q),
    );
  }, [plans, query]);

  const onToggle = (id: string) => {
    startTransition(async () => {
      await togglePricingPlanActiveAction(id);
      router.refresh();
    });
  };

  const onDelete = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deletePricingPlanAction(deleteTarget.id);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#e9ebec] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {filtered.length} / {plans.length} paket
        </p>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Paket ara…"
            className="w-full rounded-md border border-[#e9ebec] py-2 pr-3 pl-9 text-sm outline-none focus:border-[#405189]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f3f6f9] text-xs tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Paket</th>
              <th className="px-4 py-3 font-semibold">Fiyat tipi</th>
              <th className="px-4 py-3 font-semibold">Gösterim</th>
              <th className="px-4 py-3 font-semibold">Sıra</th>
              <th className="px-4 py-3 font-semibold">Durum</th>
              <th className="px-4 py-3 font-semibold">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Paket bulunamadı.
                </td>
              </tr>
            ) : (
              filtered.map((plan) => (
                <tr
                  key={plan.id}
                  className="border-t border-[#e9ebec] hover:bg-[#fafbfc]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">
                        {plan.name}
                      </span>
                      {plan.featured ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          <Star className="h-3 w-3" />
                          Öne çıkan
                        </span>
                      ) : null}
                    </div>
                    {plan.blurb ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {plan.blurb}
                      </p>
                    ) : null}
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                      /paket/{plan.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {PRICE_TYPE_LABEL[plan.priceType]}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {plan.priceType === "FIXED" && plan.priceMonthlyDiscount ? (
                      <span className="inline-flex flex-col gap-0.5">
                        <span className="text-xs text-slate-400 line-through">
                          {plan.priceMonthly}
                        </span>
                        <span className="font-semibold text-emerald-700">
                          {plan.priceMonthlyDiscount}
                        </span>
                      </span>
                    ) : (
                      formatAdminPrice(plan)
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{plan.sortOrder}</td>
                  <td className="px-4 py-3">
                    {plan.isActive ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <Check className="h-4 w-4" />
                        Aktif
                      </span>
                    ) : (
                      <span className="text-slate-400">Pasif</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title={plan.isActive ? "Pasifleştir" : "Aktifleştir"}
                        disabled={isPending}
                        onClick={() => onToggle(plan.id)}
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-[#405189]"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/admin/pricing/${plan.id}/edit`}
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-[#405189]"
                        title="Düzenle"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        title="Sil"
                        disabled={isPending}
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(plan);
                        }}
                        className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget ? (
        <DeletePlanModal
          plan={deleteTarget}
          isPending={isPending}
          error={deleteError}
          onClose={() => {
            if (!isPending) setDeleteTarget(null);
          }}
          onConfirm={onDelete}
        />
      ) : null}
    </div>
  );
}
