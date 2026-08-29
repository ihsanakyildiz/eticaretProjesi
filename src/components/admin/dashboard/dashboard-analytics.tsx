"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { formatMinorTry } from "@/lib/product-money";
import type { DashboardChartPoint, DashboardMetricId } from "@/lib/dashboard";

type Metrics = {
  sales: string;
  salesMinor: number;
  orders: string;
  orderCount: number;
  cart: string;
  cartMinor: number;
  visits: string;
  conversion: string;
  profit: string;
};

const METRICS: Array<{
  id: DashboardMetricId;
  label: string;
  ready: boolean;
}> = [
  { id: "sales", label: "Satışlar", ready: true },
  { id: "orders", label: "Siparişler", ready: true },
  { id: "cart", label: "Sepet değeri", ready: true },
  { id: "visits", label: "Ziyaretler", ready: false },
  { id: "conversion", label: "Dönüşüm oranı", ready: false },
  { id: "profit", label: "Net kâr", ready: false },
];

export function DashboardAnalytics({
  metrics,
  chart,
}: {
  metrics: Metrics;
  chart: DashboardChartPoint[];
}) {
  const [metric, setMetric] = useState<DashboardMetricId>("sales");

  const series = useMemo(() => {
    return chart.map((point) => {
      switch (metric) {
        case "sales":
          return point.salesMinor / 100;
        case "orders":
          return point.orderCount;
        case "cart":
          return point.orderCount > 0 ? point.salesMinor / 100 / point.orderCount : 0;
        case "visits":
        case "conversion":
        case "profit":
          return 0;
        default: {
          const _exhaustive: never = metric;
          return _exhaustive;
        }
      }
    });
  }, [chart, metric]);

  const values: Record<DashboardMetricId, string> = {
    sales: `${metrics.sales} vergi hariç`,
    orders: metrics.orders,
    cart: `${metrics.cart} vergi hariç`,
    visits: metrics.visits,
    conversion: metrics.conversion,
    profit: metrics.profit,
  };

  const max = Math.max(...series, 1);
  const width = 640;
  const height = 180;
  const points = series.map((value, index) => {
    const x = series.length <= 1 ? width / 2 : (index / (series.length - 1)) * width;
    const y = height - (value / max) * (height - 16) - 8;
    return `${x},${y}`;
  });

  return (
    <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#e9ebec] px-4 py-3">
        <BarChart3 className="h-4 w-4 text-[#405189]" />
        <h2 className="text-sm font-semibold text-slate-800">Gösterge paneli</h2>
      </div>

      <div className="grid grid-cols-2 border-b border-[#e9ebec] lg:grid-cols-6">
        {METRICS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMetric(item.id)}
            className={`border-[#e9ebec] px-3 py-3 text-left ${
              metric === item.id ? "bg-[#0ab39c] text-white" : "bg-white text-slate-700 hover:bg-[#f8f9fa]"
            }`}
          >
            <span className={`block text-[11px] font-semibold tracking-wide uppercase ${
              metric === item.id ? "text-white/80" : "text-slate-400"
            }`}>
              {item.label}
            </span>
            <span className="mt-1 block text-sm font-semibold">{values[item.id]}</span>
            {!item.ready ? (
              <span className={`mt-1 block text-[10px] ${metric === item.id ? "text-white/70" : "text-slate-400"}`}>
                Analitik yok
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" role="img" aria-label="Dönem grafiği">
          <polyline
            fill="none"
            stroke="#0ab39c"
            strokeWidth="2.5"
            points={points.join(" ")}
          />
          {series.map((value, index) => {
            const x = series.length <= 1 ? width / 2 : (index / (series.length - 1)) * width;
            const y = height - (value / max) * (height - 16) - 8;
            return <circle key={`${chart[index]?.fullLabel}-${index}`} cx={x} cy={y} r="3" fill="#0ab39c" />;
          })}
        </svg>
        <div className="mt-2 flex justify-between text-[10px] text-slate-400">
          <span>{chart[0]?.label}</span>
          <span>{chart[chart.length - 1]?.label}</span>
        </div>
        {(metric === "sales" || metric === "cart") && metrics.salesMinor === 0 ? (
          <p className="mt-2 text-center text-xs text-slate-400">
            Seçilen dönemde tahsil edilen satış yok. Değerler vergi hariç gösterilir.
          </p>
        ) : null}
        {metric === "sales" || metric === "cart" ? (
          <p className="sr-only">{formatMinorTry(metrics.salesMinor)}</p>
        ) : null}
      </div>
    </section>
  );
}
