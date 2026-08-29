import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getMembershipFlags } from "@/lib/membership";
import { ensureMemberPortalAccess } from "./actions";
import { MemberAccountNav } from "./member-account-nav";

export default async function UyeLayout({ children }: { children: ReactNode }) {
  const access = await ensureMemberPortalAccess();
  if (!access.ok) {
    redirect("/giris?callbackUrl=/uye");
  }

  const membership = await getMembershipFlags();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-site-muted uppercase">
            Üye Alanı
          </p>
          <h1 className="mt-1 text-2xl font-bold text-site-fg">Hesabım</h1>
        </div>
        <MemberAccountNav showSubscriptions={membership.enabled} />
      </div>
      {children}
    </div>
  );
}
