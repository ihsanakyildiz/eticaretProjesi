"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import {
  memberRegisterAction,
  type MemberAuthState,
} from "@/app/(site)/(auth)/actions";
import { membershipLoginHref } from "@/lib/membership-urls";

const initialState: MemberAuthState = {};

type Props = {
  callbackUrl?: string;
  oauthSlot?: ReactNode;
};

export function MemberRegisterForm({
  callbackUrl = "/uye",
  oauthSlot,
}: Props) {
  const [state, formAction, isPending] = useActionState(memberRegisterAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="rounded-2xl border border-site-border bg-site-card p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-site-fg">Kayıt Ol</h1>
      <p className="mt-1 text-sm text-site-muted">Paket satın almak için üye hesabı oluşturun.</p>

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
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-site-fg">
            Ad Soyad
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-site-muted" />
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className="w-full rounded-lg border border-site-border bg-site-bg py-2.5 pr-3 pl-10 text-sm outline-none focus:border-site-primary focus:ring-2 focus:ring-site-primary/20"
            />
          </div>
        </div>
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
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-site-fg">
            Şifre
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-site-muted" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-site-border bg-site-bg py-2.5 pr-11 pl-10 text-sm outline-none focus:border-site-primary focus:ring-2 focus:ring-site-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-site-muted"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label
            htmlFor="passwordConfirm"
            className="mb-1.5 block text-sm font-medium text-site-fg"
          >
            Şifre (tekrar)
          </label>
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-lg border border-site-border bg-site-bg px-3 py-2.5 text-sm outline-none focus:border-site-primary focus:ring-2 focus:ring-site-primary/20"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-site-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Kayıt Ol
        </button>
      </form>

      {oauthSlot}

      <p className="mt-6 text-center text-sm text-site-muted">
        Zaten üye misiniz?{" "}
        <Link
          href={membershipLoginHref(callbackUrl)}
          className="font-medium text-site-primary hover:underline"
        >
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
