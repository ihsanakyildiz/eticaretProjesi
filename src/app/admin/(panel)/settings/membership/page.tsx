import type { Metadata } from "next";
import { Users } from "lucide-react";
import { membershipSettingGroups } from "@/config/membership-settings";
import { ensureDefaultSettings, getSettingsMapUncached } from "@/lib/settings";
import { SettingsForm } from "../settings-form";

export const metadata: Metadata = {
  title: "Müşteri hesap ayarları",
  description: "Müşteri kayıt ve giriş sistemini açın veya kapatın",
};

export default async function MembershipSettingsPage() {
  await ensureDefaultSettings("membership");
  const values = await getSettingsMapUncached();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Ayarlar</p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <Users className="h-6 w-6 text-[#0ab39c]" />
          Müşteri hesap ayarları
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Müşteri kayıt ve girişini buradan açıp kapatabilirsiniz. Açıkken ziyaretçiler hesap
          oluşturabilir ve satın alınabilir paketleri Stripe ile alabilir.
        </p>
      </div>

      <SettingsForm
        values={values}
        groups={membershipSettingGroups}
        scope="membership"
        submitLabel="Ayarları kaydet"
      />
    </div>
  );
}
