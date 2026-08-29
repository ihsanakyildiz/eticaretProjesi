"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/staff-permissions";
import { prisma } from "@/lib/prisma";
import {
  assertSwatchColor,
  defaultNameForSystemKey,
  defaultSlugForSystemKey,
  filterUsesCustomValues,
  inputTypeForSystemKey,
  inputTypeForVariantDisplay,
  isProductFilterInputType,
  isProductFilterKind,
  isProductFilterSystemKey,
} from "@/lib/product-filters";
import { slugify } from "@/lib/slug";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

export type ProductFilterFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  redirectId?: string;
};

function revalidateFilterAdmin(id?: string) {
  revalidatePath("/admin/products/filters");
  if (id) revalidatePath(`/admin/products/filters/${id}/edit`);
}

async function uniqueFilterSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "filtre";
  let candidate = slug;
  let i = 2;
  while (true) {
    const existing = await prisma.productFilter.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${slug}-${i}`;
    i += 1;
  }
}

async function uniqueFilterValueSlug(
  filterId: string,
  base: string,
  excludeId?: string,
) {
  const slug = slugify(base) || "deger";
  let candidate = slug;
  let i = 2;
  while (true) {
    const existing = await prisma.productFilterValue.findFirst({
      where: {
        filterId,
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${slug}-${i}`;
    i += 1;
  }
}

function parseCategoryIds(formData: FormData) {
  return [
    ...new Set(
      formData
        .getAll("categoryIds")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  ];
}

function parseFilterPayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "CUSTOM").trim();
  const systemKeyRaw = String(formData.get("systemKey") ?? "").trim();
  const variantAttributeId = String(formData.get("variantAttributeId") ?? "").trim();
  const inputTypeRaw = String(formData.get("inputType") ?? "MULTI_SELECT").trim();
  const unit = String(formData.get("unit") ?? "").trim().slice(0, 20);
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const hideEmptyValues =
    formData.get("hideEmptyValues") === "on" || formData.get("hideEmptyValues") === "true";
  const showProductCount =
    formData.get("showProductCount") === "on" || formData.get("showProductCount") === "true";
  const appliesGlobally =
    formData.get("appliesGlobally") === "on" || formData.get("appliesGlobally") === "true";
  const inheritToChildren =
    formData.get("inheritToChildren") === "on" || formData.get("inheritToChildren") === "true";
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";

  return {
    name,
    slugInput,
    description: description || null,
    kindRaw,
    systemKeyRaw,
    variantAttributeId: variantAttributeId || null,
    inputTypeRaw,
    unit: unit || null,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    hideEmptyValues,
    showProductCount,
    appliesGlobally,
    inheritToChildren,
    isActive,
    categoryIds: parseCategoryIds(formData),
  };
}

type ResolvedKind =
  | { error: string; fieldErrors?: Record<string, string> }
  | {
      kind: "CUSTOM" | "VARIANT" | "SYSTEM";
      systemKey: "BRAND" | "PRICE" | "AVAILABILITY" | null;
      variantAttributeId: string | null;
      inputType: "MULTI_SELECT" | "SWATCH" | "BOOLEAN" | "RANGE";
      name: string;
      slugBase: string;
    };

