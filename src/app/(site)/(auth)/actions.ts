"use server";

import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getMembershipFlags } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { getSettingsMapUncached } from "@/lib/settings";
import { getSiteOrigin } from "@/lib/site-origin";
import { getSmtpConfigFromSettings, sendMailWithConfig } from "@/lib/smtp";

export type MemberAuthState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function memberLoginAction(
  _prev: MemberAuthState,
  formData: FormData,
): Promise<MemberAuthState> {
  const flags = await getMembershipFlags();
  if (!flags.enabled) {
    return { error: "Üyelik sistemi şu an kapalı." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/uye").trim() || "/uye";

  if (!email || !password) {
    return { error: "E-posta ve şifre zorunludur." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl.startsWith("/") ? callbackUrl : "/uye",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-posta veya şifre hatalı." };
    }
    throw error;
  }
}

export async function memberRegisterAction(
  _prev: MemberAuthState,
  formData: FormData,
): Promise<MemberAuthState> {
  const flags = await getMembershipFlags();
  if (!flags.enabled) {
    return { error: "Üyelik sistemi şu an kapalı." };
  }
  if (!flags.allowRegister) {
    return { error: "Yeni üye kaydı şu an kapalı." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const callbackRaw = String(formData.get("callbackUrl") ?? "/uye").trim() || "/uye";
  const callbackUrl = callbackRaw.startsWith("/") ? callbackRaw : "/uye";

  if (!name || !email || !password) {
    return { error: "Ad, e-posta ve şifre zorunludur." };
  }
  if (password.length < 6) {
    return { error: "Şifre en az 6 karakter olmalıdır." };
  }
  if (password !== passwordConfirm) {
    return { error: "Şifreler eşleşmiyor." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Bu e-posta adresi zaten kayıtlı." };
  }

  const passwordHash = await hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      role: Role.MEMBER,
      isActive: true,
    },
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(
        `/giris?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`,
      );
    }
    throw error;
  }
}

export async function memberForgotPasswordAction(
  _prev: MemberAuthState,
  formData: FormData,
): Promise<MemberAuthState> {
  const flags = await getMembershipFlags();
  if (!flags.enabled) {
    return { error: "Üyelik sistemi şu an kapalı." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return { error: "E-posta zorunludur." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Always show success to avoid email enumeration
  const okMessage =
    "E-posta adresiniz kayıtlıysa şifre sıfırlama bağlantısı gönderildi.";

  if (!user || user.role !== Role.MEMBER || !user.isActive) {
    return { success: true, message: okMessage };
  }

  const settings = await getSettingsMapUncached();
  const smtp = getSmtpConfigFromSettings(settings);
  if (!smtp.enabled || !smtp.host || !smtp.fromEmail) {
    return {
      error: "E-posta gönderimi yapılandırılmamış. Lütfen site yöneticisine bildirin.",
    };
  }

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  const origin = getSiteOrigin(settings);
  const resetUrl = `${origin}/sifre-sifirla?token=${token}`;

  try {
    await sendMailWithConfig(smtp, {
      to: user.email,
      subject: "Şifre sıfırlama",
      html: `<p>Merhaba${user.name ? ` ${user.name}` : ""},</p>
<p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın (1 saat geçerlidir):</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>`,
      text: `Şifre sıfırlama: ${resetUrl}`,
    });
  } catch (error) {
    console.error("Password reset mail failed:", error);
    return { error: "E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin." };
  }

  return { success: true, message: okMessage };
}

export async function memberResetPasswordAction(
  _prev: MemberAuthState,
  formData: FormData,
): Promise<MemberAuthState> {
  const flags = await getMembershipFlags();
  if (!flags.enabled) {
    return { error: "Üyelik sistemi şu an kapalı." };
  }

  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!token) return { error: "Geçersiz veya eksik bağlantı." };
  if (password.length < 6) return { error: "Şifre en az 6 karakter olmalıdır." };
  if (password !== passwordConfirm) return { error: "Şifreler eşleşmiyor." };

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    return { error: "Bağlantının süresi dolmuş veya geçersiz." };
  }

  const passwordHash = await hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  return {
    success: true,
    message: "Şifreniz güncellendi. Şimdi giriş yapabilirsiniz.",
  };
}
