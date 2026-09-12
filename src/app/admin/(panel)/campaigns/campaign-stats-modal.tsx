"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BarChart3, List, Loader2, ShoppingBag, ShoppingCart, Wallet, X } from "lucide-react";
import { formatMinorTry } from "@/lib/product-money";
import type {
  CampaignStatsCartProduct,
  CampaignStatsDetail,
  CampaignStatsSummary,
} from "@/lib/campaign-stats-types";
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
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-emerald-700">
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

function formatChartValue(value: number, valueKey: "revenueMinor" | "units") {
  switch (valueKey) {
    case "revenueMinor":
      return formatMinorTry(Math.round(value * 100));
    case "units":
      return `${value.toLocaleString("tr-TR")} adet`;
    default: {
      const _exhaustive: never = valueKey;
      return _exhaustive;
    }
  }
}

function formatWindow(startsAt: string | null, endsAt: string | null) {
  const format = (iso: string) =>
    new Date(iso).toLocaleString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  if (!startsAt && !endsAt) return null;
  if (startsAt && endsAt) return `${format(startsAt)} – ${format(endsAt)}`;
  if (startsAt) return `${format(startsAt)} – süresiz`;
  return `Bitiş ${format(endsAt!)}`;
}

function formatRelative(iso: string | null) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "";
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.round(hours / 24);
  return `${days} gün önce`;
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
    const y = height - (value / max) * (height - 28) - 14;
    return { x, y, value, label: points[index]?.label ?? "" };
  });
  const polyline = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `0,${height} ${polyline} ${width},${height}`;

  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Bu dönemde satış yok.</p>;
  }

  if (points.length === 1) {
    const point = points[0];
    const value = series[0] ?? 0;
    return (
      <div className="flex h-40 flex-col items-center justify-end">
        <p className="mb-2 text-sm font-semibold text-slate-800">{formatChartValue(value, valueKey)}</p>
        <div
          className="w-16 rounded-t-md bg-[#0ab39c]"
          style={{ height: `${Math.max(18, Math.round((value / max) * 96))}px` }}
        />
        <p className="mt-2 text-xs text-slate-400">{point?.fullLabel ?? point?.label}</p>
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${width} ${height + 24}`} className="h-44 w-full" role="img">
      <polygon fill="#0ab39c" fillOpacity="0.12" points={area} />
      <polyline fill="none" stroke="#0ab39c" strokeWidth="2.5" points={polyline} />
      {coords.map((point, index) => (
        <g key={`${point.x}-${index}`}>
          <circle cx={point.x} cy={point.y} r="3.5" fill="#405189">
            <title>
              {point.label}: {formatChartValue(point.value, valueKey)}
            </title>
          </circle>
        </g>
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
    <div className="space-y-3">
      {products.map((product) => {
        const width = Math.max(6, Math.round((product.revenueMinor / max) * 100));
        return (
          <div key={product.id}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-[#f3f6f9]">
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[9px] font-semibold text-[#405189]">
                      {product.title.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </span>
                <Link
                  href={`/admin/products/${product.id}/edit`}
                  className="truncate font-medium text-[#405189] hover:underline"
                >
                  {product.title}
                </Link>
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
              style={{ width: `${(part.value / total) * 100}%` }}
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
  action,
}: {
  label: string;
  value: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#e9ebec] bg-[#f8f9fa] px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold text-slate-400">{label}</p>
        {action}
      </div>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function CartProductsModal({
  products,
  units,
  sessions,
  valueMinor,
  onClose,
}: {
  products: CampaignStatsCartProduct[];
  units: number;
  sessions: number;
  valueMinor: number;
  onClose: () => void;
}) {
  useEscapeClose(true, onClose);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        lang="tr"
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e9ebec] px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-slate-400">Sepette bekleyen ürünler</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-800">
              {units.toLocaleString("tr-TR")} ürün · {formatMinorTry(valueMinor)}
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {sessions.toLocaleString("tr-TR")} sepet, son 48 saat
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#e9ebec] p-1.5 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto">
          {products.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">
              Bu kampanya ürünü son 48 saatte hiç sepete eklenmemiş.
            </p>
          ) : (
            <ul className="divide-y divide-[#e9ebec]">
              {products.map((product) => (
                <li
                  key={`${product.id}:${product.variantId ?? "default"}`}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f3f6f9]">
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-semibold text-[#405189]">
                        {product.title.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="truncate font-medium text-[#405189] hover:underline"
                    >
                      {product.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {product.variantTitle ? `${product.variantTitle} · ` : ""}
                      {product.sessions.toLocaleString("tr-TR")} sepet
                      {product.lastUpdatedAt ? ` · ${formatRelative(product.lastUpdatedAt)}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-800">
                      {product.quantity.toLocaleString("tr-TR")} adet
                    </p>
                    <p className="text-xs text-slate-500">{formatMinorTry(product.valueMinor)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
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
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CampaignStatsDetail | null>(null);
  const [chart, setChart] = useState<"revenue" | "units">("revenue");

  useEscapeClose(open && !cartOpen && !loading, () => setOpen(false));

  useEffect(() => {
    if (!open) {
      setCartOpen(false);
      return;
    }
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

  const windowLabel = stats ? formatWindow(stats.startsAt, stats.endsAt) : null;

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
            onClick={() => {
              if (cartOpen) return;
              setOpen(false);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            lang="tr"
            className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#e9ebec] px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-slate-400">Kampanya analizi</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-800">{name}</h2>
                {stats ? (
                  <p className="mt-0.5 text-sm text-slate-500">
                    {stats.offerLabel}
                    {windowLabel ? ` · ${windowLabel}` : ""}
                  </p>
                ) : null}
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
                      action={
                        <button
                          type="button"
                          onClick={() => setCartOpen(true)}
                          className="inline-flex items-center gap-1 rounded-md border border-[#405189]/20 bg-white px-2 py-1 text-[11px] font-semibold text-[#405189] hover:bg-[#405189]/5"
                        >
                          <List className="h-3 w-3" />
                          Ürünler
                        </button>
                      }
                    />
                    <Kpi
                      label="Ödeme bekleyen"
                      value={stats.pendingUnits.toLocaleString("tr-TR")}
                      hint={`${stats.pendingOrderCount} sipariş · ${formatMinorTry(stats.pendingMinor)}`}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Kpi label="Verilen indirim" value={formatMinorTry(stats.discountMinor)} />
                    <Kpi label="Ortalama sipariş" value={formatMinorTry(stats.averageOrderMinor)} />
                    <Kpi
                      label="Dönüşüm"
                      value={`%${conversion}`}
                      hint="Satılan / (satış + sepet + bekleyen)"
                    />
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

      {open && cartOpen && stats ? (
        <CartProductsModal
          products={stats.cartProducts ?? []}
          units={stats.cartUnits}
          sessions={stats.cartSessions}
          valueMinor={stats.cartValueMinor}
          onClose={() => setCartOpen(false)}
        />
      ) : null}
    </>
  );
}
