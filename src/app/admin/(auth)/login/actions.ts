"use server";

import { AuthError } from "next-auth";
import { Role } from "@prisma/client";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  error?: string;
  success?: boolean;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "E-posta ve şifre zorunludur." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== Role.ADMIN) {
    return { error: "E-posta veya şifre hatalı." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/admin",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "E-posta veya şifre hatalı." };
        default:
          return { error: "Giriş yapılamadı. Lütfen tekrar deneyin." };
      }
    }
    throw error;
  }
}
