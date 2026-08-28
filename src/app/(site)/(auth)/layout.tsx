import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getMembershipFlags } from "@/lib/membership";

export default async function SiteAuthLayout({ children }: { children: ReactNode }) {
  const flags = await getMembershipFlags();
  if (!flags.enabled) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      {children}
    </div>
  );
}
