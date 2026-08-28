import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ensureMemberPortalAccess, memberSignOutAction } from "./actions";

export default async function UyeLayout({ children }: { children: ReactNode }) {
  const access = await ensureMemberPortalAccess();
  if (!access.ok) {
    if (access.reason === "disabled") redirect("/");
    redirect("/giris?callbackUrl=/uye");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-site-muted uppercase">
            Üye Alanı
          </p>
          <h1 className="mt-1 text-2xl font-bold text-site-fg">Hesabım</h1>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          <Link
            href="/uye"
            className="rounded-full border border-site-border px-4 py-2 text-sm font-medium text-site-fg hover:bg-site-surface"
          >
            Profil
          </Link>
          <Link
            href="/uye/abonelikler"
            className="rounded-full border border-site-border px-4 py-2 text-sm font-medium text-site-fg hover:bg-site-surface"
          >
            Abonelikler
          </Link>
          <form action={memberSignOutAction}>
            <button
              type="submit"
              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600"
            >
              Çıkış Yap
            </button>
          </form>
        </nav>
      </div>
      {children}
    </div>
  );
}
