"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import {
  ADMIN_PERMISSION_RESOURCES,
  emptyPermissionMap,
  type StaffPermissionMap,
} from "@/config/admin-permissions";
import { nextCustomerNo } from "@/lib/customer-addresses";
import { joinFullName } from "@/lib/customers";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/staff-permissions";
import { replaceSupportChatStaffDepartments } from "@/modules/support-chat/db";

export type StaffFormState = {
  error?: string;
  success?: boolean;
  message?: string;
  redirectId?: string;
};

function parseDepartmentIds(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
  } catch {
    return [];
  }
}

function parsePermissionMap(raw: string): StaffPermissionMap {
  const map = emptyPermissionMap();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return map;
    const record = parsed as Record<string, unknown>;
    for (const resource of ADMIN_PERMISSION_RESOURCES) {
      const entry = record[resource.id];
      if (!entry || typeof entry !== "object") continue;
      const flags = entry as Record<string, unknown>;
      map[resource.id] = {
        view: flags.view === true,
        create: flags.create === true,
        update: flags.update === true,
        delete: flags.delete === true,
      };
    }
  } catch {
    return map;
  }
  return map;
}

async function replaceStaffPermissions(userId: string, map: StaffPermissionMap) {
  await prisma.staffPermission.deleteMany({ where: { userId } });
  const rows = ADMIN_PERMISSION_RESOURCES.map((resource) => {
    const flags = map[resource.id];
    return {
      userId,
      resource: resource.id,
      canView: Boolean(flags?.view),
      canCreate: Boolean(flags?.create),
      canUpdate: Boolean(flags?.update),
      canDelete: Boolean(flags?.delete),
    };
  }).filter((row) => row.canView || row.canCreate || row.canUpdate || row.canDelete);
  if (rows.length > 0) {
    await prisma.staffPermission.createMany({ data: rows });
  }
}

function revalidateStaff(id?: string) {
  revalidatePath("/admin/staff");
  revalidatePath("/admin/settings/support/temsilciler");
  if (id) revalidatePath(`/admin/staff/${id}`);
}

export async function createStaffAction(
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const gate = await requirePermission("staff", "create");
  if (!gate.ok) return { error: gate.error };

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const map = parsePermissionMap(String(formData.get("permissionsJson") ?? "{}"));
  const departmentIds = parseDepartmentIds(String(formData.get("departmentIdsJson") ?? "[]"));

  if (!firstName || !lastName) return { error: "Ad ve soyad zorunludur." };
  if (!email || !email.includes("@")) return { error: "Geçerli bir e-posta girin." };
  if (password.length < 6) return { error: "Şifre en az 6 karakter olmalı." };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: "Bu e-posta zaten kayıtlı." };

  try {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          customerNo: await nextCustomerNo(tx),
          firstName,
          lastName,
          name: joinFullName(firstName, lastName),
          email,
          password: await hash(password, 10),
          role: Role.STAFF,
          isActive,
        },
      });
      return user;
    });
    await replaceStaffPermissions(created.id, map);
    await replaceSupportChatStaffDepartments(created.id, departmentIds);
    revalidateStaff(created.id);
    return { success: true, message: "Personel oluşturuldu.", redirectId: created.id };
  } catch (error) {
    console.error(error);
    return { error: "Personel kaydedilemedi." };
  }
}

export async function updateStaffAction(
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const gate = await requirePermission("staff", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(formData.get("id") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const map = parsePermissionMap(String(formData.get("permissionsJson") ?? "{}"));
  const departmentIds = parseDepartmentIds(String(formData.get("departmentIdsJson") ?? "[]"));

  if (!id) return { error: "Personel bulunamadı." };
  if (!firstName || !lastName) return { error: "Ad ve soyad zorunludur." };
  if (!email || !email.includes("@")) return { error: "Geçerli bir e-posta girin." };

  const staff = await prisma.user.findFirst({
    where: { id, role: Role.STAFF },
    select: { id: true },
  });
  if (!staff) return { error: "Personel bulunamadı." };

  const emailTaken = await prisma.user.findFirst({
    where: { email, id: { not: id } },
    select: { id: true },
  });
  if (emailTaken) return { error: "Bu e-posta başka bir hesapta kullanılıyor." };
  if (password.length > 0 && password.length < 6) {
    return { error: "Yeni şifre en az 6 karakter olmalı." };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        name: joinFullName(firstName, lastName),
        email,
        isActive,
        ...(password.length >= 6 ? { password: await hash(password, 10) } : {}),
      },
    });
    await replaceStaffPermissions(id, map);
    await replaceSupportChatStaffDepartments(id, departmentIds);
    revalidateStaff(id);
    return { success: true, message: "Personel güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Personel güncellenemedi." };
  }
}

export async function deleteStaffAction(input: { id: string }) {
  const gate = await requirePermission("staff", "delete");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Personel bulunamadı." };

  const staff = await prisma.user.findFirst({
    where: { id, role: Role.STAFF },
    select: { id: true },
  });
  if (!staff) return { error: "Personel bulunamadı." };

  await prisma.user.delete({ where: { id } });
  revalidateStaff();
  return { success: true, message: "Personel silindi." };
}
