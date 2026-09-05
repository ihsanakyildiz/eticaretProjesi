import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { emptyPermissionMap } from "@/config/admin-permissions";
import { prisma } from "@/lib/prisma";
import {
  listSupportChatDepartments,
  listSupportChatStaffDepartmentIds,
} from "@/modules/support-chat/db";
import { StaffForm } from "../staff-form";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const staff = await prisma.user.findFirst({
    where: { id, role: Role.STAFF },
    select: { firstName: true, lastName: true, email: true },
  });
  return { title: staff ? `${staff.firstName ?? ""} ${staff.lastName ?? ""}`.trim() || staff.email : "Personel" };
}

export default async function EditStaffPage({ params }: Props) {
  const { id } = await params;
  const [staff, departments, departmentIds] = await Promise.all([
    prisma.user.findFirst({
      where: { id, role: Role.STAFF },
      include: { staffPermissions: true },
    }),
    listSupportChatDepartments(),
    listSupportChatStaffDepartmentIds(id),
  ]);
  if (!staff) notFound();

  const permissions = emptyPermissionMap();
  for (const row of staff.staffPermissions) {
    permissions[row.resource] = {
      view: row.canView,
      create: row.canCreate,
      update: row.canUpdate,
      delete: row.canDelete,
    };
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Sistem</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          {[staff.firstName, staff.lastName].filter(Boolean).join(" ") || staff.email}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Hesabı, sohbet departmanlarını ve sayfa yetkilerini güncelleyin.
        </p>
      </div>
      <StaffForm
        mode="edit"
        staff={{
          id: staff.id,
          firstName: staff.firstName ?? "",
          lastName: staff.lastName ?? "",
          email: staff.email,
          isActive: staff.isActive,
          permissions,
          departmentIds,
        }}
        departments={departments.map((item) => ({
          id: item.id,
          name: item.name,
          color: item.color,
        }))}
      />
    </div>
  );
}
