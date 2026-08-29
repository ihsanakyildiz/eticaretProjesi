"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

function isFocusedCheckout(pathname: string) {
  return pathname === "/odeme" || pathname.startsWith("/odeme/");
}

export function SiteChrome({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const focused = isFocusedCheckout(pathname);

  return (
    <>
      {focused ? null : header}
      <main id="icerik">{children}</main>
      {focused ? null : footer}
    </>
  );
}
