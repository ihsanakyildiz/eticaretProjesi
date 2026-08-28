"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { stripHtml } from "@/lib/html";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export type FaqFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeleteFaqResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session;
}

async function uniqueFaqGroupSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "sss";
  let candidate = slug;
  let i = 2;
  while (true) {
    const existing = await prisma.faqGroup.findFirst({
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

function parseGroupPayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";

  return {
    name,
    slugInput,
    description,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
  };
}

function parseItemPayload(formData: FormData) {
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";

  return {
    question,
    answer,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
  };
}

export async function createFaqGroupAction(
  _prev: FaqFormState,
  formData: FormData,
): Promise<FaqFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const data = parseGroupPayload(formData);
  if (!data.name) {
    return { error: "Grup adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  try {
    const slug = await uniqueFaqGroupSlug(data.slugInput || data.name);
    let sortOrder = data.sortOrder;
    const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
    if (sortOrderRaw === "") {
      const last = await prisma.faqGroup.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const created = await prisma.faqGroup.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        sortOrder,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/faqs");
    return {
      success: true,
      message: "SSS grubu oluşturuldu.",
      fieldErrors: { redirectId: created.id },
    };
  } catch (error) {
    console.error(error);
    return { error: "SSS grubu eklenirken bir hata oluştu." };
  }
}

export async function updateFaqGroupAction(
  _prev: FaqFormState,
  formData: FormData,
): Promise<FaqFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "SSS grubu bulunamadı." };

  const data = parseGroupPayload(formData);
  if (!data.name) {
    return { error: "Grup adı zorunludur.", fieldErrors: { name: "Zorunlu alan" } };
  }

  try {
    const existing = await prisma.faqGroup.findUnique({ where: { id } });
    if (!existing) return { error: "SSS grubu bulunamadı." };

    const slug = await uniqueFaqGroupSlug(data.slugInput || data.name, id);
    await prisma.faqGroup.update({
      where: { id },
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/faqs");
    revalidatePath(`/admin/faqs/${id}/edit`);
    return { success: true, message: "SSS grubu güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "SSS grubu güncellenirken bir hata oluştu." };
  }
}

export async function deleteFaqGroupAction(formData: FormData): Promise<DeleteFaqResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "SSS grubu bulunamadı." };

  const existing = await prisma.faqGroup.findUnique({ where: { id } });
  if (!existing) return { error: "SSS grubu bulunamadı." };

  await prisma.faqGroup.delete({ where: { id } });
  revalidatePath("/admin/faqs");
  return { success: true, message: "SSS grubu silindi." };
}

export async function toggleFaqGroupActiveAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.faqGroup.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.faqGroup.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  revalidatePath("/admin/faqs");
}

export async function createFaqItemAction(
  _prev: FaqFormState,
  formData: FormData,
): Promise<FaqFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const groupId = String(formData.get("groupId") ?? "").trim();
  if (!groupId) return { error: "SSS grubu bulunamadı." };

  const data = parseItemPayload(formData);
  const fieldErrors: Record<string, string> = {};
  if (!data.question) fieldErrors.question = "Soru zorunludur.";
  if (!stripHtml(data.answer)) fieldErrors.answer = "Cevap zorunludur.";
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Lütfen formu kontrol edin.", fieldErrors };
  }

  try {
    const group = await prisma.faqGroup.findUnique({ where: { id: groupId } });
    if (!group) return { error: "SSS grubu bulunamadı." };

    let sortOrder = data.sortOrder;
    const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
    if (sortOrderRaw === "") {
      const last = await prisma.faqItem.findFirst({
        where: { groupId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    await prisma.faqItem.create({
      data: {
        groupId,
        question: data.question,
        answer: data.answer,
        sortOrder,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/faqs");
    revalidatePath(`/admin/faqs/${groupId}/edit`);
    return {
      success: true,
      message: "Soru eklendi.",
      fieldErrors: { redirectGroupId: groupId },
    };
  } catch (error) {
    console.error(error);
    return { error: "Soru eklenirken bir hata oluştu." };
  }
}

export async function updateFaqItemAction(
  _prev: FaqFormState,
  formData: FormData,
): Promise<FaqFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Soru bulunamadı." };

  const data = parseItemPayload(formData);
  const fieldErrors: Record<string, string> = {};
  if (!data.question) fieldErrors.question = "Soru zorunludur.";
  if (!stripHtml(data.answer)) fieldErrors.answer = "Cevap zorunludur.";
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Lütfen formu kontrol edin.", fieldErrors };
  }

  try {
    const existing = await prisma.faqItem.findUnique({ where: { id } });
    if (!existing) return { error: "Soru bulunamadı." };

    await prisma.faqItem.update({
      where: { id },
      data: {
        question: data.question,
        answer: data.answer,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/faqs");
    revalidatePath(`/admin/faqs/${existing.groupId}/edit`);
    revalidatePath(`/admin/faqs/${existing.groupId}/items/${id}/edit`);
    return {
      success: true,
      message: "Soru güncellendi.",
      fieldErrors: { redirectGroupId: existing.groupId },
    };
  } catch (error) {
    console.error(error);
    return { error: "Soru güncellenirken bir hata oluştu." };
  }
}

export async function deleteFaqItemAction(formData: FormData): Promise<DeleteFaqResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Soru bulunamadı." };

  const existing = await prisma.faqItem.findUnique({ where: { id } });
  if (!existing) return { error: "Soru bulunamadı." };

  await prisma.faqItem.delete({ where: { id } });
  revalidatePath("/admin/faqs");
  revalidatePath(`/admin/faqs/${existing.groupId}/edit`);
  return { success: true, message: "Soru silindi." };
}

export async function toggleFaqItemActiveAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.faqItem.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.faqItem.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  revalidatePath("/admin/faqs");
  revalidatePath(`/admin/faqs/${existing.groupId}/edit`);
}
