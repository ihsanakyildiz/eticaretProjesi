"use server";

import { hash, compare } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { auth, signOut } from "@/auth";
import { requireMember, getMembershipFlags } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

export type ProfileFormState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function updateMemberProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const flags = await getMembershipFlags();
  if (!flags.enabled) return { error: "Üyelik sistemi kapalı." };

  let session;
  try {
    session = await requireMember();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!name || !email) {
    return { error: "Ad ve e-posta zorunludur." };
  }

  const existingEmail = await prisma.user.findFirst({
    where: { email, NOT: { id: session.user.id } },
  });
  if (existingEmail) {
    return { error: "Bu e-posta başka bir hesapta kullanılıyor." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, email, phone: phone || null },
  });

  revalidatePath("/uye");
  return { success: true, message: "Profil güncellendi." };
}

export async function updateMemberPasswordAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const flags = await getMembershipFlags();
  if (!flags.enabled) return { error: "Üyelik sistemi kapalı." };

  let session;
  try {
    session = await requireMember();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (password.length < 6) return { error: "Yeni şifre en az 6 karakter olmalıdır." };
  if (password !== passwordConfirm) return { error: "Şifreler eşleşmiyor." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Kullanıcı bulunamadı." };

  if (user.password) {
    if (!currentPassword) return { error: "Mevcut şifrenizi girin." };
    const ok = await compare(currentPassword, user.password);
    if (!ok) return { error: "Mevcut şifre hatalı." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hash(password, 10) },
  });

  return { success: true, message: "Şifre güncellendi." };
}

export async function updateMemberAvatarAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const flags = await getMembershipFlags();
  if (!flags.enabled) return { error: "Üyelik sistemi kapalı." };

  let session;
  try {
    session = await requireMember();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Görsel seçin." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Kullanıcı bulunamadı." };

  try {
    const saved = await saveOptimizedImage(file, {
      uploadDir: "uploads/avatars",
      maxBytes: uploadLimits.image,
      mode: "webp",
      quality: 82,
      width: 400,
      height: 400,
      previousPath: user.image || undefined,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { image: saved.publicPath },
    });

    revalidatePath("/uye");
    return { success: true, message: "Profil fotoğrafı güncellendi." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Görsel yüklenemedi.",
    };
  }
}

export async function removeMemberAvatarAction(
  _prev: ProfileFormState | void,
  _formData?: FormData,
): Promise<ProfileFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Oturum bulunamadı." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.image) return { success: true, message: "Zaten avatar yok." };

  await deletePublicAsset(user.image);
  await prisma.user.update({
    where: { id: user.id },
    data: { image: null },
  });

  revalidatePath("/uye");
  return { success: true, message: "Avatar kaldırıldı." };
}

export async function removeMemberAvatarFormAction(formData: FormData) {
  await removeMemberAvatarAction(undefined, formData);
}

export async function memberSignOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function ensureMemberPortalAccess() {
  const flags = await getMembershipFlags();
  if (!flags.enabled) {
    return { ok: false as const, reason: "disabled" as const };
  }
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, reason: "auth" as const };
  }
  if (session.user.role !== Role.MEMBER && session.user.role !== Role.ADMIN) {
    return { ok: false as const, reason: "auth" as const };
  }
  return { ok: true as const, session };
}
