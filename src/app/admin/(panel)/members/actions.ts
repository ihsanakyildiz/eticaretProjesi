"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { CustomerGroup, CustomerTitle, Role } from "@prisma/client";
import { prepareAddressDrafts, replaceCustomerAddresses, nextCustomerNo } from "@/lib/customer-addresses";
import {
  CUSTOMER_BULK_ACTIONS,
  CUSTOMER_FLAG_FIELDS,
  joinFullName,
  parseCustomerGroup,
  parseCustomerTitle,
  type CustomerBulkAction,
  type CustomerFlagField,
} from "@/lib/customers";
import { requirePermission } from "@/lib/staff-permissions";
import { prisma } from "@/lib/prisma";

export type CustomerFormState = {
  error?: string;
  success?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  redirectId?: string;
};

function emptyToNull(value: string, max = 191) {
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

function revalidateCustomers(id?: string) {
  revalidatePath("/admin/members");
  if (id) revalidatePath(`/admin/members/${id}`);
}

function parseCustomerFields(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  return {
    firstName,
    lastName,
    name: joinFullName(firstName, lastName),
    title: parseCustomerTitle(String(formData.get("title") ?? "")),
    customerGroup: parseCustomerGroup(String(formData.get("customerGroup") ?? "")),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: emptyToNull(String(formData.get("phone") ?? ""), 50),
    notes: emptyToNull(String(formData.get("notes") ?? ""), 4000),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
    newsletter: formData.get("newsletter") === "on" || formData.get("newsletter") === "true",
    partnerOffers:
      formData.get("partnerOffers") === "on" || formData.get("partnerOffers") === "true",
    password: String(formData.get("password") ?? ""),
    addressesJson: String(formData.get("addressesJson") ?? "[]"),
  };
}

function prismaTitle(code: ReturnType<typeof parseCustomerTitle>): CustomerTitle {
  switch (code) {
    case "MR":
      return CustomerTitle.MR;
    case "MRS":
      return CustomerTitle.MRS;
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}

function prismaGroup(code: ReturnType<typeof parseCustomerGroup>): CustomerGroup {
  switch (code) {
    case "CUSTOMER":
      return CustomerGroup.CUSTOMER;
    case "GUEST":
      return CustomerGroup.GUEST;
    case "WHOLESALE":
      return CustomerGroup.WHOLESALE;
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}

async function emailTaken(email: string, excludeId?: string) {
  const existing = await prisma.user.findFirst({
    where: { email, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function createCustomerAction(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const gate = await requirePermission("customers", "create");
  if (!gate.ok) return { error: gate.error };

  const fields = parseCustomerFields(formData);
  if (!fields.firstName) {
    return { error: "Ad zorunludur.", fieldErrors: { firstName: "Zorunlu alan" } };
  }
  if (!fields.lastName) {
    return { error: "Soyad zorunludur.", fieldErrors: { lastName: "Zorunlu alan" } };
  }
  if (!fields.email) {
    return { error: "E-posta zorunludur.", fieldErrors: { email: "Zorunlu alan" } };
  }
  if (fields.password.length < 6) {
    return {
      error: "Şifre en az 6 karakter olmalıdır.",
      fieldErrors: { password: "En az 6 karakter" },
    };
  }
  if (await emailTaken(fields.email)) {
    return { error: "Bu e-posta kullanımda.", fieldErrors: { email: "Kullanımda" } };
  }

  const prepared = prepareAddressDrafts(fields.addressesJson);
  if (prepared.error) return { error: prepared.error };

  try {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          customerNo: await nextCustomerNo(tx),
          firstName: fields.firstName,
          lastName: fields.lastName,
          name: fields.name,
          title: prismaTitle(fields.title),
          customerGroup: prismaGroup(fields.customerGroup),
          email: fields.email,
          phone: fields.phone,
          notes: fields.notes,
          isActive: fields.isActive,
          newsletter: fields.newsletter,
          partnerOffers: fields.partnerOffers,
          role: Role.MEMBER,
          password: await hash(fields.password, 10),
        },
      });
      await replaceCustomerAddresses(tx, user.id, prepared.addresses);
      return user;
    });
    revalidateCustomers(created.id);
    return { success: true, message: "Müşteri oluşturuldu.", redirectId: created.id };
  } catch (error) {
    console.error(error);
    return { error: "Müşteri kaydedilirken bir hata oluştu." };
  }
}

export async function updateCustomerAction(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const gate = await requirePermission("customers", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Müşteri bulunamadı." };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== Role.MEMBER) {
    return { error: "Müşteri bulunamadı." };
  }

  const fields = parseCustomerFields(formData);
  if (!fields.firstName) {
    return { error: "Ad zorunludur.", fieldErrors: { firstName: "Zorunlu alan" } };
  }
  if (!fields.lastName) {
    return { error: "Soyad zorunludur.", fieldErrors: { lastName: "Zorunlu alan" } };
  }
  if (!fields.email) {
    return { error: "E-posta zorunludur.", fieldErrors: { email: "Zorunlu alan" } };
  }
  if (fields.password && fields.password.length < 6) {
    return {
      error: "Şifre en az 6 karakter olmalıdır.",
      fieldErrors: { password: "En az 6 karakter" },
    };
  }
  if (await emailTaken(fields.email, id)) {
    return { error: "Bu e-posta kullanımda.", fieldErrors: { email: "Kullanımda" } };
  }

  const prepared = prepareAddressDrafts(fields.addressesJson);
  if (prepared.error) return { error: prepared.error };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          firstName: fields.firstName,
          lastName: fields.lastName,
          name: fields.name,
          title: prismaTitle(fields.title),
          customerGroup: prismaGroup(fields.customerGroup),
          email: fields.email,
          phone: fields.phone,
          notes: fields.notes,
          isActive: fields.isActive,
          newsletter: fields.newsletter,
          partnerOffers: fields.partnerOffers,
          ...(fields.password.length >= 6 ? { password: await hash(fields.password, 10) } : {}),
        },
      });
      await replaceCustomerAddresses(tx, id, prepared.addresses);
    });
    revalidateCustomers(id);
    return { success: true, message: "Müşteri güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Müşteri güncellenirken bir hata oluştu." };
  }
}

