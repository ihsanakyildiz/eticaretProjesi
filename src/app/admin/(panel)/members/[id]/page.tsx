import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emptyAddressDraft, parseCustomerGroup, parseCustomerTitle, splitFullName } from "@/lib/customers";
import { CustomerForm } from "../customer-form";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const customer = await prisma.user.findUnique({
    where: { id },
    select: { firstName: true, lastName: true, name: true, email: true, role: true },
  });
  if (!customer || customer.role !== Role.MEMBER) return { title: "Müşteri" };
  const label =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.name || customer.email;
  return { title: `Müşteri: ${label}` };
}

export default async function CustomerEditPage({ params }: Props) {
  const { id } = await params;
  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      accounts: { select: { provider: true } },
      addresses: { orderBy: { sortOrder: "asc" } },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        include: { pricingPlan: { select: { name: true } } },
      },
    },
  });

  if (!customer || customer.role !== Role.MEMBER) notFound();

  const fromName = splitFullName(customer.name);
  const displayName =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.name || customer.email;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">{displayName}</h1>
        <p className="mt-2 text-sm text-slate-500">
          #{customer.customerNo} · {customer.email}
          {customer.accounts.length
            ? ` · ${customer.accounts.map((account) => account.provider).join(", ")} ile bağlı`
            : " · E-posta hesabı"}
        </p>
      </div>

      <CustomerForm
        mode="edit"
        initial={{
          id: customer.id,
          customerNo: customer.customerNo,
          firstName: customer.firstName?.trim() || fromName.firstName,
          lastName: customer.lastName?.trim() || fromName.lastName,
          title: parseCustomerTitle(customer.title),
          customerGroup: parseCustomerGroup(customer.customerGroup),
          email: customer.email,
          phone: customer.phone ?? "",
          notes: customer.notes ?? "",
          isActive: customer.isActive,
          newsletter: customer.newsletter,
          partnerOffers: customer.partnerOffers,
          addresses: customer.addresses.map((address) =>
            emptyAddressDraft({
              id: address.id,
              alias: address.alias,
              firstName: address.firstName,
              lastName: address.lastName,
              company: address.company ?? "",
              taxOffice: address.taxOffice ?? "",
              taxNumber: address.taxNumber ?? "",
              phone: address.phone ?? "",
              line1: address.line1,
              line2: address.line2 ?? "",
              district: address.district ?? "",
              city: address.city,
              neighborhood: address.neighborhood ?? "",
              postalCode: address.postalCode ?? "",
              country: address.country,
              isDelivery: address.isDelivery,
              isInvoice: address.isInvoice,
              isDefaultDelivery: address.isDefaultDelivery,
              isDefaultInvoice: address.isDefaultInvoice,
              isCorporateInvoice:
                address.isCorporateInvoice ||
                Boolean(address.company || address.taxOffice || address.taxNumber),
            }),
          ),
        }}
      />

      <section className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">Abonelikler</h2>
        {customer.subscriptions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Abonelik kaydı yok.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#e9ebec]">
            {customer.subscriptions.map((sub) => (
              <li
                key={sub.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-800">{sub.pricingPlan.name}</p>
                  <p className="text-xs text-slate-500">
                    {sub.status} · {sub.billingInterval}
                    {sub.stripeSubscriptionId ? ` · ${sub.stripeSubscriptionId}` : ""}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  {sub.currentPeriodEnd
                    ? `Dönem sonu: ${new Intl.DateTimeFormat("tr-TR").format(sub.currentPeriodEnd)}`
                    : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