async function resolveKindFields(
  payload: ReturnType<typeof parseFilterPayload>,
  excludeId?: string,
): Promise<ResolvedKind> {
  if (!isProductFilterKind(payload.kindRaw)) {
    return { error: "Geçersiz filtre türü.", fieldErrors: { kind: "Geçersiz" } };
  }

  const kind = payload.kindRaw;
  let systemKey: "BRAND" | "PRICE" | "AVAILABILITY" | null = null;
  let variantAttributeId: string | null = null;
  let inputType = payload.inputTypeRaw;
  let name = payload.name;

  switch (kind) {
    case "SYSTEM": {
      if (!isProductFilterSystemKey(payload.systemKeyRaw)) {
        return { error: "Sistem filtresi seçin.", fieldErrors: { systemKey: "Zorunlu" } };
      }
      systemKey = payload.systemKeyRaw;
      const taken = await prisma.productFilter.findFirst({
        where: {
          systemKey,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true, name: true },
      });
      if (taken) {
        return {
          error: `"${taken.name}" zaten bu sistem filtresini kullanıyor.`,
          fieldErrors: { systemKey: "Bu anahtar kullanımda" },
        };
      }
      inputType = inputTypeForSystemKey(systemKey);
      if (!name) name = defaultNameForSystemKey(systemKey);
      break;
    }
    case "VARIANT": {
      if (!payload.variantAttributeId) {
        return {
          error: "Varyant özelliği seçin.",
          fieldErrors: { variantAttributeId: "Zorunlu" },
        };
      }
      const attribute = await prisma.productAttribute.findUnique({
        where: { id: payload.variantAttributeId },
        select: { id: true, name: true, displayType: true, filter: { select: { id: true } } },
      });
      if (!attribute) {
        return { error: "Varyant özelliği bulunamadı." };
      }
      if (attribute.filter && attribute.filter.id !== excludeId) {
        return {
          error: `"${attribute.name}" zaten bir filtreye bağlı.`,
          fieldErrors: { variantAttributeId: "Kullanımda" },
        };
      }
      variantAttributeId = attribute.id;
      inputType = inputTypeForVariantDisplay(attribute.displayType);
      if (!name) name = attribute.name;
      break;
    }
    case "CUSTOM": {
      if (!isProductFilterInputType(payload.inputTypeRaw)) {
        return { error: "Geçersiz vitrin tipi.", fieldErrors: { inputType: "Geçersiz" } };
      }
      inputType = payload.inputTypeRaw;
      break;
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }

  if (!isProductFilterInputType(inputType)) {
    return { error: "Geçersiz vitrin tipi." };
  }

  if (!name) {
    return { error: "Filtre adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  if (!payload.appliesGlobally && payload.categoryIds.length === 0) {
    return {
      error: "Global değilse en az bir kategori seçin.",
      fieldErrors: { categoryIds: "Kategori seçin" },
    };
  }

  const slugBase =
    payload.slugInput ||
    (kind === "SYSTEM" && systemKey ? defaultSlugForSystemKey(systemKey) : name);

  if (kind === "CUSTOM" && !excludeId) {
    const normalized = slugify(slugBase);
    if (normalized === "marka" || normalized === "markalar" || normalized === "brand") {
      return {
        error:
          "Marka filtresi için türü Sistem seçin. Markalar sayfasındaki kayıtlar otomatik gelir; buraya yeniden yazılmaz.",
        fieldErrors: { kind: "Sistem → Marka kullanın" },
      };
    }
  }

  return {
    kind,
    systemKey,
    variantAttributeId,
    inputType,
    name,
    slugBase,
  };
}

async function syncFilterCategories(
  filterId: string,
  categoryIds: string[],
  appliesGlobally: boolean,
) {
  const ids = appliesGlobally ? [] : categoryIds;
  if (ids.length) {
    const categories = await prisma.productCategory.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const valid = new Set(categories.map((row) => row.id));
    if (valid.size !== ids.length) {
      throw new Error("CATEGORY_NOT_FOUND");
    }
  }

  await prisma.productFilterCategory.deleteMany({
    where: {
      filterId,
      ...(ids.length ? { categoryId: { notIn: ids } } : {}),
    },
  });

  if (!ids.length) return;

  await prisma.productFilterCategory.createMany({
    data: ids.map((categoryId) => ({ filterId, categoryId })),
    skipDuplicates: true,
  });
}

export async function createProductFilterAction(
  _prev: ProductFilterFormState,
  formData: FormData,
): Promise<ProductFilterFormState> {
  const gate = await requirePermission("filters", "create");
  if (!gate.ok) return { error: gate.error };

  const payload = parseFilterPayload(formData);
  const resolved = await resolveKindFields(payload);
  if ("error" in resolved) return resolved;

  try {
    let sortOrder = payload.sortOrder;
    if (!String(formData.get("sortOrder") ?? "").trim()) {
      const last = await prisma.productFilter.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const slug = await uniqueFilterSlug(resolved.slugBase);
    const created = await prisma.productFilter.create({
      data: {
        name: resolved.name,
        slug,
        description: payload.description,
        kind: resolved.kind,
        systemKey: resolved.systemKey,
        variantAttributeId: resolved.variantAttributeId,
        inputType: resolved.inputType,
        unit: resolved.inputType === "RANGE" ? payload.unit : null,
        hideEmptyValues: payload.hideEmptyValues,
        showProductCount: payload.showProductCount,
        appliesGlobally: payload.appliesGlobally,
        inheritToChildren: payload.inheritToChildren,
        isActive: payload.isActive,
        sortOrder,
      },
    });

    await syncFilterCategories(created.id, payload.categoryIds, payload.appliesGlobally);
    revalidateFilterAdmin(created.id);
    return { success: true, message: "Filtre oluşturuldu.", redirectId: created.id };
  } catch (error) {
    console.error(error);
    return { error: "Filtre oluşturulurken bir hata oluştu." };
  }
}

export async function updateProductFilterAction(
  _prev: ProductFilterFormState,
  formData: FormData,
): Promise<ProductFilterFormState> {
  const gate = await requirePermission("filters", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Filtre bulunamadı." };

  const existing = await prisma.productFilter.findUnique({ where: { id } });
  if (!existing) return { error: "Filtre bulunamadı." };

  const payload = parseFilterPayload(formData);
  payload.kindRaw = existing.kind;
  payload.systemKeyRaw = existing.systemKey ?? "";
  payload.variantAttributeId = existing.variantAttributeId ?? "";
  if (existing.kind !== "CUSTOM") {
    payload.inputTypeRaw = existing.inputType;
  }

  const resolved = await resolveKindFields(payload, id);
  if ("error" in resolved) return resolved;

  try {
    const slug = await uniqueFilterSlug(resolved.slugBase, id);
    await prisma.productFilter.update({
      where: { id },
      data: {
        name: resolved.name,
        slug,
        description: payload.description,
        inputType: resolved.inputType,
        unit: resolved.inputType === "RANGE" ? payload.unit : null,
        hideEmptyValues: payload.hideEmptyValues,
        showProductCount: payload.showProductCount,
        appliesGlobally: payload.appliesGlobally,
        inheritToChildren: payload.inheritToChildren,
        isActive: payload.isActive,
        sortOrder: payload.sortOrder,
      },
    });

    if (!filterUsesCustomValues(resolved.inputType, resolved.kind)) {
      await prisma.productFilterValue.deleteMany({ where: { filterId: id } });
    }

    await syncFilterCategories(id, payload.categoryIds, payload.appliesGlobally);
    revalidateFilterAdmin(id);
    return { success: true, message: "Filtre güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Filtre güncellenirken bir hata oluştu." };
  }
}

export async function deleteProductFilterAction(input: { id: string }) {
  const gate = await requirePermission("filters", "delete");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Filtre bulunamadı." };

  const existing = await prisma.productFilter.findUnique({
    where: { id },
    include: {
      values: { select: { image: true } },
      _count: { select: { assignments: true } },
    },
  });
  if (!existing) return { error: "Filtre bulunamadı." };

  try {
    await prisma.productFilter.delete({ where: { id } });
    for (const value of existing.values) {
      if (value.image) await deletePublicAsset(value.image);
    }
    revalidateFilterAdmin();
    return {
      success: true,
      message:
        existing._count.assignments > 0
          ? "Filtre silindi; ürün bağlantıları kaldırıldı."
          : "Filtre silindi.",
    };
  } catch (error) {
    console.error(error);
    return { error: "Filtre silinirken bir hata oluştu." };
  }
}

export async function toggleProductFilterActiveAction(input: {
  id: string;
  isActive: boolean;
}) {
  const gate = await requirePermission("filters", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Filtre bulunamadı." };

  const existing = await prisma.productFilter.findUnique({ where: { id } });
  if (!existing) return { error: "Filtre bulunamadı." };

  await prisma.productFilter.update({
    where: { id },
    data: { isActive: input.isActive },
  });
  revalidateFilterAdmin(id);
  return {
    success: true,
    message: input.isActive ? "Filtre aktif edildi." : "Filtre pasife alındı.",
  };
}

function parseValuePayload(formData: FormData) {
  const filterId = String(formData.get("filterId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const colorHex = String(formData.get("colorHex") ?? "").trim();
  const existingImage = String(formData.get("image") ?? "").trim();
  const imageFile = formData.get("image_file");
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";

  return {
    filterId,
    name,
    slugInput,
    colorHex,
    existingImage,
    imageFile,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
  };
}

async function saveValueImage(
  imageFile: FormDataEntryValue | null,
  existingImage: string,
  previousPath?: string | null,
) {
  if (imageFile instanceof File && imageFile.size > 0) {
    const saved = await saveOptimizedImage(imageFile, {
      uploadDir: "uploads/products/filters",
      maxBytes: uploadLimits.image,
      mode: "webp",
      quality: 82,
      previousPath: previousPath || undefined,
    });
    return saved.publicPath;
  }
  return existingImage;
}

export async function createProductFilterValueAction(
  _prev: ProductFilterFormState,
  formData: FormData,
): Promise<ProductFilterFormState> {
  const gate = await requirePermission("filters", "create");
  if (!gate.ok) return { error: gate.error };

  const payload = parseValuePayload(formData);
  if (!payload.filterId) return { error: "Filtre bulunamadı." };
  if (!payload.name) {
    return { error: "Değer adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  const filter = await prisma.productFilter.findUnique({ where: { id: payload.filterId } });
  if (!filter) return { error: "Filtre bulunamadı." };
  if (!filterUsesCustomValues(filter.inputType, filter.kind)) {
    return { error: "Bu filtre türüne özel değer eklenmez." };
  }

  if (filter.inputType === "SWATCH") {
    const colorError = assertSwatchColor(payload.colorHex, true);
    if (colorError) return { error: colorError, fieldErrors: { colorHex: colorError } };
  }

  try {
    let sortOrder = payload.sortOrder;
    if (!String(formData.get("sortOrder") ?? "").trim()) {
      const last = await prisma.productFilterValue.findFirst({
        where: { filterId: payload.filterId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const slug = await uniqueFilterValueSlug(payload.filterId, payload.slugInput || payload.name);
    const image = await saveValueImage(payload.imageFile, payload.existingImage);

    await prisma.productFilterValue.create({
      data: {
        filterId: payload.filterId,
        name: payload.name,
        slug,
        colorHex: filter.inputType === "SWATCH" ? payload.colorHex : null,
        image: image || null,
        sortOrder,
        isActive: payload.isActive,
      },
    });

    revalidateFilterAdmin(payload.filterId);
    return { success: true, message: "Değer eklendi." };
  } catch (error) {
    console.error(error);
    return { error: "Değer eklenirken bir hata oluştu." };
  }
}

export async function updateProductFilterValueAction(
  _prev: ProductFilterFormState,
  formData: FormData,
): Promise<ProductFilterFormState> {
  const gate = await requirePermission("filters", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Değer bulunamadı." };

  const existing = await prisma.productFilterValue.findUnique({
    where: { id },
    include: { filter: true },
  });
  if (!existing) return { error: "Değer bulunamadı." };

  const payload = parseValuePayload(formData);
  if (!payload.name) {
    return { error: "Değer adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  if (existing.filter.inputType === "SWATCH") {
    const colorError = assertSwatchColor(payload.colorHex, true);
    if (colorError) return { error: colorError, fieldErrors: { colorHex: colorError } };
  }

  try {
    const slug = await uniqueFilterValueSlug(
      existing.filterId,
      payload.slugInput || payload.name,
      id,
    );

    let image = payload.existingImage;
    if (payload.imageFile instanceof File && payload.imageFile.size > 0) {
      image = await saveValueImage(payload.imageFile, payload.existingImage, existing.image);
    } else if (!image && existing.image) {
      await deletePublicAsset(existing.image);
      image = "";
    }

    await prisma.productFilterValue.update({
      where: { id },
      data: {
        name: payload.name,
        slug,
        colorHex: existing.filter.inputType === "SWATCH" ? payload.colorHex : null,
        image: image || null,
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
      },
    });

    revalidateFilterAdmin(existing.filterId);
    return { success: true, message: "Değer güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Değer güncellenirken bir hata oluştu." };
  }
}

export async function deleteProductFilterValueAction(input: { id: string }) {
  const gate = await requirePermission("filters", "delete");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Değer bulunamadı." };

  const existing = await prisma.productFilterValue.findUnique({ where: { id } });
  if (!existing) return { error: "Değer bulunamadı." };

  try {
    await prisma.productFilterValue.delete({ where: { id } });
    if (existing.image) await deletePublicAsset(existing.image);
    revalidateFilterAdmin(existing.filterId);
    return { success: true, message: "Değer silindi." };
  } catch (error) {
    console.error(error);
    return { error: "Değer silinirken bir hata oluştu." };
  }
}

export async function toggleProductFilterValueActiveAction(input: {
  id: string;
  isActive: boolean;
}) {
  const gate = await requirePermission("filters", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Değer bulunamadı." };

  const existing = await prisma.productFilterValue.findUnique({ where: { id } });
  if (!existing) return { error: "Değer bulunamadı." };

  await prisma.productFilterValue.update({
    where: { id },
    data: { isActive: input.isActive },
  });
  revalidateFilterAdmin(existing.filterId);
  return { success: true };
}

export async function reorderProductFilterValuesAction(input: {
  filterId: string;
  orderedIds: string[];
}) {
  const gate = await requirePermission("filters", "update");
  if (!gate.ok) return { error: gate.error };

  const filterId = String(input.filterId ?? "").trim();
  const orderedIds = input.orderedIds.map((id) => String(id).trim()).filter(Boolean);
  if (!filterId || !orderedIds.length) return { error: "Sıralama geçersiz." };

  const values = await prisma.productFilterValue.findMany({
    where: { filterId },
    select: { id: true },
  });
  const known = new Set(values.map((value) => value.id));
  if (orderedIds.some((id) => !known.has(id))) {
    return { error: "Sıralama geçersiz." };
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.productFilterValue.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
  revalidateFilterAdmin(filterId);
  return { success: true };
}
