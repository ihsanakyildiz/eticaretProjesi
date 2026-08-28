import type { Metadata } from "next";
import { Gauge, Zap } from "lucide-react";
import { performanceSettingGroups } from "@/config/settings";
import { parseLastCacheCleared } from "@/lib/cache-manager";
import { ensureDefaultSettings, getSettingsMapUncached } from "@/lib/settings";
import { SettingsForm } from "../settings-form";
import { CachePanel } from "./cache-panel";

export const metadata: Metadata = {
  title: "Performans Ayarları",
  description: "Site hızı ve performans ayarlarını yönetin",
};

const tips = [
  {
    title: "Core Web Vitals",
    text: "LCP, INP ve CLS metriklerini PageSpeed Insights ile düzenli ölçün.",
  },
  {
    title: "Görsel ağırlığı",
    text: "Logo ve OG görselleri WebP olarak kaydediliyor; gereksiz büyük görsellerden kaçının.",
  },
  {
    title: "Önbellek",
    text: "İçerik güncelledikten sonra “Önbelleği Yenile” ile ziyaretçilere yeni sürümü hemen gösterin.",
  },
];

function formatClearedAt(iso?: string) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function PerformanceSettingsPage() {
  await ensureDefaultSettings("performance");
  const values = await getSettingsMapUncached();
  const last = parseLastCacheCleared(values.perf_cache_last_cleared);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Ayarlar</p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Zap className="h-6 w-6 text-[#0ab39c]" />
              Performans Ayarları
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Sitenin daha hızlı açılması için lazy load, resource hints, analitik erteleme, cache ve
              görsel optimizasyon politikalarını buradan yönetin. İstediğiniz zaman önbelleği
              yenileyebilir veya temizleyebilirsiniz.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-[#0ab39c]/10 px-3 py-2 text-sm font-medium text-[#0ab39c]">
            <Gauge className="h-4 w-4" />
            Hız odaklı yapılandırma
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

      <CachePanel
        lastClearedLabel={formatClearedAt(last?.clearedAt)}
        lastModeLabel={
          last?.mode === "purge"
            ? "Tam temizlik"
            : last?.mode === "refresh"
              ? "Yenileme (revalidate)"
              : null
        }
      />

      <SettingsForm
        values={values}
        groups={performanceSettingGroups}
        scope="performance"
        submitLabel="Performans Ayarlarını Kaydet"
      />
    </div>
  );
}
