"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import {
  createTaxRateAction,
  updateTaxRateAction,
  type TaxRateFormState,
} from "./actions";

const initialState: TaxRateFormState = {};

type TaxRateFormValues = {
  id?: string;
  name?: string;
  percent?: number;
  sortOrder?: number;
  isActive?: boolean;
  isDefault?: boolean;
};

export function TaxRateForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: TaxRateFormValues;
}) {
  const router = useRouter();
  const action = mode === "create" ? createTaxRateAction : updateTaxRateAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (!state.success) return;
    router.push("/admin/products/tax-rates");
    router.refresh();
  }, [state.success, router]);

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      {state.error ? (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {state.error}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">KDV oranı</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ürün fiyatlandırmasında seçilebilecek yüzdeyi tanımlayın.
          </p>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Oran adı *
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={initial?.name ?? ""}
              placeholder="Örn. KDV %20"
              className={inputClass}
            />
            {state.fieldErrors?.name ? (
              <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.name}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="percent" className="mb-1.5 block text-sm font-medium text-slate-700">
              Yüzde *
            </label>
            <input
              id="percent"
              name="percent"
              type="number"
              min={0}
              max={100}
              required
              defaultValue={initial?.percent ?? ""}
              placeholder="20"
              className={inputClass}
            />
            {state.fieldErrors?.percent ? (
              <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.percent}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="sortOrder" className="mb-1.5 block text-sm font-medium text-slate-700">
              Sıra
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={
                mode === "create" && initial?.sortOrder === undefined ? "" : (initial?.sortOrder ?? 0)
              }
              placeholder="Boş = otomatik"
              className={inputClass}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <AdminSwitch name="isActive" label="Aktif" defaultChecked={initial?.isActive ?? true} />
            <AdminSwitch
              name="isDefault"
              label="Varsayılan oran"
              description="Yeni ürünlerde bu oran seçili gelir."
              defaultChecked={initial?.isDefault ?? false}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/admin/products/tax-rates"
          className="rounded-md border border-[#e9ebec] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Vazgeç
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Kaydet" : "Güncelle"}
        </button>
      </div>
    </form>
  );
}
