"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/staff-permissions";
import { prisma } from "@/lib/prisma";
import {
  isProductAttributeDisplayType,
  isValidColorHex,
} from "@/lib/product-attributes";
import { slugify } from "@/lib/slug";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

export type ProductAttributeFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  redirectId?: string;
};

function revalidateAttributeAdmin(id?: string) {
  revalidatePath("/admin/products/attributes");
  if (id) revalidatePath(`/admin/products/attributes/${id}/edit`);
}

async function uniqueAttributeSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "ozellik";
  let candidate = slug;
  let i = 2;
  while (true) {
    const existing = await prisma.productAttribute.findFirst({
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

async function uniqueValueSlug(
  attributeId: string,
  base: string,
  excludeId?: string,
) {
  const slug = slugify(base) || "deger";
  let candidate = slug;
  let i = 2;
  while (true) {
    const existing = await prisma.productAttributeValue.findFirst({
      where: {
        attributeId,
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

function parseAttributePayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const displayTypeRaw = String(formData.get("displayType") ?? "TEXT").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";

  return {
    name,
    slugInput,
    description,
    displayType: isProductAttributeDisplayType(displayTypeRaw) ? displayTypeRaw : null,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
  };
}

export async function createProductAttributeAction(
  _prev: ProductAttributeFormState,
  formData: FormData,
): Promise<ProductAttributeFormState> {
  const gate = await requirePermission("attributes", "create");
  if (!gate.ok) return { error: gate.error };

  const data = parseAttributePayload(formData);
  if (!data.name) {
    return { error: "Özellik adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }
  if (!data.displayType) {
    return { error: "Görünüm tipi geçersiz." };
  }

  try {
    const slug = await uniqueAttributeSlug(data.slugInput || data.name);
    let sortOrder = data.sortOrder;
    if (String(formData.get("sortOrder") ?? "").trim() === "") {
      const last = await prisma.productAttribute.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const created = await prisma.productAttribute.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        displayType: data.displayType,
        sortOrder,
        isActive: data.isActive,
      },
    });

    revalidateAttributeAdmin(created.id);
    return {
      success: true,
      message: "Özellik oluşturuldu. Değerleri ekleyebilirsiniz.",
      redirectId: created.id,
    };
  } catch (error) {
    console.error(error);
    return { error: "Özellik eklenirken bir hata oluştu." };
  }
}

export async function updateProductAttributeAction(
  _prev: ProductAttributeFormState,
  formData: FormData,
): Promise<ProductAttributeFormState> {
  const gate = await requirePermission("attributes", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Özellik bulunamadı." };

  const data = parseAttributePayload(formData);
  if (!data.name) {
    return { error: "Özellik adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }
  if (!data.displayType) {
    return { error: "Görünüm tipi geçersiz." };
  }

  try {
    const existing = await prisma.productAttribute.findUnique({ where: { id } });
    if (!existing) return { error: "Özellik bulunamadı." };

    const slug = await uniqueAttributeSlug(data.slugInput || data.name, id);
    await prisma.productAttribute.update({
      where: { id },
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        displayType: data.displayType,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });

    revalidateAttributeAdmin(id);
    return { success: true, message: "Özellik güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Özellik güncellenirken bir hata oluştu." };
  }
}

export async function deleteProductAttributeAction(input: { id: string }): Promise<{
  success?: boolean;
  error?: string;
  message?: string;
}> {
  const gate = await requirePermission("attributes", "delete");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Özellik bulunamadı." };

  const existing = await prisma.productAttribute.findUnique({
    where: { id },
    include: {
      _count: { select: { selections: true, values: true } },
      filter: { select: { id: true, name: true } },
    },
  });
  if (!existing) return { error: "Özellik bulunamadı." };

  if (existing.filter) {
    return {
      error: `"${existing.name}" “${existing.filter.name}” filtresine bağlı. Önce filtreyi silin veya bağlantıyı kaldırın.`,
    };
  }

  if (existing._count.selections > 0) {
    return {
      error: `"${existing.name}" bir veya daha fazla ürün SKU’sunda kullanılıyor. Önce ilgili varyantları güncelleyin.`,
    };
  }

  try {
    const values = await prisma.productAttributeValue.findMany({
      where: { attributeId: id },
      select: { image: true },
    });
    await prisma.productAttribute.delete({ where: { id } });
    for (const value of values) {
      if (value.image) await deletePublicAsset(value.image);
    }
    revalidateAttributeAdmin();
    return { success: true, message: "Özellik ve değerleri silindi." };
  } catch (error) {
    console.error(error);
    return { error: "Özellik silinirken bir hata oluştu." };
  }
}

export async function toggleProductAttributeActiveAction(id: string): Promise<{
  success?: boolean;
  error?: string;
  message?: string;
}> {
  const gate = await requirePermission("attributes", "update");
  if (!gate.ok) return { error: gate.error };

  const attributeId = id.trim();
  if (!attributeId) return { error: "Özellik bulunamadı." };

  const existing = await prisma.productAttribute.findUnique({
    where: { id: attributeId },
    select: { id: true, isActive: true },
  });
  if (!existing) return { error: "Özellik bulunamadı." };

  await prisma.productAttribute.update({
    where: { id: attributeId },
    data: { isActive: !existing.isActive },
  });
  revalidateAttributeAdmin(attributeId);
  return {
    success: true,
    message: existing.isActive ? "Özellik pasife alındı." : "Özellik aktifleştirildi.",
  };
}

function parseValuePayload(formData: FormData) {
  const attributeId = String(formData.get("attributeId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const colorHex = String(formData.get("colorHex") ?? "").trim();
  const existingImage = String(formData.get("image") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const imageFile = formData.get("image_file");

  return {
    attributeId,
    name,
    slugInput,
    colorHex,
    existingImage,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
    imageFile,
  };
}

export async function createProductAttributeValueAction(
  _prev: ProductAttributeFormState,
  formData: FormData,
): Promise<ProductAttributeFormState> {
  const gate = await requirePermission("attributes", "create");
  if (!gate.ok) return { error: gate.error };

  const data = parseValuePayload(formData);
  if (!data.attributeId) return { error: "Özellik bulunamadı." };
  if (!data.name) {
    return { error: "Değer adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  const attribute = await prisma.productAttribute.findUnique({
    where: { id: data.attributeId },
    select: { id: true, displayType: true },
  });
  if (!attribute) return { error: "Özellik bulunamadı." };

  if (attribute.displayType === "COLOR" && data.colorHex && !isValidColorHex(data.colorHex)) {
    return { error: "Geçerli bir hex renk girin (#000 veya #000000)." };
  }

  try {
    const slug = await uniqueValueSlug(attribute.id, data.slugInput || data.name);
    let sortOrder = data.sortOrder;
    if (String(formData.get("sortOrder") ?? "").trim() === "") {
      const last = await prisma.productAttributeValue.findFirst({
        where: { attributeId: attribute.id },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    let image: string | null = data.existingImage || null;
    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/products/attributes",
        maxBytes: uploadLimits.image,
        mode: "webp",
        quality: 82,
      });
      image = saved.publicPath;
    }

    await prisma.productAttributeValue.create({
      data: {
        attributeId: attribute.id,
        name: data.name,
        slug,
        colorHex:
          attribute.displayType === "COLOR" ? data.colorHex || null : null,
        image: attribute.displayType === "IMAGE" ? image : null,
        sortOrder,
        isActive: data.isActive,
      },
    });

    revalidateAttributeAdmin(attribute.id);
    return { success: true, message: "Değer eklendi." };
  } catch (error) {
    console.error(error);
    return { error: "Değer eklenirken bir hata oluştu." };
  }
}

export async function updateProductAttributeValueAction(
  _prev: ProductAttributeFormState,
  formData: FormData,
): Promise<ProductAttributeFormState> {
  const gate = await requirePermission("attributes", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Değer bulunamadı." };

  const data = parseValuePayload(formData);
  if (!data.name) {
    return { error: "Değer adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  const existing = await prisma.productAttributeValue.findUnique({
    where: { id },
    include: { attribute: { select: { id: true, displayType: true } } },
  });
  if (!existing) return { error: "Değer bulunamadı." };

  if (
    existing.attribute.displayType === "COLOR" &&
    data.colorHex &&
    !isValidColorHex(data.colorHex)
  ) {
    return { error: "Geçerli bir hex renk girin (#000 veya #000000)." };
  }

  try {
    const slug = await uniqueValueSlug(
      existing.attributeId,
      data.slugInput || data.name,
      id,
    );

    let image = data.existingImage;
    if (existing.attribute.displayType === "IMAGE") {
      if (data.imageFile instanceof File && data.imageFile.size > 0) {
        const saved = await saveOptimizedImage(data.imageFile, {
          uploadDir: "uploads/products/attributes",
          maxBytes: uploadLimits.image,
          mode: "webp",
          quality: 82,
          previousPath: existing.image || undefined,
        });
        image = saved.publicPath;
      } else if (!image && existing.image) {
        await deletePublicAsset(existing.image);
        image = "";
      }
    }

    await prisma.productAttributeValue.update({
      where: { id },
      data: {
        name: data.name,
        slug,
        colorHex:
          existing.attribute.displayType === "COLOR" ? data.colorHex || null : null,
        image: existing.attribute.displayType === "IMAGE" ? image || null : null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });

    revalidateAttributeAdmin(existing.attributeId);
    return { success: true, message: "Değer güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Değer güncellenirken bir hata oluştu." };
  }
}

export async function deleteProductAttributeValueAction(input: { id: string }): Promise<{
  success?: boolean;
  error?: string;
  message?: string;
}> {
  const gate = await requirePermission("attributes", "delete");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Değer bulunamadı." };

  const existing = await prisma.productAttributeValue.findUnique({
    where: { id },
    include: { _count: { select: { selections: true } } },
  });
  if (!existing) return { error: "Değer bulunamadı." };

  if (existing._count.selections > 0) {
    return {
      error: `"${existing.name}" bir ürün SKU’sunda kullanılıyor. Silmek için önce o varyantı kaldırın veya değiştirin.`,
    };
  }

  try {
    await prisma.productAttributeValue.delete({ where: { id } });
    if (existing.image) await deletePublicAsset(existing.image);
    revalidateAttributeAdmin(existing.attributeId);
    return { success: true, message: "Değer silindi." };
  } catch (error) {
    console.error(error);
    return { error: "Değer silinirken bir hata oluştu." };
  }
}

export async function toggleProductAttributeValueActiveAction(id: string): Promise<{
  success?: boolean;
  error?: string;
  message?: string;
}> {
  const gate = await requirePermission("attributes", "update");
  if (!gate.ok) return { error: gate.error };

  const valueId = id.trim();
  if (!valueId) return { error: "Değer bulunamadı." };

  const existing = await prisma.productAttributeValue.findUnique({
    where: { id: valueId },
    select: { id: true, attributeId: true, isActive: true },
  });
  if (!existing) return { error: "Değer bulunamadı." };

  await prisma.productAttributeValue.update({
    where: { id: valueId },
    data: { isActive: !existing.isActive },
  });
  revalidateAttributeAdmin(existing.attributeId);
  return { success: true };
}

export async function reorderProductAttributeValuesAction(
  attributeId: string,
  orderedIds: string[],
): Promise<ProductAttributeFormState> {
  const gate = await requirePermission("attributes", "update");
  if (!gate.ok) return { error: gate.error };

  const id = attributeId.trim();
  if (!id || orderedIds.length === 0) {
    return { error: "Geçersiz sıralama." };
  }

  const existing = await prisma.productAttributeValue.findMany({
    where: { attributeId: id },
    select: { id: true },
  });
  if (existing.length !== orderedIds.length) {
    return { error: "Sıralama listesi güncel değil. Sayfayı yenileyin." };
  }

  const existingIds = new Set(existing.map((item) => item.id));
  for (const valueId of orderedIds) {
    if (!existingIds.has(valueId)) {
      return { error: "Geçersiz değer." };
    }
  }

  try {
    await prisma.$transaction(
      orderedIds.map((valueId, index) =>
        prisma.productAttributeValue.updateMany({
          where: { id: valueId, attributeId: id },
          data: { sortOrder: index },
        }),
      ),
    );
    revalidateAttributeAdmin(id);
    return { success: true, message: "Sıra güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Sıralama kaydedilemedi." };
  }
}
