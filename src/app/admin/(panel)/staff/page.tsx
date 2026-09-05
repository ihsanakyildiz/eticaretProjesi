import type { Metadata } from "next";
import Link from "next/link";
import { Plus, UserRoundCog } from "lucide-react";
import { Role } from "@prisma/client";
import { Can } from "@/components/admin/admin-permissions";
import { prisma } from "@/lib/prisma";
import { listSupportChatStaffDepartmentNamesByUser } from "@/modules/support-chat/db";
import { StaffTable } from "./staff-table";

export const metadata: Metadata = {
  title: "Personel",
};

export default async function StaffPage() {
  const staff = await prisma.user.findMany({
    where: { role: Role.STAFF },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      name: true,
      email: true,
      isActive: true,
      lastLoginAt: true,
    },
  });
  const departmentsByUser = await listSupportChatStaffDepartmentNamesByUser(staff.map((row) => row.id));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Sistem</p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <UserRoundCog className="h-6 w-6 text-[#405189]" />
              Personel ({staff.length})
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Çalışan hesaplarına sohbet sayfası / sohbet ayarları yetkisi ve departman ataması verin.
            </p>
          </div>
          <Can resource="staff" action="create">
            <Link
              href="/admin/staff/new"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#099885]"
            >
              <Plus className="h-4 w-4" />
              Yeni personel
            </Link>
          </Can>
        </div>
      </div>
      <StaffTable
        staff={staff.map((row) => ({
          id: row.id,
          name: [row.firstName, row.lastName].filter(Boolean).join(" ") || row.name || row.email,
          email: row.email,
          isActive: row.isActive,
          lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
          departments: departmentsByUser[row.id] ?? [],
        }))}
      />
    </div>
  );
}
