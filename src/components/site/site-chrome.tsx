"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

function isFocusedCheckout(pathname: string) {
  return pathname === "/odeme" || pathname.startsWith("/odeme/");
}

export function SiteChrome({
  header,
  banner,
  footer,
  children,
}: {
  header: ReactNode;
  banner?: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const focused = isFocusedCheckout(pathname);

  return (
    <>
      {focused ? null : header}
      {banner}
      <main id="icerik">{children}</main>
      {focused ? null : footer}
    </>
  );
}
