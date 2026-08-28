import type { Metadata } from "next";
import { getSettingDefsByScope } from "@/config/settings";
import {
  ensureDefaultSettings,
  getSettingsMapUncached,
  syncDetectedSitePath,
} from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = {
  title: "Genel Ayarlar",
  description: "Site genel ayarlarını yönetin",
};

/** password alanlarını tarayıcıya düz metin olarak vermez */
function sanitizeSettingsForClient(values: Record<string, string>) {
  const next = { ...values };
  for (const def of getSettingDefsByScope("general")) {
    if (def.type === "password" && next[def.key]) {
      next[def.key] = "1";
    }
  }
  return next;
}

export default async function SettingsPage() {
  await ensureDefaultSettings();
  await syncDetectedSitePath();
  const values = sanitizeSettingsForClient(await getSettingsMapUncached());

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Ayarlar</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Genel Ayarlar</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Site adı, logo, favicon, iletişim, SEO, özel kod enjeksiyonu, sosyal medya ve
          e-posta (SMTP / gelen kutu) ayarlarını buradan yönetebilirsiniz. SMTP’yi
          kaydettikten sonra “Test e-postası gönder” ile bağlantıyı doğrulayın.
        </p>
      </div>

      <SettingsForm values={values} scope="general" />
    </div>
  );
}
