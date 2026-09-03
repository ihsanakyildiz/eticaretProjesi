import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { splitFullName } from "@/lib/customers";
import { prisma } from "@/lib/prisma";
import { loadOrderPickLines } from "@/lib/warehouse-pick";
import { WarehousePickListPrint } from "./print-view";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: { orderNo: true },
  });
  return { title: order ? `Toplama #${order.orderNo}` : "Toplama listesi" };
}

export default async function WarehousePickListPage({ params }: Props) {
  const { id } = await params;
  const [order, lines] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      select: {
        orderNo: true,
        reference: true,
        user: { select: { firstName: true, lastName: true, name: true, email: true } },
      },
    }),
    loadOrderPickLines(id),
  ]);
  if (!order) notFound();
  const fromName = splitFullName(order.user.name);
  const customerName =
    [order.user.firstName?.trim() || fromName.firstName, order.user.lastName?.trim() || fromName.lastName]
      .filter(Boolean)
      .join(" ") || order.user.email;

  return (
    <WarehousePickListPrint
      orderNo={order.orderNo}
      reference={order.reference}
      customerName={customerName}
      lines={lines}
    />
  );
}
