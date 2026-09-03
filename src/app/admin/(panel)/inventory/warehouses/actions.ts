"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requirePermission } from "@/lib/staff-permissions";

export type WarehouseFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  redirectId?: string;
};

function revalidateWarehouses(id?: string) {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/warehouses");
  if (id) revalidatePath(`/admin/inventory/warehouses/${id}/edit`);
}

function emptyToNull(value: string, max = 191) {
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

function normalizeCode(value: string) {
  return value
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/[^A-Z0-9_-]/gi, "")
    .slice(0, 32);
}

async function uniqueWarehouseCode(base: string, excludeId?: string) {
  const code = normalizeCode(base) || "DEPO";
  let candidate = code;
  let i = 2;
  while (true) {
    const existing = await prisma.stockWarehouse.findFirst({
      where: {
        code: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${code}${i}`.slice(0, 32);
    i += 1;
  }
}

function parseWarehousePayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 191);
  const codeInput = String(formData.get("code") ?? "").trim();
  const city = emptyToNull(String(formData.get("city") ?? ""), 100);
  const district = emptyToNull(String(formData.get("district") ?? ""), 100);
  const address = emptyToNull(String(formData.get("address") ?? ""), 5000);
  const phone = emptyToNull(String(formData.get("phone") ?? ""), 50);
  const notes = emptyToNull(String(formData.get("notes") ?? ""), 10_000);
  const sortOrderParsed = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive =
    formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const isDefault =
    formData.get("isDefault") === "on" || formData.get("isDefault") === "true";
  return {
    name,
    codeInput,
    city,
    district,
    address,
    phone,
    notes,
    sortOrder: Number.isFinite(sortOrderParsed) ? sortOrderParsed : 0,
    isActive,
    isDefault,
  };
}

async function setOnlyDefault(id: string) {
  await prisma.stockWarehouse.updateMany({
    where: { NOT: { id } },
    data: { isDefault: false },
  });
  await prisma.stockWarehouse.update({
    where: { id },
    data: { isDefault: true, isActive: true },
  });
}

export async function createWarehouseAction(
  _prev: WarehouseFormState,
  formData: FormData,
): Promise<WarehouseFormState> {
  const gate = await requirePermission("inventory", "create");
  if (!gate.ok) return { error: gate.error };

  const payload = parseWarehousePayload(formData);
  if (!payload.name) return { fieldErrors: { name: "Zorunlu alan" } };

  const count = await prisma.stockWarehouse.count();
  const code = await uniqueWarehouseCode(payload.codeInput || payload.name);
  const created = await prisma.stockWarehouse.create({
    data: {
      name: payload.name,
      code,
      city: payload.city,
      district: payload.district,
      address: payload.address,
      phone: payload.phone,
      notes: payload.notes,
      sortOrder: payload.sortOrder,
      isActive: payload.isActive,
      isDefault: count === 0 ? true : payload.isDefault,
    },
  });
  if (created.isDefault) await setOnlyDefault(created.id);

  revalidateWarehouses(created.id);
  return { success: true, message: "Depo oluşturuldu.", redirectId: created.id };
}

export async function updateWarehouseAction(
  _prev: WarehouseFormState,
  formData: FormData,
): Promise<WarehouseFormState> {
  const gate = await requirePermission("inventory", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Depo bulunamadı." };
  const existing = await prisma.stockWarehouse.findUnique({ where: { id } });
  if (!existing) return { error: "Depo bulunamadı." };

  const payload = parseWarehousePayload(formData);
  if (!payload.name) return { fieldErrors: { name: "Zorunlu alan" } };

  if (existing.isDefault && !payload.isDefault) {
    const other = await prisma.stockWarehouse.findFirst({
      where: { id: { not: id }, isActive: true },
      select: { id: true },
    });
    if (!other) {
      return { error: "Varsayılan depoyu kaldırmadan önce başka bir aktif depo seçin." };
    }
  }

  if (existing.isDefault && !payload.isActive) {
    return { error: "Varsayılan depo pasif yapılamaz. Önce başka depoyu varsayılan yapın." };
  }

  const code = await uniqueWarehouseCode(payload.codeInput || existing.code, id);
  await prisma.stockWarehouse.update({
    where: { id },
    data: {
      name: payload.name,
      code,
      city: payload.city,
      district: payload.district,
      address: payload.address,
      phone: payload.phone,
      notes: payload.notes,
      sortOrder: payload.sortOrder,
      isActive: payload.isActive,
      isDefault: payload.isDefault || existing.isDefault,
    },
  });
  if (payload.isDefault) await setOnlyDefault(id);

  revalidateWarehouses(id);
  return { success: true, message: "Depo güncellendi." };
}

export async function deleteWarehouseAction(id: string): Promise<WarehouseFormState> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };

  const warehouse = await prisma.stockWarehouse.findUnique({
    where: { id },
    select: {
      id: true,
      isDefault: true,
      _count: { select: { documents: true, transfersIn: true, movements: true } },
    },
  });
  if (!warehouse) return { error: "Depo bulunamadı." };
  if (warehouse.isDefault) return { error: "Varsayılan depo silinemez." };
  const total = await prisma.stockWarehouse.count();
  if (total <= 1) return { error: "Son depo silinemez." };
  if (warehouse._count.documents > 0 || warehouse._count.transfersIn > 0) {
    return { error: "Bu depoya bağlı belgeler var. Silmek yerine pasif yapın." };
  }

  const leftover = await prisma.warehouseStock.aggregate({
    where: { warehouseId: id },
    _sum: { quantity: true },
  });
  if ((leftover._sum.quantity ?? 0) !== 0) {
    return { error: "Depoda stok varken silinemez. Önce transfer veya sayım yapın." };
  }
  if (warehouse._count.movements > 0) {
    return { error: "Hareket geçmişi olan depo silinemez. Pasif yapın." };
  }

  await prisma.stockWarehouse.delete({ where: { id } });
  revalidateWarehouses();
  return { success: true, message: "Depo silindi." };
}

export async function setDefaultWarehouseAction(id: string): Promise<WarehouseFormState> {
  const gate = await requirePermission("inventory", "update");
  if (!gate.ok) return { error: gate.error };
  const warehouse = await prisma.stockWarehouse.findUnique({ where: { id } });
  if (!warehouse) return { error: "Depo bulunamadı." };
  await setOnlyDefault(id);
  revalidateWarehouses(id);
  return { success: true, message: "Varsayılan depo güncellendi." };
}
