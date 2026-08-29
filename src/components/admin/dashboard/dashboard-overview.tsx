import Link from "next/link";
import { RefreshCw } from "lucide-react";

type Activity = {
  activeCarts: number;
  pendingOrders: number;
  returns: number;
  abandonedCarts: number;
  outOfStock: number;
  newMessages: number;
  reviews: number;
};

function Row({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-t border-[#e9ebec] px-4 py-2.5 text-sm hover:bg-[#f8f9fa]"
    >
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </Link>
  );
}

export function DashboardOverview({ activity }: { activity: Activity }) {
  return (
    <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#e9ebec] px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">Etkinliğe genel bakış</h2>
        <Link href="/admin" className="text-slate-400 hover:text-[#405189]" title="Yenile">
          <RefreshCw className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="px-4 py-3">
        <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
          Aktif alışveriş sepetleri
        </p>
        <p className="mt-2 text-2xl font-semibold text-slate-800">{activity.activeCarts}</p>
        <p className="mt-1 text-[11px] text-slate-400">Son 30 dakika · vitrin sepeti henüz bağlı değil</p>
      </div>

      <div className="px-4 pt-2 pb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
        Beklemede
      </div>
      <Row label="Siparişler" value={activity.pendingOrders} href="/admin/orders" />
      <Row label="İade / değişimler" value={activity.returns} href="/admin/orders" />
      <Row label="Vazgeçilen sepetler" value={activity.abandonedCarts} href="/admin/orders" />
      <Row label="Stokta olmayan ürünler" value={activity.outOfStock} href="/admin/products" />

      <div className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
        Bildirimler
      </div>
      <Row label="Yeni mesajlar" value={activity.newMessages} href="/admin/email" />
      <Row label="Ürün incelemeleri" value={activity.reviews} href="/admin/products" />
    </section>
  );
}
