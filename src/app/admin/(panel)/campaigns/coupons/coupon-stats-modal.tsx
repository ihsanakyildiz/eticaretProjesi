"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  Loader2,
  ShoppingBag,
  ShoppingCart,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { formatMinorTry } from "@/lib/product-money";
import type { DiscountCouponStatsDetail } from "@/lib/discount-coupon-stats";
import { loadCouponStatsAction } from "./actions";

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

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[#e9ebec] bg-slate-50/80 px-3 py-3">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-base font-semibold text-slate-800">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function CouponStatsButton({
  couponId,
  code,
  usageCount,
}: {
  couponId: string;
  code: string;
  usageCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DiscountCouponStatsDetail | null>(null);
  const [customerFilter, setCustomerFilter] = useState("all");

  useEscapeClose(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadCouponStatsAction(couponId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if ("error" in result && result.error) {
        setError(result.error);
        setStats(null);
        return;
      }
      if ("stats" in result && result.stats) {
        setStats(result.stats);
        setCustomerFilter("all");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [couponId, open]);

  const filteredOrders = useMemo(() => {
    if (!stats) return [];
    if (customerFilter === "all") return stats.orders;
    return stats.orders.filter((order) => order.customerId === customerFilter);
  }, [customerFilter, stats]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
        title="Kullanım istatistikleri"
      >
        <BarChart3 className="h-3.5 w-3.5 opacity-70" />
        {usageCount.toLocaleString("tr-TR")} kullanım
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Kapat"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[#e9ebec] bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#e9ebec] px-5 py-4">
              <div>
                <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                  Hediye çeki istatistikleri
                </p>
                <h2 className="mt-1 font-mono text-lg font-semibold text-slate-800">{code}</h2>
                {stats?.name ? <p className="text-sm text-slate-500">{stats.name}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Yükleniyor…
                </div>
              ) : error ? (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              ) : stats ? (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <StatCard
                      icon={<ShoppingBag className="h-3.5 w-3.5" />}
                      label="Kullanım / sipariş"
                      value={`${stats.usageCount.toLocaleString("tr-TR")} kez`}
                      hint={`${stats.orderCount.toLocaleString("tr-TR")} sipariş kaydı`}
                    />
                    <StatCard
                      icon={<Wallet className="h-3.5 w-3.5" />}
                      label="Sipariş cirosu"
                      value={formatMinorTry(stats.orderTotalMinor)}
                      hint="Kodlu siparişlerin toplam tutarı"
                    />
                    <StatCard
                      icon={<BarChart3 className="h-3.5 w-3.5" />}
                      label="Ürün sepet tutarı"
                      value={formatMinorTry(stats.productsTotalMinor)}
                      hint="İndirim öncesi ürün toplamı"
                    />
                    <StatCard
                      icon={<Wallet className="h-3.5 w-3.5 text-emerald-600" />}
                      label="Toplam kupon indirimi"
                      value={formatMinorTry(stats.couponDiscountTotalMinor)}
                      hint="Kullanılan hediye çeki tutarı"
                    />
                    <StatCard
                      icon={<ShoppingCart className="h-3.5 w-3.5" />}
                      label="Bekleyen sepet"
                      value={`${stats.pendingCartSessions.toLocaleString("tr-TR")} adet`}
                      hint={`Son 48 saatte · ${formatMinorTry(stats.pendingCartProductsMinor)}`}
                    />
                    <StatCard
                      icon={<Users className="h-3.5 w-3.5" />}
                      label="Müşteri"
                      value={stats.customers.length.toLocaleString("tr-TR")}
                      hint="Kodu kullanan farklı hesap"
                    />
                  </div>

                  <section className="rounded-lg border border-[#e9ebec]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9ebec] px-4 py-3">
                      <h3 className="text-sm font-semibold text-slate-800">Siparişler</h3>
                      <label className="flex items-center gap-2 text-xs text-slate-500">
                        Müşteri
                        <select
                          value={customerFilter}
                          onChange={(event) => setCustomerFilter(event.target.value)}
                          className="rounded-md border border-[#e9ebec] bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-[#0ab39c]"
                        >
                          <option value="all">Tümü ({stats.orders.length})</option>
                          {stats.customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.label} · {customer.orderCount}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {filteredOrders.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-slate-400">
                        Bu filtrede sipariş yok.
                      </p>
                    ) : (
                      <div className="max-h-72 overflow-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                            <tr>
                              <th className="px-4 py-2">Sipariş</th>
                              <th className="px-4 py-2">Müşteri</th>
                              <th className="px-4 py-2">Ürün</th>
                              <th className="px-4 py-2">İndirim</th>
                              <th className="px-4 py-2">Toplam</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e9ebec]">
                            {filteredOrders.map((order) => (
                              <tr key={order.id} className="hover:bg-slate-50/80">
                                <td className="px-4 py-2">
                                  <Link
                                    href={`/admin/orders/${order.id}`}
                                    className="font-medium text-[#405189] hover:underline"
                                  >
                                    #{order.orderNo}
                                  </Link>
                                  <p className="text-xs text-slate-400">{order.reference}</p>
                                </td>
                                <td className="px-4 py-2 text-slate-600">{order.customerName}</td>
                                <td className="px-4 py-2 text-slate-600">
                                  {formatMinorTry(order.productsMinor)}
                                </td>
                                <td className="px-4 py-2 text-emerald-700">
                                  −{formatMinorTry(order.couponDiscountMinor)}
                                </td>
                                <td className="px-4 py-2 font-medium text-slate-800">
                                  {formatMinorTry(order.totalMinor)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  {stats.customers.length > 0 ? (
                    <section className="rounded-lg border border-[#e9ebec]">
                      <div className="border-b border-[#e9ebec] px-4 py-3">
                        <h3 className="text-sm font-semibold text-slate-800">Kullanan müşteriler</h3>
                      </div>
                      <ul className="divide-y divide-[#e9ebec]">
                        {stats.customers.map((customer) => (
                          <li
                            key={customer.id}
                            className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm"
                          >
                            <div className="min-w-0">
                              <Link
                                href={`/admin/members/${customer.id}`}
                                className="font-medium text-[#405189] hover:underline"
                              >
                                {customer.label}
                              </Link>
                              <p className="text-xs text-slate-400">{customer.email}</p>
                            </div>
                            <div className="text-right text-xs text-slate-500">
                              <p>{customer.orderCount} sipariş</p>
                              <p className="font-medium text-slate-700">
                                {formatMinorTry(customer.orderTotalMinor)}
                              </p>
                              <p className="text-emerald-700">
                                −{formatMinorTry(customer.couponDiscountMinor)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
