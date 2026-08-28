import type { Metadata } from "next";
import { Palette, Sparkles } from "lucide-react";
import { ensureDefaultSettings, getSettingsMapUncached } from "@/lib/settings";
import { ThemeDesignForm } from "./theme-design-form";

export const metadata: Metadata = {
  title: "Tema Tasarımı",
  description: "Site renkleri ve görsel tasarımını yönetin",
};

const tips = [
  {
    title: "Preset ile başlayın",
    text: "Hazır temalardan birini seçip renkleri ihtiyacınıza göre ince ayar yapın.",
  },
  {
    title: "Açık & koyu mod",
    text: "Her iki mod için ayrı palet tanımlayın; ziyaretçiler header’daki düğmeyle geçiş yapabilir.",
  },
  {
    title: "Anında yansır",
    text: "Kaydettikten sonra site genelinde buton, kart ve arka plan renkleri güncellenir.",
  },
];

export default async function ThemeSettingsPage() {
  await ensureDefaultSettings("theme");
  const values = await getSettingsMapUncached();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Ayarlar</p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Palette className="h-6 w-6 text-[#0ab39c]" />
              Tema Tasarımı
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Web sitenizin renk paletini, yazı tipini ve görsel stilini admin panelinden
              yönetin. Değişiklikler tüm frontend bileşenlerine otomatik yansır.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-[#0ab39c]/10 px-3 py-2 text-sm font-medium text-[#0ab39c]">
            <Sparkles className="h-4 w-4" />
            Canlı önizleme
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tips.map((tip) => (
          <div
            key={tip.title}
            className="rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-800">{tip.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{tip.text}</p>
          </div>
        ))}
      </div>

      <ThemeDesignForm values={values} />
    </div>
  );
}
