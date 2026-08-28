"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireAdmin } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

export type MemberFormState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function updateMemberAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const password = String(formData.get("password") ?? "");

  if (!id) return { error: "Üye bulunamadı." };
  if (!name || !email) return { error: "Ad ve e-posta zorunludur." };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== Role.MEMBER) {
    return { error: "Üye bulunamadı." };
  }

  const emailTaken = await prisma.user.findFirst({
    where: { email, NOT: { id } },
  });
  if (emailTaken) return { error: "Bu e-posta kullanımda." };

  await prisma.user.update({
    where: { id },
    data: {
      name,
      email,
      phone: phone || null,
      isActive,
      ...(password.length >= 6 ? { password: await hash(password, 10) } : {}),
    },
  });

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${id}`);
  return { success: true, message: "Üye güncellendi." };
}

export async function toggleMemberActiveAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== Role.MEMBER) return;

  await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
  });

  revalidatePath("/admin/members");
}

export async function deleteMemberAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id || id === session.user.id) return;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== Role.MEMBER) return;

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/members");
}
