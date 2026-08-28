"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { AdminSwitch } from "@/components/admin/admin-switch";
import {
  updatePricingBillingSettingsAction,
  type PricingFormState,
} from "./actions";

export function PricingBillingSettingsForm({
  monthlyEnabled,
  yearlyEnabled,
}: {
  monthlyEnabled: boolean;
  yearlyEnabled: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    PricingFormState,
    FormData
  >(updatePricingBillingSettingsAction, {});

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <form
      action={formAction}
      className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm space-y-4"
    >
      <div>
        <h2 className="text-sm font-semibold text-slate-800">
          Fiyatlandırma modeli
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Varsayılan: tek seferlik proje bedeli (ikisi de kapalı). Aylık veya
          yıllık açarsanız abonelik modu devreye girer ve sitede dönem seçici
          görünebilir.
        </p>
      </div>

      {state.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}
      {state.message && state.success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <AdminSwitch
          name="pricing_billing_monthly_enabled"
          label="Aylık fiyatlandırma (abonelik)"
          defaultChecked={monthlyEnabled}
        />
        <AdminSwitch
          name="pricing_billing_yearly_enabled"
          label="Yıllık fiyatlandırma (abonelik)"
          defaultChecked={yearlyEnabled}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-[#405189] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#364574] disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Dönem ayarlarını kaydet
      </button>
    </form>
  );
}
