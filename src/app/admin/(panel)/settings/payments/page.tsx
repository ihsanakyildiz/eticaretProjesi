import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { getSettingDefsByScope } from "@/config/settings";
import { paymentSettingGroups } from "@/config/payment-settings";
import { ensureDefaultSettings, getSettingsMapUncached } from "@/lib/settings";
import { SettingsForm } from "../settings-form";

export const metadata: Metadata = {
  title: "Ödeme ayarları",
  description: "iyzico ve PayTR kart ödemesi, 3D Secure ve taksit",
};

function sanitizeSettingsForClient(values: Record<string, string>) {
  const next = { ...values };
  for (const def of getSettingDefsByScope("payments")) {
    if (def.type === "password" && next[def.key]) {
      next[def.key] = "1";
    }
  }
  return next;
}

export default async function PaymentSettingsPage() {
  await ensureDefaultSettings("payments");
  const values = sanitizeSettingsForClient(await getSettingsMapUncached());

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Ayarlar</p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <CreditCard className="h-6 w-6 text-[#0ab39c]" />
          Kart ödemesi (iyzico / PayTR)
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Türkiye’deki taksitli ve 3D Secure kart alışkanlığı için iyzico ve PayTR’yi buradan açın.
          Stripe varsa ödeme adımında ayrıca görünür; üyelik paketleri Stripe’da kalır.
        </p>
      </div>

      <SettingsForm
        values={values}
        groups={paymentSettingGroups}
        scope="payments"
        submitLabel="Ayarları kaydet"
      />
    </div>
  );
}
