"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Search, ShoppingBag, Trophy } from "lucide-react";
import { formatOrderDate, orderStatusBadgeClass, orderStatusLabel } from "@/lib/orders";
import { formatMinorTry } from "@/lib/product-money";
import type { DashboardRecentOrder, DashboardTopProduct } from "@/lib/dashboard";

const TABS = ["orders", "sellers", "viewed", "searches"] as const;
type TabId = (typeof TABS)[number];

export function DashboardSales({
  orders,
  topProducts,
}: {
  orders: DashboardRecentOrder[];
  topProducts: DashboardTopProduct[];
}) {
  const [tab, setTab] = useState<TabId>("orders");

  return (
    <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#e9ebec] px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-[#405189]" />
          <h2 className="text-sm font-semibold text-slate-800">Ürünler ve satışlar</h2>
        </div>
        <Link href="/admin/orders" className="text-xs font-medium text-[#405189] hover:underline">
          Tüm siparişler
        </Link>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-[#e9ebec] px-3 py-2">
        <TabButton active={tab === "orders"} onClick={() => setTab("orders")} icon={ShoppingBag} label="Son siparişler" />
        <TabButton active={tab === "sellers"} onClick={() => setTab("sellers")} icon={Trophy} label="En çok satanlar" />
        <TabButton active={tab === "viewed"} onClick={() => setTab("viewed")} icon={Eye} label="En çok görüntülenen" />
        <TabButton active={tab === "searches"} onClick={() => setTab("searches")} icon={Search} label="En sık aramalar" />
      </div>

      {tab === "orders" ? <OrdersTable orders={orders} /> : null}
      {tab === "sellers" ? <SellersTable products={topProducts} /> : null}
      {tab === "viewed" ? (
        <EmptyNote text="Ürün görüntülenme ölçümü vitrin analitiği bağlanınca dolacak." />
      ) : null}
      {tab === "searches" ? (
        <EmptyNote text="Arama kayıtları henüz toplanmıyor." />
      ) : null}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof ShoppingBag;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
        active ? "bg-[#405189] text-white" : "text-slate-600 hover:bg-[#f3f6f9]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function OrdersTable({ orders }: { orders: DashboardRecentOrder[] }) {
  if (orders.length === 0) {
    return <EmptyNote text="Henüz sipariş yok." />;
  }

  return (
    <div className="overflow-x-auto">
      <p className="px-4 pt-3 text-xs font-medium text-slate-400">Son 10 sipariş</p>
      <table className="mt-1 w-full min-w-[720px] text-left text-sm">
        <thead className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-2">Müşteri</th>
            <th className="px-4 py-2">Ürünler</th>
            <th className="px-4 py-2">Toplam vergi hariç</th>
            <th className="px-4 py-2">Tarih</th>
            <th className="px-4 py-2">Durum</th>
            <th className="px-4 py-2 text-right"> </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-[#e9ebec]">
              <td className="px-4 py-2.5 font-medium text-slate-800">{order.customerName}</td>
              <td className="px-4 py-2.5 text-slate-600">{order.itemCount}</td>
              <td className="px-4 py-2.5 text-slate-800">{formatMinorTry(order.productsMinor)}</td>
              <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">
                {formatOrderDate(order.createdAt)}
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${orderStatusBadgeClass(order.status)}`}
                >
                  {orderStatusLabel(order.status)}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e9ebec] text-slate-500 hover:text-[#405189]"
                  title="Detay"
                >
                  <Search className="h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SellersTable({ products }: { products: DashboardTopProduct[] }) {
  if (products.length === 0) {
    return <EmptyNote text="Seçilen dönemde satış yok." />;
  }

  return (
    <div className="overflow-x-auto">
      <p className="px-4 pt-3 text-xs font-medium text-slate-400">En çok satan 10 ürün</p>
      <table className="mt-1 w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-2">Ürün</th>
            <th className="px-4 py-2">Adet</th>
            <th className="px-4 py-2 text-right">Ciro</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t border-[#e9ebec]">
              <td className="px-4 py-2.5">
                <Link href={`/admin/products/${product.id}/edit`} className="font-medium text-slate-800 hover:text-[#405189]">
                  {product.title}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-slate-600">{product.quantity}</td>
              <td className="px-4 py-2.5 text-right font-medium text-slate-800">
                {formatMinorTry(product.totalMinor)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="px-4 py-12 text-center text-sm text-slate-500">{text}</p>;
}
