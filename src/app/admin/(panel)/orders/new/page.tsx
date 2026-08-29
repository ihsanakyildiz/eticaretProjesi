import type { Metadata } from "next";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { splitFullName } from "@/lib/customers";
import { formatMinorTry, taxIncludedMinor } from "@/lib/product-money";
import { OrderCreateForm } from "./order-create-form";

export const metadata: Metadata = {
  title: "Yeni sipariş",
};

export default async function NewOrderPage() {
  const [customers, variants] = await Promise.all([
    prisma.user.findMany({
      where: { role: Role.MEMBER, isActive: true },
      orderBy: { customerNo: "desc" },
      include: { addresses: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.productVariant.findMany({
      where: { isActive: true, product: { isActive: true } },
      orderBy: [{ product: { title: "asc" } }, { sortOrder: "asc" }],
      include: {
        product: { select: { title: true, taxRatePercent: true, image: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Yeni sipariş</h1>
        <p className="mt-2 text-sm text-slate-500">
          Müşteri, adres ve ürün seçerek panelden sipariş oluşturun.
        </p>
      </div>
      <OrderCreateForm
        customers={customers.map((customer) => {
          const fromName = splitFullName(customer.name);
          const firstName = customer.firstName?.trim() || fromName.firstName;
          const lastName = customer.lastName?.trim() || fromName.lastName;
          return {
            id: customer.id,
            label: `${[firstName, lastName].filter(Boolean).join(" ") || customer.email} · ${customer.email}`,
            addresses: customer.addresses.map((address) => ({
              id: address.id,
              label: [
                address.alias,
                `${address.firstName} ${address.lastName}`.trim(),
                address.city,
                address.isInvoice ? "Fatura" : null,
                address.isDelivery ? "Teslimat" : null,
              ]
                .filter(Boolean)
                .join(" · "),
              isDelivery: address.isDelivery,
              isInvoice: address.isInvoice,
              isDefaultDelivery: address.isDefaultDelivery,
              isDefaultInvoice: address.isDefaultInvoice,
            })),
          };
        })}
        variants={variants.map((variant) => ({
          id: variant.id,
          label: `${variant.product.title}${variant.isDefault ? "" : ` · ${variant.title}`} · ${formatMinorTry(
            taxIncludedMinor(variant.priceMinor, variant.product.taxRatePercent),
          )}`,
          stock: variant.stockQuantity,
        }))}
      />
    </div>
  );
}
