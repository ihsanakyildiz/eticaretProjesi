"use server";

import { hash, compare } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { auth, signOut } from "@/auth";
import {
  appendCustomerAddress,
  customerAddressToDraft,
  prepareAddressDrafts,
  replaceCustomerAddresses,
} from "@/lib/customer-addresses";
import { emptyAddressDraft, normalizeAddressDefaults, splitFullName } from "@/lib/customers";
import { requireMember } from "@/lib/membership";
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

  const names = splitFullName(name);
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      firstName: names.firstName || null,
      lastName: names.lastName || null,
      email,
      phone: phone || null,
    },
  });

  revalidatePath("/uye");
  return { success: true, message: "Profil güncellendi." };
}

export async function updateMemberPasswordAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
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
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, reason: "auth" as const };
  }
  if (session.user.role !== Role.MEMBER && session.user.role !== Role.ADMIN) {
    return { ok: false as const, reason: "auth" as const };
  }
  return { ok: true as const, session };
}

export async function saveMemberAddressAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const access = await ensureMemberPortalAccess();
  if (!access.ok) return { error: "Oturum bulunamadı." };

  const prepared = prepareAddressDrafts(
    JSON.stringify([
      emptyAddressDraft({
        alias: String(formData.get("alias") ?? "").trim().slice(0, 100) || "Teslimat",
        firstName: String(formData.get("firstName") ?? "").trim().slice(0, 100),
        lastName: String(formData.get("lastName") ?? "").trim().slice(0, 100),
        phone: String(formData.get("phone") ?? "").trim().slice(0, 50),
        line1: String(formData.get("line1") ?? "").trim(),
        line2: String(formData.get("line2") ?? "").trim(),
        country: String(formData.get("country") ?? "").trim().slice(0, 100) || "Türkiye",
        city: String(formData.get("city") ?? "").trim().slice(0, 100),
        district: String(formData.get("district") ?? "").trim().slice(0, 100),
        neighborhood: String(formData.get("neighborhood") ?? "").trim().slice(0, 150),
        postalCode: String(formData.get("postalCode") ?? "").trim().slice(0, 20),
        company: String(formData.get("company") ?? "").trim().slice(0, 191),
        taxOffice: String(formData.get("taxOffice") ?? "").trim().slice(0, 100),
        taxNumber: String(formData.get("taxNumber") ?? "").trim().slice(0, 50),
        isDelivery: formData.get("isDelivery") !== "false",
        isInvoice: formData.get("isInvoice") !== "false",
        isCorporateInvoice: formData.get("isCorporateInvoice") === "on",
        isDefaultDelivery: true,
        isDefaultInvoice: true,
      }),
    ]),
  );
  if (prepared.error) return { error: prepared.error };
  const draft = prepared.addresses[0];
  if (!draft) return { error: "Adres bilgilerini doldurun." };

  await prisma.$transaction((tx) => appendCustomerAddress(tx, access.session.user.id, draft));
  revalidatePath("/uye/adresler");
  revalidatePath("/odeme");
  return { success: true, message: "Adres kaydedildi." };
}

export async function deleteMemberAddressAction(formData: FormData) {
  const access = await ensureMemberPortalAccess();
  if (!access.ok) return;
  const id = String(formData.get("addressId") ?? "").trim();
  if (!id) return;

  const existing = await prisma.customerAddress.findMany({
    where: { userId: access.session.user.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const drafts = normalizeAddressDefaults(
    existing.filter((row) => row.id !== id).map(customerAddressToDraft),
  );
  await prisma.$transaction((tx) =>
    replaceCustomerAddresses(tx, access.session.user.id, drafts),
  );
  revalidatePath("/uye/adresler");
  revalidatePath("/odeme");
}
