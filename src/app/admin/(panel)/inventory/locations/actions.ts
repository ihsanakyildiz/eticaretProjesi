"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  buildLocationCode,
  normalizeLocationCode,
  padLocationNumber,
} from "@/lib/inventory-locations";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/staff-permissions";

export type LocationActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  created?: number;
};

function revalidateLocations() {
  revalidatePath("/admin/inventory", "layout");
  revalidatePath("/admin/inventory/locations");
  revalidatePath("/admin/inventory/warehouses");
  revalidatePath("/admin/warehouse", "layout");
}

function emptyToNull(value: string, max = 16) {
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

function locationSaveError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return "Bu raf kodu bu depoda zaten var.";
      case "P2021":
        return "Raf tablosu bulunamadı. Veritabanı güncellemesi eksik.";
      case "P2003":
        return "Seçilen depo geçersiz.";
      default:
        return "Raf kaydedilemedi.";
    }
  }
  if (error instanceof Error && /doesn't have a default value/i.test(error.message)) {
    return "Raf kaydı için gerekli alanlar eksik.";
  }
  return "Raf kaydedilemedi.";
}

export async function createStockLocationAction(input: {
  warehouseId: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  code?: string;
  notes?: string;
}): Promise<LocationActionResult> {
  const gate = await requirePermission("inventory", "create");
  if (!gate.ok) return { ok: false, error: gate.error };

  const warehouseId = String(input.warehouseId ?? "").trim();
  if (!warehouseId) return { ok: false, error: "Depo seçin." };
  const warehouse = await prisma.stockWarehouse.findUnique({
    where: { id: warehouseId },
    select: { id: true },
  });
  if (!warehouse) return { ok: false, error: "Depo bulunamadı." };

  const aisle = emptyToNull(String(input.aisle ?? ""));
  const rack = emptyToNull(String(input.rack ?? ""));
  const shelf = emptyToNull(String(input.shelf ?? ""));
  const code = buildLocationCode({
    code: input.code,
    aisle,
    rack,
    shelf,
  });
  if (!code) return { ok: false, error: "Raf kodu veya koridor/raf/göz girin." };

  const exists = await prisma.stockLocation.findUnique({
    where: { warehouseId_code: { warehouseId, code } },
    select: { id: true },
  });
  if (exists) return { ok: false, error: `${code} bu depoda zaten var.` };

  const maxSort = await prisma.stockLocation.aggregate({
    where: { warehouseId },
    _max: { sortOrder: true },
  });
  const now = new Date();
  try {
    await prisma.stockLocation.create({
      data: {
        warehouseId,
        code,
        aisle,
        rack,
        shelf,
        notes: emptyToNull(String(input.notes ?? ""), 255),
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error) {
    return { ok: false, error: locationSaveError(error) };
  }
  revalidateLocations();
  return { ok: true, message: `${code} eklendi.`, created: 1 };
}

export async function generateStockLocationsAction(input: {
  warehouseId: string;
  aisle: string;
  rackFrom: number;
  rackTo: number;
  shelfFrom: number;
  shelfTo: number;
}): Promise<LocationActionResult> {
  const gate = await requirePermission("inventory", "create");
  if (!gate.ok) return { ok: false, error: gate.error };

  const warehouseId = String(input.warehouseId ?? "").trim();
  const aisle = emptyToNull(String(input.aisle ?? ""));
  if (!warehouseId) return { ok: false, error: "Depo seçin." };
  if (!aisle) return { ok: false, error: "Koridor girin (ör. A)." };

  const rackFrom = Math.round(input.rackFrom);
  const rackTo = Math.round(input.rackTo);
  const shelfFrom = Math.round(input.shelfFrom);
  const shelfTo = Math.round(input.shelfTo);
  if (rackFrom < 1 || rackTo < rackFrom || shelfFrom < 1 || shelfTo < shelfFrom) {
    return { ok: false, error: "Raf ve göz aralığı geçersiz." };
  }
  const count = (rackTo - rackFrom + 1) * (shelfTo - shelfFrom + 1);
  if (count > 400) return { ok: false, error: "Tek seferde en fazla 400 göz oluşturulabilir." };

  const warehouse = await prisma.stockWarehouse.findUnique({
    where: { id: warehouseId },
    select: { id: true },
  });
  if (!warehouse) return { ok: false, error: "Depo bulunamadı." };

  const existing = await prisma.stockLocation.findMany({
    where: { warehouseId },
    select: { code: true },
  });
  const used = new Set(existing.map((row) => row.code));
  const maxSort = await prisma.stockLocation.aggregate({
    where: { warehouseId },
    _max: { sortOrder: true },
  });
  let sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
  const now = new Date();
  const rows: Array<{
    id: string;
    warehouseId: string;
    code: string;
    aisle: string;
    rack: string;
    shelf: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  for (let rack = rackFrom; rack <= rackTo; rack += 1) {
    for (let shelf = shelfFrom; shelf <= shelfTo; shelf += 1) {
      const code = buildLocationCode({
        aisle,
        rack: padLocationNumber(rack),
        shelf: padLocationNumber(shelf),
      });
      if (!code || used.has(code)) continue;
      used.add(code);
      rows.push({
        id: crypto.randomUUID(),
        warehouseId,
        code,
        aisle,
        rack: padLocationNumber(rack),
        shelf: padLocationNumber(shelf),
        sortOrder,
        createdAt: now,
        updatedAt: now,
      });
      sortOrder += 1;
    }
  }

  if (rows.length === 0) {
    return { ok: false, error: "Bu aralıktaki gözler zaten tanımlı." };
  }

  try {
    await prisma.stockLocation.createMany({ data: rows });
  } catch (error) {
    return { ok: false, error: locationSaveError(error) };
  }
  revalidateLocations();
  return { ok: true, message: `${rows.length} raf gözü oluşturuldu.`, created: rows.length };
}

export async function updateStockLocationAction(input: {
  id: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  code?: string;
  notes?: string;
}): Promise<LocationActionResult> {
  const gate = await requirePermission("inventory", "update");
  if (!gate.ok) return { ok: false, error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false, error: "Raf bulunamadı." };

  const current = await prisma.stockLocation.findUnique({
    where: { id },
    select: { id: true, warehouseId: true, code: true },
  });
  if (!current) return { ok: false, error: "Raf bulunamadı." };

  const aisle = emptyToNull(String(input.aisle ?? ""));
  const rack = emptyToNull(String(input.rack ?? ""));
  const shelf = emptyToNull(String(input.shelf ?? ""));
  const submittedCode = normalizeLocationCode(input.code);
  const rebuilt = buildLocationCode({ aisle, rack, shelf });
  const code =
    submittedCode && submittedCode !== current.code ? submittedCode : rebuilt || submittedCode;
  if (!code) return { ok: false, error: "Raf kodu veya koridor/raf/göz girin." };

  const duplicate = await prisma.stockLocation.findFirst({
    where: { warehouseId: current.warehouseId, code, NOT: { id } },
    select: { id: true },
  });
  if (duplicate) return { ok: false, error: `${code} bu depoda zaten var.` };

  try {
    await prisma.stockLocation.update({
      where: { id },
      data: {
        code,
        aisle,
        rack,
        shelf,
        notes: emptyToNull(String(input.notes ?? ""), 255),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    return { ok: false, error: locationSaveError(error) };
  }
  revalidateLocations();
  return { ok: true, message: `${current.code} → ${code} olarak güncellendi.` };
}

export async function createStockLocationFormAction(
  _prev: LocationActionResult,
  formData: FormData,
): Promise<LocationActionResult> {
  return createStockLocationAction({
    warehouseId: String(formData.get("warehouseId") ?? ""),
    aisle: String(formData.get("aisle") ?? ""),
    rack: String(formData.get("rack") ?? ""),
    shelf: String(formData.get("shelf") ?? ""),
    code: String(formData.get("code") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
}

export async function updateStockLocationFormAction(
  _prev: LocationActionResult,
  formData: FormData,
): Promise<LocationActionResult> {
  return updateStockLocationAction({
    id: String(formData.get("id") ?? ""),
    aisle: String(formData.get("aisle") ?? ""),
    rack: String(formData.get("rack") ?? ""),
    shelf: String(formData.get("shelf") ?? ""),
    code: String(formData.get("code") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
}

export async function generateStockLocationsFormAction(
  _prev: LocationActionResult,
  formData: FormData,
): Promise<LocationActionResult> {
  return generateStockLocationsAction({
    warehouseId: String(formData.get("warehouseId") ?? ""),
    aisle: String(formData.get("aisle") ?? ""),
    rackFrom: Number.parseInt(String(formData.get("rackFrom") ?? "1"), 10),
    rackTo: Number.parseInt(String(formData.get("rackTo") ?? "10"), 10),
    shelfFrom: Number.parseInt(String(formData.get("shelfFrom") ?? "1"), 10),
    shelfTo: Number.parseInt(String(formData.get("shelfTo") ?? "4"), 10),
  });
}

export async function deleteStockLocationAction(id: string): Promise<LocationActionResult> {
  const gate = await requirePermission("inventory", "delete");
  if (!gate.ok) return { ok: false, error: gate.error };
  const location = await prisma.stockLocation.findUnique({
    where: { id },
    select: { id: true, code: true, _count: { select: { stocks: true } } },
  });
  if (!location) return { ok: false, error: "Raf bulunamadı." };
  if (location._count.stocks > 0) {
    return {
      ok: false,
      error: `${location.code} rafa bağlı ${location._count.stocks} ürün var. Silmek yerine kalem ile düzeltin.`,
    };
  }
  await prisma.stockLocation.delete({ where: { id } });
  revalidateLocations();
  return { ok: true, message: `${location.code} silindi.` };
}

export async function assignStockLocationAction(input: {
  warehouseId: string;
  variantId: string;
  locationId: string | null;
}): Promise<LocationActionResult> {
  const gate = await requirePermission("inventory", "update");
  if (!gate.ok) return { ok: false, error: gate.error };

  const warehouseId = String(input.warehouseId ?? "").trim();
  const variantId = String(input.variantId ?? "").trim();
  const locationId = input.locationId ? String(input.locationId).trim() || null : null;
  if (!warehouseId || !variantId) return { ok: false, error: "Eksik bilgi." };

  if (locationId) {
    const location = await prisma.stockLocation.findFirst({
      where: { id: locationId, warehouseId, isActive: true },
      select: { id: true },
    });
    if (!location) return { ok: false, error: "Raf bu depoya ait değil." };
  }

  await prisma.warehouseStock.upsert({
    where: { warehouseId_variantId: { warehouseId, variantId } },
    create: {
      warehouseId,
      variantId,
      quantity: 0,
      reservedQuantity: 0,
      locationId,
    },
    update: { locationId },
  });
  revalidateLocations();
  return { ok: true, message: locationId ? "Raf kaydedildi." : "Raf kaldırıldı." };
}

export { normalizeLocationCode };
