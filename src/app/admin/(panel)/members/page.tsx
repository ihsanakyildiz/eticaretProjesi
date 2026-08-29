import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Role } from "@prisma/client";
import { Can } from "@/components/admin/admin-permissions";
import { prisma } from "@/lib/prisma";
import { parseCustomerGroup, parseCustomerTitle, splitFullName } from "@/lib/customers";
import { CustomersTable } from "./customers-table";

export const metadata: Metadata = {
  title: "Müşteriler",
  description: "Mağaza müşteri hesaplarını yönetin",
};

export default async function CustomersPage() {
  const customers = await prisma.user.findMany({
    where: { role: Role.MEMBER },
    orderBy: { customerNo: "desc" },
    include: {
      _count: { select: { addresses: true } },
    },
  });

  const rows = customers.map((customer) => {
    const fromName = splitFullName(customer.name);
    return {
      id: customer.id,
      customerNo: customer.customerNo,
      title: parseCustomerTitle(customer.title),
      firstName: customer.firstName?.trim() || fromName.firstName,
      lastName: customer.lastName?.trim() || fromName.lastName,
      email: customer.email,
      customerGroup: parseCustomerGroup(customer.customerGroup),
      addressCount: customer._count.addresses,
      isActive: customer.isActive,
      newsletter: customer.newsletter,
      partnerOffers: customer.partnerOffers,
      createdAt: customer.createdAt.toISOString(),
      lastLoginAt: customer.lastLoginAt?.toISOString() ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Mağaza</p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <Users className="h-6 w-6 text-[#405189]" />
              Müşteriler ({rows.length})
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Her müşterinin birden fazla teslimat ve fatura adresi olabilir. Liste sütun
              filtreleri ve anahtarlarla hesap durumunu yönetin.
            </p>
          </div>
          <Can resource="customers" action="create">
            <Link
              href="/admin/members/new"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
            >
              <Plus className="h-4 w-4" />
              Yeni Müşteri
            </Link>
          </Can>
        </div>
      </div>

      <CustomersTable customers={rows} />
    </div>
  );
}
