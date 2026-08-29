import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderAddressKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "../print-button";
import { splitFullName } from "@/lib/customers";
import {
  formatOrderDateTime,
  formatOrderDocumentNumber,
  orderDocumentKindLabel,
  parseOrderDocumentKind,
} from "@/lib/orders";
import { formatMinorTry } from "@/lib/product-money";

type Props = { params: Promise<{ id: string; documentId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { documentId } = await params;
  const document = await prisma.orderDocument.findUnique({
    where: { id: documentId },
    select: { kind: true, number: true },
  });
  if (!document) return { title: "Belge" };
  const kind = parseOrderDocumentKind(document.kind);
  return { title: `${orderDocumentKindLabel(kind)} ${formatOrderDocumentNumber(kind, document.number)}` };
}

export default async function OrderDocumentPage({ params }: Props) {
  const { id, documentId } = await params;
  const document = await prisma.orderDocument.findFirst({
    where: { id: documentId, orderId: id },
    include: {
      order: {
        include: {
          user: { select: { name: true, firstName: true, lastName: true, email: true } },
          items: { orderBy: { createdAt: "asc" } },
          addresses: true,
        },
      },
    },
  });

  if (!document) notFound();

  const kind = parseOrderDocumentKind(document.kind);
  const order = document.order;
  const fromName = splitFullName(order.user.name);
  const customerName =
    [order.user.firstName?.trim() || fromName.firstName, order.user.lastName?.trim() || fromName.lastName]
      .filter(Boolean)
      .join(" ") || order.user.email;
  const billing = order.addresses.find((address) => address.kind === OrderAddressKind.BILLING);
  const shipping = order.addresses.find((address) => address.kind === OrderAddressKind.SHIPPING);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="text-sm font-medium text-[#405189] hover:underline">
          ← Siparişe dön
        </Link>
        <PrintButton />
      </div>

      <article className="rounded-lg border border-[#e9ebec] bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <header className="border-b border-[#e9ebec] pb-4">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            {orderDocumentKindLabel(kind)}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-800">
            {formatOrderDocumentNumber(kind, document.number)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sipariş #{order.orderNo} · {order.reference} · {formatOrderDateTime(document.createdAt.toISOString())}
          </p>
        </header>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <AddressBlock
            title="Fatura adresi"
            name={billing ? `${billing.firstName} ${billing.lastName}` : customerName}
            lines={
              billing
                ? [
                    billing.isCorporateInvoice ? billing.company : null,
                    billing.line1,
                    [billing.neighborhood, billing.district, billing.city].filter(Boolean).join(" / "),
                    [billing.postalCode, billing.country].filter(Boolean).join(" "),
                    billing.phone,
                  ].filter((line): line is string => Boolean(line))
                : [order.user.email]
            }
          />
          <AddressBlock
            title="Teslimat adresi"
            name={shipping ? `${shipping.firstName} ${shipping.lastName}` : customerName}
            lines={
              shipping
                ? [
                    shipping.line1,
                    [shipping.neighborhood, shipping.district, shipping.city].filter(Boolean).join(" / "),
                    [shipping.postalCode, shipping.country].filter(Boolean).join(" "),
                  ].filter((line): line is string => Boolean(line))
                : []
            }
          />
        </div>

        <table className="mt-6 w-full text-left text-sm">
          <thead className="text-xs text-slate-400 uppercase">
            <tr>
              <th className="py-2">Ürün</th>
              <th className="py-2">Adet</th>
              <th className="py-2 text-right">Birim</th>
              <th className="py-2 text-right">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-t border-[#e9ebec]">
                <td className="py-2">
                  <p className="font-medium text-slate-800">{item.title}</p>
                  {item.variantTitle ? <p className="text-xs text-slate-500">{item.variantTitle}</p> : null}
                  {item.sku ? <p className="text-xs text-slate-400">{item.sku}</p> : null}
                </td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2 text-right">{formatMinorTry(item.unitPriceMinor)}</td>
                <td className="py-2 text-right font-medium">{formatMinorTry(item.totalMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Ürünler</dt>
            <dd>{formatMinorTry(order.productsMinor)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Kargo</dt>
            <dd>{formatMinorTry(order.shippingMinor)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">KDV</dt>
            <dd>{formatMinorTry(order.taxMinor)}</dd>
          </div>
          <div className="flex justify-between border-t border-[#e9ebec] pt-2 font-semibold">
            <dt>Toplam</dt>
            <dd>{formatMinorTry(document.amountMinor)}</dd>
          </div>
        </dl>
      </article>
    </div>
  );
}

function AddressBlock({ title, name, lines }: { title: string; name: string; lines: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{title}</p>
      <p className="mt-1 font-medium text-slate-800">{name}</p>
      <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
