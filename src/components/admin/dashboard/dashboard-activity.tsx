import Link from "next/link";
import type { DashboardActivityItem } from "@/lib/dashboard";

const toneDot: Record<DashboardActivityItem["tone"], string> = {
  teal: "bg-[#0ab39c]",
  indigo: "bg-[#405189]",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
};

export function DashboardActivity({
  items,
}: {
  items: DashboardActivityItem[];
}) {
  return (
    <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-800">Son Güncellemeler</h3>
      <p className="mt-1 text-sm text-slate-500">
        Sayfa, çalışma, proje ve blog kayıtlarından en son dokunulanlar
      </p>

      {items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-500">
          Henüz güncellenen içerik yok.
        </p>
      ) : (
        <div className="mt-5 space-y-0">
          {items.map((activity, index) => (
            <div key={activity.id} className="relative flex gap-4 pb-6 last:pb-0">
              {index < items.length - 1 ? (
                <span className="absolute top-3 left-[7px] h-[calc(100%-12px)] w-px bg-[#e9ebec]" />
              ) : null}
              <span
                className={`relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ${toneDot[activity.tone]}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={activity.href}
                    className="truncate text-sm font-medium text-slate-700 hover:text-[#405189]"
                  >
                    {activity.title}
                  </Link>
                  <span className="shrink-0 text-xs text-slate-400">{activity.time}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{activity.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
