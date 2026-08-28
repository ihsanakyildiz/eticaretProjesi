"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import {
  membershipRegisterHref,
} from "@/lib/membership-urls";
import {
  memberLoginAction,
  type MemberAuthState,
} from "@/app/(site)/(auth)/actions";

const initialState: MemberAuthState = {};

type Props = {
  callbackUrl?: string;
  allowRegister: boolean;
  registered?: boolean;
  oauthSlot?: ReactNode;
};

export function MemberLoginForm({
  callbackUrl = "/uye",
  allowRegister,
  registered,
  oauthSlot,
}: Props) {
  const [state, formAction, isPending] = useActionState(memberLoginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="rounded-2xl border border-site-border bg-site-card p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-site-fg">Giriş Yap</h1>
      <p className="mt-1 text-sm text-site-muted">Üye hesabınızla oturum açın.</p>

      {registered ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Kayıt tamamlandı. Şimdi giriş yapabilirsiniz.
        </div>
      ) : null}

      {state.error ? (
        <div
          role="alert"
          className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {state.error}
        </div>
      ) : null}

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-site-fg">
              Şifre
            </label>
            <Link href="/sifremi-unuttum" className="text-xs text-site-primary hover:underline">
              Şifremi unuttum
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-site-muted" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete="current-password"
              className="w-full rounded-lg border border-site-border bg-site-bg py-2.5 pr-11 pl-10 text-sm outline-none focus:border-site-primary focus:ring-2 focus:ring-site-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-site-muted"
              aria-label={showPassword ? "Gizle" : "Göster"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-site-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Giriş Yap
        </button>
      </form>

      {oauthSlot}

      {allowRegister ? (
        <p className="mt-6 text-center text-sm text-site-muted">
          Hesabınız yok mu?{" "}
          <Link
            href={membershipRegisterHref(callbackUrl)}
            className="font-medium text-site-primary hover:underline"
          >
            Kayıt olun
          </Link>
        </p>
      ) : null}
    </div>
  );
}
