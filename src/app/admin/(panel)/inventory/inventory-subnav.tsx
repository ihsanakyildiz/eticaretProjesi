"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/inventory", label: "Stok durumu", exact: true },
  { href: "/admin/inventory/warehouses", label: "Depolar" },
  { href: "/admin/inventory/locations", label: "Raflar" },
  { href: "/admin/inventory/scan", label: "El terminali" },
  { href: "/admin/inventory/receipts", label: "Giriş irsaliyesi" },
  { href: "/admin/inventory/invoices", label: "Alış faturası" },
  { href: "/admin/inventory/issues", label: "Çıkış irsaliyesi" },
  { href: "/admin/inventory/transfers", label: "Transfer" },
  { href: "/admin/inventory/counts", label: "Sayım" },
  { href: "/admin/inventory/adjustments", label: "Düzeltme" },
  { href: "/admin/inventory/supplier-returns", label: "Tedarikçi iade" },
  { href: "/admin/inventory/customer-returns", label: "Müşteri iade" },
  { href: "/admin/inventory/movements", label: "Hareketler" },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function InventorySubnav() {
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
