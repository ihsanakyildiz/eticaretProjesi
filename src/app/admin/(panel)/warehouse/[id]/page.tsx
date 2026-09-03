import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderAddressKind, OrderStatus } from "@prisma/client";
import { ArrowLeft, Warehouse } from "lucide-react";
import { splitFullName } from "@/lib/customers";
import { isOpenOrderCaseStatus, parseOrderCaseStatus } from "@/lib/order-cases";
import { orderStatusLabel, parseOrderStatus } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";
import { isWarehouseReadyStatus, warehouseAddressLines } from "@/lib/warehouse";
import { loadOrderPickLines } from "@/lib/warehouse-pick";
import { WarehousePackStation, type WarehousePackModel } from "../pack-station";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: { orderNo: true, reference: true },
  });
  return { title: order ? `Depo #${order.orderNo}` : "Depo paketleme" };
}

export default async function WarehousePackPage({ params }: Props) {
  const { id } = await params;
  const [order, settings, carriers] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNo: true,
        reference: true,
        status: true,
        carrierName: true,
        trackingNumber: true,
        user: { select: { firstName: true, lastName: true, name: true, email: true } },
        addresses: true,
        cases: { select: { status: true } },
      },
    }),
    getSettingsMap(),
    prisma.shippingCarrier.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  if (!order) notFound();

  const status = parseOrderStatus(order.status);
  const fromName = splitFullName(order.user.name);
  const customerName =
    [order.user.firstName?.trim() || fromName.firstName, order.user.lastName?.trim() || fromName.lastName]
      .filter(Boolean)
      .join(" ") || order.user.email;
  const shipping = order.addresses.find((address) => address.kind === OrderAddressKind.SHIPPING);
  const addressLines = shipping ? warehouseAddressLines(shipping) : [];
  const blocked = order.cases.some((row) => isOpenOrderCaseStatus(parseOrderCaseStatus(row.status)));
  const shipped = order.status === OrderStatus.SHIPPED;
  const packable = isWarehouseReadyStatus(status) && !blocked;
  const lines = await loadOrderPickLines(order.id);

  const model: WarehousePackModel = {
    id: order.id,
    orderNo: order.orderNo,
    reference: order.reference,
    trackingNumber: order.trackingNumber ?? "",
    carrierName: order.carrierName ?? "",
    siteName: settings.site_name || "Mağaza",
    customerName,
    addressLines,
    carriers,
    shipped,
    lines,
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm print:hidden">
        <Link
          href={shipped ? "/admin/warehouse/shipped" : "/admin/warehouse"}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Depo listesine dön
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
          <Warehouse className="h-6 w-6 text-[#405189]" />
          Sipariş #{order.orderNo}
        </h1>
        <p className="mt-1 font-mono text-sm text-slate-500">{order.reference}</p>
        <p className="mt-2 text-sm text-slate-600">
          {customerName} · {orderStatusLabel(status)}
        </p>
      </div>

      {blocked ? (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 print:hidden"
        >
          Bu siparişte açık iptal veya iade talebi var. Paketleme durduruldu.
        </div>
      ) : null}

      {!packable && !shipped ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 print:hidden"
        >
          Bu sipariş depodan kargoya çıkarılamaz. Durum: {orderStatusLabel(status)}.
        </div>
      ) : (
        <WarehousePackStation order={model} />
      )}
    </div>
  );
}
