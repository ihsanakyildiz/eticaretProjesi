import type { Metadata } from "next";
import Link from "next/link";
import { OrderAddressKind } from "@prisma/client";
import { BarChart3, Plus, ShoppingBag, ShoppingCart, UserRound, Wallet, type LucideIcon } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { prisma } from "@/lib/prisma";
import { splitFullName } from "@/lib/customers";
import { orderLineDiscount, readStoredCompareAt } from "@/lib/order-discount";
import { parseOrderPaymentMethod, parseOrderStatus } from "@/lib/orders";
import { OrdersSubnav } from "./orders-subnav";
import { OrdersTable } from "./orders-table";

export const metadata: Metadata = {
  title: "Siparişler",
  description: "Mağaza siparişlerini yönetin",
};

export default async function OrdersPage() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [orders, recentOrders] = await Promise.all([
    prisma.order.findMany({
      orderBy: { orderNo: "desc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
            createdAt: true,
            _count: { select: { orders: true } },
          },
        },
        items: true,
        addresses: true,
      },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { totalMinor: true },
    }),
  ]);

  const rows = orders.map((order) => {
    const fromName = splitFullName(order.user.name);
    const firstName = order.user.firstName?.trim() || fromName.firstName;
    const lastName = order.user.lastName?.trim() || fromName.lastName;
    const shipping = order.addresses.find((address) => address.kind === OrderAddressKind.SHIPPING);
    return {
      id: order.id,
      orderNo: order.orderNo,
      reference: order.reference,
      isNewClient: order.user._count.orders <= 1,
      deliveryCountry: shipping?.country ?? "—",
      customerName: [firstName, lastName].filter(Boolean).join(" ") || order.user.email,
      customerEmail: order.user.email,
      totalMinor: order.totalMinor,
      paymentMethod: parseOrderPaymentMethod(order.paymentMethod),
      status: parseOrderStatus(order.status),
      createdAt: order.createdAt.toISOString(),
      carrierName: order.carrierName,
      trackingNumber: order.trackingNumber,
      shippingLines: shipping
        ? [
            `${shipping.firstName} ${shipping.lastName}`.trim(),
            shipping.isCorporateInvoice ? shipping.company : null,
            shipping.line1,
            [shipping.neighborhood, shipping.district, shipping.city].filter(Boolean).join(" / "),
            [shipping.postalCode, shipping.country].filter(Boolean).join(" "),
            shipping.phone,
          ].filter((line): line is string => Boolean(line))
        : [],
      billingLines: (() => {
        const billing = order.addresses.find((address) => address.kind === OrderAddressKind.BILLING);
        if (!billing) return [];
        return [
          `${billing.firstName} ${billing.lastName}`.trim(),
          billing.isCorporateInvoice ? billing.company : null,
          billing.line1,
          [billing.neighborhood, billing.district, billing.city].filter(Boolean).join(" / "),
          [billing.postalCode, billing.country].filter(Boolean).join(" "),
        ].filter((line): line is string => Boolean(line));
      })(),
      items: order.items.map((item) => {
        const discount = orderLineDiscount({
          unitPriceMinor: item.unitPriceMinor,
          quantity: item.quantity,
          totalMinor: item.totalMinor,
          compareAtMinor: readStoredCompareAt(item),
        });
        return {
          title: item.variantTitle ? `${item.title} ${item.variantTitle}` : item.title,
          sku: item.sku,
          quantity: item.quantity,
          totalMinor: item.totalMinor,
          discountMinor: discount.savingsMinor,
          discountPercent: discount.percent,
        };
      }),
    };
  });

  const averageMinor =
    recentOrders.length === 0
      ? 0
      : Math.round(recentOrders.reduce((sum, order) => sum + order.totalMinor, 0) / recentOrders.length);

  return (
    <div className="space-y-6">
      <OrdersSubnav />
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <ShoppingBag className="h-6 w-6 text-[#405189]" />
              Siparişler
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Müşteri siparişlerini durum, ödeme ve teslimat bilgileriyle yönetin.
            </p>
          </div>
          <Can resource="orders" action="create">
            <Link
              href="/admin/orders/new"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
            >
              <Plus className="h-4 w-4" />
              Yeni sipariş ekle
            </Link>
          </Can>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={BarChart3}
            title="Dönüşüm oranı"
            value="—"
            hint="30 gün · vitrin ölçümü henüz yok"
          />
          <StatCard
            icon={ShoppingCart}
            title="Vazgeçilen sepetler"
            value="0"
            hint="Sepet sistemi bağlanınca dolacak"
          />
          <StatCard
            icon={Wallet}
            title="Ortalama sipariş tutarı"
            value={new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
              averageMinor / 100,
            )}
            hint="Son 30 gün"
          />
          <StatCard
            icon={UserRound}
            title="Ziyaret başına net kâr"
            value="—"
            hint="30 gün · analitik henüz yok"
          />
        </div>
      </div>

      <OrdersTable orders={rows} />
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-[#e9ebec] bg-[#f8f9fa] px-4 py-3">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[#405189] shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{title}</p>
        <p className="mt-1 text-xl font-semibold text-slate-800">{value}</p>
        <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
      </div>
    </div>
  );
}
