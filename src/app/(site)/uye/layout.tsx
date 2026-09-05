import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ensureMemberPortalAccess } from "./actions";

export default async function UyeLayout({ children }: { children: ReactNode }) {
  const access = await ensureMemberPortalAccess();
  if (!access.ok) {
    redirect("/giris?callbackUrl=/uye");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-medium tracking-wide text-site-muted uppercase">Üye Alanı</p>
        <h1 className="mt-1 text-2xl font-bold text-site-fg">Hesabım</h1>
      </div>
      {children}
    </div>
  );
}
