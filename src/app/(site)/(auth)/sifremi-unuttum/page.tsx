"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import {
  memberForgotPasswordAction,
  type MemberAuthState,
} from "@/app/(site)/(auth)/actions";

const initialState: MemberAuthState = {};

export default function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    memberForgotPasswordAction,
    initialState,
  );

  return (
    <div className="rounded-2xl border border-site-border bg-site-card p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-site-fg">Şifremi Unuttum</h1>
      <p className="mt-1 text-sm text-site-muted">
        E-posta adresinize şifre sıfırlama bağlantısı göndereceğiz.
      </p>

      {state.error ? (
        <div
          role="alert"
          className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div
          role="status"
          className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {state.message}
        </div>
      ) : null}

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-site-fg">
            E-posta
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-site-muted" />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-site-border bg-site-bg py-2.5 pr-3 pl-10 text-sm outline-none focus:border-site-primary focus:ring-2 focus:ring-site-primary/20"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-site-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Bağlantı Gönder
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-site-muted">
        <Link href="/giris" className="font-medium text-site-primary hover:underline">
          Girişe dön
        </Link>
      </p>
    </div>
  );
}
