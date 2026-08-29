"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/staff-permissions";
import { normalizeProjectUrl } from "@/lib/project-portfolio";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

export type SupplierFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeleteSupplierResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function revalidateSupplierAdmin(id?: string) {
  revalidatePath("/admin/products/suppliers");
  if (id) revalidatePath(`/admin/products/suppliers/${id}/edit`);
}

function emptyToNull(value: string, max = 191) {
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

function emptyHtml(html: string): string | null {
  const stripped = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return stripped ? html.trim() : null;
}

async function uniqueSupplierSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "tedarikci";
  let candidate = slug;
  let i = 2;

  while (true) {
    const existing = await prisma.supplier.findFirst({
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

function parseSupplierPayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const legalName = emptyToNull(String(formData.get("legalName") ?? ""));
  const taxNumber = emptyToNull(String(formData.get("taxNumber") ?? ""), 50);
  const taxOffice = emptyToNull(String(formData.get("taxOffice") ?? ""));
  const contactName = emptyToNull(String(formData.get("contactName") ?? ""));
  const emailRaw = String(formData.get("email") ?? "").trim().slice(0, 191);
  const email = emailRaw || null;
  const phone = emptyToNull(String(formData.get("phone") ?? ""), 50);
  const phone2 = emptyToNull(String(formData.get("phone2") ?? ""), 50);
  const whatsapp = emptyToNull(String(formData.get("whatsapp") ?? ""), 50);
  const website = normalizeProjectUrl(String(formData.get("website") ?? ""));
  const address = emptyToNull(String(formData.get("address") ?? ""), 5000);
  const city = emptyToNull(String(formData.get("city") ?? ""), 100);
  const district = emptyToNull(String(formData.get("district") ?? ""), 100);
  const country = emptyToNull(String(formData.get("country") ?? ""), 100);
  const postalCode = emptyToNull(String(formData.get("postalCode") ?? ""), 20);
  const description = emptyHtml(String(formData.get("description") ?? ""));
  const productInfo = emptyHtml(String(formData.get("productInfo") ?? ""));
  const notes = emptyToNull(String(formData.get("notes") ?? ""), 10_000);
  const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
  const sortOrderParsed = Number.parseInt(sortOrderRaw, 10);
  const isActive =
    formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const existingLogo = String(formData.get("logo") ?? "").trim();
  const logoFile = formData.get("logo_file");

  return {
    name,
    slugInput,
    legalName,
    taxNumber,
    taxOffice,
    contactName,
    email,
    phone,
    phone2,
    whatsapp,
    website,
    address,
    city,
    district,
    country,
    postalCode,
    description,
    productInfo,
    notes,
    sortOrderRaw,
    sortOrder: Number.isFinite(sortOrderParsed) ? sortOrderParsed : null,
    isActive,
    existingLogo,
    logoFile,
  };
}

function validatePayload(payload: ReturnType<typeof parseSupplierPayload>) {
  const fieldErrors: Record<string, string> = {};
  if (!payload.name) fieldErrors.name = "Zorunlu alan";
  if (payload.email && !EMAIL_RE.test(payload.email)) {
    fieldErrors.email = "Geçerli bir e-posta girin";
  }
  return fieldErrors;
}

async function saveLogo(
  logoFile: FormDataEntryValue | null,
  existingLogo: string,
  previousPath?: string | null,
) {
  let logo = existingLogo;
  if (logoFile instanceof File && logoFile.size > 0) {
    const saved = await saveOptimizedImage(logoFile, {
      uploadDir: "uploads/products/suppliers",
      maxBytes: uploadLimits.image,
      mode: "webp",
      quality: 82,
      previousPath: previousPath || undefined,
    });
    logo = saved.publicPath;
  }
  return logo;
}

export async function createSupplierAction(
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const gate = await requirePermission("suppliers", "create");
  if (!gate.ok) return { error: gate.error };

  const payload = parseSupplierPayload(formData);
  const fieldErrors = validatePayload(payload);
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Formdaki hataları düzeltin.", fieldErrors };
  }

  try {
    const slug = await uniqueSupplierSlug(payload.slugInput || payload.name);
    let sortOrder = payload.sortOrder;
    if (sortOrder === null || payload.sortOrderRaw === "") {
      const last = await prisma.supplier.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const logo = await saveLogo(payload.logoFile, payload.existingLogo);

    await prisma.supplier.create({
      data: {
        name: payload.name,
        slug,
        legalName: payload.legalName,
        taxNumber: payload.taxNumber,
        taxOffice: payload.taxOffice,
        contactName: payload.contactName,
        email: payload.email,
        phone: payload.phone,
        phone2: payload.phone2,
        whatsapp: payload.whatsapp,
        website: payload.website,
        address: payload.address,
        city: payload.city,
        district: payload.district,
        country: payload.country,
        postalCode: payload.postalCode,
        logo: logo || null,
        description: payload.description,
        productInfo: payload.productInfo,
        notes: payload.notes,
        sortOrder,
        isActive: payload.isActive,
      },
    });

    revalidateSupplierAdmin();
    return { success: true, message: "Tedarikçi oluşturuldu." };
  } catch (error) {
    console.error(error);
    return { error: "Tedarikçi oluşturulurken bir hata oluştu." };
  }
}

export async function updateSupplierAction(
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const gate = await requirePermission("suppliers", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Tedarikçi bulunamadı." };

  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) return { error: "Tedarikçi bulunamadı." };

  const payload = parseSupplierPayload(formData);
  const fieldErrors = validatePayload(payload);
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Formdaki hataları düzeltin.", fieldErrors };
  }

  try {
    const slug = await uniqueSupplierSlug(payload.slugInput || payload.name, id);
    const sortOrder =
      payload.sortOrderRaw === "" || payload.sortOrder === null
        ? existing.sortOrder
        : payload.sortOrder;

    let logo = payload.existingLogo;
    if (payload.logoFile instanceof File && payload.logoFile.size > 0) {
      logo = await saveLogo(payload.logoFile, payload.existingLogo, existing.logo);
    } else if (!logo && existing.logo) {
      await deletePublicAsset(existing.logo);
      logo = "";
    }

    await prisma.supplier.update({
      where: { id },
      data: {
        name: payload.name,
        slug,
        legalName: payload.legalName,
        taxNumber: payload.taxNumber,
        taxOffice: payload.taxOffice,
        contactName: payload.contactName,
        email: payload.email,
        phone: payload.phone,
        phone2: payload.phone2,
        whatsapp: payload.whatsapp,
        website: payload.website,
        address: payload.address,
        city: payload.city,
        district: payload.district,
        country: payload.country,
        postalCode: payload.postalCode,
        logo: logo || null,
        description: payload.description,
        productInfo: payload.productInfo,
        notes: payload.notes,
        sortOrder,
        isActive: payload.isActive,
      },
    });

    revalidateSupplierAdmin(id);
    return { success: true, message: "Tedarikçi güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Tedarikçi güncellenirken bir hata oluştu." };
  }
}

export async function deleteSupplierAction(input: {
  id: string;
}): Promise<DeleteSupplierResult> {
  const gate = await requirePermission("suppliers", "delete");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Tedarikçi bulunamadı." };

  const existing = await prisma.supplier.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) return { error: "Tedarikçi bulunamadı." };

  try {
    await prisma.supplier.delete({ where: { id } });
    if (existing.logo) await deletePublicAsset(existing.logo);

    revalidateSupplierAdmin();
    return {
      success: true,
      message:
        existing._count.products > 0
          ? `Tedarikçi silindi; ${existing._count.products} üründen bağlantı kaldırıldı.`
          : "Tedarikçi silindi.",
    };
  } catch (error) {
    console.error(error);
    return { error: "Tedarikçi silinirken bir hata oluştu." };
  }
}

export async function toggleSupplierActiveAction(input: {
  id: string;
  isActive: boolean;
}): Promise<DeleteSupplierResult> {
  const gate = await requirePermission("suppliers", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Tedarikçi bulunamadı." };

  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) return { error: "Tedarikçi bulunamadı." };

  await prisma.supplier.update({
    where: { id },
    data: { isActive: input.isActive },
  });

  revalidateSupplierAdmin(id);
  return {
    success: true,
    message: input.isActive ? "Tedarikçi aktif edildi." : "Tedarikçi pasife alındı.",
  };
}
