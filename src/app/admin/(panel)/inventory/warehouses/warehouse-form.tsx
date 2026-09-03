"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import {
  createWarehouseAction,
  updateWarehouseAction,
  type WarehouseFormState,
} from "./actions";

const initialState: WarehouseFormState = {};

type WarehouseFormValues = {
  id?: string;
  name?: string;
  code?: string;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  isDefault?: boolean;
};

export function WarehouseForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: WarehouseFormValues;
}) {
  const router = useRouter();
  const action = mode === "create" ? createWarehouseAction : updateWarehouseAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (!state.success) return;
    router.push("/admin/inventory/warehouses");
    router.refresh();
  }, [state.success, router]);

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {state.error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Depo adı</span>
          <input
            name="name"
            defaultValue={initial?.name ?? ""}
            required
            placeholder="İstanbul Depo"
            className={inputClass}
          />
          {state.fieldErrors?.name ? (
            <span className="mt-1 block text-xs text-rose-600">{state.fieldErrors.name}</span>
          ) : null}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Kod</span>
          <input
            name="code"
            defaultValue={initial?.code ?? ""}
            placeholder="IST"
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-slate-400">
            El terminali ve belgelerde görünür. Boş bırakılırsa addan üretilir.
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Sıra</span>
          <input
            name="sortOrder"
            type="number"
            defaultValue={initial?.sortOrder ?? 0}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Şehir</span>
          <input name="city" defaultValue={initial?.city ?? ""} placeholder="İstanbul" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">İlçe</span>
          <input name="district" defaultValue={initial?.district ?? ""} className={inputClass} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Adres</span>
          <textarea
            name="address"
            rows={3}
            defaultValue={initial?.address ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Telefon</span>
          <input name="phone" defaultValue={initial?.phone ?? ""} className={inputClass} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Not</span>
          <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} className={inputClass} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <AdminSwitch name="isActive" label="Aktif" defaultChecked={initial?.isActive ?? true} />
        <AdminSwitch
          name="isDefault"
          label="Varsayılan depo"
          description="Sipariş rezervasyonu ve katalog stok yazımı bu depodan başlar."
          defaultChecked={initial?.isDefault ?? false}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Kaydet
        </button>
        <Link href="/admin/inventory/warehouses" className="text-sm font-medium text-slate-500 hover:text-slate-800">
          Vazgeç
        </Link>
      </div>
    </form>
  );
}
