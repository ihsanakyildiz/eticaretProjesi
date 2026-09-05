import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Can } from "@/components/admin/admin-permissions";
import { prisma } from "@/lib/prisma";
import {
  customerEmailLabel,
  parseCustomerGroup,
  parseCustomerSource,
  parseCustomerTitle,
  splitFullName,
} from "@/lib/customers";
import { isSupportChatChannel } from "@/modules/support-chat/kinds";
import { CustomersTable } from "./customers-table";

export const metadata: Metadata = {
  title: "Müşteriler",
  description: "Mağaza müşteri hesaplarını yönetin",
};

export default async function CustomersPage() {
  const customers = await prisma.$queryRaw<
    Array<{
      id: string;
      customerNo: number;
      name: string | null;
      firstName: string | null;
      lastName: string | null;
      title: string;
      email: string;
      phone: string | null;
      customerGroup: string;
      customerSource: string | null;
      supportChannel: string | null;
      isActive: number | boolean;
      newsletter: number | boolean;
      partnerOffers: number | boolean;
      createdAt: Date;
      lastLoginAt: Date | null;
      addressCount: bigint | number;
      orderCount: bigint | number;
      chatCount: bigint | number;
    }>
  >`
    SELECT
      u.id,
      u.customerNo,
      u.name,
      u.firstName,
      u.lastName,
      u.title,
      u.email,
      u.phone,
      u.customerGroup,
      u.customerSource,
      u.supportChannel,
      u.isActive,
      u.newsletter,
      u.partnerOffers,
      u.createdAt,
      u.lastLoginAt,
      (SELECT COUNT(*) FROM customer_addresses a WHERE a.userId = u.id) AS addressCount,
      (SELECT COUNT(*) FROM orders o WHERE o.userId = u.id) AS orderCount,
      (SELECT COUNT(*) FROM support_chat_conversations c WHERE c.customerUserId = u.id) AS chatCount
    FROM users u
    WHERE u.role = 'MEMBER'
    ORDER BY u.customerNo DESC
  `;

  const rows = customers.map((customer) => {
    const fromName = splitFullName(customer.name);
    const supportChannel = customer.supportChannel;
    return {
      id: customer.id,
      customerNo: Number(customer.customerNo),
      title: parseCustomerTitle(customer.title),
      firstName: customer.firstName?.trim() || fromName.firstName,
      lastName: customer.lastName?.trim() || fromName.lastName,
      email: customerEmailLabel(customer.email),
      phone: customer.phone?.trim() ?? "",
      customerGroup: parseCustomerGroup(customer.customerGroup),
      customerSource: parseCustomerSource(customer.customerSource),
      supportChannel: supportChannel && isSupportChatChannel(supportChannel) ? supportChannel : null,
      addressCount: Number(customer.addressCount),
      orderCount: Number(customer.orderCount),
      chatCount: Number(customer.chatCount),
      isActive: Boolean(customer.isActive),
      newsletter: Boolean(customer.newsletter),
      partnerOffers: Boolean(customer.partnerOffers),
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
              Mağaza kayıtları, sipariş müşterileri ve destek sohbetinden oluşan profiller
              burada listelenir. Aynı telefon numarası varsa sohbet kişisi mevcut müşteriyle
              birleştirilir. Sütun filtreleriyle kaynağı ve kanalı ayırt edebilirsiniz.
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