export async function patchCustomerFlagAction(input: {
  id: string;
  field: CustomerFlagField;
  value: boolean;
}) {
  const gate = await requirePermission("customers", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Müşteri bulunamadı." };
  if (!CUSTOMER_FLAG_FIELDS.includes(input.field)) {
    return { error: "Geçersiz alan." };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== Role.MEMBER) return { error: "Müşteri bulunamadı." };

  const data = ((): { isActive?: boolean; newsletter?: boolean; partnerOffers?: boolean } => {
    switch (input.field) {
      case "isActive":
        return { isActive: input.value };
      case "newsletter":
        return { newsletter: input.value };
      case "partnerOffers":
        return { partnerOffers: input.value };
      default: {
        const _exhaustive: never = input.field;
        return _exhaustive;
      }
    }
  })();

  await prisma.user.update({ where: { id }, data });
  revalidateCustomers(id);
  return { success: true };
}

export async function toggleCustomerActiveAction(input: { id: string; isActive: boolean }) {
  return patchCustomerFlagAction({ id: input.id, field: "isActive", value: input.isActive });
}

export async function deleteCustomerAction(input: { id: string }) {
  try {
    const gate = await requirePermission("customers", "delete");
    if (!gate.ok) return { error: gate.error };
    const session = gate.session;
    const id = String(input.id ?? "").trim();
    if (!id) return { error: "Müşteri bulunamadı." };
    if (id === session.user.id) return { error: "Kendi hesabınızı silemezsiniz." };

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== Role.MEMBER) return { error: "Müşteri bulunamadı." };

    await prisma.user.delete({ where: { id } });
    revalidateCustomers();
    return { success: true, message: "Müşteri silindi." };
  } catch {
    return { error: "Müşteri silinirken bir hata oluştu." };
  }
}

export async function bulkCustomersAction(input: { ids: string[]; action: CustomerBulkAction }) {
  try {
    const needed = input.action === "delete" ? "delete" : "update";
    const gate = await requirePermission("customers", needed);
    if (!gate.ok) return { error: gate.error };
    const session = gate.session;
    if (!CUSTOMER_BULK_ACTIONS.includes(input.action)) {
      return { error: "Geçersiz toplu eylem." };
    }

    const ids = Array.from(new Set(input.ids.map((id) => String(id ?? "").trim()).filter(Boolean)));
    if (ids.length === 0) return { error: "Müşteri seçilmedi." };
    if (ids.includes(session.user.id) && input.action === "delete") {
      return { error: "Kendi hesabınızı silemezsiniz." };
    }

    const members = await prisma.user.findMany({
      where: { id: { in: ids }, role: Role.MEMBER },
      select: { id: true },
    });
    const memberIds = members.map((member) => member.id);
    if (memberIds.length === 0) return { error: "Müşteri bulunamadı." };

    switch (input.action) {
      case "enable":
        await prisma.user.updateMany({
          where: { id: { in: memberIds } },
          data: { isActive: true },
        });
        break;
      case "disable":
        await prisma.user.updateMany({
          where: { id: { in: memberIds } },
          data: { isActive: false },
        });
        break;
      case "newsletterOn":
        await prisma.user.updateMany({
          where: { id: { in: memberIds } },
          data: { newsletter: true },
        });
        break;
      case "newsletterOff":
        await prisma.user.updateMany({
          where: { id: { in: memberIds } },
          data: { newsletter: false },
        });
        break;
      case "delete":
        await prisma.user.deleteMany({ where: { id: { in: memberIds } } });
        break;
      default: {
        const _exhaustive: never = input.action;
        return _exhaustive;
      }
    }

    revalidateCustomers();
    return { success: true };
  } catch {
    return { error: "Toplu işlem uygulanırken bir hata oluştu." };
  }
}
