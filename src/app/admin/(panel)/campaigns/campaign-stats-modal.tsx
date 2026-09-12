"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, ShoppingBag, ShoppingCart, Wallet, X } from "lucide-react";
import { formatMinorTry } from "@/lib/product-money";
import type { CampaignStatsDetail, CampaignStatsSummary } from "@/lib/campaign-stats-types";
import { loadCampaignStatsAction } from "./actions";

function useEscapeClose(enabled: boolean, onClose: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onClose]);
}

function lineChartValue(point: CampaignStatsDetail["daily"][number], valueKey: "revenueMinor" | "units") {
  switch (valueKey) {
    case "revenueMinor":
      return point.revenueMinor / 100;
    case "units":
      return point.units;
    default: {
      const _exhaustive: never = valueKey;
      return _exhaustive;
    }
  }
}

function statsButtonClass(size: "sm" | "md") {
  switch (size) {
    case "md":
      return "inline-flex flex-col items-start rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-left text-emerald-800 hover:bg-emerald-100";
    case "sm":
      return "inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100";
    default: {
      const _exhaustive: never = size;
      return _exhaustive;
    }
  }
}

function statsButtonLabel(size: "sm" | "md", amount: string) {
  switch (size) {
    case "md":
      return (
        <>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-emerald-700 uppercase">
            <BarChart3 className="h-3 w-3" />
            Toplam satış
          </span>
          <span className="text-sm font-semibold">{amount}</span>
        </>
      );
    case "sm":
      return (
        <>
          <BarChart3 className="h-3.5 w-3.5 opacity-70" />
          {amount}
        </>
      );
    default: {
      const _exhaustive: never = size;
      return _exhaustive;
    }
  }
}

function dailyChartKey(chart: "revenue" | "units"): "revenueMinor" | "units" {
  switch (chart) {
    case "revenue":
      return "revenueMinor";
    case "units":
      return "units";
    default: {
      const _exhaustive: never = chart;
      return _exhaustive;
    }
  }
}

