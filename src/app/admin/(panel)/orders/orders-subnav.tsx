"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/orders", label: "Siparişler", exact: true },
  { href: "/admin/orders/invoices", label: "Faturalar" },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (href === "/admin/orders/invoices") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (exact) {
    if (pathname === "/admin/orders/invoices" || pathname.startsWith("/admin/orders/invoices/")) {
      return false;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OrdersSubnav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1.5 rounded-lg border border-[#e9ebec] bg-white p-2 shadow-sm">
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href, "exact" in link ? link.exact : false);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
              active
                ? "bg-[#405189] text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
