"use client";

import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { DASHBOARD_PERIODS, type DashboardPeriod } from "@/lib/dashboard";

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  day: "Gün",
  month: "Ay",
  year: "Yıl",
  "day-1": "Gün-1",
  "month-1": "Ay-1",
  "year-1": "Yıl-1",
};

export function DashboardPeriod({
  period,
  fromValue,
}: {
  period: DashboardPeriod;
  fromValue: string;
}) {
  const router = useRouter();

  const go = (nextPeriod: DashboardPeriod, from = fromValue) => {
    const params = new URLSearchParams();
    params.set("period", nextPeriod);
    if (from) params.set("from", from);
    router.push(`/admin?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Gösterge paneli</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-md border border-[#e9ebec] bg-white">
          {DASHBOARD_PERIODS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => go(item)}
              className={`px-3 py-2 text-xs font-semibold ${
                period === item
                  ? "bg-[#405189] text-white"
                  : "text-slate-600 hover:bg-[#f3f6f9]"
              }`}
            >
              {PERIOD_LABELS[item]}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-xs text-slate-600">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
          <span>Başlangıç</span>
          <input
            type="date"
            value={fromValue}
            onChange={(event) => go(period, event.target.value)}
            className="border-0 bg-transparent text-xs text-slate-700 outline-none"
          />
        </label>
      </div>
    </div>
  );
}
