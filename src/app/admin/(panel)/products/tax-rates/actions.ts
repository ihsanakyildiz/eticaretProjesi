"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/staff-permissions";
import { prisma } from "@/lib/prisma";

export type TaxRateFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type TaxRateActionResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

function revalidateTaxRateAdmin(id?: string) {
  revalidatePath("/admin/products/tax-rates");
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/new");
  if (id) revalidatePath(`/admin/products/tax-rates/${id}/edit`);
}

function isUniquePercentError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function ensureSingleDefault(id: string) {
  await prisma.taxRate.updateMany({
    where: { id: { not: id }, isDefault: true },
    data: { isDefault: false },
  });
}

async function promoteDefaultIfNeeded() {
  const current = await prisma.taxRate.findFirst({
    where: { isDefault: true, isActive: true },
    select: { id: true },
  });
  if (current) return;
  const next = await prisma.taxRate.findFirst({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { percent: "asc" }],
    select: { id: true },
  });
  if (next) {
    await prisma.taxRate.update({ where: { id: next.id }, data: { isDefault: true } });
  }
}

function parseTaxRatePayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 191);
  const percent = Number.parseInt(String(formData.get("percent") ?? ""), 10);
  const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
  const sortOrderParsed = Number.parseInt(sortOrderRaw, 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const isDefault = formData.get("isDefault") === "on" || formData.get("isDefault") === "true";

  return {
    name,
    percent,
    sortOrderRaw,
    sortOrder: Number.isFinite(sortOrderParsed) ? sortOrderParsed : null,
    isActive,
    isDefault: isActive ? isDefault : false,
  };
}

export async function createTaxRateAction(
  _prev: TaxRateFormState,
  formData: FormData,
): Promise<TaxRateFormState> {
  const gate = await requirePermission("tax_rates", "create");
  if (!gate.ok) return { error: gate.error };

  const payload = parseTaxRatePayload(formData);
  const fieldErrors: Record<string, string> = {};
  if (!payload.name) fieldErrors.name = "Oran adı zorunludur.";
  if (!Number.isFinite(payload.percent) || payload.percent < 0 || payload.percent > 100) {
    fieldErrors.percent = "0 ile 100 arasında bir oran girin.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Lütfen formu kontrol edin.", fieldErrors };
  }

  try {
    let sortOrder = payload.sortOrder;
    if (sortOrder === null || payload.sortOrderRaw === "") {
      const last = await prisma.taxRate.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const created = await prisma.taxRate.create({
      data: {
        name: payload.name,
        percent: payload.percent,
        sortOrder,
        isActive: payload.isActive,
        isDefault: payload.isDefault,
      },
    });
    if (created.isDefault) await ensureSingleDefault(created.id);
    else await promoteDefaultIfNeeded();

    revalidateTaxRateAdmin();
    return { success: true, message: "KDV oranı oluşturuldu." };
  } catch (error) {
    if (isUniquePercentError(error)) {
      return {
        error: "Bu KDV yüzdesi zaten kayıtlı.",
        fieldErrors: { percent: "Aynı oran tekrar eklenemez." },
      };
    }
    console.error(error);
    return { error: "KDV oranı kaydedilirken bir hata oluştu." };
  }
}

export async function updateTaxRateAction(
  _prev: TaxRateFormState,
  formData: FormData,
): Promise<TaxRateFormState> {
  const gate = await requirePermission("tax_rates", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "KDV oranı bulunamadı." };

  const existing = await prisma.taxRate.findUnique({ where: { id } });
  if (!existing) return { error: "KDV oranı bulunamadı." };

  const payload = parseTaxRatePayload(formData);
  const fieldErrors: Record<string, string> = {};
  if (!payload.name) fieldErrors.name = "Oran adı zorunludur.";
  if (!Number.isFinite(payload.percent) || payload.percent < 0 || payload.percent > 100) {
    fieldErrors.percent = "0 ile 100 arasında bir oran girin.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Lütfen formu kontrol edin.", fieldErrors };
  }

  try {
    const sortOrder =
      payload.sortOrderRaw === "" || payload.sortOrder === null
        ? existing.sortOrder
        : payload.sortOrder;

    await prisma.taxRate.update({
      where: { id },
      data: {
        name: payload.name,
        percent: payload.percent,
        sortOrder,
        isActive: payload.isActive,
        isDefault: payload.isDefault,
      },
    });
    if (payload.isDefault) await ensureSingleDefault(id);
    else await promoteDefaultIfNeeded();

    revalidateTaxRateAdmin(id);
    return { success: true, message: "KDV oranı güncellendi." };
  } catch (error) {
    if (isUniquePercentError(error)) {
      return {
        error: "Bu KDV yüzdesi zaten kayıtlı.",
        fieldErrors: { percent: "Aynı oran tekrar eklenemez." },
      };
    }
    console.error(error);
    return { error: "KDV oranı güncellenirken bir hata oluştu." };
  }
}

export async function deleteTaxRateAction(input: { id: string }): Promise<TaxRateActionResult> {
  const gate = await requirePermission("tax_rates", "delete");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "KDV oranı bulunamadı." };

  const existing = await prisma.taxRate.findUnique({ where: { id } });
  if (!existing) return { error: "KDV oranı bulunamadı." };

  try {
    await prisma.taxRate.delete({ where: { id } });
    await promoteDefaultIfNeeded();
    revalidateTaxRateAdmin();
    return { success: true, message: "KDV oranı silindi." };
  } catch (error) {
    console.error(error);
    return { error: "KDV oranı silinirken bir hata oluştu." };
  }
}

export async function toggleTaxRateActiveAction(input: {
  id: string;
  isActive: boolean;
}): Promise<TaxRateActionResult> {
  const gate = await requirePermission("tax_rates", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "KDV oranı bulunamadı." };

  const existing = await prisma.taxRate.findUnique({ where: { id } });
  if (!existing) return { error: "KDV oranı bulunamadı." };

  await prisma.taxRate.update({
    where: { id },
    data: {
      isActive: input.isActive,
      isDefault: input.isActive ? existing.isDefault : false,
    },
  });
  await promoteDefaultIfNeeded();
  revalidateTaxRateAdmin(id);
  return {
    success: true,
    message: input.isActive ? "KDV oranı aktif edildi." : "KDV oranı pasife alındı.",
  };
}
