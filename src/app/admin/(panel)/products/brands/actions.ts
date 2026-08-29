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

export type BrandFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeleteBrandResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

function revalidateBrandAdmin(id?: string) {
  revalidatePath("/admin/products/brands");
  if (id) revalidatePath(`/admin/products/brands/${id}/edit`);
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

async function uniqueBrandSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "marka";
  let candidate = slug;
  let i = 2;

  while (true) {
    const existing = await prisma.brand.findFirst({
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

function parseBrandPayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const tagline = emptyToNull(String(formData.get("tagline") ?? ""));
  const website = normalizeProjectUrl(String(formData.get("website") ?? ""));
  const country = emptyToNull(String(formData.get("country") ?? ""), 100);
  const description = emptyHtml(String(formData.get("description") ?? ""));
  const seoTitle = emptyToNull(String(formData.get("seoTitle") ?? ""));
  const seoDescription = emptyToNull(String(formData.get("seoDescription") ?? ""), 500);
  const notes = emptyToNull(String(formData.get("notes") ?? ""), 10_000);
  const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
  const sortOrderParsed = Number.parseInt(sortOrderRaw, 10);
  const isActive =
    formData.get("isActive") === "on" || formData.get("isActive") === "true";

  return {
    name,
    slugInput,
    tagline,
    website,
    country,
    description,
    seoTitle,
    seoDescription,
    notes,
    sortOrderRaw,
    sortOrder: Number.isFinite(sortOrderParsed) ? sortOrderParsed : null,
    isActive,
    existingLogo: String(formData.get("logo") ?? "").trim(),
    logoFile: formData.get("logo_file"),
    existingBanner: String(formData.get("banner") ?? "").trim(),
    bannerFile: formData.get("banner_file"),
  };
}

async function saveBrandImage(
  file: FormDataEntryValue | null,
  existingPath: string,
  previousPath?: string | null,
) {
  if (file instanceof File && file.size > 0) {
    const saved = await saveOptimizedImage(file, {
      uploadDir: "uploads/products/brands",
      maxBytes: uploadLimits.image,
      mode: "webp",
      quality: 82,
      previousPath: previousPath || undefined,
    });
    return saved.publicPath;
  }
  return existingPath;
}

export async function createBrandAction(
  _prev: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const gate = await requirePermission("brands", "create");
  if (!gate.ok) return { error: gate.error };

  const payload = parseBrandPayload(formData);
  if (!payload.name) {
    return { error: "Marka adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  try {
    const slug = await uniqueBrandSlug(payload.slugInput || payload.name);
    let sortOrder = payload.sortOrder;
    if (sortOrder === null || payload.sortOrderRaw === "") {
      const last = await prisma.brand.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const logo = await saveBrandImage(payload.logoFile, payload.existingLogo);
    const banner = await saveBrandImage(payload.bannerFile, payload.existingBanner);

    await prisma.brand.create({
      data: {
        name: payload.name,
        slug,
        tagline: payload.tagline,
        website: payload.website,
        country: payload.country,
        logo: logo || null,
        banner: banner || null,
        description: payload.description,
        seoTitle: payload.seoTitle,
        seoDescription: payload.seoDescription,
        notes: payload.notes,
        sortOrder,
        isActive: payload.isActive,
      },
    });

    revalidateBrandAdmin();
    return { success: true, message: "Marka oluşturuldu." };
  } catch (error) {
    console.error(error);
    return { error: "Marka oluşturulurken bir hata oluştu." };
  }
}

export async function updateBrandAction(
  _prev: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const gate = await requirePermission("brands", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Marka bulunamadı." };

  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) return { error: "Marka bulunamadı." };

  const payload = parseBrandPayload(formData);
  if (!payload.name) {
    return { error: "Marka adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  try {
    const slug = await uniqueBrandSlug(payload.slugInput || payload.name, id);
    const sortOrder =
      payload.sortOrderRaw === "" || payload.sortOrder === null
        ? existing.sortOrder
        : payload.sortOrder;

    let logo = payload.existingLogo;
    if (payload.logoFile instanceof File && payload.logoFile.size > 0) {
      logo = await saveBrandImage(payload.logoFile, payload.existingLogo, existing.logo);
    } else if (!logo && existing.logo) {
      await deletePublicAsset(existing.logo);
      logo = "";
    }

    let banner = payload.existingBanner;
    if (payload.bannerFile instanceof File && payload.bannerFile.size > 0) {
      banner = await saveBrandImage(
        payload.bannerFile,
        payload.existingBanner,
        existing.banner,
      );
    } else if (!banner && existing.banner) {
      await deletePublicAsset(existing.banner);
      banner = "";
    }

    await prisma.brand.update({
      where: { id },
      data: {
        name: payload.name,
        slug,
        tagline: payload.tagline,
        website: payload.website,
        country: payload.country,
        logo: logo || null,
        banner: banner || null,
        description: payload.description,
        seoTitle: payload.seoTitle,
        seoDescription: payload.seoDescription,
        notes: payload.notes,
        sortOrder,
        isActive: payload.isActive,
      },
    });

    revalidateBrandAdmin(id);
    return { success: true, message: "Marka güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Marka güncellenirken bir hata oluştu." };
  }
}

export async function deleteBrandAction(input: {
  id: string;
}): Promise<DeleteBrandResult> {
  const gate = await requirePermission("brands", "delete");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Marka bulunamadı." };

  const existing = await prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) return { error: "Marka bulunamadı." };

  try {
    await prisma.brand.delete({ where: { id } });
    if (existing.logo) await deletePublicAsset(existing.logo);
    if (existing.banner) await deletePublicAsset(existing.banner);

    revalidateBrandAdmin();
    return {
      success: true,
      message:
        existing._count.products > 0
          ? `Marka silindi; ${existing._count.products} üründen bağlantı kaldırıldı.`
          : "Marka silindi.",
    };
  } catch (error) {
    console.error(error);
    return { error: "Marka silinirken bir hata oluştu." };
  }
}

export async function toggleBrandActiveAction(input: {
  id: string;
  isActive: boolean;
}): Promise<DeleteBrandResult> {
  const gate = await requirePermission("brands", "update");
  if (!gate.ok) return { error: gate.error };

  const id = String(input.id ?? "").trim();
  if (!id) return { error: "Marka bulunamadı." };

  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) return { error: "Marka bulunamadı." };

  await prisma.brand.update({
    where: { id },
    data: { isActive: input.isActive },
  });

  revalidateBrandAdmin(id);
  return {
    success: true,
    message: input.isActive ? "Marka aktif edildi." : "Marka pasife alındı.",
  };
}