function LineChart({
  points,
  valueKey,
}: {
  points: CampaignStatsDetail["daily"];
  valueKey: "revenueMinor" | "units";
}) {
  const series = points.map((point) => lineChartValue(point, valueKey));
  const max = Math.max(...series, 1);
  const width = 640;
  const height = 160;
  const coords = series.map((value, index) => {
    const x = series.length <= 1 ? width / 2 : (index / (series.length - 1)) * width;
    const y = height - (value / max) * (height - 20) - 10;
    return { x, y, label: points[index]?.label ?? "" };
  });
  const polyline = coords.map((point) => `${point.x},${point.y}`).join(" ");

  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Bu dönemde satış yok.</p>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height + 24}`} className="h-44 w-full" role="img">
      <polyline fill="none" stroke="#0ab39c" strokeWidth="2.5" points={polyline} />
      {coords.map((point, index) => (
        <circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r="3.5" fill="#405189" />
      ))}
      {coords.map((point, index) =>
        index === 0 || index === coords.length - 1 || coords.length <= 8 ? (
          <text
            key={`l-${index}`}
            x={point.x}
            y={height + 18}
            textAnchor="middle"
            className="fill-slate-400"
            fontSize="10"
          >
            {point.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function BarChart({ products }: { products: CampaignStatsDetail["topProducts"] }) {
  const max = Math.max(...products.map((item) => item.revenueMinor), 1);
  if (products.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Satılan ürün yok.</p>;
  }
  return (
    <div className="space-y-2">
      {products.map((product) => {
        const width = Math.max(6, Math.round((product.revenueMinor / max) * 100));
        return (
          <div key={product.id}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded object-cover"
                  />
                ) : null}
                <span className="truncate font-medium text-slate-700">{product.title}</span>
              </span>
              <span className="shrink-0 text-slate-500">
                {product.quantity} adet · {formatMinorTry(product.revenueMinor)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#0ab39c]" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Funnel({ sold, pending, cart }: { sold: number; pending: number; cart: number }) {
  const total = Math.max(sold + pending + cart, 1);
  const parts = [
    { label: "Satıldı", value: sold, color: "bg-[#0ab39c]" },
    { label: "Ödeme bekliyor", value: pending, color: "bg-amber-400" },
    { label: "Sepette", value: cart, color: "bg-[#405189]" },
  ];
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
        {parts.map((part) =>
          part.value > 0 ? (
            <div
              key={part.label}
              className={part.color}
              style={{ width: `${Math.max(4, (part.value / total) * 100)}%` }}
              title={`${part.label}: ${part.value}`}
            />
          ) : null,
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        {parts.map((part) => (
          <span key={part.label} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${part.color}`} />
            {part.label}: {part.value.toLocaleString("tr-TR")}
          </span>
        ))}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[#e9ebec] bg-[#f8f9fa] px-3 py-3">
      <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function CampaignStatsButton({
  campaignId,
  name,
  summary,
  size = "sm",
}: {
  campaignId: string;
  name: string;
  summary?: CampaignStatsSummary;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CampaignStatsDetail | null>(null);
  const [chart, setChart] = useState<"revenue" | "units">("revenue");

  useEscapeClose(open && !loading, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadCampaignStatsAction(campaignId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("stats" in result && result.stats) setStats(result.stats);
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId, open]);

  const conversion = useMemo(() => {
    if (!stats) return 0;
    const pool = stats.unitsSold + stats.pendingUnits + stats.cartUnits;
    if (pool <= 0) return 0;
    return Math.round((stats.unitsSold / pool) * 100);
  }, [stats]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${name} satış istatistiği`}
        className={statsButtonClass(size)}
      >
        {statsButtonLabel(size, formatMinorTry(summary?.revenueMinor ?? 0))}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#e9ebec] px-5 py-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  Kampanya analizi
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-800">{name}</h2>
                {stats ? <p className="mt-0.5 text-sm text-slate-500">{stats.offerLabel}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-[#e9ebec] p-1.5 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  İstatistikler hesaplanıyor…
                </div>
              ) : error ? (
                <p className="py-10 text-center text-sm text-rose-600">{error}</p>
              ) : stats ? (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Kpi
                      label="Kazanç"
                      value={formatMinorTry(stats.revenueMinor)}
                      hint={`${stats.orderCount} sipariş`}
                    />
                    <Kpi
                      label="Satılan ürün"
                      value={stats.unitsSold.toLocaleString("tr-TR")}
                      hint={`${stats.uniqueProductsSold} farklı ürün`}
                    />
                    <Kpi
                      label="Sepette bekleyen"
                      value={stats.cartUnits.toLocaleString("tr-TR")}
                      hint={`${stats.cartSessions} sepet · ${formatMinorTry(stats.cartValueMinor)}`}
                    />
                    <Kpi
                      label="Ödeme bekleyen"
                      value={stats.pendingUnits.toLocaleString("tr-TR")}
                      hint={`${stats.pendingOrderCount} sipariş · ${formatMinorTry(stats.pendingMinor)}`}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Kpi
                      label="Verilen indirim"
                      value={formatMinorTry(stats.discountMinor)}
                    />
                    <Kpi
                      label="Ortalama sipariş"
                      value={formatMinorTry(stats.averageOrderMinor)}
                    />
                    <Kpi label="Dönüşüm" value={`%${conversion}`} hint="Satılan / (satış + sepet + bekleyen)" />
                  </div>

                  <section className="rounded-lg border border-[#e9ebec] p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <ShoppingBag className="h-4 w-4 text-[#405189]" />
                      Satış hunisi
                    </div>
                    <Funnel
                      sold={stats.unitsSold}
                      pending={stats.pendingUnits}
                      cart={stats.cartUnits}
                    />
                  </section>

                  <section className="rounded-lg border border-[#e9ebec] p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Wallet className="h-4 w-4 text-[#405189]" />
                        Günlük performans
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setChart("revenue")}
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                            chart === "revenue"
                              ? "bg-[#405189] text-white"
                              : "border border-[#e9ebec] text-slate-600"
                          }`}
                        >
                          Ciro
                        </button>
                        <button
                          type="button"
                          onClick={() => setChart("units")}
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                            chart === "units"
                              ? "bg-[#405189] text-white"
                              : "border border-[#e9ebec] text-slate-600"
                          }`}
                        >
                          Adet
                        </button>
                      </div>
                    </div>
                    <LineChart points={stats.daily} valueKey={dailyChartKey(chart)} />
                  </section>

                  <section className="rounded-lg border border-[#e9ebec] p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <ShoppingCart className="h-4 w-4 text-[#405189]" />
                      En çok kazandıran ürünler
                    </div>
                    <BarChart products={stats.topProducts} />
                  </section>

                  <p className="text-xs leading-relaxed text-slate-400">
                    Satışlar, kampanya ürünlerinin kampanya tarih aralığındaki ödenmiş
                    siparişlerinden hesaplanır. Ödeme bekleyen siparişler ve son 48 saatte
                    güncellenen canlı sepetler ayrı gösterilir.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
